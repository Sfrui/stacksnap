export interface ProjectConfig {
  framework: 'nextjs' | 'express-react' | 'express-vue' | 'unknown';
  orm: 'prisma' | 'drizzle' | 'sequelize' | 'none';
  typescript: boolean;
  directories: {
    schema?: string;
    services?: string;
    middleware?: string;
    apiRoutes?: string;
    pages?: string;
    components?: string;
    hooks?: string;
    types?: string;
    router?: string;
    stores?: string;
  };
  packageManager: 'npm' | 'yarn' | 'pnpm';
  locale?: string;
  uiLibrary?: string;
}

export interface SceneDependency {
  package: string;
  version: string;
}

export interface SceneEntity {
  name: string;
  fields: Record<string, string>;
}

export interface SceneApiRoute {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
}

export interface SceneFrontendFile {
  path: string;
  description: string;
}

export interface SceneFrontend {
  pages: SceneFrontendFile[];
  components: SceneFrontendFile[];
  hooks: SceneFrontendFile[];
}

export interface SceneTypeFile {
  path: string;
  description: string;
}

export interface GeneratedFile {
  action: 'create' | 'modify';
  filePath: string;
  content: string;
}

export interface SceneDefinition {
  name: string;
  description: string;
  version: string;
  stackCompatibility: string[];
  dependsOn?: string[];
  dependencies: SceneDependency[];
  entities: SceneEntity[];
  api: SceneApiRoute[];
  frontend: SceneFrontend;
  types: SceneTypeFile[];
}
