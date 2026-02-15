import type { PluginApi } from '../plugin.js';
import type { RevisiumAdapter } from '../revisium-adapter.js';

export function registerMemoryCommitTool(
  api: PluginApi,
  adapter: RevisiumAdapter,
): void {
  api.registerTool({
    name: 'memory_commit',
    description:
      'Commit all pending changes to create a new immutable revision.',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Commit message' },
      },
    },
    execute: async (params) => {
      const message = params['message'] as string | undefined;

      try {
        const draft = await adapter.getDraft();
        const revision = await draft.commit(message);

        return {
          success: true,
          data: {
            revisionId: revision.id,
            createdAt: revision.createdAt,
          },
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return { success: false, error: msg };
      }
    },
  });
}
