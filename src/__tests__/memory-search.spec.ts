import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import type {
  PluginApi,
  RevisiumMemoryConfig,
  ToolDefinition,
} from '../plugin.js';
import type { RevisiumAdapter } from '../revisium-adapter.js';
import { registerMemorySearchTool } from '../tools/memory-search.js';

interface MockHead {
  getRows: jest.Mock<() => Promise<unknown>>;
}

describe('memory_search', () => {
  let tool: ToolDefinition;
  let mockHead: MockHead;
  let mockAdapter: RevisiumAdapter;

  beforeEach(() => {
    mockHead = {
      getRows: jest.fn<() => Promise<unknown>>().mockResolvedValue({
        edges: [
          { node: { id: 'row-1', data: { topic: 'test', content: 'hello' } } },
        ],
        totalCount: 1,
      }),
    };

    mockAdapter = {
      getHead: jest.fn<() => Promise<unknown>>().mockResolvedValue(mockHead),
    } as unknown as RevisiumAdapter;

    const mockApi: PluginApi = {
      getConfig: jest.fn<() => RevisiumMemoryConfig>().mockReturnValue({
        url: 'http://localhost:9000',
        organizationId: 'org',
        projectName: 'proj',
      }),
      registerTool: jest.fn((t: ToolDefinition) => {
        tool = t;
      }),
    };

    registerMemorySearchTool(mockApi, mockAdapter);
  });

  it('should register tool with name memory_search', () => {
    expect(tool.name).toBe('memory_search');
  });

  it('should search with full-text query', async () => {
    const result = await tool.execute({
      table: 'facts',
      query: 'hello',
    });

    expect(result.success).toBe(true);
    expect(mockHead.getRows).toHaveBeenCalledWith('facts', {
      first: 20,
      where: { data: { search: 'hello' } },
    });
  });

  it('should search with string filter', async () => {
    const result = await tool.execute({
      table: 'facts',
      filter: { path: 'topic', value: 'test' },
    });

    expect(result.success).toBe(true);
    expect(mockHead.getRows).toHaveBeenCalledWith('facts', {
      first: 20,
      where: { data: { path: 'topic', string_contains: 'test' } },
    });
  });

  it('should search with non-string filter using equals', async () => {
    await tool.execute({
      table: 'facts',
      filter: { path: 'confidence', value: 0.9 },
    });

    expect(mockHead.getRows).toHaveBeenCalledWith('facts', {
      first: 20,
      where: { data: { path: 'confidence', equals: 0.9 } },
    });
  });

  it('should combine query and filter with AND', async () => {
    await tool.execute({
      table: 'facts',
      query: 'hello',
      filter: { path: 'topic', value: 'test' },
    });

    expect(mockHead.getRows).toHaveBeenCalledWith('facts', {
      first: 20,
      where: {
        AND: [
          { data: { search: 'hello' } },
          { data: { path: 'topic', string_contains: 'test' } },
        ],
      },
    });
  });

  it('should respect custom limit', async () => {
    await tool.execute({
      table: 'facts',
      limit: 5,
    });

    expect(mockHead.getRows).toHaveBeenCalledWith('facts', { first: 5 });
  });

  it('should add orderBy when specified', async () => {
    await tool.execute({
      table: 'facts',
      orderBy: 'topic',
    });

    expect(mockHead.getRows).toHaveBeenCalledWith('facts', {
      first: 20,
      orderBy: [
        { field: 'data', direction: 'asc', path: 'topic', type: 'text' },
      ],
    });
  });

  it('should return rows with id and data', async () => {
    const result = await tool.execute({ table: 'facts' });

    expect(result.success).toBe(true);
    const data = result.data as { rows: unknown[]; totalCount: number };
    expect(data.rows).toEqual([
      { id: 'row-1', data: { topic: 'test', content: 'hello' } },
    ]);
    expect(data.totalCount).toBe(1);
  });

  it('should return error on failure', async () => {
    mockHead.getRows.mockRejectedValue(new Error('Table not found'));

    const result = await tool.execute({ table: 'invalid' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Table not found');
  });

  it('should return empty results', async () => {
    mockHead.getRows.mockResolvedValue({ edges: [], totalCount: 0 });

    const result = await tool.execute({ table: 'facts' });

    expect(result.success).toBe(true);
    const data = result.data as { rows: unknown[]; totalCount: number };
    expect(data.rows).toEqual([]);
    expect(data.totalCount).toBe(0);
  });
});
