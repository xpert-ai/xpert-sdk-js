import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {config} from 'dotenv'
import { Client, ClientConfig } from '../src/index.js';

type EnvConfig = {
  XPERT_API_URL?: string;
  XPERT_API_KEY?: string;
  XPERT_ID?: string;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..', '..');
config({
  path: path.resolve(rootDir, '.env')
})

describe('Conversations Client', () => {
  const mockConfig: ClientConfig = {}

  it('should create a new Conversations client instance', () => {
    const service = new Client(mockConfig);
    expect(service).toBeInstanceOf(Client);
  });

  it('should manage conversations, messages, and feedbacks via ConversationsClient', async () => {
    // const env = loadEnvConfig();
    const env = process.env as EnvConfig;
    const apiUrl = process.env.XPERT_API_URL || env.XPERT_API_URL;
    const apiKey = process.env.XPERT_API_KEY || env.XPERT_API_KEY;
    const xpertId = process.env.XPERT_ID || env.XPERT_ID;

    if (!apiUrl || !apiKey || !xpertId) {
      throw new Error(
        'Missing XPERT_API_URL, XPERT_API_KEY, or XPERT_ID; set them in the root .env file.'
      );
    }

    const client = new Client({ apiUrl, apiKey });
    const marker = `codex-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    let conversationId = '';
    let messageId = '';
    let feedbackId = '';

    try {
      const created = await client.conversations.create({
        title: `Test ${marker}`,
        xpertId,
      });
      conversationId = created.id;
      expect(created.id).toBeTruthy();
      expect(created.threadId).toBeTruthy();
      console.log(`Created conversation with ID: ${conversationId}`, created);

      const fetched = await client.conversations.get(conversationId);
      console.log(`Fetched conversation with ID: ${conversationId}`, fetched);
      expect(fetched.id).toBe(conversationId);

      const searched = await client.conversations.search({
        search: marker,
        limit: 10,
        offset: 0,
        order: { createdAt: 'DESC' },
      });
      expect(searched.items.some((item) => item.id === conversationId)).toBe(
        true
      );

      const xpertSearch = await client.conversations.search({
        where: { xpertId },
        limit: 10,
        offset: 0,
        order: { createdAt: 'DESC' },
      });
      console.log('Xpert Search Results:', xpertSearch);
      expect(xpertSearch.items.some((item) => item.id === conversationId)).toBe(
        true
      );

      const updated = await client.conversations.update(conversationId, {
        title: `Updated ${marker}`,
      });
      expect(updated.title).toContain('Updated');

      const message = await client.conversations.createMessage(conversationId, {
        role: 'user',
        content: `hello ${marker}`,
      });
      messageId = message.id;
      expect(message.conversationId).toBe(conversationId);

      const messagesList = await client.conversations.listMessages(
        conversationId,
        { limit: 20, offset: 0 }
      );
      console.log('Messages List:', messagesList);
      expect(messagesList.items.some((item) => item.id === messageId)).toBe(
        true
      );

      const messagesSearch = await client.conversations.searchMessages(
        conversationId,
        {
          where: { id: messageId },
          limit: 10,
          offset: 0,
        }
      );
      expect(messagesSearch.items.length).toBeGreaterThanOrEqual(1);

      const feedback = await client.conversations.createFeedback(
        conversationId,
        messageId,
        {
          rating: 'like',
          content: `feedback ${marker}`,
        }
      );
      feedbackId = feedback.id;
      expect(feedback.messageId).toBe(messageId);

      const feedbackList = await client.conversations.listFeedbacks(
        conversationId,
        messageId,
        { limit: 20, offset: 0 }
      );
      expect(feedbackList.items.some((item) => item.id === feedbackId)).toBe(
        true
      );

      const feedbackUpdated = await client.conversations.updateFeedback(
        conversationId,
        messageId,
        feedbackId,
        { content: `feedback updated ${marker}` }
      );
      expect(feedbackUpdated.content).toContain('updated');

      const feedbackSearch = await client.conversations.searchFeedbacks(
        conversationId,
        messageId,
        {
          where: { id: feedbackId },
          limit: 10,
          offset: 0,
        }
      );
      expect(feedbackSearch.items.length).toBeGreaterThanOrEqual(1);

      await client.conversations.deleteFeedback(
        conversationId,
        messageId,
        feedbackId
      );
      await client.conversations.deleteMessage(conversationId, messageId);
    } finally {
      if (conversationId) {
        await client.conversations.delete(conversationId);
      }
    }
  });

});
