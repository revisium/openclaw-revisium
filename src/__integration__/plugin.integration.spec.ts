import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { RevisiumClient } from '@revisium/client';
import type { ToolDefinition } from '../plugin.js';
import { RevisiumAdapter } from '../revisium-adapter.js';
import { registerMemoryStoreTool } from '../tools/memory-store.js';
import { registerMemorySearchTool } from '../tools/memory-search.js';
import { registerMemoryCommitTool } from '../tools/memory-commit.js';
import { registerMemoryRollbackTool } from '../tools/memory-rollback.js';
import { registerMemoryHistoryTool } from '../tools/memory-history.js';
import { registerMemoryBranchTool } from '../tools/memory-branch.js';
import { registerMemoryConfigTool } from '../tools/memory-config.js';
import type { PluginApi, RevisiumMemoryConfig } from '../plugin.js';

const REVISIUM_URL = process.env['REVISIUM_URL'] ?? 'http://localhost:9000';
const TEST_PROJECT = `test-memory-${Date.now()}`;

describe('openclaw-revisium integration', () => {
  const tools = new Map<string, ToolDefinition>();
  let client: RevisiumClient;

  beforeAll(async () => {
    client = new RevisiumClient({ baseUrl: REVISIUM_URL });
    await client.login('admin', 'admin');

    const me = await client.me();
    expect(me.id).toBeDefined();

    const org = client.org('admin');
    await org.createProject({
      projectName: TEST_PROJECT,
      branchName: 'master',
    });

    const tableSchema = {
      type: 'object',
      properties: {
        topic: { type: 'string', default: '' },
        content: { type: 'string', default: '' },
        confidence: { type: 'number', default: 0 },
      },
      additionalProperties: false,
      required: ['topic', 'content', 'confidence'],
    };

    const draft = await client.revision({
      org: 'admin',
      project: TEST_PROJECT,
    });
    await draft.createTable('facts', tableSchema);
    await draft.commit('Initial table setup');

    const config: RevisiumMemoryConfig = {
      url: REVISIUM_URL,
      organizationId: 'admin',
      projectName: TEST_PROJECT,
      branchName: 'master',
    };

    const adapter = new RevisiumAdapter(config);
    await adapter.getClient().login('admin', 'admin');

    const api: PluginApi = {
      getConfig: () => config,
      registerTool: (tool) => {
        tools.set(tool.name, tool);
      },
    };

    registerMemoryStoreTool(api, adapter);
    registerMemorySearchTool(api, adapter);
    registerMemoryCommitTool(api, adapter);
    registerMemoryRollbackTool(api, adapter);
    registerMemoryHistoryTool(api, adapter);
    registerMemoryBranchTool(api, adapter);
    registerMemoryConfigTool(api, adapter);
  });

  afterAll(async () => {
    try {
      const project = client.org('admin').project(TEST_PROJECT);
      await project.delete();
    } catch {
      // ignore cleanup errors
    }
  });

  function getTool(name: string): ToolDefinition {
    const tool = tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not registered`);
    }
    return tool;
  }

  it('should connect to Revisium standalone', async () => {
    const me = await client.me();
    expect(me.id).toBeDefined();
  });

  it('should view config', async () => {
    const configTool = getTool('memory_config');
    const result = await configTool.execute({});

    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.url).toBe(REVISIUM_URL);
    expect(data.organizationId).toBe('admin');
    expect(data.projectName).toBe(TEST_PROJECT);
  });

  it('should store a memory entry', async () => {
    const storeTool = getTool('memory_store');
    const result = await storeTool.execute({
      table: 'facts',
      id: 'fact-1',
      data: {
        topic: 'testing',
        content: 'Integration test fact',
        confidence: 0.95,
      },
    });

    expect(result.success).toBe(true);
    const data = result.data as { rowId: string; operation: string };
    expect(data.rowId).toBe('fact-1');
    expect(data.operation).toBe('created');
  });

  it('should commit changes', async () => {
    const commitTool = getTool('memory_commit');
    const result = await commitTool.execute({
      message: 'Added test fact',
    });

    expect(result.success).toBe(true);
    const data = result.data as { revisionId: string; createdAt: string };
    expect(data.revisionId).toBeDefined();
    expect(data.createdAt).toBeDefined();
  });

  it('should search by content filter', async () => {
    const searchTool = getTool('memory_search');
    const result = await searchTool.execute({
      table: 'facts',
      filter: { path: 'content', value: 'Integration' },
    });

    expect(result.success).toBe(true);
    const data = result.data as {
      rows: Array<{ id: string; data: Record<string, unknown> }>;
      totalCount: number;
    };
    expect(data.totalCount).toBeGreaterThanOrEqual(1);
    expect(data.rows.some((r) => r.id === 'fact-1')).toBe(true);
  });

  it('should search by field filter', async () => {
    const searchTool = getTool('memory_search');
    const result = await searchTool.execute({
      table: 'facts',
      filter: { path: 'topic', value: 'testing' },
    });

    expect(result.success).toBe(true);
    const data = result.data as {
      rows: Array<{ id: string }>;
      totalCount: number;
    };
    expect(data.totalCount).toBeGreaterThanOrEqual(1);
  });

  it('should update an existing entry', async () => {
    const storeTool = getTool('memory_store');
    const result = await storeTool.execute({
      table: 'facts',
      id: 'fact-1',
      data: { topic: 'testing', content: 'Updated fact', confidence: 0.99 },
    });

    expect(result.success).toBe(true);
    const data = result.data as { rowId: string; operation: string };
    expect(data.operation).toBe('updated');
  });

  it('should rollback uncommitted changes', async () => {
    const rollbackTool = getTool('memory_rollback');
    const result = await rollbackTool.execute({});

    expect(result.success).toBe(true);
  });

  it('should list revision history', async () => {
    const historyTool = getTool('memory_history');
    const result = await historyTool.execute({ limit: 10 });

    expect(result.success).toBe(true);
    const data = result.data as {
      revisions: Array<{ id: string; isDraft: boolean; isHead: boolean }>;
      totalCount: number;
    };
    expect(data.totalCount).toBeGreaterThanOrEqual(2);
  });

  it('should list branches', async () => {
    const branchTool = getTool('memory_branch');
    const result = await branchTool.execute({
      operation: 'list',
    });

    expect(result.success).toBe(true);
    const data = result.data as {
      branches: Array<{ name: string }>;
      currentBranch: string;
    };
    expect(data.branches.some((b) => b.name === 'master')).toBe(true);
    expect(data.currentBranch).toBe('master');
  });
});
