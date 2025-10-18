import { describe, it, expect } from 'vitest';
import { CoreService, createCoreService, type CoreConfig } from '../src';

describe('CoreService', () => {
  const mockConfig: CoreConfig = {
    name: 'Test Service',
    version: '1.0.0',
  };

  it('should create a new CoreService instance', () => {
    const service = new CoreService(mockConfig);
    expect(service).toBeInstanceOf(CoreService);
  });

  it('should return the correct name', () => {
    const service = new CoreService(mockConfig);
    expect(service.getName()).toBe('Test Service');
  });

  it('should return the correct version', () => {
    const service = new CoreService(mockConfig);
    expect(service.getVersion()).toBe('1.0.0');
  });

  it('should return the correct info string', () => {
    const service = new CoreService(mockConfig);
    expect(service.getInfo()).toBe('Test Service v1.0.0');
  });

  it('should create service using factory function', () => {
    const service = createCoreService(mockConfig);
    expect(service).toBeInstanceOf(CoreService);
    expect(service.getName()).toBe('Test Service');
  });
});