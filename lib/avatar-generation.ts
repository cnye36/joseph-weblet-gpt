import { createClient } from '@/lib/supabase/server';

export interface AvatarGenerationOptions {
  botName: string;
  botDescription: string;
  botSystem: string;
  style?: 'professional' | 'friendly' | 'scientific' | 'creative';
}

/**
 * Generate an AI avatar for a GPT bot using DALL-E
 */
export async function generateBotAvatar(
  options: AvatarGenerationOptions
): Promise<string | null> {
  const {
    botName,
    botDescription,
    botSystem,
    style = "professional",
  } = options;

  // Check if OpenAI API key is available
  if (!process.env.OPENAI_API_KEY) {
    console.log("No OpenAI API key found, generating fallback avatar");
    return await generateFallbackAvatar(options);
  }

  // Create a detailed prompt for avatar generation
  const avatarPrompt = createAvatarPrompt(
    botName,
    botDescription,
    botSystem,
    style
  );

  try {
    // Generate image using OpenAI DALL-E directly
    const response = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-image-1-mini",
          prompt: avatarPrompt,
          n: 1,
          size: "1024x1024",
          quality: "low",
        }),
      }
    );

    if (!response.ok) {
      console.error("DALL-E API error:", await response.text());
      return await generateFallbackAvatar(options);
    }

    const data = await response.json();
    const imageData = data.data?.[0];

    // Handle different response formats:
    // - DALL-E 2/3 returns URLs
    // - gpt-image-1 returns base64-encoded images
    let imageBuffer: ArrayBuffer;

    if (imageData?.url) {
      // Download the image from URL (DALL-E 2/3)
      const imageResponse = await fetch(imageData.url);
      if (!imageResponse.ok) {
        throw new Error("Failed to download image");
      }
      imageBuffer = await imageResponse.arrayBuffer();
    } else if (imageData?.b64_json) {
      // Decode base64 image (gpt-image-1)
      const base64Data = imageData.b64_json;
      imageBuffer = Buffer.from(base64Data, "base64").buffer;
    } else {
      console.error("No image URL or base64 data returned from DALL-E");
      return await generateFallbackAvatar(options);
    }

    // Upload image buffer to Supabase storage
    const avatarUrl = await uploadAvatarToSupabaseFromBuffer(
      imageBuffer,
      options.botName
    );
    return avatarUrl;
  } catch (error) {
    console.error("Error generating avatar:", error);
    return await generateFallbackAvatar(options);
  }
}

/**
 * Create a detailed prompt for avatar generation based on bot characteristics
 */
function createAvatarPrompt(
  botName: string,
  botDescription: string,
  botSystem: string,
  style: string
): string {
  // Extract key themes from the bot's purpose
  const themes = extractThemes(botName, botDescription, botSystem);

  const basePrompt = `Create a professional AI assistant avatar for "${botName}". `;

  const styleDescriptions = {
    professional: "Clean, modern, corporate style with subtle tech elements",
    friendly: "Warm, approachable design with friendly colors and soft shapes",
    scientific:
      "Technical, precise design with scientific symbols and clean lines",
    creative:
      "Artistic, innovative design with creative elements and vibrant colors",
  };

  const themeContext =
    themes.length > 0
      ? `The avatar should reflect these themes: ${themes.join(", ")}. `
      : "";

  const styleContext =
    styleDescriptions[style as keyof typeof styleDescriptions] ||
    styleDescriptions.professional;

  return `${basePrompt}${themeContext}Style: ${styleContext}. The avatar should be a circular, minimalist design suitable for a chat interface. Avoid text or words in the image. Use a clean background. The design should be distinctive and memorable while remaining professional.`;
}

/**
 * Extract key themes from bot information
 */
function extractThemes(
  botName: string,
  botDescription: string,
  botSystem: string
): string[] {
  const text = `${botName} ${botDescription} ${botSystem}`.toLowerCase();
  const themes: string[] = [];

  // Research/Academic themes
  if (
    text.includes("research") ||
    text.includes("academic") ||
    text.includes("poster") ||
    text.includes("conference")
  ) {
    themes.push("research", "academic");
  }

  // Project management themes
  if (
    text.includes("gantt") ||
    text.includes("project") ||
    text.includes("timeline") ||
    text.includes("chart")
  ) {
    themes.push("project management", "planning");
  }

  // Scientific themes
  if (
    text.includes("microbial") ||
    text.includes("biochemistry") ||
    text.includes("microorganism") ||
    text.includes("laboratory")
  ) {
    themes.push("microbiology", "laboratory");
  }

  // Technical themes
  if (
    text.includes("data") ||
    text.includes("analysis") ||
    text.includes("technical") ||
    text.includes("system")
  ) {
    themes.push("technical", "data analysis");
  }

  return themes;
}

/**
 * Upload avatar image to Supabase storage from a URL
 * @deprecated Use uploadAvatarToSupabaseFromBuffer instead
 */
