#!/usr/bin/env node

import { generateAvatarsForExistingBots } from '../lib/avatar-generation.js';

console.log('🎨 Generating avatars for existing bots...\n');

try {
  await generateAvatarsForExistingBots();
  console.log('\n✅ Avatar generation completed!');
} catch (error) {
  console.error('\n❌ Error generating avatars:', error.message);
  process.exit(1);
}
