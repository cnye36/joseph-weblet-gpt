'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search } from 'lucide-react';
import DeleteBotButton from '../DeleteBotButton';
import { Input } from '@/components/ui/input';

interface Bot {
  id: string;
  name: string;
  description: string | null;
  model: string;
  avatar_url: string | null;
}

interface BotListProps {
  bots: Bot[];
}

export default function BotList({ bots }: BotListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBots = bots.filter((bot) =>
    bot.name.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
      // Sort by relevance: starts with > contains
      const aStarts = a.name.toLowerCase().startsWith(searchQuery.toLowerCase());
      const bStarts = b.name.toLowerCase().startsWith(searchQuery.toLowerCase());
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return 0;
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search bots..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {filteredBots.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No bots found matching &quot;{searchQuery}&quot;
        </div>
      )}

      {filteredBots.map((b) => (
        <div
          key={b.id}
          className="flex items-center justify-between border p-3 rounded hover:bg-muted/40"
        >
          <Link
            href={`/app/admin/bots/${b.id}`}
            className="flex items-center gap-3 flex-1"
          >
            {/* Avatar */}
            {b.avatar_url ? (
              <Image
                src={b.avatar_url}
                alt={`${b.name} avatar`}
                width={40}
                height={40}
                className="w-10 h-10 rounded-full object-cover border border-gray-200 flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {b.name.charAt(0)}
              </div>
            )}

            {/* Bot Info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium">{b.name}</div>
              <div className="text-xs text-muted-foreground">
                {b.id} · {b.model}
              </div>
              {b.description ? (
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {b.description}
                </div>
              ) : null}
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground">Click to edit</div>
            <DeleteBotButton botId={b.id} botName={b.name} />
          </div>
        </div>
      ))}
    </div>
  );
}
