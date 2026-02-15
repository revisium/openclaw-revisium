import { RevisiumAdapter } from './revisium-adapter.js';
import { registerMemoryBranchTool } from './tools/memory-branch.js';
import { registerMemoryCommitTool } from './tools/memory-commit.js';
import { registerMemoryConfigTool } from './tools/memory-config.js';
import { registerMemoryHistoryTool } from './tools/memory-history.js';
import { registerMemoryRollbackTool } from './tools/memory-rollback.js';
import { registerMemorySearchTool } from './tools/memory-search.js';
import { registerMemoryStoreTool } from './tools/memory-store.js';

export interface RevisiumMemoryConfig {
  url: string;
  token?: string;
  organizationId: string;
  projectName: string;
  branchName?: string;
  autoCommit?: boolean;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (
    params: Record<string, unknown>,
  ) => Promise<ToolResult> | ToolResult;
}

export interface PluginApi {
  getConfig(): RevisiumMemoryConfig;
  registerTool(tool: ToolDefinition): void;
}

export function register(api: PluginApi): void {
  const config = api.getConfig();
  const adapter = new RevisiumAdapter(config);

  registerMemoryStoreTool(api, adapter);
  registerMemorySearchTool(api, adapter);
  registerMemoryCommitTool(api, adapter);
  registerMemoryRollbackTool(api, adapter);
  registerMemoryHistoryTool(api, adapter);
  registerMemoryBranchTool(api, adapter);
  registerMemoryConfigTool(api, adapter);
}
