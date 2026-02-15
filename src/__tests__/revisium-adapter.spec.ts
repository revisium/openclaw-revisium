import { describe, it, expect, jest, beforeEach } from '@jest/globals';

const mockDraftScope = {
  revisionId: 'draft-rev-1',
  isDraft: true,
  isDisposed: false,
  isStale: false,
  dispose: jest.fn(),
};

const mockHeadScope = {
  revisionId: 'head-rev-1',
  isDraft: false,
  isDisposed: false,
  isStale: false,
  dispose: jest.fn(),
};

const mockBranchScope = {
  headRevisionId: 'head-rev-1',
  draftRevisionId: 'draft-rev-1',
  draft: jest.fn().mockReturnValue(mockDraftScope),
  head: jest.fn().mockReturnValue(mockHeadScope),
  getRevisions: jest.fn<() => Promise<unknown>>().mockResolvedValue({
    edges: [],
    totalCount: 0,
  }),
};

const mockGetBranches = jest.fn<() => Promise<unknown>>().mockResolvedValue({
  edges: [],
  totalCount: 0,
});

const mockCreateBranch = jest.fn<() => Promise<unknown>>().mockResolvedValue({
  name: 'new-branch',
  id: 'b-new',
});

const mockProjectGet = jest.fn<() => Promise<unknown>>().mockResolvedValue({
  id: 'p-1',
  name: 'test-project',
});

const mockProject = jest.fn().mockReturnValue({
  getBranches: mockGetBranches,
  createBranch: mockCreateBranch,
  get: mockProjectGet,
});

const mockCreateProject = jest
  .fn<() => Promise<unknown>>()
  .mockResolvedValue({ id: 'p-new', name: 'test-project' });

const mockOrg = jest.fn().mockReturnValue({
  project: mockProject,
  createProject: mockCreateProject,
});

const mockDraftRevisionScope = {
  createTable: jest.fn<() => Promise<unknown>>().mockResolvedValue({}),
  commit: jest.fn<() => Promise<unknown>>().mockResolvedValue({ id: 'rev-1' }),
};

const mockBranch = jest
  .fn<() => Promise<unknown>>()
  .mockResolvedValue(mockBranchScope);
const mockRevision = jest
  .fn<() => Promise<unknown>>()
  .mockResolvedValue(mockDraftRevisionScope);
const mockLoginWithToken = jest.fn();

jest.unstable_mockModule('@revisium/client', () => ({
  RevisiumClient: jest.fn().mockImplementation(() => ({
    loginWithToken: mockLoginWithToken,
    branch: mockBranch,
    revision: mockRevision,
    org: mockOrg,
    client: {},
  })),
}));

const { RevisiumAdapter } = await import('../revisium-adapter.js');

