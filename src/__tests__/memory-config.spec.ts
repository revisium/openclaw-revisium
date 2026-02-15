import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type {
  PluginApi,
  RevisiumMemoryConfig,
  ToolDefinition,
} from '../plugin.js';
import type { RevisiumAdapter } from '../revisium-adapter.js';
import { registerMemoryConfigTool } from '../tools/memory-config.js';

describe('memory_config', () => {
  let tool: ToolDefinition;

  beforeEach(() => {
    const mockAdapter = {
      getConfig: jest.fn<() => unknown>().mockReturnValue({
        url: 'http://localhost:9000',
        token: 'secret-token',
        organizationId: 'org',
        projectName: 'proj',
        branchName: 'main',
        autoCommit: true,
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

    registerMemoryConfigTool(mockApi, mockAdapter);
  });

  it('should register tool with name memory_config', () => {
    expect(tool.name).toBe('memory_config');
  });

  it('should return config with masked token', async () => {
    const result = await tool.execute({});

    expect(result.success).toBe(true);
    const data = result.data as Record<string, unknown>;
    expect(data.url).toBe('http://localhost:9000');
    expect(data.organizationId).toBe('org');
    expect(data.projectName).toBe('proj');
    expect(data.branchName).toBe('main');
    expect(data.autoCommit).toBe(true);
    expect(data.hasToken).toBe(true);
    expect(data).not.toHaveProperty('token');
  });

  it('should default branchName to master when not set', async () => {
    const mockAdapter2 = {
      getConfig: jest.fn<() => unknown>().mockReturnValue({
        url: 'http://localhost:9000',
        organizationId: 'org',
        projectName: 'proj',
      }),
    } as unknown as RevisiumAdapter;

    const mockApi2: PluginApi = {
      getConfig: jest
        .fn<() => RevisiumMemoryConfig>()
        .mockReturnValue({} as RevisiumMemoryConfig),
      registerTool: jest.fn((t: ToolDefinition) => {
        tool = t;
      }),
    };

    registerMemoryConfigTool(mockApi2, mockAdapter2);

    const result = await tool.execute({});
    const data = result.data as Record<string, unknown>;
    expect(data.branchName).toBe('master');
    expect(data.autoCommit).toBe(false);
    expect(data.hasToken).toBe(false);
  });
});
