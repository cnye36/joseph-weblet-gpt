"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Save,
  Loader2,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  CheckCircle,
  MessageSquare,
  FileText,
} from "lucide-react";
import { formatDistance } from "date-fns";

interface EvaluationCriterion {
  name: string;
  weight: number;
  description?: string | null;
}

interface Evaluation {
  total_score: number;
  product_score?: number | null;
  prompt_score?: number | null;
  criteria_scores?: Record<string, number>;
  feedback?: string | null;
  strengths?: string | null;
  areas_for_improvement?: string | null;
}

interface Submission {
  id: string;
  title: string;
  user: { email: string };
  product_output: unknown;
  prompts_used: string;
  methodology_notes?: string | null;
  submission_number: number;
  submitted_at: string;
  evaluations: Evaluation[];
  bot_id?: string | null;
  chat_id?: string | null;
}

// Re-export type for server components that need to type submissions
export type CompetitionEvaluationSubmission = Submission;

interface Props {
  competitionId: string;
  competition: {
    evaluation_criteria?: EvaluationCriterion[];
  };
  submissions: Submission[];
}

export default function CompetitionEvaluator({
  competitionId,
  competition,
  submissions,
}: Props) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [evaluating, setEvaluating] = useState<string | null>(null);
  const [evaluationForms, setEvaluationForms] = useState<{
    [key: string]: {
      product_score: string;
      prompt_score: string;
      criteria_scores: { [key: string]: string };
      total_score: string;
      feedback: string;
      strengths: string;
      areas_for_improvement: string;
    };
  }>({});

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      // Initialize form if not already done
      if (!evaluationForms[id]) {
        const submission = submissions.find((s) => s.id === id);
        const existingEval = submission?.evaluations?.[0];

        const criteriaScores: { [key: string]: string } = {};
        if (competition.evaluation_criteria) {
          competition.evaluation_criteria.forEach((criterion) => {
            criteriaScores[criterion.name] =
              existingEval?.criteria_scores?.[criterion.name]?.toString() || "";
          });
        }

        setEvaluationForms((prev) => ({
          ...prev,
          [id]: {
            product_score: existingEval?.product_score?.toString() || "",
            prompt_score: existingEval?.prompt_score?.toString() || "",
            criteria_scores: criteriaScores,
            total_score: existingEval?.total_score?.toString() || "",
            feedback: existingEval?.feedback || "",
            strengths: existingEval?.strengths || "",
            areas_for_improvement: existingEval?.areas_for_improvement || "",
          },
        }));
      }
    }
  };

  const updateForm = (
    submissionId: string,
    field: string,
    value: string
  ) => {
    setEvaluationForms((prev) => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        [field]: value,
      },
    }));
  };

  const updateCriteriaScore = (
    submissionId: string,
    criterion: string,
    value: string
  ) => {
    setEvaluationForms((prev) => ({
      ...prev,
      [submissionId]: {
        ...prev[submissionId],
        criteria_scores: {
          ...prev[submissionId]?.criteria_scores,
          [criterion]: value,
        },
      },
    }));
  };

  const calculateTotalScore = (submissionId: string) => {
    const form = evaluationForms[submissionId];
    if (!form) return;

    if (competition.evaluation_criteria && competition.evaluation_criteria.length > 0) {
      // Calculate weighted score based on criteria
      let total = 0;
      competition.evaluation_criteria.forEach((criterion) => {
        const score = parseFloat(form.criteria_scores[criterion.name] || "0");
        total += score * criterion.weight;
      });
      updateForm(submissionId, "total_score", total.toFixed(2));
    } else if (form.product_score && form.prompt_score) {
      // Simple average if no criteria defined
      const total =
        (parseFloat(form.product_score) + parseFloat(form.prompt_score)) / 2;
      updateForm(submissionId, "total_score", total.toFixed(2));
    }
  };

  const handleSubmitEvaluation = async (submissionId: string) => {
    const form = evaluationForms[submissionId];
    if (!form) return;

    setEvaluating(submissionId);

    const getErrorMessage = (error: unknown): string => {
      if (error instanceof Error) return error.message;
      return "Failed to save evaluation";
    };

    try {
      // Convert criteria_scores to numbers
      const criteria_scores: { [key: string]: number } = {};
      Object.entries(form.criteria_scores).forEach(([key, value]) => {
        if (value) criteria_scores[key] = parseFloat(value);
      });

      const response = await fetch(
        `/api/competitions/${competitionId}/evaluate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submission_id: submissionId,
            product_score: form.product_score
              ? parseFloat(form.product_score)
              : null,
            prompt_score: form.prompt_score
              ? parseFloat(form.prompt_score)
              : null,
            criteria_scores,
            total_score: parseFloat(form.total_score),
            feedback: form.feedback,
            strengths: form.strengths,
            areas_for_improvement: form.areas_for_improvement,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save evaluation");
      }

      // Refresh to show updated evaluation
      router.refresh();
    } catch (error: unknown) {
      alert(`Error: ${getErrorMessage(error)}`);
    } finally {
      setEvaluating(null);
    }
  };

  if (submissions.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-12 text-center">
        <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No submissions yet
        </h3>
        <p className="text-sm text-gray-600">
          Submissions will appear here once participants start submitting.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
        <strong>Evaluation Instructions:</strong> Score each submission and
        provide feedback. Scores should be 0-100. The total score will be
        calculated automatically based on your evaluation criteria.
      </div>

      {submissions.map((submission) => {
        const isExpanded = expandedId === submission.id;
        const form = evaluationForms[submission.id];
        const hasEvaluation = submission.evaluations.length > 0;

        return (
          <div
            key={submission.id}
            className="bg-white rounded-lg border overflow-hidden"
          >
            <div
              className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => toggleExpand(submission.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900">
                      {submission.title}
                    </h3>
                    {hasEvaluation && (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {submission.user.email}
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDistance(
                        new Date(submission.submitted_at),
                        new Date(),
                        { addSuffix: true }
                      )}
                    </div>
                    <div>Submission #{submission.submission_number}</div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                    {submission.bot_id && (
                      <span>Bot: {submission.bot_id}</span>
                    )}
                    {submission.chat_id && (
                      <Link
                        href={`/app/admin/chats/${submission.chat_id}`}
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageSquare className="w-3 h-3" />
                        View chat
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {hasEvaluation && (
                    <div className="text-right">
                      <div className="text-xs text-gray-500">Score</div>
                      <div className="text-lg font-bold text-blue-600">
                        {submission.evaluations[0].total_score?.toFixed(1)}
                      </div>
                    </div>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>
            </div>

            {isExpanded && form && (
              <div className="border-t p-6 bg-gray-50 space-y-6">
                {/* Submission Details */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      Prompts Used
                    </h4>
                    <div className="bg-white rounded border p-3 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
                      {submission.prompts_used}
                    </div>
                  </div>

                  {submission.methodology_notes && (
                    <div>
                      <h4 className="text-sm font-semibold mb-2">
                        Methodology Notes
                      </h4>
                      <div className="bg-white rounded border p-3 text-sm whitespace-pre-wrap">
                        {submission.methodology_notes}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-semibold mb-2">
                      Product Output
                    </h4>
                    <div className="bg-white rounded border p-3 text-sm font-mono whitespace-pre-wrap max-h-96 overflow-y-auto">
                      {JSON.stringify(submission.product_output, null, 2)}
                    </div>
                  </div>
                </div>

                {/* Evaluation Form */}
                <div className="bg-white rounded-lg border p-6 space-y-4">
                  <h4 className="font-semibold text-lg">Evaluation</h4>

                  {/* Evaluation Criteria Scores */}
                  {competition.evaluation_criteria &&
                    competition.evaluation_criteria.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium mb-3">
                          Criteria Scores (0-100)
                        </label>
                        <div className="space-y-3">
                          {competition.evaluation_criteria.map(
                            (criterion: EvaluationCriterion) => (
                              <div key={criterion.name} className="grid grid-cols-3 gap-3 items-center">
                                <div className="col-span-2">
                                  <div className="font-medium text-sm">
                                    {criterion.name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    Weight: {(criterion.weight * 100).toFixed(0)}%
                                  </div>
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  step="0.1"
                                  value={
                                    form.criteria_scores[criterion.name] || ""
                                  }
                                  onChange={(e) => {
                                    updateCriteriaScore(
                                      submission.id,
                                      criterion.name,
                                      e.target.value
                                    );
                                    setTimeout(
                                      () =>
                                        calculateTotalScore(submission.id),
                                      100
                                    );
                                  }}
                                  className="border rounded px-3 py-2 text-sm"
                                  placeholder="0-100"
                                />
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}

                  {/* Simple Scores if no criteria */}
                  {(!competition.evaluation_criteria ||
                    competition.evaluation_criteria.length === 0) && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Product Score (0-100)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={form.product_score}
                          onChange={(e) => {
                            updateForm(
                              submission.id,
                              "product_score",
                              e.target.value
                            );
                            setTimeout(
                              () => calculateTotalScore(submission.id),
                              100
                            );
                          }}
                          className="w-full border rounded px-3 py-2 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">
                          Prompt Score (0-100)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={form.prompt_score}
                          onChange={(e) => {
                            updateForm(
                              submission.id,
                              "prompt_score",
                              e.target.value
                            );
                            setTimeout(
                              () => calculateTotalScore(submission.id),
                              100
                            );
                          }}
                          className="w-full border rounded px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                  )}

                  {/* Total Score (calculated) */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Total Score (calculated)
                    </label>
                    <input
                      type="number"
                      value={form.total_score}
                      onChange={(e) =>
                        updateForm(
                          submission.id,
                          "total_score",
                          e.target.value
                        )
                      }
                      className="w-full border rounded px-3 py-2 text-sm bg-gray-50"
                    />
                  </div>

                  {/* Feedback */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Overall Feedback
                    </label>
                    <textarea
                      value={form.feedback}
                      onChange={(e) =>
                        updateForm(submission.id, "feedback", e.target.value)
                      }
                      rows={3}
                      className="w-full border rounded px-3 py-2 text-sm"
                      placeholder="Provide constructive feedback..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Strengths
                      </label>
                      <textarea
                        value={form.strengths}
                        onChange={(e) =>
                          updateForm(
                            submission.id,
                            "strengths",
                            e.target.value
                          )
                        }
                        rows={3}
                        className="w-full border rounded px-3 py-2 text-sm"
                        placeholder="What did they do well?"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Areas for Improvement
                      </label>
                      <textarea
                        value={form.areas_for_improvement}
                        onChange={(e) =>
                          updateForm(
                            submission.id,
                            "areas_for_improvement",
                            e.target.value
                          )
                        }
                        rows={3}
                        className="w-full border rounded px-3 py-2 text-sm"
                        placeholder="What could be improved?"
                      />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={() => handleSubmitEvaluation(submission.id)}
                    disabled={
                      evaluating === submission.id || !form.total_score
                    }
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {evaluating === submission.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {hasEvaluation ? "Update Evaluation" : "Submit Evaluation"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
