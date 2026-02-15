import type { PluginApi } from '../plugin.js';
import type { RevisiumAdapter } from '../revisium-adapter.js';

export function registerMemoryBranchTool(
  api: PluginApi,
  adapter: RevisiumAdapter,
): void {
  api.registerTool({
    name: 'memory_branch',
    description:
      'Manage branches: list all branches, create a new branch from current head, or switch to a different branch.',
    parameters: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['list', 'create', 'switch'],
          description: 'Branch operation',
        },
        name: {
          type: 'string',
          description: 'Branch name (required for create/switch)',
        },
      },
      required: ['operation'],
    },
    execute: async (params) => {
      const operation = params['operation'] as string;
      const name = params['name'] as string | undefined;

      try {
        if (operation === 'list') {
          const result = await adapter.getBranches({ first: 100 });
          return {
            success: true,
            data: {
              branches: result.edges.map((edge) => ({
                name: edge.node.name,
                id: edge.node.id,
                isRoot: edge.node.isRoot,
              })),
              currentBranch: adapter.getConfig().branchName ?? 'master',
            },
          };
        }

        if (!name) {
          return {
            success: false,
            error: 'Branch name is required for create/switch operations',
          };
        }

        if (operation === 'create') {
          const branchName = await adapter.createBranch(name);
          return {
            success: true,
            data: { branchName, operation: 'created' },
          };
        }

        if (operation === 'switch') {
          adapter.switchBranch(name);
          return {
            success: true,
            data: { branchName: name, operation: 'switched' },
          };
        }

        return { success: false, error: `Unknown operation: ${operation}` };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
      }
    },
  });
}
