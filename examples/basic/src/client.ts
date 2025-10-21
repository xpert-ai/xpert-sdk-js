import * as dotenv from 'dotenv';
import { Client } from '@xpert-ai/xpert-sdk';

dotenv.config();

const apiUrl = process.env.API_URL || 'http://localhost:3000/api/ai';
const apiKey = process.env.API_KEY || '';

// Create a client instance
export const client = new Client({
    apiUrl,
    apiKey
});