async function uploadAvatarToSupabase(
  imageUrl: string,
  botName: string
): Promise<string | null> {
  try {
    // Download the image
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error("Failed to download image");
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    return await uploadAvatarToSupabaseFromBuffer(imageBuffer, botName);
  } catch (error) {
    console.error("Error uploading avatar to Supabase:", error);
    return null;
  }
}

/**
 * Upload avatar image to Supabase storage from a buffer
 */
async function uploadAvatarToSupabaseFromBuffer(
  imageBuffer: ArrayBuffer,
  botName: string
): Promise<string | null> {
  try {
    const imageData = new Uint8Array(imageBuffer);

    // Create filename
    const timestamp = Date.now();
    const filename = `avatar-${botName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")}-${timestamp}.png`;

    // Upload to Supabase storage
    const supabase = await createClient();
    const { error } = await supabase.storage
      .from("bot-avatars")
      .upload(filename, imageData, {
        contentType: "image/png",
        upsert: false,
      });

    if (error) {
      console.error("Supabase upload error:", error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("bot-avatars")
      .getPublicUrl(filename);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Error uploading avatar to Supabase:", error);
    return null;
  }
}

/**
 * Generate a fallback avatar using a simple SVG
 */
async function generateFallbackAvatar(options: AvatarGenerationOptions): Promise<string | null> {
  const { botName } = options;
  
  // Create a simple SVG avatar with dark colors for white backgrounds
  const svg = `
    <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1E293B;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#334155;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0F172A;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="512" cy="512" r="512" fill="url(#grad)"/>
      <text x="512" y="580" font-family="Arial, sans-serif" font-size="400" font-weight="bold" text-anchor="middle" fill="white">
        ${botName.charAt(0).toUpperCase()}
      </text>
    </svg>
  `;
  
  try {
    // Convert SVG to PNG and upload to Supabase
    const svgBuffer = Buffer.from(svg);
    const timestamp = Date.now();
    const filename = `avatar-${botName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}.svg`;
    
    const supabase = await createClient();
    const { error } = await supabase.storage
      .from("bot-avatars")
      .upload(filename, svgBuffer, {
        contentType: "image/svg+xml",
        upsert: false,
      });
    
    if (error) {
      console.error('Supabase upload error:', error);
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('bot-avatars')
      .getPublicUrl(filename);
    
    return urlData.publicUrl;
    
  } catch (error) {
    console.error('Error creating fallback avatar:', error);
    return null;
  }
}

/**
 * Generate avatar for a specific bot
 */
export async function generateAvatarForBot(botId: string): Promise<string | null> {
  const supabase = await createClient();
  
  const { data: bot, error } = await supabase
    .from('bots')
    .select('id, name, description, system')
    .eq('id', botId)
    .single();
  
  if (error || !bot) {
    console.error('Error fetching bot:', error);
    return null;
  }
  
  console.log(`Generating avatar for: ${bot.name}`);
  
  const avatarUrl = await generateBotAvatar({
    botName: bot.name,
    botDescription: bot.description || '',
    botSystem: bot.system,
    style: 'professional'
  });
  
  if (avatarUrl) {
    // Update bot with avatar URL
    const { error: updateError } = await supabase
      .from('bots')
      .update({ avatar_url: avatarUrl })
      .eq('id', botId);
    
    if (updateError) {
      console.error(`Error updating bot ${botId}:`, updateError);
      return null;
    } else {
      console.log(`✅ Avatar generated for ${bot.name}: ${avatarUrl}`);
      return avatarUrl;
    }
  } else {
    console.error(`❌ Failed to generate avatar for ${bot.name}`);
    return null;
  }
}

/**
 * Generate avatars for existing bots
 */
export async function generateAvatarsForExistingBots(): Promise<void> {
  const supabase = await createClient();
  
  // Get all bots (including those with existing avatars for regeneration)
  const { data: bots, error } = await supabase
    .from('bots')
    .select('id, name, description, system, avatar_url');
  
  if (error) {
    console.error('Error fetching bots:', error);
    return;
  }
  
  if (!bots || bots.length === 0) {
    console.log('No bots found without avatars');
    return;
  }
  
  console.log(`Generating avatars for ${bots.length} bots...`);
  
  for (const bot of bots) {
    console.log(`Generating avatar for: ${bot.name}`);
    
    const avatarUrl = await generateBotAvatar({
      botName: bot.name,
      botDescription: bot.description || '',
      botSystem: bot.system,
      style: 'professional'
    });
    
    if (avatarUrl) {
      // Update bot with avatar URL
      const { error: updateError } = await supabase
        .from('bots')
        .update({ avatar_url: avatarUrl })
        .eq('id', bot.id);
      
      if (updateError) {
        console.error(`Error updating bot ${bot.id}:`, updateError);
      } else {
        console.log(`✅ Avatar generated for ${bot.name}: ${avatarUrl}`);
      }
    } else {
      console.error(`❌ Failed to generate avatar for ${bot.name}`);
    }
    
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}
