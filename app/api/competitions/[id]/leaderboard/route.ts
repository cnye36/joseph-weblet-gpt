import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

interface LeaderboardRow {
  rank: number;
  user_id: string;
  user_email: string;
  submission_id: string;
  submission_title: string;
  total_score: number;
  product_score: number;
  prompt_score: number;
  is_winner: boolean;
  submitted_at: string;
}

interface EvaluationRow {
  id: string;
  feedback?: string | null;
  strengths?: string | null;
  areas_for_improvement?: string | null;
}

interface SubmissionWithEvaluations {
  id: string;
  prompts_used?: string | null;
  methodology_notes?: string | null;
  evaluations?: EvaluationRow[];
}

// GET /api/competitions/[id]/leaderboard - Get competition leaderboard
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: competitionId } = await context.params;
    const { searchParams } = new URL(request.url);

    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const includeDetails = searchParams.get('includeDetails') === 'true';

    // Use the helper function to get leaderboard
    const { data: leaderboardData, error } = await supabase.rpc(
      "get_competition_leaderboard",
      { p_competition_id: competitionId }
    );

    if (error) {
      console.error("Error fetching leaderboard:", error);
      return NextResponse.json(
        { error: "Failed to fetch leaderboard" },
        { status: 500 }
      );
    }

    const leaderboardRows = (leaderboardData ?? []) as LeaderboardRow[];

    // Limit results if specified
    const limitedLeaderboard: LeaderboardRow[] =
      leaderboardRows.slice(0, limit) ?? [];

    // If includeDetails is true, fetch full submission details
    if (includeDetails && limitedLeaderboard.length > 0) {
      const submissionIds = limitedLeaderboard.map((entry) => entry.submission_id);

      const { data: submissionsData } = await supabase
        .from("competition_submissions")
        .select(
          `
          id,
          prompts_used,
          methodology_notes,
          evaluations:competition_evaluations(*)
        `
        )
        .in("id", submissionIds);

      const submissions = (submissionsData ?? []) as SubmissionWithEvaluations[];

      // Merge submission details into leaderboard
      const enrichedLeaderboard = limitedLeaderboard.map((entry) => {
        const submission = submissions?.find((s) => s.id === entry.submission_id);
        return {
          ...entry,
          submission,
        };
      });

      return NextResponse.json({ leaderboard: enrichedLeaderboard });
    }

    return NextResponse.json({ leaderboard: limitedLeaderboard });
  } catch (error) {
    console.error('Error in GET /api/competitions/[id]/leaderboard:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
