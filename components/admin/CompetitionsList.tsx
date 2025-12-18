"use client";

import Link from "next/link";
import { formatDistance } from "date-fns";
import { Edit, Trash2, Eye, Users, FileText } from "lucide-react";
import { useState, useMemo } from "react";

interface Competition {
  id: string;
  title: string;
  description: string;
  status: "draft" | "active" | "closed" | "judging" | "completed";
  bot_id: string;
  start_date: string;
  end_date: string;
  submission_deadline: string;
  created_at: string;
  sponsors?: { count: number }[];
  submissions?: { count: number }[];
}

interface Props {
  competitions: Competition[];
}

const statusColors = {
  draft: "bg-gray-100 text-gray-800",
  active: "bg-green-100 text-green-800",
  closed: "bg-yellow-100 text-yellow-800",
  judging: "bg-blue-100 text-blue-800",
  completed: "bg-purple-100 text-purple-800",
};

export default function CompetitionsList({ competitions }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Filter competitions by status
  const filteredCompetitions = useMemo(() => {
    if (statusFilter === "all") {
      return competitions;
    }
    return competitions.filter((c) => c.status === statusFilter);
  }, [competitions, statusFilter]);

  // Count competitions by status
  const statusCounts = useMemo(() => {
    return {
      all: competitions.length,
      draft: competitions.filter((c) => c.status === "draft").length,
      active: competitions.filter((c) => c.status === "active").length,
      judging: competitions.filter((c) => c.status === "judging").length,
      completed: competitions.filter((c) => c.status === "completed").length,
      closed: competitions.filter((c) => c.status === "closed").length,
    };
  }, [competitions]);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(id);

    try {
      const response = await fetch(`/api/competitions/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        window.location.reload();
      } else {
        alert("Failed to delete competition");
      }
    } catch (error) {
      console.error("Error deleting competition:", error);
      alert("Failed to delete competition");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      {/* Status Filter Tabs */}
      <div className="border-b bg-gray-50">
        <div className="flex gap-1 p-2 overflow-x-auto">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              statusFilter === "all"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            All ({statusCounts.all})
          </button>
          <button
            onClick={() => setStatusFilter("draft")}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              statusFilter === "draft"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            Drafts ({statusCounts.draft})
          </button>
          <button
            onClick={() => setStatusFilter("active")}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              statusFilter === "active"
                ? "bg-white text-green-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            Active ({statusCounts.active})
          </button>
          <button
            onClick={() => setStatusFilter("judging")}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              statusFilter === "judging"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            Judging ({statusCounts.judging})
          </button>
          <button
            onClick={() => setStatusFilter("completed")}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
              statusFilter === "completed"
                ? "bg-white text-purple-700 shadow-sm"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            }`}
          >
            Completed ({statusCounts.completed})
          </button>
          {statusCounts.closed > 0 && (
            <button
              onClick={() => setStatusFilter("closed")}
              className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${
                statusFilter === "closed"
                  ? "bg-white text-yellow-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              Closed ({statusCounts.closed})
            </button>
          )}
        </div>
      </div>

      {/* Competitions List */}
      {filteredCompetitions.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-gray-500">
            No competitions found with status “{statusFilter}”.
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {filteredCompetitions.map((competition) => {
        const submissionCount = competition.submissions?.[0]?.count || 0;
        const sponsorCount = competition.sponsors?.[0]?.count || 0;

        return (
          <div key={competition.id} className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {competition.title}
                  </h3>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded-full ${
                      statusColors[competition.status]
                    }`}
                  >
                    {competition.status}
                  </span>
                </div>

                <p className="text-sm text-gray-600 line-clamp-2">
                  {competition.description}
                </p>

                <div className="flex items-center gap-6 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Bot: {competition.bot_id}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {submissionCount} submission{submissionCount !== 1 ? "s" : ""}
                  </div>
                  {sponsorCount > 0 && (
                    <div>
                      {sponsorCount} sponsor{sponsorCount !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <div>
                    Starts: {new Date(competition.start_date).toLocaleDateString()}
                  </div>
                  <div>
                    Ends: {new Date(competition.end_date).toLocaleDateString()}
                  </div>
                  <div>
                    Created {formatDistance(new Date(competition.created_at), new Date(), { addSuffix: true })}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/app/competitions/${competition.id}`}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
                  title="View public page"
                >
                  <Eye className="w-4 h-4" />
                </Link>
                <Link
                  href={`/app/admin/competitions/${competition.id}`}
                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                  title="Edit competition"
                >
                  <Edit className="w-4 h-4" />
                </Link>
                <button
                  onClick={() => handleDelete(competition.id, competition.title)}
                  disabled={deletingId === competition.id}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                  title="Delete competition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
        </div>
      )}
    </div>
  );
}
