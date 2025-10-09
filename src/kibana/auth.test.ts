/**
 * Unit tests for authentication helpers
 */

import { describe, it, expect } from 'vitest';
import { getAuthHeaders, validateAuthConfig } from './auth.js';
import { KibanaConfig } from './types.js';

describe('getAuthHeaders', () => {
  it('should generate API key authorization header', () => {
    const config: KibanaConfig = {
      url: 'https://kibana.example.com',
      apiKey: 'test-api-key',
    };

    const headers = getAuthHeaders(config);

    expect(headers).toEqual({
      'kbn-xsrf': 'true',
      'Content-Type': 'application/json',
      Authorization: 'ApiKey test-api-key',
    });
  });

  it('should generate Basic auth authorization header', () => {
    const config: KibanaConfig = {
      url: 'https://kibana.example.com',
      username: 'admin',
      password: 'password123',
    };

    const headers = getAuthHeaders(config);

    expect(headers['kbn-xsrf']).toBe('true');
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers.Authorization).toMatch(/^Basic /);

    // Verify base64 encoding
    const base64Creds = headers.Authorization?.split(' ')[1];
    const decoded = Buffer.from(base64Creds!, 'base64').toString('utf-8');
    expect(decoded).toBe('admin:password123');
  });

  it('should prefer API key over username/password', () => {
    const config: KibanaConfig = {
      url: 'https://kibana.example.com',
      apiKey: 'test-api-key',
      username: 'admin',
      password: 'password123',
    };

    const headers = getAuthHeaders(config);

    expect(headers.Authorization).toBe('ApiKey test-api-key');
  });

  it('should not include Authorization header if no credentials', () => {
    const config: KibanaConfig = {
      url: 'https://kibana.example.com',
    };

    const headers = getAuthHeaders(config);

    expect(headers.Authorization).toBeUndefined();
    expect(headers['kbn-xsrf']).toBe('true');
  });
});

describe('validateAuthConfig', () => {
  it('should pass with valid API key', () => {
    const config: KibanaConfig = {
      url: 'https://kibana.example.com',
      apiKey: 'test-api-key',
    };

    expect(() => validateAuthConfig(config)).not.toThrow();
  });

  it('should pass with valid username/password', () => {
    const config: KibanaConfig = {
      url: 'https://kibana.example.com',
      username: 'admin',
      password: 'password123',
    };

    expect(() => validateAuthConfig(config)).not.toThrow();
  });

  it('should throw if URL is missing', () => {
    const config: KibanaConfig = {
      url: '',
      apiKey: 'test-api-key',
    };

    expect(() => validateAuthConfig(config)).toThrow('Kibana URL is required');
  });

  it('should throw if no credentials provided', () => {
    const config: KibanaConfig = {
      url: 'https://kibana.example.com',
    };

    expect(() => validateAuthConfig(config)).toThrow(
      'Authentication credentials required'
    );
  });

  it('should throw if only username provided', () => {
    const config: KibanaConfig = {
      url: 'https://kibana.example.com',
      username: 'admin',
    };

    expect(() => validateAuthConfig(config)).toThrow(
      'Authentication credentials required'
    );
  });

  it('should throw if only password provided', () => {
    const config: KibanaConfig = {
      url: 'https://kibana.example.com',
      password: 'password123',
    };

    expect(() => validateAuthConfig(config)).toThrow(
      'Authentication credentials required'
    );
  });
});
