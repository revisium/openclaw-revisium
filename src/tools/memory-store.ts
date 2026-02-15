import type { PluginApi } from '../plugin.js';
import type { RevisiumAdapter } from '../revisium-adapter.js';

export function registerMemoryStoreTool(
  api: PluginApi,
  adapter: RevisiumAdapter,
): void {
  api.registerTool({
    name: 'memory_store',
    description:
      'Store, update, or delete a memory entry in a table. Use operation "upsert" to create or update, "delete" to remove.',
    parameters: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          description: 'Table name (e.g. "facts", "episodes")',
        },
        id: { type: 'string', description: 'Row ID' },
        data: { type: 'object', description: 'Row data matching table schema' },
        operation: {
          type: 'string',
          enum: ['upsert', 'delete'],
          default: 'upsert',
          description: 'Operation to perform',
        },
      },
      required: ['table', 'id'],
    },
    execute: async (params) => {
      const table = params['table'] as string;
      const id = params['id'] as string;
      const data = (params['data'] as Record<string, unknown>) ?? {};
      const operation = (params['operation'] as string) ?? 'upsert';

      try {
        const draft = await adapter.getDraft();

        if (operation === 'delete') {
          await draft.deleteRow(table, id);

          if (api.getConfig().autoCommit) {
            await draft.commit(`Delete ${table}/${id}`);
          }

          return { success: true, data: { rowId: id, operation: 'deleted' } };
        }

        let resultOperation: 'created' | 'updated';
        try {
          await draft.createRow(table, id, data);
          resultOperation = 'created';
        } catch {
          await draft.updateRow(table, id, data);
          resultOperation = 'updated';
        }

        if (api.getConfig().autoCommit) {
          await draft.commit(
            `${resultOperation === 'created' ? 'Create' : 'Update'} ${table}/${id}`,
          );
        }

        return {
          success: true,
          data: { rowId: id, operation: resultOperation },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { success: false, error: message };
      }
    },
  });
}
