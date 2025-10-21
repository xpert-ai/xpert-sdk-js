#!/usr/bin/env node

import * as dotenv from 'dotenv';
import { Client } from '@xpert-ai/xpert-sdk';
import { capitalize } from '@xpert-ai/utils';

dotenv.config();

const apiUrl = process.env.API_URL || 'http://localhost:3000/api/ai';
const apiKey = process.env.API_KEY || '';

async function main() {
  console.log('🚀 Basic Example - TypeScript Monorepo Template');
  console.log('================================================\n');

  // Create a client instance
  const client = new Client({
    apiUrl,
    apiKey
  });

  try {
    // Connect to the service
    console.log('📡 Connecting to service...');
    const connectionResult = await client.assistants.count({metadata: {name: 'Test Graph'}});
    console.log(`✅ ${connectionResult}\n`);

    // List assistants
    console.log('📋 Listing assistants...');
    const assistants = await client.assistants.search({limit: 5});
    console.log(assistants)
    console.log(`✅ Found ${assistants.length} assistants.\n`);

    console.log(capitalize('connection successful!'));

    console.log('🎉 Example completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(console.error);