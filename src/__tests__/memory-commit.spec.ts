import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type {
  PluginApi,
  RevisiumMemoryConfig,
  ToolDefinition,
} from '../plugin.js';
import type { RevisiumAdapter } from '../revisium-adapter.js';
import { registerMemoryCommitTool } from '../tools/memory-commit.js';

interface MockDraft {
  commit: jest.Mock<() => Promise<unknown>>;
}

describe('memory_commit', () => {
  let tool: ToolDefinition;
  let mockDraft: MockDraft;

  beforeEach(() => {
    mockDraft = {
      commit: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        id: 'rev-2',
        createdAt: '2026-02-15T10:00:00Z',
        isDraft: false,
        isHead: true,
      }),
    };

    const mockAdapter = {
      getDraft: jest.fn<() => Promise<unknown>>().mockResolvedValue(mockDraft),
    } as unknown as RevisiumAdapter;

    const mockApi: PluginApi = {
      getConfig: jest
        .fn<() => RevisiumMemoryConfig>()
        .mockReturnValue({} as RevisiumMemoryConfig),
      registerTool: jest.fn((t: ToolDefinition) => {
        tool = t;
      }),
    };

    registerMemoryCommitTool(mockApi, mockAdapter);
  });

  it('should register tool with name memory_commit', () => {
    expect(tool.name).toBe('memory_commit');
  });

  it('should commit with message', async () => {
    const result = await tool.execute({
      message: 'Added new facts',
    });

    expect(result.success).toBe(true);
    expect(mockDraft.commit).toHaveBeenCalledWith('Added new facts');
    const data = result.data as { revisionId: string; createdAt: string };
    expect(data.revisionId).toBe('rev-2');
    expect(data.createdAt).toBe('2026-02-15T10:00:00Z');
  });

  it('should commit without message', async () => {
    const result = await tool.execute({});

    expect(result.success).toBe(true);
    expect(mockDraft.commit).toHaveBeenCalledWith(undefined);
  });

  it('should return error on failure', async () => {
    mockDraft.commit.mockRejectedValue(new Error('No changes to commit'));

    const result = await tool.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toBe('No changes to commit');
  });
});
