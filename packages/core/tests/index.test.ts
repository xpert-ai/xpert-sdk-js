import { describe, it, expect } from 'vitest';
import { Client, ClientConfig } from '../src/index.js';

describe('CoreService', () => {
  const mockConfig: ClientConfig = {}

  it('should create a new CoreService instance', () => {
    const service = new Client(mockConfig);
    expect(service).toBeInstanceOf(Client);
  });

});