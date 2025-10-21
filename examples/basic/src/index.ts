#!/usr/bin/env node

import { client } from "./client.js";


async function main() {
  console.log('🚀 Basic Example - TypeScript Monorepo Template');
  console.log('================================================\n');

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

    console.log('🎉 Example completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(console.error);