/**
 * @myorg/client - Client package that uses core and utils
 */

import { createCoreService, type CoreConfig } from '@myorg/core';
import { capitalize, formatDate, isString, sleep } from '@myorg/utils';

export interface ClientConfig extends CoreConfig {
  timeout?: number;
  retries?: number;
}

export class Client {
  private coreService: ReturnType<typeof createCoreService>;
  private timeout: number;
  private retries: number;

  constructor(config: ClientConfig) {
    this.coreService = createCoreService({
      name: config.name,
      version: config.version,
    });
    this.timeout = config.timeout || 5000;
    this.retries = config.retries || 3;
  }

  async connect(): Promise<string> {
    let attempts = 0;
    
    while (attempts < this.retries) {
      try {
        await sleep(100); // Simulate connection delay
        return `Connected to ${this.coreService.getInfo()}`;
      } catch (error) {
        attempts++;
        if (attempts >= this.retries) {
          throw new Error(`Failed to connect after ${this.retries} attempts`);
        }
        await sleep(1000); // Wait before retry
      }
    }
    
    throw new Error('Connection failed');
  }

  getStatus(): { 
    service: string; 
    timeout: number; 
    retries: number; 
    timestamp: string 
  } {
    return {
      service: capitalize(this.coreService.getName()),
      timeout: this.timeout,
      retries: this.retries,
      timestamp: formatDate(new Date()),
    };
  }

  async request(data: unknown): Promise<string> {
    if (!isString(data)) {
      throw new Error('Data must be a string');
    }

    await sleep(this.timeout / 10); // Simulate request processing
    return `Processed: ${data} by ${this.coreService.getInfo()}`;
  }
}

export const createClient = (config: ClientConfig): Client => {
  return new Client(config);
};