import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type {
  PluginApi,
  RevisiumMemoryConfig,
  ToolDefinition,
} from '../plugin.js';
import type { RevisiumAdapter } from '../revisium-adapter.js';
import { registerMemoryBranchTool } from '../tools/memory-branch.js';

describe('memory_branch', () => {
  let tool: ToolDefinition;
  let mockAdapter: RevisiumAdapter;

  beforeEach(() => {
    mockAdapter = {
      getBranches: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        edges: [
          { node: { name: 'master', id: 'b-1', isRoot: true } },
          { node: { name: 'feature', id: 'b-2', isRoot: false } },
        ],
        totalCount: 2,
      }),
      createBranch: jest
        .fn<() => Promise<string>>()
        .mockResolvedValue('new-branch'),
      switchBranch: jest.fn(),
      getConfig: jest.fn<() => unknown>().mockReturnValue({
        url: 'http://localhost:9000',
        organizationId: 'org',
        projectName: 'proj',
        branchName: 'master',
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

    registerMemoryBranchTool(mockApi, mockAdapter);
  });

  it('should register tool with name memory_branch', () => {
    expect(tool.name).toBe('memory_branch');
  });

  it('should list branches', async () => {
    const result = await tool.execute({
      operation: 'list',
    });

    expect(result.success).toBe(true);
    const data = result.data as {
      branches: Array<{ name: string; id: string; isRoot: boolean }>;
      currentBranch: string;
    };
    expect(data.branches).toHaveLength(2);
    expect(data.branches[0]).toEqual({
      name: 'master',
      id: 'b-1',
      isRoot: true,
    });
    expect(data.currentBranch).toBe('master');
  });

  it('should create a branch', async () => {
    const result = await tool.execute({
      operation: 'create',
      name: 'new-branch',
    });

    expect(result.success).toBe(true);
    expect(mockAdapter.createBranch).toHaveBeenCalledWith('new-branch');
    const data = result.data as { branchName: string; operation: string };
    expect(data.branchName).toBe('new-branch');
    expect(data.operation).toBe('created');
  });

  it('should switch branch', async () => {
    const result = await tool.execute({
      operation: 'switch',
      name: 'feature',
    });

    expect(result.success).toBe(true);
    expect(mockAdapter.switchBranch).toHaveBeenCalledWith('feature');
    const data = result.data as { branchName: string; operation: string };
    expect(data.branchName).toBe('feature');
    expect(data.operation).toBe('switched');
  });

  it('should return error when name missing for create', async () => {
    const result = await tool.execute({
      operation: 'create',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Branch name is required');
  });

  it('should return error when name missing for switch', async () => {
    const result = await tool.execute({
      operation: 'switch',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Branch name is required');
  });

  it('should return error for unknown operation', async () => {
    const result = await tool.execute({
      operation: 'merge',
      name: 'some-branch',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unknown operation');
  });

  it('should return error on failure', async () => {
    (
      mockAdapter.createBranch as jest.Mock<() => Promise<string>>
    ).mockRejectedValue(new Error('Branch exists'));

    const result = await tool.execute({
      operation: 'create',
      name: 'master',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Branch exists');
  });
});
