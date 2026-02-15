import type { PluginApi } from '../plugin.js';
import type { RevisiumAdapter } from '../revisium-adapter.js';

export function registerMemoryConfigTool(
  api: PluginApi,
  adapter: RevisiumAdapter,
): void {
  api.registerTool({
    name: 'memory_config',
    description: 'View the current plugin configuration.',
    parameters: {
      type: 'object',
      properties: {},
    },
    execute: () => {
      const config = adapter.getConfig();

      return {
        success: true,
        data: {
          url: config.url,
          organizationId: config.organizationId,
          projectName: config.projectName,
          branchName: config.branchName ?? 'master',
          autoCommit: config.autoCommit ?? false,
          hasToken: Boolean(config.token),
        },
      };
    },
  });
}
