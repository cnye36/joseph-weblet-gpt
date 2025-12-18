"use client";

import Link from "next/link";
import { Trophy, Calendar, Users, Award, ArrowRight, Zap } from "lucide-react";

interface CompetitionSponsor {
  id: string;
  name: string;
}

interface Competition {
  id: string;
  title: string;
  description: string;
  bot_id: string;
  end_date: string;
  submission_deadline: string;
  reward_description?: string;
  banner_url?: string;
  cover_image_url?: string;
  sponsors?: CompetitionSponsor[];
  submission_count?: { count: number }[];
}

interface Props {
  competitions: Competition[];
}

export default function FeaturedCompetitions({ competitions }: Props) {
  const featured = competitions[0]; // First competition is the hero
  const others = competitions.slice(1, 3); // Next 2 are smaller cards

  return (
    <div className="relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 opacity-90" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-30" />

      <div className="relative max-w-7xl mx-auto px-6 py-12">
        {/* Section Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white font-medium mb-4">
            <Zap className="w-4 h-4" />
            <span>Live Competitions</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-2">
            Compete & Win Rewards
          </h2>
          <p className="text-lg text-white/90 max-w-2xl mx-auto">
            Show your skills with our AI weblets, learn from the best, and win prizes
          </p>
        </div>

        {/* Hero Competition */}
        <div className="mb-6">
          <HeroCompetitionCard competition={featured} />
        </div>

        {/* Secondary Competitions */}
        {others.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {others.map((comp) => (
              <SecondaryCompetitionCard key={comp.id} competition={comp} />
            ))}
          </div>
        )}

        {/* View All Link */}
        <div className="text-center">
          <Link
            href="/app/competitions"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-white/90 transition-colors shadow-lg hover:shadow-xl"
          >
            View All Competitions
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function HeroCompetitionCard({ competition }: { competition: Competition }) {
  const daysLeft = Math.ceil(
    (new Date(competition.submission_deadline).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24)
  );
  const submissionCount = competition.submission_count?.[0]?.count || 0;
  const imageUrl = competition.cover_image_url || competition.banner_url;

  return (
    <Link
      href={`/app/competitions/${competition.id}`}
      className="block group"
    >
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-2xl transition-transform duration-300 hover:scale-[1.02]">
        {/* Cover image or Gradient */}
        {imageUrl ? (
          <div className="relative h-72 overflow-hidden">
            <img
              src={imageUrl}
              alt={competition.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute top-4 right-4">
              <div className="px-4 py-2 bg-red-500 text-white rounded-full font-bold text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {daysLeft > 0 ? `${daysLeft} days left` : "Ending soon"}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative h-64 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
            <Trophy className="w-24 h-24 text-white/80" />
            <div className="absolute top-4 right-4">
              <div className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white rounded-full font-bold text-sm flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {daysLeft > 0 ? `${daysLeft} days left` : "Ending soon"}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-8">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h3 className="text-3xl font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
                {competition.title}
              </h3>
              <p className="text-gray-600 text-lg line-clamp-2">
                {competition.description}
              </p>
            </div>
            <Trophy className="w-12 h-12 text-amber-500 flex-shrink-0" />
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mb-6 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="w-4 h-4" />
              <span className="font-medium">
                {submissionCount} submission{submissionCount !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Zap className="w-4 h-4" />
              <span className="font-medium">Using: {competition.bot_id}</span>
            </div>
          </div>

          {/* Rewards */}
          {competition.reward_description && (
            <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Award className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-900 mb-1">
                    Prizes & Rewards
                  </div>
                  <div className="text-sm text-amber-800 line-clamp-2">
                    {competition.reward_description}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sponsors */}
          {competition.sponsors && competition.sponsors.length > 0 && (
            <div className="pt-4 border-t">
              <div className="text-xs text-gray-500 mb-2">Sponsored by</div>
              <div className="flex items-center gap-3 flex-wrap">
              {competition.sponsors.slice(0, 4).map((sponsor) => (
                  <div
                    key={sponsor.id}
                    className="text-sm font-medium text-gray-700 px-3 py-1 bg-gray-100 rounded-full"
                  >
                    {sponsor.name}
                  </div>
                ))}
                {competition.sponsors.length > 4 && (
                  <div className="text-sm text-gray-500">
                    +{competition.sponsors.length - 4} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Deadline:{" "}
              {new Date(competition.submission_deadline).toLocaleDateString()}
            </div>
            <div className="flex items-center gap-2 text-purple-600 font-semibold group-hover:gap-3 transition-all">
              <span>Enter Competition</span>
              <ArrowRight className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function SecondaryCompetitionCard({
  competition,
}: {
  competition: Competition;
}) {
  const daysLeft = Math.ceil(
    (new Date(competition.submission_deadline).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24)
  );
  const submissionCount = competition.submission_count?.[0]?.count || 0;
  const imageUrl = competition.cover_image_url || competition.banner_url;

  return (
    <Link
      href={`/app/competitions/${competition.id}`}
      className="block group"
    >
      <div className="h-full overflow-hidden rounded-xl bg-white shadow-lg transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
        {/* Mini cover image */}
        {imageUrl ? (
          <div className="relative h-40 overflow-hidden">
            <img
              src={imageUrl}
              alt={competition.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        ) : (
          <div className="h-32 bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center">
            <Trophy className="w-12 h-12 text-white/80" />
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="text-lg font-bold text-gray-900 line-clamp-2 group-hover:text-purple-600 transition-colors flex-1">
              {competition.title}
            </h3>
            <Trophy className="w-6 h-6 text-amber-500 flex-shrink-0" />
          </div>

          <p className="text-sm text-gray-600 line-clamp-2 mb-4">
            {competition.description}
          </p>

          {/* Stats */}
          <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {daysLeft > 0 ? `${daysLeft}d left` : "Ending soon"}
            </div>
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {submissionCount} entries
            </div>
          </div>

          {/* Rewards Preview */}
          {competition.reward_description && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
              <div className="flex items-start gap-2">
                <Award className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <div className="text-xs text-amber-800 line-clamp-2 flex-1">
                  {competition.reward_description}
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="flex items-center justify-end text-purple-600 font-medium text-sm group-hover:gap-2 transition-all">
            <span>Enter Now</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </Link>
  );
}
