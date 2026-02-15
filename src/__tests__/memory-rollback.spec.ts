import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type {
  PluginApi,
  RevisiumMemoryConfig,
  ToolDefinition,
} from '../plugin.js';
import type { RevisiumAdapter } from '../revisium-adapter.js';
import { registerMemoryRollbackTool } from '../tools/memory-rollback.js';

interface MockDraft {
  revertChanges: jest.Mock<() => Promise<unknown>>;
}

describe('memory_rollback', () => {
  let tool: ToolDefinition;
  let mockDraft: MockDraft;

  beforeEach(() => {
    mockDraft = {
      revertChanges: jest
        .fn<() => Promise<unknown>>()
        .mockResolvedValue(undefined),
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

    registerMemoryRollbackTool(mockApi, mockAdapter);
  });

  it('should register tool with name memory_rollback', () => {
    expect(tool.name).toBe('memory_rollback');
  });

  it('should revert draft changes', async () => {
    const result = await tool.execute({});

    expect(result.success).toBe(true);
    expect(mockDraft.revertChanges).toHaveBeenCalled();
  });

  it('should return error on failure', async () => {
    mockDraft.revertChanges.mockRejectedValue(new Error('Revert failed'));

    const result = await tool.execute({});

    expect(result.success).toBe(false);
    expect(result.error).toBe('Revert failed');
  });
});
