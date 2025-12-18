import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

// GET /api/competitions - List all competitions (public can see active/completed, admins see all)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status'); // Filter by status
    const botId = searchParams.get('botId'); // Filter by bot
    const includeSponsors = searchParams.get('includeSponsors') === 'true';

    // Check if user is admin (based on auth + app_admins table)
    const isUserAdmin = await isAdmin();

    // Always use admin client for database access to avoid RLS policy
    // errors that reference auth.users. We still enforce visibility
    // rules in application code based on isUserAdmin.
    const dbClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Build select columns safely to avoid PostgREST parse errors
    const selectColumns = [
      '*',
      ...(includeSponsors ? ['sponsors:competition_sponsors(*)'] : []),
    ].join(',');

    let query = dbClient.from('competitions').select(selectColumns);

    // Apply filters
    if (status) {
      // Respect explicit status filter from caller
      query = query.eq('status', status);
    } else if (!isUserAdmin) {
      // Non-admins can only see active or completed competitions
      query = query.in('status', ['active', 'completed']);
    }
    if (botId) {
      query = query.eq('bot_id', botId);
    }

    // Order by start date (newest first)
    query = query.order('start_date', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching competitions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch competitions' },
        { status: 500 }
      );
    }

    return NextResponse.json({ competitions: data });
  } catch (error) {
    console.error('Error in GET /api/competitions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/competitions - Create new competition (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin status
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      bot_id,
      allowed_bot_ids = [],
      title,
      description,
      rules,
      instructions,
      status = 'draft',
      start_date,
      end_date,
      submission_deadline,
      results_date,
      max_submissions_per_user = 3,
      allow_team_submissions = false,
      reward_description,
      top_winners_count = 10,
      baseline_title,
      baseline_description,
      baseline_prompts,
      baseline_output,
      baseline_evaluation_notes,
      evaluation_criteria,
      cover_image_url,
      banner_url,
      sponsors = [],
    }: {
      bot_id?: string;
      allowed_bot_ids?: string[];
      title?: string;
      description?: string;
      rules?: string;
      instructions?: string;
      status?: string;
      start_date?: string;
      end_date?: string;
      submission_deadline?: string;
      results_date?: string | null;
      max_submissions_per_user?: number;
      allow_team_submissions?: boolean;
      reward_description?: string;
      top_winners_count?: number;
      baseline_title?: string;
      baseline_description?: string;
      baseline_prompts?: string;
      baseline_evaluation_notes?: string;
      baseline_output?: unknown;
      evaluation_criteria?: unknown;
      cover_image_url?: string;
      banner_url?: string;
      sponsors?: {
        name: string;
        logo_url: string;
        website_url?: string;
        description?: string;
        display_order?: number;
      }[];
    } = body;

    // Validate required fields
    // If allowed_bot_ids is provided and has items, bot_id is optional
    // Otherwise, bot_id is required
    const hasMultipleBots = Array.isArray(allowed_bot_ids) && allowed_bot_ids.length > 0;
    if (!hasMultipleBots && !bot_id) {
      return NextResponse.json(
        { error: 'Either bot_id or allowed_bot_ids (with at least one bot) is required' },
        { status: 400 }
      );
    }
    if (!title || !description || !start_date || !end_date || !submission_deadline) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create competition
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: competition, error: competitionError } = await supabaseAdmin
      .from('competitions')
      .insert({
        bot_id: hasMultipleBots ? (bot_id || allowed_bot_ids[0]) : bot_id, // Use first allowed bot or provided bot_id
        allowed_bot_ids: hasMultipleBots ? allowed_bot_ids : [],
        title,
        description,
        rules,
        instructions,
        status,
        start_date,
        end_date,
        submission_deadline,
        results_date: results_date || null,
        max_submissions_per_user,
        allow_team_submissions,
        reward_description,
        top_winners_count,
        baseline_title,
        baseline_description,
        baseline_prompts,
        baseline_output,
        baseline_evaluation_notes,
        evaluation_criteria,
        cover_image_url,
        banner_url,
        created_by: user.id
      })
      .select()
      .single();

    if (competitionError) {
      console.error('Error creating competition:', competitionError);
      return NextResponse.json(
        { error: 'Failed to create competition' },
        { status: 500 }
      );
    }

    // Insert sponsors if provided
    if (sponsors.length > 0 && competition) {
      const sponsorsToInsert = sponsors.map((sponsor, index) => ({
        competition_id: competition.id,
        name: sponsor.name,
        logo_url: sponsor.logo_url,
        website_url: sponsor.website_url,
        description: sponsor.description,
        display_order: sponsor.display_order ?? index,
      }));

      const { error: sponsorsError } = await supabaseAdmin
        .from('competition_sponsors')
        .insert(sponsorsToInsert);

      if (sponsorsError) {
        console.error('Error creating sponsors:', sponsorsError);
        // Don't fail the whole request, just log the error
      }
    }

    return NextResponse.json({ competition }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/competitions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
