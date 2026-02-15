import type {
  GetTableRowsDto,
  JsonFilterDto,
  RowWhereInputDto,
} from '@revisium/client';
import type { PluginApi } from '../plugin.js';
import type { RevisiumAdapter } from '../revisium-adapter.js';

export function registerMemorySearchTool(
  api: PluginApi,
  adapter: RevisiumAdapter,
): void {
  api.registerTool({
    name: 'memory_search',
    description:
      'Search memory entries in a table. Supports full-text search, field filtering, sorting, and pagination.',
    parameters: {
      type: 'object',
      properties: {
        table: { type: 'string', description: 'Table name' },
        query: { type: 'string', description: 'Full-text search string' },
        filter: {
          type: 'object',
          description: 'Filter by field value: { path, value }',
          properties: {
            path: { type: 'string', description: 'JSON path to field' },
            value: { description: 'Value to match' },
          },
        },
        limit: {
          type: 'number',
          default: 20,
          description: 'Max rows to return',
        },
        orderBy: { type: 'string', description: 'Field name to sort by' },
      },
      required: ['table'],
    },
    execute: async (params) => {
      const table = params['table'] as string;
      const query = params['query'] as string | undefined;
      const filter = params['filter'] as
        | { path: string; value: unknown }
        | undefined;
      const limit = (params['limit'] as number) ?? 20;
      const orderBy = params['orderBy'] as string | undefined;

      try {
        const head = await adapter.getHead();

        const options: GetTableRowsDto = { first: limit };

        const where = buildWhere(query, filter);
        if (where) {
          options.where = where;
        }

        if (orderBy) {
          options.orderBy = [
            { field: 'data', direction: 'asc', path: orderBy, type: 'text' },
          ];
        }

        const result = await head.getRows(table, options);

        return {
          success: true,
          data: {
            rows: result.edges.map((edge) => ({
              id: edge.node.id,
              data: edge.node.data,
            })),
            totalCount: result.totalCount,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
      }
    },
  });
}

function buildWhere(
  query: string | undefined,
  filter: { path: string; value: unknown } | undefined,
): RowWhereInputDto | undefined {
  const conditions: RowWhereInputDto[] = [];

  if (query) {
    const dataFilter: JsonFilterDto = { search: query };
    conditions.push({ data: dataFilter });
  }

  if (filter) {
    const dataFilter: JsonFilterDto =
      typeof filter.value === 'string'
        ? { path: filter.path, string_contains: filter.value }
        : {
            path: filter.path,
            equals: filter.value as Record<string, unknown>,
          };
    conditions.push({ data: dataFilter });
  }

  if (conditions.length === 0) {
    return undefined;
  }
  if (conditions.length === 1) {
    return conditions[0];
  }
  return { AND: conditions };
}
