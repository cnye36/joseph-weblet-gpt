# Settings Modal - Usage Examples

Complete examples showing how to use the Settings Modal and related features in your application.

## Table of Contents

1. [Basic Usage](#basic-usage)
2. [Custom Hooks](#custom-hooks)
3. [Premium Features](#premium-features)
4. [Profile Display](#profile-display)
5. [Advanced Examples](#advanced-examples)

## Basic Usage

### Open Settings Modal from Any Component

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import SettingsModal from "@/components/settings/SettingsModal";

export default function MyComponent() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div>
      <Button onClick={() => setSettingsOpen(true)}>
        Open Settings
      </Button>
      <SettingsModal 
        open={settingsOpen} 
        onOpenChange={setSettingsOpen} 
      />
    </div>
  );
}
```

### Add Settings Button to Any Page

```tsx
import SettingsButton from "@/components/settings/SettingsButton";

export default function DashboardPage() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1>Dashboard</h1>
        <SettingsButton />
      </div>
      {/* Your content */}
    </div>
  );
}
```

## Custom Hooks

### Check Subscription Status

```tsx
"use client";

import { useSubscription } from "@/hooks/useSubscription";
import PremiumBadge from "@/components/settings/PremiumBadge";

export default function UserProfile() {
  const { isPremium, subscription, loading } = useSubscription();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h2>My Profile</h2>
      {isPremium && <PremiumBadge />}
      
      {subscription && (
        <div>
          <p>Plan: {subscription.plan_name}</p>
          <p>Next billing: {new Date(subscription.next_billing_date).toLocaleDateString()}</p>
        </div>
      )}
    </div>
  );
}
```

### Load User Profile

```tsx
"use client";

