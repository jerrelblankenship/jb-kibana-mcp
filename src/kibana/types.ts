/**
 * Kibana API Types
 */

export interface KibanaConfig {
  url: string;
  apiKey?: string;
  username?: string;
  password?: string;
}

export interface KibanaDashboard {
  id: string;
  type: string;
  attributes: {
    title: string;
    description?: string;
    panelsJSON?: string;
    timeRestore?: boolean;
    timeFrom?: string;
    timeTo?: string;
    version?: number;
  };
  references: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  updated_at?: string;
  version?: string;
}

export interface KibanaVisualization {
  id: string;
  type: string;
  attributes: {
    title: string;
    description?: string;
    visState?: string;
    uiStateJSON?: string;
    version?: number;
  };
  references: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  updated_at?: string;
}

export interface KibanaDataView {
  id: string;
  type: string;
  attributes: {
    title: string;
    name?: string;
    timeFieldName?: string;
    fields?: string;
    fieldFormatMap?: string;
    typeMeta?: string;
  };
  updated_at?: string;
}

export interface KibanaSavedSearch {
  id: string;
  type: string;
  attributes: {
    title: string;
    description?: string;
    hits?: number;
    columns?: string[];
    sort?: Array<[string, string]>;
    version?: number;
  };
  references: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  updated_at?: string;
}

export interface SavedObjectsResponse<T> {
  page?: number;
  per_page?: number;
  total: number;
  saved_objects: T[];
}

export interface ElasticsearchSearchParams {
  index: string;
  body?: {
    query?: any;
    size?: number;
    from?: number;
    sort?: any;
    _source?: string[] | boolean;
    aggs?: any;
  };
}

export interface ElasticsearchSearchResponse {
  took: number;
  timed_out: boolean;
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  hits: {
    total: {
      value: number;
      relation: string;
    };
    max_score: number | null;
    hits: Array<{
      _index: string;
      _id: string;
      _score: number | null;
      _source: any;
      fields?: any;
    }>;
  };
  aggregations?: any;
}

export interface ExportDashboardParams {
  objects: Array<{
    type: string;
    id: string;
  }>;
  includeReferencesDeep?: boolean;
}
