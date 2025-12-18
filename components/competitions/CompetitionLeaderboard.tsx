 "use client";

import { useEffect, useState } from "react";
import { Trophy, Medal, Award, ChevronDown, ChevronUp } from "lucide-react";
import { formatDistance } from "date-fns";

interface SubmissionEvaluation {
  id: string;
  feedback?: string | null;
  strengths?: string | null;
  areas_for_improvement?: string | null;
}

interface SubmissionDetails {
  prompts_used?: string | null;
  methodology_notes?: string | null;
  evaluations?: SubmissionEvaluation[];
}

interface LeaderboardEntry {
  rank: number;
  user_email: string;
  submission_id: string;
  submission_title: string;
  total_score: number;
  product_score: number;
  prompt_score: number;
  is_winner: boolean;
  submitted_at: string;
  submission?: SubmissionDetails;
}

interface Props {
  competitionId: string;
}

export default function CompetitionLeaderboard({ competitionId }: Props) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(
          `/api/competitions/${competitionId}/leaderboard?includeDetails=true`
        );
        if (!response.ok) throw new Error("Failed to fetch leaderboard");

        const data: { leaderboard?: LeaderboardEntry[] } = await response.json();
        setLeaderboard(data.leaderboard || []);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : "Failed to fetch leaderboard";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [competitionId]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1)
      return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2)
      return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3)
      return <Medal className="w-6 h-6 text-orange-600" />;
    return null;
  };

  const getRankBadge = (rank: number, isWinner: boolean) => {
    if (rank === 1)
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    if (rank === 2)
      return "bg-gray-100 text-gray-800 border-gray-300";
    if (rank === 3)
      return "bg-orange-100 text-orange-800 border-orange-300";
    if (isWinner)
      return "bg-blue-100 text-blue-800 border-blue-300";
    return "bg-gray-50 text-gray-700 border-gray-200";
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-12 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto" />
        <p className="text-sm text-gray-600 mt-4">Loading leaderboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (leaderboard.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-12 text-center">
        <Trophy className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No rankings yet
        </h3>
        <p className="text-sm text-gray-600">
          Submissions are still being evaluated.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6 text-blue-600" />
            <h2 className="text-lg font-semibold">Leaderboard</h2>
          </div>
          <div className="text-sm text-gray-600">
            {leaderboard.length} participants
          </div>
        </div>
      </div>

      <div className="divide-y">
        {leaderboard.map((entry, index) => {
          const isExpanded = expandedId === entry.submission_id;
          const rankIcon = getRankIcon(entry.rank);
          const rankBadge = getRankBadge(entry.rank, entry.is_winner);

          return (
            <div key={entry.submission_id} className="hover:bg-gray-50 transition-colors">
              <div className="p-4">
                <div className="flex items-center gap-4">
                  {/* Rank */}
                  <div className="flex items-center justify-center w-16 flex-shrink-0">
                    {rankIcon ? (
                      rankIcon
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full border-2 flex items-center justify-center font-bold ${rankBadge}`}
                      >
                        {entry.rank}
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {entry.submission_title}
                          </h3>
                          {entry.is_winner && (
                            <Award className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="text-sm text-gray-600 truncate">
                          {entry.user_email}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Submitted{" "}
                          {formatDistance(
                            new Date(entry.submitted_at),
                            new Date(),
                            { addSuffix: true }
                          )}
                        </div>
                      </div>

                      {/* Scores */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-right">
                          <div className="text-xs text-gray-500 mb-1">
                            Total Score
                          </div>
                          <div className="text-2xl font-bold text-blue-600">
                            {entry.total_score?.toFixed(1) || "—"}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleExpand(entry.submission_id)}
                          className="p-2 hover:bg-gray-100 rounded transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">
                          Product Score
                        </div>
                        <div className="text-xl font-semibold text-blue-600">
                          {entry.product_score?.toFixed(1) || "—"}
                        </div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">
                          Prompt Score
                        </div>
                        <div className="text-xl font-semibold text-purple-600">
                          {entry.prompt_score?.toFixed(1) || "—"}
                        </div>
                      </div>
                    </div>

                    {entry.submission && (
                      <div className="space-y-2">
                        {entry.submission.prompts_used && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs font-medium text-gray-700 mb-2">
                              Prompts Used
                            </div>
                            <div className="text-sm text-gray-600 whitespace-pre-wrap font-mono text-xs max-h-48 overflow-y-auto">
                              {entry.submission.prompts_used}
                            </div>
                          </div>
                        )}

                        {entry.submission.methodology_notes && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs font-medium text-gray-700 mb-2">
                              Methodology
                            </div>
                            <div className="text-sm text-gray-600 whitespace-pre-wrap">
                              {entry.submission.methodology_notes}
                            </div>
                          </div>
                        )}

                        {entry.submission.evaluations &&
                          entry.submission.evaluations.length > 0 && (
                            <div className="bg-gray-50 rounded-lg p-3">
                              <div className="text-xs font-medium text-gray-700 mb-2">
                                Evaluator Feedback
                              </div>
                              {entry.submission.evaluations.map((evaluation) => (
                                <div
                                  key={evaluation.id}
                                  className="text-sm text-gray-600 mb-2 last:mb-0"
                                >
                                  {evaluation.feedback && (
                                    <div className="mb-1">{evaluation.feedback}</div>
                                  )}
                                  {evaluation.strengths && (
                                    <div className="text-xs text-green-700">
                                      <span className="font-medium">
                                        Strengths:
                                      </span>{" "}
                                      {evaluation.strengths}
                                    </div>
                                  )}
                                  {evaluation.areas_for_improvement && (
                                    <div className="text-xs text-amber-700">
                                      <span className="font-medium">
                                        Areas for improvement:
                                      </span>{" "}
                                      {evaluation.areas_for_improvement}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