import { useProfile } from "@/hooks/useProfile";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function ProfileDisplay() {
  const { profile, loading, error } = useProfile();

  if (loading) return <div>Loading profile...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!profile) return <div>No profile found</div>;

  return (
    <div className="flex items-center gap-3">
      <Avatar>
        <AvatarImage src={profile.avatar_url} />
        <AvatarFallback>
          {profile.full_name?.[0] || "?"}
        </AvatarFallback>
      </Avatar>
      <div>
        <p className="font-medium">{profile.full_name}</p>
        <p className="text-sm text-muted-foreground">
          Member since {new Date(profile.created_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
```

## Premium Features

### Guard Content with Premium Check

```tsx
"use client";

import PremiumGuard from "@/components/settings/PremiumGuard";

export default function AdvancedFeaturePage() {
  return (
    <PremiumGuard message="Advanced analytics are only available for premium members.">
      <div>
        <h2>Advanced Analytics</h2>
        {/* Premium content here */}
      </div>
    </PremiumGuard>
  );
}
```

### Show Different Content for Premium Users

```tsx
"use client";

import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";

export default function FeatureCard() {
  const { isPremium } = useSubscription();

  return (
    <div className="p-6 border rounded-lg">
      <h3>AI Chat</h3>
      <p>
        {isPremium 
          ? "Unlimited conversations available!"
          : "5 conversations per day"}
      </p>
      
      {isPremium ? (
        <Button>Start New Chat</Button>
      ) : (
        <Button variant="outline">Upgrade for Unlimited</Button>
      )}
    </div>
  );
}
```

### Custom Premium Badge

```tsx
import PremiumBadge from "@/components/settings/PremiumBadge";

export default function UserCard() {
  return (
    <div className="space-y-2">
      {/* Default badge */}
      <PremiumBadge />
      
      {/* Small subtle badge */}
      <PremiumBadge size="sm" variant="subtle" />
      
      {/* Large badge with custom styling */}
      <PremiumBadge 
        size="lg" 
        className="hover:scale-105 transition-transform" 
      />
    </div>
  );
}
```

## Profile Display

### User Header Component

```tsx
"use client";

import { useProfile } from "@/hooks/useProfile";
import { useSubscription } from "@/hooks/useSubscription";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import PremiumBadge from "@/components/settings/PremiumBadge";
import SettingsButton from "@/components/settings/SettingsButton";

export default function UserHeader() {
  const { profile, loading: profileLoading } = useProfile();
  const { isPremium } = useSubscription();

  if (profileLoading) {
    return <div>Loading...</div>;
  }

  const initials = profile?.full_name
    ?.split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase() || "?";

  return (
    <div className="flex items-center justify-between p-4 border-b">
      <div className="flex items-center gap-3">
        <Avatar className="w-12 h-12">
          <AvatarImage src={profile?.avatar_url} />
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{profile?.full_name || "User"}</h3>
            {isPremium && <PremiumBadge size="sm" variant="subtle" />}
          </div>
          <p className="text-sm text-muted-foreground">
            Welcome back!
          </p>
        </div>
      </div>
      <SettingsButton />
    </div>
  );
}
```

### Avatar with Upload Button

```tsx
"use client";

import { useState, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { Camera, Loader2 } from "lucide-react";

export default function EditableAvatar({ 
  avatarUrl, 
  userId,
  onUpdate 
}: { 
  avatarUrl: string;
  userId: string;
  onUpdate: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/${Math.random()}.${fileExt}`;

      const { error } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      onUpdate(data.publicUrl);
    } catch (error) {
      console.error("Error uploading:", error);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="relative group">
      <Avatar className="w-24 h-24">
        <AvatarImage src={avatarUrl} />
        <AvatarFallback>?</AvatarFallback>
      </Avatar>
      
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {uploading ? (
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : (
          <Camera className="w-6 h-6 text-white" />
        )}
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
}
```

## Advanced Examples

### Access Profile from Server Component

```tsx
import { createClient } from "@/lib/supabase/server";

export default async function ServerProfile() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return null;
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div>
      <h1>Welcome, {profile?.full_name}!</h1>
    </div>
  );
}
```

### Check Premium Status Server-Side

```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function PremiumPage() {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/login");
  }
  
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();
  
  if (!subscription) {
    redirect("/upgrade");
  }

  return (
    <div>
      <h1>Premium Content</h1>
      {/* Premium-only content */}
    </div>
  );
}
```

### API Route with Subscription Check

```tsx
// app/api/premium-feature/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  // Check subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();
  
  if (!subscription) {
    return NextResponse.json(
      { error: "Premium subscription required" },
      { status: 403 }
    );
  }
  
  // Process premium feature
  return NextResponse.json({ success: true });
}
```

### Real-time Subscription Updates

```tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function RealtimeSubscription() {
  const [subscription, setSubscription] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    // Load initial data
    loadSubscription();

    // Subscribe to changes
    const channel = supabase
      .channel("subscriptions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
        },
        (payload) => {
          console.log("Subscription changed:", payload);
          loadSubscription();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadSubscription() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    setSubscription(data);
  }

  return (
    <div>
      {subscription ? (
        <p>Active subscription: {subscription.plan_name}</p>
      ) : (
        <p>No active subscription</p>
      )}
    </div>
  );
}
```

### Form with Profile Pre-fill

```tsx
"use client";

import { useEffect, useState } from "react";
import { useProfile } from "@/hooks/useProfile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ContactForm() {
  const { profile } = useProfile();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  // Pre-fill with profile data
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        name: profile.full_name,
      }));
    }
  }, [profile]);

  return (
    <form className="space-y-4">
      <Input
        value={formData.name}
        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
        placeholder="Your name"
      />
      <Input
        value={formData.email}
        onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
        placeholder="Your email"
      />
      <textarea
        value={formData.message}
        onChange={e => setFormData(prev => ({ ...prev, message: e.target.value }))}
        placeholder="Your message"
        className="w-full p-2 border rounded"
      />
      <Button type="submit">Send Message</Button>
    </form>
  );
}
```

## Best Practices

1. **Always Check Loading States**
   ```tsx
   const { profile, loading } = useProfile();
   if (loading) return <Skeleton />;
   ```

2. **Handle Errors Gracefully**
   ```tsx
   const { error } = useProfile();
   if (error) return <ErrorMessage message={error} />;
   ```

3. **Use Server Components When Possible**
   - Faster initial load
   - Better SEO
   - Reduced client bundle

4. **Cache Profile Data**
   - Use React Query or SWR for better caching
   - Refresh only when needed

5. **Secure Premium Features**
   - Always verify on server-side
   - Don't trust client-side checks alone

## Common Patterns

### Dashboard with Premium Features

```tsx
import { useSubscription } from "@/hooks/useSubscription";
import PremiumGuard from "@/components/settings/PremiumGuard";

export default function Dashboard() {
  const { isPremium } = useSubscription();

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Always available */}
      <BasicFeatureCard />
      
      {/* Premium only */}
      <PremiumGuard>
        <AdvancedFeatureCard />
      </PremiumGuard>
      
      {/* Conditional rendering */}
      {isPremium ? (
        <PremiumChart />
      ) : (
        <UpgradePrompt />
      )}
    </div>
  );
}
```

### Settings Access from Header

```tsx
import SettingsButton from "@/components/settings/SettingsButton";

export default function Header() {
  return (
    <header className="flex justify-between p-4">
      <Logo />
      <nav className="flex items-center gap-4">
        <NavLinks />
        <SettingsButton />
      </nav>
    </header>
  );
}
```

That's it! You now have everything you need to integrate the Settings Modal throughout your application. 🎉

