#!/usr/bin/env node

import { client } from './client.js';

async function main() {
  console.log('🚀 Knowledgebase Example');
  console.log('================================================\n');
  
  try {
    // Connect to the service
    console.log('📡 Create a new knowledgebase...');
    const createdKnowledgebase = await client.knowledges.create({
      workspaceId: process.env.WORKSPACE_ID,
      name: 'My Knowledgebase',
      description: 'A knowledgebase created via the Xpert SDK'
    })

    console.log('✅ Knowledgebase created:', createdKnowledgebase);

    // Upload knowledge files and run a thread
    // const fileBuffer = await fs.promises.readFile('./files/knowledge-file.md');
    // const blob = new Blob([fileBuffer as any]);
    // const file = await client.contexts.uploadFile(blob, { filename: 'knowledge-file.md' });

    // console.log(file)

    // const thread = await client.threads.create();
    // const result = await client.runs.wait(thread.thread_id, pipelineId, {
    //   input: { 
    //     input: 'What is Xpert SDK?', // more parameters
    //     files: [file]
    //   },
    //   context: {}
    // });
    
    // console.log('🧵 Knowledge thread result:', result);

    console.log('🎉 Example completed successfully!');
  } catch (error) {
    console.error('❌ Example failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(console.error);