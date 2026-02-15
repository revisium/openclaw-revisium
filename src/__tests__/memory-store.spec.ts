import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type {
  PluginApi,
  RevisiumMemoryConfig,
  ToolDefinition,
} from '../plugin.js';
import type { RevisiumAdapter } from '../revisium-adapter.js';
import { registerMemoryStoreTool } from '../tools/memory-store.js';

interface MockDraft {
  createRow: jest.Mock<() => Promise<unknown>>;
  updateRow: jest.Mock<() => Promise<unknown>>;
  deleteRow: jest.Mock<() => Promise<unknown>>;
  commit: jest.Mock<() => Promise<unknown>>;
}

describe('memory_store', () => {
  let tool: ToolDefinition;
  let mockDraft: MockDraft;
  let mockAdapter: RevisiumAdapter;
  let mockGetConfig: jest.Mock<() => RevisiumMemoryConfig>;

  beforeEach(() => {
    mockDraft = {
      createRow: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
      updateRow: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
      deleteRow: jest.fn<() => Promise<unknown>>().mockResolvedValue(undefined),
      commit: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
    };

    mockAdapter = {
      getDraft: jest.fn<() => Promise<unknown>>().mockResolvedValue(mockDraft),
    } as unknown as RevisiumAdapter;

    mockGetConfig = jest.fn<() => RevisiumMemoryConfig>().mockReturnValue({
      url: 'http://localhost:9000',
      organizationId: 'org',
      projectName: 'proj',
    });

    const mockApi: PluginApi = {
      getConfig: mockGetConfig,
      registerTool: jest.fn((t: ToolDefinition) => {
        tool = t;
      }),
    };

    registerMemoryStoreTool(mockApi, mockAdapter);
  });

  it('should register tool with name memory_store', () => {
    expect(tool.name).toBe('memory_store');
  });

  it('should create a new row', async () => {
    const result = await tool.execute({
      table: 'facts',
      id: 'fact-1',
      data: { topic: 'test', content: 'hello' },
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ rowId: 'fact-1', operation: 'created' });
    expect(mockDraft.createRow).toHaveBeenCalledWith('facts', 'fact-1', {
      topic: 'test',
      content: 'hello',
    });
  });

  it('should update an existing row when createRow fails', async () => {
    mockDraft.createRow.mockRejectedValueOnce(new Error('Row already exists'));

    const result = await tool.execute({
      table: 'facts',
      id: 'fact-1',
      data: { topic: 'updated' },
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ rowId: 'fact-1', operation: 'updated' });
    expect(mockDraft.updateRow).toHaveBeenCalledWith('facts', 'fact-1', {
      topic: 'updated',
    });
  });

  it('should delete a row', async () => {
    const result = await tool.execute({
      table: 'facts',
      id: 'fact-1',
      operation: 'delete',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ rowId: 'fact-1', operation: 'deleted' });
    expect(mockDraft.deleteRow).toHaveBeenCalledWith('facts', 'fact-1');
  });

  it('should auto-commit after upsert when autoCommit is true', async () => {
    mockGetConfig.mockReturnValue({
      url: 'http://localhost:9000',
      organizationId: 'org',
      projectName: 'proj',
      autoCommit: true,
    });

    await tool.execute({
      table: 'facts',
      id: 'fact-1',
      data: { topic: 'test' },
    });

    expect(mockDraft.commit).toHaveBeenCalledWith('Create facts/fact-1');
  });

  it('should auto-commit after delete when autoCommit is true', async () => {
    mockGetConfig.mockReturnValue({
      url: 'http://localhost:9000',
      organizationId: 'org',
      projectName: 'proj',
      autoCommit: true,
    });

    await tool.execute({
      table: 'facts',
      id: 'fact-1',
      operation: 'delete',
    });

    expect(mockDraft.commit).toHaveBeenCalledWith('Delete facts/fact-1');
  });

  it('should not commit when autoCommit is false', async () => {
    await tool.execute({
      table: 'facts',
      id: 'fact-1',
      data: { topic: 'test' },
    });

    expect(mockDraft.commit).not.toHaveBeenCalled();
  });

  it('should return error on failure', async () => {
    (
      mockAdapter.getDraft as jest.Mock<() => Promise<unknown>>
    ).mockRejectedValue(new Error('Connection failed'));

    const result = await tool.execute({
      table: 'facts',
      id: 'fact-1',
      data: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Connection failed');
  });

  it('should default to empty data when data param not provided', async () => {
    await tool.execute({
      table: 'facts',
      id: 'fact-1',
    });

    expect(mockDraft.createRow).toHaveBeenCalledWith('facts', 'fact-1', {});
  });
});
