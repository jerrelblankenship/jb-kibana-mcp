/**
 * MCP Resources - Read-only data exposure
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { KibanaClient } from '../kibana/client.js';

export function registerResources(server: Server, kibanaClient: KibanaClient) {
  /**
   * Resource: List all dashboards
   */
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'kibana://dashboards',
          name: 'Kibana Dashboards',
          description: 'List of all available Kibana dashboards',
          mimeType: 'application/json',
        },
        {
          uri: 'kibana://visualizations',
          name: 'Kibana Visualizations',
          description: 'List of all available Kibana visualizations',
          mimeType: 'application/json',
        },
        {
          uri: 'kibana://data-views',
          name: 'Kibana Data Views',
          description: 'List of all available data views (index patterns)',
          mimeType: 'application/json',
        },
        {
          uri: 'kibana://saved-searches',
          name: 'Kibana Saved Searches',
          description: 'List of all saved searches',
          mimeType: 'application/json',
        },
      ],
    };
  });

  /**
   * Resource: Read specific resource content
   */
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;

    try {
      if (uri === 'kibana://dashboards') {
        const dashboards = await kibanaClient.listDashboards(undefined, 1, 100);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  total: dashboards.total,
                  dashboards: dashboards.saved_objects.map((d) => ({
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

      if (uri === 'kibana://visualizations') {
        const visualizations = await kibanaClient.listVisualizations(
          undefined,
          1,
          100
        );
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  total: visualizations.total,
                  visualizations: visualizations.saved_objects.map((v) => ({
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

      if (uri === 'kibana://data-views') {
        const dataViews = await kibanaClient.listDataViews();
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
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

      if (uri === 'kibana://saved-searches') {
        const searches = await kibanaClient.listSavedSearches(undefined, 1, 100);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  total: searches.total,
                  searches: searches.saved_objects.map((s) => ({
                    id: s.id,
                    title: s.attributes.title,
                    description: s.attributes.description,
                    updated_at: s.updated_at,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      }

      if (uri.startsWith('kibana://dashboard/')) {
        const id = uri.replace('kibana://dashboard/', '');
        const dashboard = await kibanaClient.getDashboard(id);
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(dashboard, null, 2),
            },
          ],
        };
      }

      throw new Error(`Unknown resource URI: ${uri}`);
    } catch (error: any) {
      throw new Error(`Failed to read resource: ${error.message}`);
    }
  });
}
