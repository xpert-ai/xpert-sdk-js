#!/usr/bin/env node

import { client } from './client.js';

async function main() {
  console.log('🚀 Basic Example - TypeScript Monorepo Template');
  console.log('================================================\n');
  
  try {
    // Connect to the service
    console.log('📡 Connecting to service...');
    const connectionResult = await client.assistants.count({metadata: {type: 'knowledge'}});
    console.log(`✅ ${connectionResult}\n`);

    // List pipelines
    console.log('📋 Listing pipelines...');
    const pipelines = await client.assistants.search({metadata: {type: 'knowledge'}, limit: 5});
    console.log(pipelines)
    console.log(`✅ Found ${pipelines.length} pipelines.\n`);

    // Run pipeline
    const pipelineId = pipelines[0]?.assistant_id;
    if (!pipelineId) {
      throw new Error('No pipelines found to run.');
    }

    const thread = await client.threads.create();
    const stream = client.runs.stream(thread.thread_id, pipelineId, {
      input: { 
        input: 'What is Xpert SDK?', // more parameters 
      },
      context: {
        files: [
          {

          }
        ]
      }
    });
    for await (const chunk of stream) {
      const data = (<{ type: 'message', data: string | {type: 'text' | string; text?: string; data?: unknown} }>chunk.data)
      // Output text messages only
      if (data.type === 'message') {
        if (typeof data.data === 'string') {
          process.stdout.write(data.data)
        } else if (data.data.type === 'text') {
          process.stdout.write(data.data.text ?? '')
        } else {
          console.log(`Component:`, data.data);
        }
      } else {
        console.log(`Non-message chunk:`, chunk.data);
      }
    }

    console.log('🎉 Example completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(console.error);