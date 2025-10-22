#!/usr/bin/env node

import fs from "fs";
import { client } from './client.js';

async function main() {
  console.log('🚀 Knowledgebase Pipeline Example');
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

    // Upload knowledge files and run a thread
    const fileBuffer = await fs.promises.readFile('./files/knowledge-file.md');
    const blob = new Blob([fileBuffer as any]);
    const file = await client.contexts.uploadFile(blob, { filename: 'knowledge-file.md' });

    console.log(file)

    const thread = await client.threads.create();
    const result = await client.runs.wait(thread.thread_id, pipelineId, {
      input: { 
        input: 'What is Xpert SDK?', // more parameters
        files: [file]
      },
      context: {}
    });
    
    console.log('🧵 Knowledge thread result:', result);

    console.log('🎉 Example completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(console.error);