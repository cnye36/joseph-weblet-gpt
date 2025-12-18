import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// GET /api/competitions/[id]/submissions - Get submissions for a competition
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: competitionId } = await context.params;
    const { searchParams } = new URL(request.url);

    const userId = searchParams.get('userId'); // Filter by user
    const includeEvaluations = searchParams.get('includeEvaluations') === 'true';

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    // Check competition status to determine visibility
    const { data: competition } = await supabase
      .from('competitions')
      .select('status')
      .eq('id', competitionId)
      .single();

    const selectColumns = [
      '*',
      ...(includeEvaluations ? ['evaluations:competition_evaluations(*)'] : []),
    ].join(',');

    let query = supabase
      .from('competition_submissions')
      .select(selectColumns)
      .eq('competition_id', competitionId);

    // Apply user filter if provided
    if (userId) {
      query = query.eq('user_id', userId);
    } else if (competition?.status !== 'completed' && user) {
      // If competition not completed, only show user's own submissions
      query = query.eq('user_id', user.id);
    }

    query = query.order('submitted_at', { ascending: false });

    const { data: submissions, error } = await query;

    if (error) {
      console.error('Error fetching submissions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('Error in GET /api/competitions/[id]/submissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/competitions/[id]/submissions - Create new submission
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { id: competitionId } = await context.params;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can submit (using helper function)
    const { data: canSubmit, error: checkError } = await supabaseAdmin.rpc(
      'can_user_submit',
      {
        p_competition_id: competitionId,
        p_user_id: user.id
      }
    );

    if (checkError) {
      console.error('Error checking submission eligibility:', checkError);
      return NextResponse.json(
        { error: 'Failed to verify submission eligibility' },
        { status: 500 }
      );
    }

    if (!canSubmit) {
      return NextResponse.json(
        { error: 'Cannot submit to this competition. Check deadline, status, or submission limit.' },
        { status: 403 }
      );
    }

    // Get current submission count to determine submission number
    const { data: countData } = await supabaseAdmin.rpc(
      'get_user_submission_count',
      {
        p_competition_id: competitionId,
        p_user_id: user.id
      }
    );

    const submissionNumber = (countData || 0) + 1;

    const body = await request.json();
    const {
      title,
      product_output,
      prompts_used,
      methodology_notes,
      chat_id,
      bot_id
    } = body as {
      title?: string;
      product_output?: unknown;
      prompts_used?: string;
      methodology_notes?: string;
      chat_id?: string;
      bot_id?: string;
    };

    if (!title) {
      return NextResponse.json(
        { error: 'Missing required field: title' },
        { status: 400 }
      );
    }

    // Check if competition allows multiple bots and validate bot_id / chat.bot_id
    const { data: competition } = await supabaseAdmin
      .from('competitions')
      .select('bot_id, allowed_bot_ids')
      .eq('id', competitionId)
      .single();

    if (!competition) {
      return NextResponse.json(
        { error: 'Competition not found' },
        { status: 404 }
      );
    }

    // Validate bot_id if provided or if competition allows multiple bots
    const allowedBotIds: string[] =
      competition.allowed_bot_ids &&
      Array.isArray(competition.allowed_bot_ids) &&
      competition.allowed_bot_ids.length > 0
        ? competition.allowed_bot_ids
        : [];

    let submissionBotId: string;
    let finalProductOutput: unknown = product_output;
    let finalPromptsUsed: string | undefined = prompts_used;

    // If chat_id is provided, derive snapshot from chat and messages
    if (chat_id) {
      // Load chat and verify ownership
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .select('id, user_id, bot_id, competition_id')
        .eq('id', chat_id)
        .maybeSingle();

      if (chatError) {
        console.error('Error loading chat for submission:', chatError);
        return NextResponse.json(
          { error: 'Failed to load chat for submission' },
          { status: 500 }
        );
      }

      if (!chat || chat.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Chat not found for this user' },
          { status: 404 }
        );
      }

      if (chat.competition_id && chat.competition_id !== competitionId) {
        return NextResponse.json(
          { error: 'Chat is not linked to this competition' },
          { status: 400 }
        );
      }

      submissionBotId = chat.bot_id;

      // Validate bot for this competition
      if (allowedBotIds.length > 0) {
        if (!allowedBotIds.includes(submissionBotId)) {
          return NextResponse.json(
            { error: 'Chat was created with a bot that is not allowed for this competition' },
            { status: 400 }
          );
        }
      } else if (submissionBotId !== competition.bot_id) {
        return NextResponse.json(
          { error: 'Chat bot does not match competition bot' },
          { status: 400 }
        );
      }

      // Load messages to build snapshot
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('role, content, parts, created_at')
        .eq('chat_id', chat_id)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error loading messages for submission:', messagesError);
        return NextResponse.json(
          { error: 'Failed to load messages for submission' },
          { status: 500 }
        );
      }

      if (!messages || messages.length === 0) {
        return NextResponse.json(
          { error: 'Chat has no messages to submit' },
          { status: 400 }
        );
      }

      const assistantMessages = messages.filter((m) => m.role === 'assistant');
      const lastAssistant = assistantMessages[assistantMessages.length - 1];

      if (!lastAssistant) {
        return NextResponse.json(
          { error: 'Chat must include at least one assistant reply before submission' },
          { status: 400 }
        );
      }

      // Snapshot of product output: prefer structured parts, fall back to text
      if (Array.isArray(lastAssistant.parts) && lastAssistant.parts.length > 0) {
        finalProductOutput = lastAssistant.parts;
      } else {
        finalProductOutput = [
          {
            type: 'text',
            text: lastAssistant.content ?? '',
          },
        ];
      }

      // Snapshot of prompts used: concatenate user messages
      const userPrompts = messages
        .filter((m) => m.role === 'user')
        .map((m) => m.content || '')
        .filter((text) => text.length > 0);

      finalPromptsUsed = userPrompts.join('\n\n---\n\n');

      if (!finalPromptsUsed) {
        return NextResponse.json(
          { error: 'Chat must include at least one user prompt before submission' },
          { status: 400 }
        );
      }
    } else {
      // Manual submission path (fallback for backwards compatibility)
      if (!product_output || !prompts_used) {
        return NextResponse.json(
          { error: 'Missing required fields: product_output, prompts_used' },
          { status: 400 }
        );
      }

      if (allowedBotIds.length > 0) {
        // Competition allows multiple bots - bot_id is required
        if (!bot_id) {
          return NextResponse.json(
            { error: 'bot_id is required when competition allows multiple bots' },
            { status: 400 }
          );
        }
        if (!allowedBotIds.includes(bot_id)) {
          return NextResponse.json(
            { error: 'Selected bot is not allowed for this competition' },
            { status: 400 }
          );
        }
        submissionBotId = bot_id;
      } else {
        // Single bot competition - use competition's bot_id
        const submissionBot = bot_id || competition.bot_id;
        if (submissionBot !== competition.bot_id) {
          return NextResponse.json(
            { error: 'Invalid bot_id for this competition' },
            { status: 400 }
          );
        }
        submissionBotId = submissionBot;
      }
    }

    // Create submission using admin client to avoid RLS recursion on policies.
    const { data: submission, error: createError } = await supabaseAdmin
      .from('competition_submissions')
      .insert({
        competition_id: competitionId,
        user_id: user.id,
        bot_id: submissionBotId,
        title,
        product_output: finalProductOutput,
        prompts_used: finalPromptsUsed,
        methodology_notes,
        chat_id,
        submission_number: submissionNumber
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating submission:', createError);
      return NextResponse.json(
        { error: 'Failed to create submission' },
        { status: 500 }
      );
    }

    return NextResponse.json({ submission }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/competitions/[id]/submissions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
