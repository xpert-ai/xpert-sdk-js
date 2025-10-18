/**
 * @myorg/core - Core functionality package
 */

export interface CoreConfig {
  name: string;
  version: string;
}

export class CoreService {
  private config: CoreConfig;

  constructor(config: CoreConfig) {
    this.config = config;
  }

  getName(): string {
    return this.config.name;
  }

  getVersion(): string {
    return this.config.version;
  }

  getInfo(): string {
    return `${this.getName()} v${this.getVersion()}`;
  }
}

export const createCoreService = (config: CoreConfig): CoreService => {
  return new CoreService(config);
};

export default {
  CoreService,
  createCoreService,
};