import { createClient } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/admin';
import { NextRequest, NextResponse } from 'next/server';

// POST /api/competitions/[id]/evaluate - Evaluate a submission (admin only)
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: competitionId } = await context.params;

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
      submission_id,
      product_score,
      prompt_score,
      criteria_scores,
      total_score,
      feedback,
      strengths,
      areas_for_improvement
    } = body;

    // Validate required fields
    if (!submission_id || total_score === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: submission_id, total_score' },
        { status: 400 }
      );
    }

    // Verify submission belongs to this competition
    const { data: submission, error: submissionError } = await supabase
      .from('competition_submissions')
      .select('competition_id')
      .eq('id', submission_id)
      .single();

    if (submissionError || submission?.competition_id !== competitionId) {
      return NextResponse.json(
        { error: 'Submission not found in this competition' },
        { status: 404 }
      );
    }

    // Check if evaluation already exists from this evaluator
    const { data: existingEval } = await supabase
      .from('competition_evaluations')
      .select('id')
      .eq('submission_id', submission_id)
      .eq('evaluator_id', user.id)
      .single();

    let evaluation;
    let error;

    if (existingEval) {
      // Update existing evaluation
      const result = await supabase
        .from('competition_evaluations')
        .update({
          product_score,
          prompt_score,
          criteria_scores,
          total_score,
          feedback,
          strengths,
          areas_for_improvement,
          evaluated_at: new Date().toISOString()
        })
        .eq('id', existingEval.id)
        .select()
        .single();

      evaluation = result.data;
      error = result.error;
    } else {
      // Create new evaluation
      const result = await supabase
        .from('competition_evaluations')
        .insert({
          submission_id,
          competition_id: competitionId,
          evaluator_id: user.id,
          product_score,
          prompt_score,
          criteria_scores,
          total_score,
          feedback,
          strengths,
          areas_for_improvement
        })
        .select()
        .single();

      evaluation = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error creating/updating evaluation:', error);
      return NextResponse.json(
        { error: 'Failed to save evaluation' },
        { status: 500 }
      );
    }

    // Trigger rankings refresh (happens automatically via trigger)

    return NextResponse.json({ evaluation }, { status: existingEval ? 200 : 201 });
  } catch (error) {
    console.error('Error in POST /api/competitions/[id]/evaluate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/competitions/[id]/evaluate - Get evaluations for a competition (admin only)
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: competitionId } = await context.params;
    const { searchParams } = new URL(request.url);

    // Check admin status
    const adminStatus = await isAdmin();
    if (!adminStatus) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const submissionId = searchParams.get('submissionId');

    let query = supabase
      .from('competition_evaluations')
      .select(`
        *,
        evaluator:auth.users!evaluator_id(email),
        submission:competition_submissions(
          id,
          title,
          user:auth.users!user_id(email)
        )
      `)
      .eq('competition_id', competitionId);

    if (submissionId) {
      query = query.eq('submission_id', submissionId);
    }

    query = query.order('evaluated_at', { ascending: false });

    const { data: evaluations, error } = await query;

    if (error) {
      console.error('Error fetching evaluations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch evaluations' },
        { status: 500 }
      );
    }

    return NextResponse.json({ evaluations });
  } catch (error) {
    console.error('Error in GET /api/competitions/[id]/evaluate:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
