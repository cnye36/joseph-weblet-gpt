# Avatar System for Weblet GPT

This document describes the AI avatar generation system implemented for the Weblet GPT application.

## Overview

The avatar system automatically generates unique, AI-created avatars for each GPT bot in the application. It uses DALL-E 3 via OpenRouter to create professional, contextually relevant avatars based on the bot's name, description, and system prompt.

## Features

- **Automatic Generation**: New GPTs created in the admin panel automatically get AI-generated avatars
- **Contextual Design**: Avatars are generated based on the bot's purpose and characteristics
- **Fallback System**: If avatar generation fails, a fallback initial-based avatar is displayed
- **Supabase Storage**: All avatars are stored in Supabase storage with proper RLS policies
- **Multiple Styles**: Support for professional, friendly, scientific, and creative avatar styles

## Architecture

### Database Changes

- Added `avatar_url` column to the `bots` table
- Created `bot-avatars` storage bucket in Supabase
- Set up RLS policies for public read access and admin write access

### Core Components

1. **`lib/avatar-generation.ts`**: Core avatar generation logic
2. **`app/api/admin/generate-avatars/route.ts`**: API endpoint for generating avatars
3. **`app/app/admin/GenerateAvatarsButton.tsx`**: Admin UI component
4. **Database migration**: `supabase/migrations/0003_avatar_support.sql`

### Avatar Generation Process

1. **Prompt Creation**: The system analyzes the bot's name, description, and system prompt to create a detailed DALL-E prompt
2. **Image Generation**: Uses DALL-E 3 via OpenRouter to generate a 1024x1024 avatar image
3. **Upload**: Downloads the generated image and uploads it to Supabase storage
4. **Database Update**: Updates the bot record with the avatar URL

## Usage

### For Existing Bots

1. Go to the admin panel (`/app/admin`)
2. Click "Generate Avatars" button
3. The system will generate avatars for all bots without existing avatars

### For New Bots

Avatars are automatically generated when creating new GPTs through the admin interface.

### Manual Generation

You can also generate avatars programmatically:

```typescript
import { generateBotAvatar } from '@/lib/avatar-generation';

const avatarUrl = await generateBotAvatar({
  botName: 'My GPT',
  botDescription: 'A helpful assistant',
  botSystem: 'You are a helpful assistant...',
  style: 'professional'
});
```

## Configuration

### Environment Variables

- `OPENROUTER_API_KEY`: Required for DALL-E image generation
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key

### Avatar Styles

- `professional`: Clean, modern, corporate style
- `friendly`: Warm, approachable design
- `scientific`: Technical, precise design with scientific symbols
- `creative`: Artistic, innovative design with vibrant colors

## File Structure

```
lib/
├── avatar-generation.ts          # Core avatar generation logic
app/
├── api/admin/generate-avatars/
│   └── route.ts                   # API endpoint for avatar generation
├── app/admin/
│   ├── GenerateAvatarsButton.tsx  # Admin UI component
│   └── bots/new/create/route.ts   # Updated bot creation with avatar generation
supabase/migrations/
└── 0003_avatar_support.sql        # Database migration for avatar support
```

## Error Handling

- If DALL-E generation fails, the system continues without an avatar
- Fallback avatars use the first letter of the bot name
- All errors are logged for debugging
- Rate limiting is implemented to avoid API limits

## Security

- RLS policies ensure only admins can upload/update/delete avatars
- Public read access for avatar display
- Service role authentication for storage operations

## Performance Considerations

- 2-second delay between avatar generations to avoid rate limiting
- Images are stored in Supabase storage for fast access
- Fallback avatars are generated client-side for immediate display

## Future Enhancements

- Custom avatar styles per bot category
- Avatar regeneration functionality
- Batch avatar processing
- Avatar optimization and compression
- Custom avatar upload option for admins
