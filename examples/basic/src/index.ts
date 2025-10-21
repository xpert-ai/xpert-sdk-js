#!/usr/bin/env node

import { Client } from '@xpert-ai/xpert-sdk';
import { capitalize } from '@xpert-ai/utils';

async function main() {
  console.log('🚀 Basic Example - TypeScript Monorepo Template');
  console.log('================================================\n');

  // Create a client instance
  const client = new Client({
    apiUrl: 'http://localhost:3000/api/ai',
    apiKey: 'sk-x-Qn'
  });

  try {
    // Connect to the service
    console.log('📡 Connecting to service...');
    const connectionResult = await client.assistants.count()
    console.log(`✅ ${connectionResult}\n`);
    console.log(capitalize('connection successful!'));

    console.log('🎉 Example completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(console.error);