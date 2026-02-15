import type { PluginApi } from '../plugin.js';
import type { RevisiumAdapter } from '../revisium-adapter.js';

export function registerMemoryRollbackTool(
  api: PluginApi,
  adapter: RevisiumAdapter,
): void {
  api.registerTool({
    name: 'memory_rollback',
    description:
      'Discard all uncommitted changes in the current draft, reverting to the last committed state.',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: async () => {
      try {
        const draft = await adapter.getDraft();
        await draft.revertChanges();

        return { success: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
      }
    },
  });
}
