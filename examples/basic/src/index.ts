#!/usr/bin/env node

import { createClient } from '@myorg/client';
import { capitalize } from '@myorg/utils';

async function main() {
  console.log('🚀 Basic Example - TypeScript Monorepo Template');
  console.log('================================================\n');

  // Create a client instance
  const client = createClient({
    name: 'Basic Example Client',
    version: '1.0.0',
    timeout: 3000,
    retries: 2,
  });

  try {
    // Connect to the service
    console.log('📡 Connecting to service...');
    const connectionResult = await client.connect();
    console.log(`✅ ${connectionResult}\n`);

    // Get status
    console.log('📊 Service Status:');
    const status = client.getStatus();
    Object.entries(status).forEach(([key, value]) => {
      console.log(`   ${capitalize(key)}: ${value}`);
    });
    console.log();

    // Make a request
    console.log('📤 Making a request...');
    const response = await client.request('Hello from basic example!');
    console.log(`✅ ${response}\n`);

    console.log('🎉 Example completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(console.error);