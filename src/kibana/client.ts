/**
 * Kibana API Client
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  KibanaConfig,
  KibanaDashboard,
  KibanaVisualization,
  KibanaDataView,
  KibanaSavedSearch,
  SavedObjectsResponse,
  ElasticsearchSearchParams,
  ElasticsearchSearchResponse,
  ExportDashboardParams,
} from './types.js';
import { getAuthHeaders, validateAuthConfig } from './auth.js';

export class KibanaClient {
  private axiosInstance: AxiosInstance;
  private config: KibanaConfig;

  constructor(config: KibanaConfig) {
    validateAuthConfig(config);
    this.config = config;

    const headers = getAuthHeaders(config);

    this.axiosInstance = axios.create({
      baseURL: config.url,
      headers,
      timeout: 30000,
    });

    // Add response interceptor for better error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const status = error.response.status;
          const message = (error.response.data as any)?.message || error.message;

          if (status === 401) {
            throw new Error(`Authentication failed: ${message}`);
          } else if (status === 403) {
            throw new Error(`Permission denied: ${message}`);
          } else if (status === 404) {
            throw new Error(`Resource not found: ${message}`);
          } else {
            throw new Error(`Kibana API error (${status}): ${message}`);
          }
        } else if (error.request) {
          throw new Error(`Failed to connect to Kibana at ${this.config.url}`);
        } else {
          throw new Error(`Request setup error: ${error.message}`);
        }
      }
    );
  }

  /**
   * List all dashboards
   */
  async listDashboards(
    search?: string,
    page = 1,
    perPage = 20
  ): Promise<SavedObjectsResponse<KibanaDashboard>> {
    const params: any = {
      type: 'dashboard',
      per_page: perPage,
      page,
    };

    if (search) {
      params.search = search;
      params.search_fields = 'title';
    }

    const response = await this.axiosInstance.get('/api/saved_objects/_find', {
      params,
    });

    return response.data;
  }

  /**
   * Get a specific dashboard by ID
   */
  async getDashboard(id: string): Promise<KibanaDashboard> {
    const response = await this.axiosInstance.get(
      `/api/saved_objects/dashboard/${id}`
    );
    return response.data;
  }

  /**
   * Export dashboard with its dependencies
   */
  async exportDashboard(
    dashboardId: string,
    includeReferencesDeep = true
  ): Promise<any> {
    const exportParams: ExportDashboardParams = {
      objects: [
        {
          type: 'dashboard',
          id: dashboardId,
        },
      ],
      includeReferencesDeep,
    };

    const response = await this.axiosInstance.post(
      '/api/saved_objects/_export',
      exportParams,
      {
        responseType: 'arraybuffer',
      }
    );

    // Parse NDJSON response
    const text = Buffer.from(response.data).toString('utf-8');
    const objects = text
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));

    return objects;
  }

  /**
   * List all visualizations
   */
  async listVisualizations(
    search?: string,
    page = 1,
    perPage = 20
  ): Promise<SavedObjectsResponse<KibanaVisualization>> {
    const params: any = {
      type: 'visualization',
      per_page: perPage,
      page,
    };

    if (search) {
      params.search = search;
      params.search_fields = 'title';
    }

    const response = await this.axiosInstance.get('/api/saved_objects/_find', {
      params,
    });

    return response.data;
  }

  /**
   * Get a specific visualization by ID
   */
  async getVisualization(id: string): Promise<KibanaVisualization> {
    const response = await this.axiosInstance.get(
      `/api/saved_objects/visualization/${id}`
    );
    return response.data;
  }

  /**
   * List all data views (index patterns)
   */
  async listDataViews(): Promise<SavedObjectsResponse<KibanaDataView>> {
    const response = await this.axiosInstance.get('/api/saved_objects/_find', {
      params: {
        type: 'index-pattern',
        per_page: 100,
      },
    });

    return response.data;
  }

  /**
   * Get a specific data view by ID
   */
  async getDataView(id: string): Promise<KibanaDataView> {
    const response = await this.axiosInstance.get(
      `/api/saved_objects/index-pattern/${id}`
    );
    return response.data;
  }

  /**
   * List all saved searches
   */
  async listSavedSearches(
    search?: string,
    page = 1,
    perPage = 20
  ): Promise<SavedObjectsResponse<KibanaSavedSearch>> {
    const params: any = {
      type: 'search',
      per_page: perPage,
      page,
    };

    if (search) {
      params.search = search;
      params.search_fields = 'title';
    }

    const response = await this.axiosInstance.get('/api/saved_objects/_find', {
      params,
    });

    return response.data;
  }

  /**
   * Search Elasticsearch data through Kibana
   */
  async searchLogs(
    params: ElasticsearchSearchParams
  ): Promise<ElasticsearchSearchResponse> {
    // Use Kibana's internal Elasticsearch proxy
    const response = await this.axiosInstance.post(
      `/internal/search/es`,
      {
        params: {
          index: params.index,
          body: params.body || {},
        },
      }
    );

    // Kibana wraps the ES response under rawResponse
    return response.data.rawResponse ?? response.data;
  }

  /**
   * Health check - verify connection to Kibana
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get('/api/status');
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}
