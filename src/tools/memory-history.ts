import type { PluginApi } from '../plugin.js';
import type { RevisiumAdapter } from '../revisium-adapter.js';

export function registerMemoryHistoryTool(
  api: PluginApi,
  adapter: RevisiumAdapter,
): void {
  api.registerTool({
    name: 'memory_history',
    description: 'List revision history for the current branch.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          default: 10,
          description: 'Max revisions to return',
        },
      },
    },
    execute: async (params) => {
      const limit = (params['limit'] as number) ?? 10;

      try {
        const result = await adapter.getRevisions({ first: limit });

        return {
          success: true,
          data: {
            revisions: result.edges.map((edge) => ({
              id: edge.node.id,
              createdAt: edge.node.createdAt,
              isDraft: edge.node.isDraft,
              isHead: edge.node.isHead,
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