describe('RevisiumAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDraftScope.isDisposed = false;
    mockHeadScope.isDisposed = false;
    mockBranchScope.draft.mockReturnValue(mockDraftScope);
    mockBranchScope.head.mockReturnValue(mockHeadScope);
    mockBranch.mockResolvedValue(mockBranchScope);
    mockProjectGet.mockResolvedValue({ id: 'p-1', name: 'test-project' });
  });

  it('should create adapter with config', () => {
    const adapter = new RevisiumAdapter({
      url: 'http://localhost:9000',
      organizationId: 'test-org',
      projectName: 'test-project',
    });

    expect(adapter.getConfig()).toEqual({
      url: 'http://localhost:9000',
      organizationId: 'test-org',
      projectName: 'test-project',
    });
  });

  it('should expose RevisiumClient instance', () => {
    const adapter = new RevisiumAdapter({
      url: 'http://localhost:9000',
      organizationId: 'test-org',
      projectName: 'test-project',
    });

    expect(adapter.getClient()).toBeDefined();
  });

  it('should login with token on ensureConnected', () => {
    const adapter = new RevisiumAdapter({
      url: 'http://localhost:9000',
      token: 'test-token',
      organizationId: 'test-org',
      projectName: 'test-project',
    });

    adapter.ensureConnected();

    expect(mockLoginWithToken).toHaveBeenCalledWith('test-token');
  });

  it('should not login again on second ensureConnected call', () => {
    const adapter = new RevisiumAdapter({
      url: 'http://localhost:9000',
      token: 'test-token',
      organizationId: 'test-org',
      projectName: 'test-project',
    });

    adapter.ensureConnected();
    adapter.ensureConnected();

    expect(mockLoginWithToken).toHaveBeenCalledTimes(1);
  });

  it('should create draft scope via client.branch().draft()', async () => {
    const adapter = new RevisiumAdapter({
      url: 'http://localhost:9000',
      organizationId: 'test-org',
      projectName: 'test-project',
      branchName: 'main',
    });

    const draft = await adapter.getDraft();

    expect(draft).toBe(mockDraftScope);
    expect(mockBranch).toHaveBeenCalledWith({
      org: 'test-org',
      project: 'test-project',
      branch: 'main',
    });
    expect(mockBranchScope.draft).toHaveBeenCalled();
  });

  it('should reuse cached draft scope', async () => {
    const adapter = new RevisiumAdapter({
      url: 'http://localhost:9000',
      organizationId: 'test-org',
      projectName: 'test-project',
    });

    const draft1 = await adapter.getDraft();
    const draft2 = await adapter.getDraft();

    expect(draft1).toBe(draft2);
    expect(mockBranch).toHaveBeenCalledTimes(1);
  });

  it('should create head scope via client.branch().head()', async () => {
    const adapter = new RevisiumAdapter({
      url: 'http://localhost:9000',
      organizationId: 'test-org',
      projectName: 'test-project',
    });

    const head = await adapter.getHead();

    expect(head).toBe(mockHeadScope);
    expect(mockBranch).toHaveBeenCalledWith({
      org: 'test-org',
      project: 'test-project',
      branch: 'master',
    });
    expect(mockBranchScope.head).toHaveBeenCalled();
  });

  it('should dispose scopes on switchBranch', async () => {
    const adapter = new RevisiumAdapter({
      url: 'http://localhost:9000',
      organizationId: 'test-org',
      projectName: 'test-project',
      branchName: 'main',
    });

    await adapter.getDraft();
    adapter.switchBranch('feature');

    expect(mockDraftScope.dispose).toHaveBeenCalled();
    expect(adapter.getConfig().branchName).toBe('feature');
  });

  it('should use default branch name "master" when not specified', async () => {
    const adapter = new RevisiumAdapter({
      url: 'http://localhost:9000',
      organizationId: 'test-org',
      projectName: 'test-project',
    });

    await adapter.getDraft();

    expect(mockBranch).toHaveBeenCalledWith(
      expect.objectContaining({ branch: 'master' }),
    );
  });

  it('should get revisions via branch.getRevisions()', async () => {
    const adapter = new RevisiumAdapter({
      url: 'http://localhost:9000',
      organizationId: 'test-org',
      projectName: 'test-project',
    });

    await adapter.getRevisions({ first: 10 });

    expect(mockBranchScope.getRevisions).toHaveBeenCalledWith({ first: 10 });
  });

  it('should get branches via project.getBranches()', async () => {
    const adapter = new RevisiumAdapter({
      url: 'http://localhost:9000',
      organizationId: 'test-org',
      projectName: 'test-project',
    });

    await adapter.getBranches({ first: 100 });

    expect(mockOrg).toHaveBeenCalledWith('test-org');
    expect(mockProject).toHaveBeenCalledWith('test-project');
    expect(mockGetBranches).toHaveBeenCalledWith({ first: 100 });
  });

  it('should create branch via project.createBranch()', async () => {
    const adapter = new RevisiumAdapter({
      url: 'http://localhost:9000',
      organizationId: 'test-org',
      projectName: 'test-project',
    });

    const name = await adapter.createBranch('feature');

    expect(name).toBe('new-branch');
    expect(mockCreateBranch).toHaveBeenCalledWith('feature', 'head-rev-1');
  });

  describe('ensureProject', () => {
    it('should skip init when no template configured', async () => {
      const adapter = new RevisiumAdapter({
        url: 'http://localhost:9000',
        organizationId: 'test-org',
        projectName: 'test-project',
      });

      await adapter.ensureProject();

      expect(mockProjectGet).not.toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    it('should skip init when project already exists', async () => {
      mockProjectGet.mockResolvedValue({ id: 'p-1', name: 'test-project' });

      const adapter = new RevisiumAdapter({
        url: 'http://localhost:9000',
        organizationId: 'test-org',
        projectName: 'test-project',
        template: 'agent-memory',
      });

      await adapter.ensureProject();

      expect(mockProjectGet).toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    it('should create project and tables when project does not exist', async () => {
      mockProjectGet.mockRejectedValue(new Error('Not found'));

      const adapter = new RevisiumAdapter({
        url: 'http://localhost:9000',
        organizationId: 'test-org',
        projectName: 'test-project',
        template: 'agent-memory',
      });

      await adapter.ensureProject();

      expect(mockCreateProject).toHaveBeenCalledWith({
        projectName: 'test-project',
        branchName: 'master',
      });
      expect(mockRevision).toHaveBeenCalledWith({
        org: 'test-org',
        project: 'test-project',
      });
      expect(mockDraftRevisionScope.createTable).toHaveBeenCalledTimes(3);
      expect(mockDraftRevisionScope.commit).toHaveBeenCalledWith(
        'Initialize from template: agent-memory',
      );
    });

    it('should run init only once', async () => {
      mockProjectGet.mockResolvedValue({ id: 'p-1', name: 'test-project' });

      const adapter = new RevisiumAdapter({
        url: 'http://localhost:9000',
        organizationId: 'test-org',
        projectName: 'test-project',
        template: 'agent-memory',
      });

      await adapter.ensureProject();
      await adapter.ensureProject();

      expect(mockProjectGet).toHaveBeenCalledTimes(1);
    });

    it('should skip init for unknown template', async () => {
      const adapter = new RevisiumAdapter({
        url: 'http://localhost:9000',
        organizationId: 'test-org',
        projectName: 'test-project',
        template: 'nonexistent',
      });

      await adapter.ensureProject();

      expect(mockProjectGet).not.toHaveBeenCalled();
      expect(mockCreateProject).not.toHaveBeenCalled();
    });

    it('should auto-init on first getDraft call', async () => {
      mockProjectGet.mockRejectedValue(new Error('Not found'));

      const adapter = new RevisiumAdapter({
        url: 'http://localhost:9000',
        organizationId: 'test-org',
        projectName: 'test-project',
        template: 'agent-memory',
      });

      await adapter.getDraft();

      expect(mockCreateProject).toHaveBeenCalled();
      expect(mockDraftRevisionScope.commit).toHaveBeenCalled();
    });
  });
});
