/**
 * MCP Tools - Executable functions
 */

import { z } from 'zod';
import { KibanaClient } from '../kibana/client.js';

export function registerTools(server: any, kibanaClient: KibanaClient) {
  /**
   * Tool: List dashboards
   */
  server.setRequestHandler('tools/list', async () => {
    return {
      tools: [
        {
          name: 'list_dashboards',
          description:
            'List all Kibana dashboards with optional search filtering',
          inputSchema: {
            type: 'object',
            properties: {
              search: {
                type: 'string',
                description: 'Optional search term to filter dashboards by title',
              },
              page: {
                type: 'number',
                description: 'Page number for pagination (default: 1)',
                default: 1,
              },
              perPage: {
                type: 'number',
                description:
                  'Number of results per page (default: 20, max: 100)',
                default: 20,
              },
            },
          },
        },
        {
          name: 'get_dashboard',
          description: 'Get detailed information about a specific dashboard',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Dashboard ID',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'export_dashboard',
          description:
            'Export a dashboard with all its dependencies (visualizations, data views, etc.)',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Dashboard ID to export',
              },
              includeReferences: {
                type: 'boolean',
                description:
                  'Include all referenced objects (default: true)',
                default: true,
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'list_visualizations',
          description: 'List all Kibana visualizations',
          inputSchema: {
            type: 'object',
            properties: {
              search: {
                type: 'string',
                description:
                  'Optional search term to filter visualizations by title',
              },
              page: {
                type: 'number',
                description: 'Page number for pagination (default: 1)',
                default: 1,
              },
              perPage: {
                type: 'number',
                description:
                  'Number of results per page (default: 20, max: 100)',
                default: 20,
              },
            },
          },
        },
        {
          name: 'get_visualization',
          description: 'Get detailed information about a specific visualization',
          inputSchema: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: 'Visualization ID',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'list_data_views',
          description: 'List all data views (index patterns) in Kibana',
          inputSchema: {
            type: 'object',
            properties: {},
          },
        },
        {
          name: 'search_logs',
          description:
            'Search Elasticsearch data through Kibana using Elasticsearch query DSL',
          inputSchema: {
            type: 'object',
            properties: {
              index: {
                type: 'string',
                description: 'Index pattern or name to search',
              },
              query: {
                type: 'object',
                description:
                  'Elasticsearch query DSL (e.g., {"match_all": {}} or {"term": {"field": "value"}})',
              },
              size: {
                type: 'number',
                description: 'Number of results to return (default: 10, max: 100)',
                default: 10,
              },
              from: {
                type: 'number',
                description: 'Starting offset for pagination (default: 0)',
                default: 0,
              },
              sort: {
                type: 'array',
                description:
                  'Sort specification (e.g., [{"@timestamp": "desc"}])',
              },
            },
            required: ['index'],
          },
        },
      ],
    };
  });

  /**
   * Tool: Call handler
   */
  server.setRequestHandler('tools/call', async (request: any) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'list_dashboards': {
          const { search, page = 1, perPage = 20 } = args;
          const result = await kibanaClient.listDashboards(
            search,
            page,
            Math.min(perPage, 100)
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    total: result.total,
                    page,
                    per_page: result.per_page,
                    dashboards: result.saved_objects.map((d) => ({
                      id: d.id,
                      title: d.attributes.title,
                      description: d.attributes.description,
                      updated_at: d.updated_at,
                    })),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case 'get_dashboard': {
          const { id } = args;
          const dashboard = await kibanaClient.getDashboard(id);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(dashboard, null, 2),
              },
            ],
          };
        }

        case 'export_dashboard': {
          const { id, includeReferences = true } = args;
          const exported = await kibanaClient.exportDashboard(
            id,
            includeReferences
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(exported, null, 2),
              },
            ],
          };
        }

        case 'list_visualizations': {
          const { search, page = 1, perPage = 20 } = args;
          const result = await kibanaClient.listVisualizations(
            search,
            page,
            Math.min(perPage, 100)
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    total: result.total,
                    page,
                    per_page: result.per_page,
                    visualizations: result.saved_objects.map((v) => ({
                      id: v.id,
                      title: v.attributes.title,
                      description: v.attributes.description,
                      updated_at: v.updated_at,
                    })),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case 'get_visualization': {
          const { id } = args;
          const visualization = await kibanaClient.getVisualization(id);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(visualization, null, 2),
              },
            ],
          };
        }

        case 'list_data_views': {
          const dataViews = await kibanaClient.listDataViews();

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    total: dataViews.total,
                    dataViews: dataViews.saved_objects.map((dv) => ({
                      id: dv.id,
                      title: dv.attributes.title,
                      timeFieldName: dv.attributes.timeFieldName,
                    })),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        case 'search_logs': {
          const { index, query, size = 10, from = 0, sort } = args;

          const searchParams = {
            index,
            body: {
              query: query || { match_all: {} },
              size: Math.min(size, 100),
              from,
              ...(sort && { sort }),
            },
          };

          const result = await kibanaClient.searchLogs(searchParams);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    took: result.took,
                    total: result.hits.total,
                    hits: result.hits.hits.map((hit) => ({
                      _id: hit._id,
                      _index: hit._index,
                      _score: hit._score,
                      _source: hit._source,
                    })),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error executing tool ${name}: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });
}
