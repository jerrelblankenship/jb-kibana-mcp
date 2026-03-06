/**
 * Kibana Authentication Helpers
 */

import { KibanaConfig } from './types.js';

export interface AuthHeaders {
  [key: string]: string | undefined;
  'kbn-xsrf': string;
  'Content-Type': string;
  Authorization?: string;
}

/**
 * Generate authentication headers for Kibana API requests
 */
export function getAuthHeaders(config: KibanaConfig): AuthHeaders {
  const headers: AuthHeaders = {
    'kbn-xsrf': 'true',
    'Content-Type': 'application/json',
  };

  if (config.apiKey) {
    headers.Authorization = `ApiKey ${config.apiKey}`;
  } else if (config.username && config.password) {
    const credentials = Buffer.from(
      `${config.username}:${config.password}`
    ).toString('base64');
    headers.Authorization = `Basic ${credentials}`;
  }

  return headers;
}

/**
 * Validate that authentication configuration is present
 */
export function validateAuthConfig(config: KibanaConfig): void {
  if (!config.url) {
    throw new Error('Kibana URL is required');
  }

  const hasApiKey = !!config.apiKey;
  const hasBasicAuth = !!(config.username && config.password);

  if (!hasApiKey && !hasBasicAuth) {
    throw new Error(
      'Authentication credentials required: either KIBANA_API_KEY or KIBANA_USERNAME/KIBANA_PASSWORD must be provided'
    );
  }
}
