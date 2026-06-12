import { SceneDefinition, ProjectConfig, SceneApiRoute } from '../types';

// --- Artifact & file types ---

export type FileType = 'page' | 'component' | 'hook' | 'service' | 'route' | 'model' | 'api-module' | 'type';

export type ArtifactType =
  | 'pages'
  | 'components'
  | 'hooks'
  | 'services'
  | 'apiRoutes'
  | 'schema'
  | 'types'
  | 'router'
  | 'stores'
  | 'middleware';

// --- Locale ---

export interface LocaleConfig {
  /** IETF language tag, e.g. 'zh-CN', 'en-US' */
  locale: string;
  /** Instruction for UI text language in prompts */
  uiLanguageInstruction: string;
  /** Instruction for backend message language in prompts */
  messageLanguageInstruction: string;
}

// --- Backend sub-adapter ---

export interface BackendAdapter {
  buildSchemaPrompt(
    scene: SceneDefinition,
    config: ProjectConfig,
    existingSchema: string,
    locale: LocaleConfig,
  ): string | null;

  buildServicePrompt(
    scene: SceneDefinition,
    config: ProjectConfig,
    modelCode: string,
    refService: string,
    locale: LocaleConfig,
  ): string | null;

  buildRoutePrompt(
    scene: SceneDefinition,
    config: ProjectConfig,
    serviceCode: string,
    refRoute: string,
    routeIndexContent: string,
    locale: LocaleConfig,
  ): string | null;

  buildModelIndexPrompt(
    scene: SceneDefinition,
    config: ProjectConfig,
    modelNames: string[],
    existingModelIndex: string,
    locale: LocaleConfig,
  ): string | null;

  /** True for Sequelize/Drizzle (one file per model), false for Prisma (single schema file) */
  isMultiFileModels(config?: ProjectConfig): boolean;

  /** Conventional index file path for model registration, e.g. 'models/index.js'. Null for Prisma. */
  modelIndexFile(): string | null;

  /** Paths that should be treated as registration/index files for smart injection */
  registrationFiles(): string[];
}

// --- Frontend sub-adapter ---

export interface FrontendAdapter {
  buildApiModulePrompt(
    scene: SceneDefinition,
    config: ProjectConfig,
    refApiModule: string,
    locale: LocaleConfig,
  ): string | null;

  buildPagePrompt(
    scene: SceneDefinition,
    config: ProjectConfig,
    refPage: string,
    apiFunctions: string,
    locale: LocaleConfig,
  ): string | null;

  buildHookPrompt(
    scene: SceneDefinition,
    config: ProjectConfig,
    refHook: string,
    apiFunctions: string,
    locale: LocaleConfig,
  ): string | null;

  buildComponentPrompt(
    scene: SceneDefinition,
    config: ProjectConfig,
    refComponent: string,
    apiFunctions: string,
    locale: LocaleConfig,
  ): string | null;

  buildRouterPrompt(
    scene: SceneDefinition,
    config: ProjectConfig,
    existingRouterContent: string,
    locale: LocaleConfig,
  ): string | null;

  buildTypePrompt(
    scene: SceneDefinition,
    config: ProjectConfig,
    existingTypes: string,
    locale: LocaleConfig,
  ): string | null;

  /** Naming convention for page files, e.g. '{Name}View.vue' or '{Name}Page.tsx' */
  pageFileNaming(pagePath: string): string;

  /** File path for the router registration file, or null if not applicable */
  routerFile(): string | null;
}

// --- Integration sub-adapter ---

export interface IntegrationAdapter {
  /** Resolve a page path (e.g. 'auth/login') to a file path relative to the pages directory */
  resolvePagePath(config: ProjectConfig, pagePath: string): string;
}

// --- Top-level adapter ---

export interface TechStackAdapter {
  id: string;
  displayName: string;
  backend: BackendAdapter;
  frontend: FrontendAdapter;
  integration: IntegrationAdapter;

  /** Return the conventional file extension for a given file type */
  fileExtension(type: FileType): string;

  /** Map an artifact type to its directory key in ProjectConfig.directories */
  directoryFor(artifact: ArtifactType): string | undefined;
}

// --- Prompt helpers (shared across adapters) ---

export function formatRoutesForPrompt(routes: SceneApiRoute[]): string {
  return routes.map(r => `  ${r.method} ${r.path} — ${r.description}`).join('\n');
}

export function groupRoutesByPrefix(routes: SceneApiRoute[]): Map<string, SceneApiRoute[]> {
  const groups = new Map<string, SceneApiRoute[]>();
  for (const route of routes) {
    const parts = route.path.replace(/^\/api\//, '').split('/');
    const prefix = parts[0] || 'default';
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix)!.push(route);
  }
  return groups;
}
