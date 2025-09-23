"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { bots } from "@/lib/bots";

export default function AppDashboard() {
  return (
    <div className="p-6">
      <header className="max-w-5xl mx-auto mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded bg-primary/15 flex items-center justify-center">
            <span className="font-bold text-primary">W</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Weblet GPT</h1>
        </div>
        <span className="text-sm text-muted-foreground">Choose an assistant to get started</span>
      </header>
      <div className="max-w-5xl mx-auto grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Object.values(bots).map((b) => (
          <Link key={b.id} href={`/app/chat/${b.id}`} className="block">
            <Card className="hover:shadow-md transition-shadow h-full">
              <CardContent className="p-5 space-y-2">
                <div className="font-medium">{b.name}</div>
                <div className="text-sm text-muted-foreground line-clamp-2">{b.system}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}


