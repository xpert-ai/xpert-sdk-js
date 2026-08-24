import { McpAppsClient } from './apps.js';
import { McpPublicationsClient } from './publications.js';
import type { McpTransport } from './transport.js';

export class McpClient {
  public publications: McpPublicationsClient;
  public apps: McpAppsClient;

  constructor(transport: McpTransport) {
    this.publications = new McpPublicationsClient(transport);
    this.apps = new McpAppsClient(transport);
  }
}

export * from './apps.js';
export * from './publications.js';
export type * from './types.js';
