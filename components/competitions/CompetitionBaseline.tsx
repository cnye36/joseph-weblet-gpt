"use client";

import { Lightbulb, Code, Target, CheckCircle } from "lucide-react";
import { useState } from "react";

interface Props {
  competition: {
    baseline_title?: string;
    baseline_description?: string;
    baseline_prompts?: string;
    baseline_output?: unknown;
    baseline_evaluation_notes?: string;
  };
}

export default function CompetitionBaseline({ competition }: Props) {
  const [showOutput, setShowOutput] = useState(false);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <Lightbulb className="w-6 h-6 text-blue-600 flex-shrink-0" />
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">
            {competition.baseline_title || "Admin Baseline Evaluation"}
          </h2>
          <p className="text-sm text-blue-800 mb-4">
            The competition organizers have provided this baseline to show what
            good submissions look like. Use this as a guide for your own work.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Baseline Description */}
        {competition.baseline_description && (
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-sm text-gray-900">
                What Makes a Good Submission
              </h3>
            </div>
            <div className="text-sm text-gray-700 whitespace-pre-line">
              {competition.baseline_description}
            </div>
          </div>
        )}

        {/* Example Prompts */}
        {competition.baseline_prompts && (
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Code className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-sm text-gray-900">
                Example Prompts
              </h3>
            </div>
            <div className="bg-gray-900 text-gray-100 rounded p-3 text-sm font-mono whitespace-pre-wrap overflow-x-auto">
              {competition.baseline_prompts}
            </div>
          </div>
        )}

        {/* Baseline Output */}
        {(competition.baseline_output !== undefined &&
          competition.baseline_output !== null) && (
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-sm text-gray-900">
                  Example Output
                </h3>
              </div>
              <button
                onClick={() => setShowOutput(!showOutput)}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                {showOutput ? "Hide" : "Show"} Output
              </button>
            </div>
            {showOutput && (
              <div className="bg-gray-900 text-gray-100 rounded p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto max-h-96 overflow-y-auto">
                {JSON.stringify(competition.baseline_output, null, 2)}
              </div>
            )}
          </div>
        )}

        {/* Evaluation Notes */}
        {competition.baseline_evaluation_notes && (
          <div className="bg-white rounded-lg p-4 border border-blue-100">
            <h3 className="font-semibold text-sm text-gray-900 mb-2">
              Evaluation Criteria
            </h3>
            <div className="text-sm text-gray-700 whitespace-pre-line">
              {competition.baseline_evaluation_notes}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
