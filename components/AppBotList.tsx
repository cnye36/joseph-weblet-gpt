'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from '@/components/ui/input';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Pagination } from './Pagination';

interface Bot {
  id: string;
  name: string;
  description: string | null;
  system: string | null;
  avatar_url: string | null;
}

interface AppBotListProps {
  bots: Bot[];
  currentPage: number;
  totalPages: number;
}

function BotListContent({ bots, currentPage, totalPages }: AppBotListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Initialize search query from URL
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');

  // Sync state with URL (e.g. on back button)
  useEffect(() => {
    const currentQ = searchParams.get("q") || "";
    if (currentQ !== searchQuery) {
      setSearchQuery(currentQ);
    }
  }, [searchParams, searchQuery]);

  // Debounce search update to URL
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get('q') || '';
      if (searchQuery !== currentQ) {
        const params = new URLSearchParams(searchParams.toString());
        if (searchQuery) {
          params.set('q', searchQuery);
        } else {
          params.delete('q');
        }
        params.set('page', '1'); // Reset page on search change
        router.push(`${pathname}?${params.toString()}`);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, router, pathname, searchParams]);

  return (
    <div className="space-y-8">
      <div className="max-w-md mx-auto relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search Weblets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 bg-white/50 backdrop-blur-sm border-neutral-200 focus:bg-white transition-colors"
        />
      </div>

      {bots.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No Weblets found matching &quot;{searchQuery}&quot;
        </div>
      )}

      <div className="max-w-5xl mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {bots.map((b) => (
          <Link
            key={b.id}
            href={`/app/chat/${b.id}`}
            className="block group h-full"
          >
            <div className="relative rounded-xl p-[2px] bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 hover:from-blue-400 hover:via-purple-400 hover:to-pink-400 transition-all duration-300 hover:scale-105 h-full">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-20 transition-opacity duration-300 blur-sm"></div>
              <Card className="relative bg-white border-white/0 shadow-sm hover:shadow-xl transition-all duration-300 rounded-xl h-full flex flex-col">
                <CardContent className="p-6 space-y-3 flex-1 flex flex-col">
                  <div className="flex items-center space-x-3">
                    {b.avatar_url ? (
                      <Image
                        src={b.avatar_url}
                        alt={`${b.name} avatar`}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                        {b.name.charAt(0)}
                      </div>
                    )}
                    <div className="font-semibold text-lg text-neutral-900 flex-1">
                      {b.name}
                    </div>
                  </div>
                  <div className="text-sm text-neutral-600 line-clamp-3 leading-relaxed flex-1">
                    {b.description || b.system}
                  </div>
                </CardContent>
              </Card>
            </div>
          </Link>
        ))}
      </div>
      
      <Pagination 
        currentPage={currentPage}
        totalPages={totalPages}
        baseUrl={pathname}
        searchParams={Object.fromEntries(searchParams.entries())}
      />
    </div>
  );
}

export default function AppBotList(props: AppBotListProps) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <BotListContent {...props} />
    </Suspense>
  );
}
