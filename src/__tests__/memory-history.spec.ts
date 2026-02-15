import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type {
  PluginApi,
  RevisiumMemoryConfig,
  ToolDefinition,
} from '../plugin.js';
import type { RevisiumAdapter } from '../revisium-adapter.js';
import { registerMemoryHistoryTool } from '../tools/memory-history.js';

describe('memory_history', () => {
  let tool: ToolDefinition;
  let mockAdapter: RevisiumAdapter;

  beforeEach(() => {
    mockAdapter = {
      getRevisions: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        edges: [
          {
            node: {
              id: 'rev-1',
              createdAt: '2026-02-15T09:00:00Z',
              isDraft: false,
              isHead: false,
            },
          },
          {
            node: {
              id: 'rev-2',
              createdAt: '2026-02-15T10:00:00Z',
              isDraft: false,
              isHead: true,
            },
          },
          {
            node: {
              id: 'rev-draft',
              createdAt: '2026-02-15T10:00:00Z',
              isDraft: true,
              isHead: false,
            },
          },
        ],
        totalCount: 3,
      }),
    } as unknown as RevisiumAdapter;

    const mockApi: PluginApi = {
      getConfig: jest
        .fn<() => RevisiumMemoryConfig>()
        .mockReturnValue({} as RevisiumMemoryConfig),
      registerTool: jest.fn((t: ToolDefinition) => {
        tool = t;
      }),
    };

    registerMemoryHistoryTool(mockApi, mockAdapter);
  });

  it('should register tool with name memory_history', () => {
    expect(tool.name).toBe('memory_history');
  });

  it('should list revisions with default limit', async () => {
    const result = await tool.execute({});

    expect(result.success).toBe(true);
    expect(mockAdapter.getRevisions).toHaveBeenCalledWith({ first: 10 });

    const data = result.data as {
      revisions: unknown[];
      totalCount: number;
    };
    expect(data.revisions).toHaveLength(3);
    expect(data.totalCount).toBe(3);
  });

  it('should respect custom limit', async () => {
    await tool.execute({ limit: 5 });

    expect(mockAdapter.getRevisions).toHaveBeenCalledWith({ first: 5 });
  });

  it('should return revision details', async () => {
    const result = await tool.execute({});
    const data = result.data as {
      revisions: Array<{
        id: string;
        createdAt: string;
        isDraft: boolean;
        isHead: boolean;
      }>;
    };

    expect(data.revisions[0]).toEqual({
      id: 'rev-1',
      createdAt: '2026-02-15T09:00:00Z',
      isDraft: false,
      isHead: false,
    });
    expect(data.revisions[1]).toEqual({
      id: 'rev-2',
      createdAt: '2026-02-15T10:00:00Z',
      isDraft: false,
      isHead: true,
    });
  });

  it('should return error on failure', async () => {
    (
      mockAdapter.getRevisions as jest.Mock<() => Promise<unknown>>
    ).mockRejectedValue(new Error('Failed'));

    const result = await tool.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed');
  });
});
