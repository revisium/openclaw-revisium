import { RevisiumClient } from '@revisium/client';
import type {
  BranchScope,
  RevisionScope,
  BranchesConnection,
  RevisionsConnection,
} from '@revisium/client';
import type { RevisiumMemoryConfig } from './plugin.js';
import { getTemplate } from './templates/index.js';

export class RevisiumAdapter {
  private readonly client: RevisiumClient;
  private config: RevisiumMemoryConfig;
  private branchScope: BranchScope | null = null;
  private draftScope: RevisionScope | null = null;
  private headScope: RevisionScope | null = null;
  private connected = false;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(config: RevisiumMemoryConfig) {
    this.config = config;
    this.client = new RevisiumClient({
      baseUrl: config.url,
    });
  }

  public getClient(): RevisiumClient {
    return this.client;
  }

  public getConfig(): RevisiumMemoryConfig {
    return this.config;
  }

  public ensureConnected(): void {
    if (this.connected) {
      return;
    }
    if (this.config.token) {
      this.client.loginWithToken(this.config.token);
    }
    this.connected = true;
  }

  public async ensureProject(): Promise<void> {
    if (this.initialized) {
      return;
    }
    if (this.initPromise) {
      return this.initPromise;
    }
    this.initPromise = this.doEnsureProject();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  private async doEnsureProject(): Promise<void> {
    this.ensureConnected();

    const templateName = this.config.template;
    if (!templateName) {
      this.initialized = true;
      return;
    }

    const template = getTemplate(templateName);
    if (!template) {
      this.initialized = true;
      return;
    }

    const org = this.client.org(this.config.organizationId);
    const project = org.project(this.config.projectName);

    try {
      await project.get();
      this.initialized = true;
      return;
    } catch {
      // project doesn't exist — create it
    }

    await org.createProject({
      projectName: this.config.projectName,
      branchName: this.config.branchName ?? 'master',
    });

    const draft = await this.client.revision({
      org: this.config.organizationId,
      project: this.config.projectName,
    });

    for (const [tableId, schema] of Object.entries(template.tables)) {
      await draft.createTable(tableId, schema);
    }

    await draft.commit(`Initialize from template: ${template.name}`);
    this.initialized = true;
  }

  private async getBranchScope(): Promise<BranchScope> {
    this.ensureConnected();
    await this.ensureProject();
    this.branchScope ??= await this.client.branch({
      org: this.config.organizationId,
      project: this.config.projectName,
      branch: this.config.branchName ?? 'master',
    });
    return this.branchScope;
  }

  public async getDraft(): Promise<RevisionScope> {
    if (!this.draftScope || this.draftScope.isDisposed) {
      const branch = await this.getBranchScope();
      this.draftScope = branch.draft();
    }
    return this.draftScope;
  }

  public async getHead(): Promise<RevisionScope> {
    if (!this.headScope || this.headScope.isDisposed) {
      const branch = await this.getBranchScope();
      this.headScope = branch.head();
    }
    return this.headScope;
  }

  public async getRevisions(options: {
    first: number;
  }): Promise<RevisionsConnection> {
    const branch = await this.getBranchScope();
    return branch.getRevisions({ first: options.first });
  }

  public async getBranches(options: {
    first: number;
  }): Promise<BranchesConnection> {
    this.ensureConnected();
    const project = this.client
      .org(this.config.organizationId)
      .project(this.config.projectName);
    return project.getBranches({ first: options.first });
  }

  public async createBranch(name: string): Promise<string> {
    const branch = await this.getBranchScope();
    const revisionId = branch.headRevisionId;
    const project = this.client
      .org(this.config.organizationId)
      .project(this.config.projectName);
    const result = await project.createBranch(name, revisionId);
    return result.name;
  }

  public switchBranch(branchName: string): void {
    this.disposeScopes();
    this.config = { ...this.config, branchName };
  }

  public disposeScopes(): void {
    if (this.draftScope && !this.draftScope.isDisposed) {
      this.draftScope.dispose();
    }
    this.draftScope = null;
    if (this.headScope && !this.headScope.isDisposed) {
      this.headScope.dispose();
    }
    this.headScope = null;
    this.branchScope = null;
  }
}
