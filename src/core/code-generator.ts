import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { SceneDefinition, ProjectConfig, GeneratedFile } from '../types';
import {
  buildSchemaPrompt,
  buildServicePrompt,
  buildRoutePrompt,
  buildApiModulePrompt,
  buildPagePrompt,
  buildHookPrompt,
  buildComponentPrompt,
  buildModelIndexPrompt,
  buildRouterPrompt,
} from './prompt-factory';

let _callAI: ((prompt: string) => Promise<string>) | null = null;

export function setCallAIOverride(fn: (prompt: string) => Promise<string>): void {
  _callAI = fn;
}

export async function callAI(prompt: string): Promise<string> {
  if (_callAI) return _callAI(prompt);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set.');
  }
  const baseURL = process.env.OPENAI_BASE_URL || undefined;
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const client = new OpenAI({ apiKey, baseURL });
  const response = await client.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [{ role: 'user', content: prompt }],
  });
  return response.choices[0].message.content ?? '';
}

// --- Generic multi-file parser ---

function parseMultiFileOutput(aiOutput: string, targetDir: string, cwd?: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const fileRegex = /\/\/\s*FILE:\s*(\S+)\s*\n([\s\S]*?)(?=\/\/\s*FILE:|$)/g;
  let match;

  while ((match = fileRegex.exec(aiOutput)) !== null) {
    let fileName = match[1].trim();
    const content = match[2].trim();

    // Skip special registration blocks — handled separately
    if (fileName.startsWith('__')) continue;

    // Ensure correct extension for Vue pages
    if (targetDir.includes('views') && !fileName.endsWith('.vue')) {
      fileName = fileName.replace(/\.js$/, '') + '.vue';
    }

    const filePath = path.join(targetDir, fileName);
    const fileExists = cwd ? fs.existsSync(path.join(cwd, filePath)) : false;

    files.push({
      action: fileExists ? 'modify' : 'create',
      filePath,
      content,
    });
  }

  return files;
}

function parseSpecialBlock(aiOutput: string, blockName: string): string | null {
  const regex = new RegExp(`//\\s*FILE:\\s*${blockName}\\s*\\n([\\s\\S]*?)(?=//\\s*FILE:|$)`);
  const match = regex.exec(aiOutput);
  return match ? match[1].trim() : null;
}

// --- Reference file reader ---

function readFirstFile(dirPath: string, cwd: string): string {
  const absDir = path.join(cwd, dirPath);
  if (!fs.existsSync(absDir)) return '';
  const entries = fs.readdirSync(absDir).filter(f =>
    f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.vue'),
  );
  if (entries.length === 0) return '';
  // Pick the largest file as it likely has the most patterns
  let best = entries[0];
  let bestSize = 0;
  for (const f of entries) {
    const size = fs.statSync(path.join(absDir, f)).size;
    if (size > bestSize) { bestSize = size; best = f; }
  }
  return fs.readFileSync(path.join(absDir, best), 'utf-8');
}

function readAllFiles(dirPath: string, cwd: string): string {
  const absDir = path.join(cwd, dirPath);
  if (!fs.existsSync(absDir)) return '';
  const entries = fs.readdirSync(absDir).filter(f =>
    f.endsWith('.js') || f.endsWith('.ts'),
  );
  return entries.map(f => fs.readFileSync(path.join(absDir, f), 'utf-8')).join('\n');
}

function readFileIfExists(filePath: string, cwd: string): string {
  const absPath = path.join(cwd, filePath);
  return fs.existsSync(absPath) ? fs.readFileSync(absPath, 'utf-8') : '';
}

// Read existing stacksnap-generated code from a directory (for multi-scene context)
function readStacksnapCode(dirPath: string, cwd: string): string {
  const absDir = path.join(cwd, dirPath);
  if (!fs.existsSync(absDir)) return '';
  const entries = fs.readdirSync(absDir).filter(f =>
    f.endsWith('.js') || f.endsWith('.ts') || f.endsWith('.vue'),
  );
  const blocks: string[] = [];
  for (const f of entries) {
    const content = fs.readFileSync(path.join(absDir, f), 'utf-8');
    // Extract @stacksnap blocks for context
    const stacksnapMatch = content.match(/\/\/\s*@stacksnap\s+added[\s\S]*?\/\/\s*@stacksnap\s+end/g);
    if (stacksnapMatch) {
      blocks.push(`// From ${f}:\n${stacksnapMatch.join('\n')}`);
    }
  }
  return blocks.join('\n\n');
}

// --- Schema generation (existing logic, refactored) ---

async function generateSchema(
  scene: SceneDefinition,
  config: ProjectConfig,
  cwd: string,
): Promise<{ files: GeneratedFile[]; generatedModelCode: string }> {
  if (scene.entities.length === 0 || !config.directories.schema) {
    return { files: [], generatedModelCode: '' };
  }

  const schemaRelPath = config.directories.schema;
  const schemaAbsPath = path.join(cwd, schemaRelPath);
  const isDirectory = fs.existsSync(schemaAbsPath) && fs.statSync(schemaAbsPath).isDirectory();

  let existingSchema = '';
  if (isDirectory) {
    const modelFiles = fs.readdirSync(schemaAbsPath).filter(f => f.endsWith('.js') || f.endsWith('.ts'));
    existingSchema = modelFiles.map(f => fs.readFileSync(path.join(schemaAbsPath, f), 'utf-8')).join('\n');
  } else {
    existingSchema = fs.existsSync(schemaAbsPath) ? fs.readFileSync(schemaAbsPath, 'utf-8') : '';
  }

  const prompt = buildSchemaPrompt(scene, config, existingSchema);
  if (prompt === null) return { files: [], generatedModelCode: '' };

  const aiOutput = await callAI(prompt);

  if (config.orm === 'sequelize' && isDirectory) {
    const files = parseMultiFileOutput(aiOutput, schemaRelPath, cwd);
    return { files, generatedModelCode: aiOutput };
  } else {
    const file: GeneratedFile = {
      action: fs.existsSync(schemaAbsPath) ? 'modify' : 'create',
      filePath: schemaRelPath,
      content: aiOutput,
    };
    return { files: [file], generatedModelCode: aiOutput };
  }
}

// --- Service generation ---

async function generateServices(
  scene: SceneDefinition,
  config: ProjectConfig,
  cwd: string,
  modelCode: string,
): Promise<GeneratedFile[]> {
  if (!scene.api || scene.api.length === 0 || !config.directories.services) return [];

  const refService = readFirstFile(config.directories.services, cwd);
  const existingStacksnap = readStacksnapCode(config.directories.services, cwd);
  const contextRef = existingStacksnap
    ? `${refService}\n\n--- EXISTING STACKSNAP CODE (do not duplicate) ---\n${existingStacksnap}\n--- END EXISTING STACKSNAP ---`
    : refService;
  const prompt = buildServicePrompt(scene, config, modelCode, contextRef);
  if (!prompt) return [];

  const aiOutput = await callAI(prompt);
  return parseMultiFileOutput(aiOutput, config.directories.services, cwd);
}

// --- Route generation ---

async function generateRoutes(
  scene: SceneDefinition,
  config: ProjectConfig,
  cwd: string,
  serviceCode: string,
): Promise<{ files: GeneratedFile[]; routeCode: string }> {
  if (!scene.api || scene.api.length === 0 || !config.directories.apiRoutes) {
    return { files: [], routeCode: '' };
  }

  const refRoute = readFirstFile(config.directories.apiRoutes, cwd);
  const existingStacksnapRoutes = readStacksnapCode(config.directories.apiRoutes, cwd);
  const contextRefRoute = existingStacksnapRoutes
    ? `${refRoute}\n\n--- EXISTING STACKSNAP CODE (do not duplicate routes) ---\n${existingStacksnapRoutes}\n--- END EXISTING STACKSNAP ---`
    : refRoute;
  const routeIndexContent = readFileIfExists(
    path.join(config.directories.apiRoutes, 'index.js'),
    cwd,
  );

  const prompt = buildRoutePrompt(scene, config, serviceCode, contextRefRoute, routeIndexContent);
  if (!prompt) return { files: [], routeCode: '' };

  const aiOutput = await callAI(prompt);
  const files = parseMultiFileOutput(aiOutput, config.directories.apiRoutes, cwd);

  // Parse __ROUTE_REGISTRATION__ block for injecting into routes/index.js
  const regBlock = parseSpecialBlock(aiOutput, '__ROUTE_REGISTRATION__');
  if (regBlock) {
    files.push({
      action: 'modify',
      filePath: path.join(config.directories.apiRoutes, 'index.js'),
      content: regBlock,
    });
  }

  return { files, routeCode: aiOutput };
}

// --- Frontend API module generation ---

async function generateApiModules(
  scene: SceneDefinition,
  config: ProjectConfig,
  cwd: string,
): Promise<GeneratedFile[]> {
  if (!scene.api || scene.api.length === 0) {
    // Derive api directory from pages/components directory
    const apiDir = config.directories.pages
      ? path.dirname(config.directories.pages) + '/api'
      : undefined;
    if (!apiDir) return [];
  }

  // Frontend api directory is typically sibling to views
  const apiDir = config.directories.pages
    ? path.join(path.dirname(config.directories.pages), 'api')
    : 'frontend/src/api';

  const refApiModule = readFirstFile(apiDir, cwd);
  const existingStacksnapApi = readStacksnapCode(apiDir, cwd);
  const contextRefApi = existingStacksnapApi
    ? `${refApiModule}\n\n--- EXISTING STACKSNAP CODE (do not duplicate functions) ---\n${existingStacksnapApi}\n--- END EXISTING STACKSNAP ---`
    : refApiModule;
  const prompt = buildApiModulePrompt(scene, config, contextRefApi);
  if (!prompt) return [];

  const aiOutput = await callAI(prompt);
  return parseMultiFileOutput(aiOutput, apiDir, cwd);
}

// --- Page generation ---

async function generatePages(
  scene: SceneDefinition,
  config: ProjectConfig,
  cwd: string,
  apiFunctions: string,
): Promise<GeneratedFile[]> {
  if (!scene.frontend.pages || scene.frontend.pages.length === 0 || !config.directories.pages) return [];

  const refPage = readFirstFile(config.directories.pages, cwd);
  const prompt = buildPagePrompt(scene, config, refPage, apiFunctions);
  if (!prompt) return [];

  const aiOutput = await callAI(prompt);

  // Pages go into subdirectories: views/auth/LoginView.vue, views/profile/ProfileView.vue
  const files: GeneratedFile[] = [];
  const fileRegex = /\/\/\s*FILE:\s*(\S+)\s*\n([\s\S]*?)(?=\/\/\s*FILE:|$)/g;
  let match;

  while ((match = fileRegex.exec(aiOutput)) !== null) {
    const fileName = match[1].trim();
    const content = match[2].trim();

    // Find the matching scene page to determine subdirectory
    const scenePage = scene.frontend.pages.find(p => {
      const parts = p.path.split('/');
      const expectedName = parts[parts.length - 1];
      return fileName.toLowerCase().includes(expectedName.toLowerCase());
    });

    let filePath: string;
    if (scenePage) {
      const dirName = scenePage.path; // e.g., 'auth/login' or 'profile'
      const nameParts = dirName.split('/');
      const viewName = nameParts[nameParts.length - 1]
        .split('-')
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join('') + 'View.vue';
      filePath = path.join(config.directories.pages, ...nameParts.slice(0, -1), viewName);
    } else {
      filePath = path.join(config.directories.pages, fileName);
    }

    files.push({ action: 'create', filePath, content });
  }

  return files;
}

// --- Hook generation ---

async function generateHooks(
  scene: SceneDefinition,
  config: ProjectConfig,
  cwd: string,
  apiFunctions: string,
): Promise<GeneratedFile[]> {
  if (!scene.frontend.hooks || scene.frontend.hooks.length === 0 || !config.directories.hooks) return [];

  const refHook = readFirstFile(config.directories.hooks, cwd);
  const prompt = buildHookPrompt(scene, config, refHook, apiFunctions);
  if (!prompt) return [];

  const aiOutput = await callAI(prompt);
  return parseMultiFileOutput(aiOutput, config.directories.hooks, cwd);
}

// --- Component generation ---

async function generateComponents(
  scene: SceneDefinition,
  config: ProjectConfig,
  cwd: string,
  apiFunctions: string,
): Promise<GeneratedFile[]> {
  if (!scene.frontend.components || scene.frontend.components.length === 0 || !config.directories.components) return [];

  const refComponent = readFirstFile(config.directories.components, cwd);
  const prompt = buildComponentPrompt(scene, config, refComponent, apiFunctions);
  if (!prompt) return [];

  const aiOutput = await callAI(prompt);
  return parseMultiFileOutput(aiOutput, config.directories.components, cwd);
}

// --- Model index update ---

async function generateModelIndexUpdate(
  scene: SceneDefinition,
  config: ProjectConfig,
  cwd: string,
  modelNames: string[],
): Promise<GeneratedFile | null> {
  if (modelNames.length === 0 || !config.directories.schema) return null;

  const indexFile = path.join(cwd, config.directories.schema, 'index.js');
  if (!fs.existsSync(indexFile)) return null;

  const existingIndex = fs.readFileSync(indexFile, 'utf-8');
  const prompt = buildModelIndexPrompt(scene, config, modelNames, existingIndex);
  if (!prompt) return null;

  const aiOutput = await callAI(prompt);
  const block = parseSpecialBlock(aiOutput, '__MODEL_INDEX__') || aiOutput;

  return {
    action: 'modify',
    filePath: path.join(config.directories.schema, 'index.js'),
    content: block,
  };
}

// --- Router registration ---

async function generateRouterRegistration(
  scene: SceneDefinition,
  config: ProjectConfig,
  cwd: string,
): Promise<GeneratedFile | null> {
  if (!scene.frontend.pages || scene.frontend.pages.length === 0 || !config.directories.router) return null;

  const routerFile = path.join(config.directories.router, 'index.js');
  if (!fs.existsSync(routerFile)) return null;

  const existingRouter = fs.readFileSync(routerFile, 'utf-8');
  const prompt = buildRouterPrompt(scene, config, existingRouter);
  if (!prompt) return null;

  const aiOutput = await callAI(prompt);
  const block = parseSpecialBlock(aiOutput, '__ROUTER_REGISTRATION__') || aiOutput;

  return {
    action: 'modify',
    filePath: path.join(config.directories.router, 'index.js'),
    content: block,
  };
}

// --- Main orchestrator ---

export async function generateSceneCode(
  scene: SceneDefinition,
  config: ProjectConfig,
  cwd: string,
  onProgress?: (step: string) => void,
): Promise<GeneratedFile[]> {
  const allFiles: GeneratedFile[] = [];

  // Batch 1: Schema models
  onProgress?.('Generating backend models...');
  const { files: schemaFiles, generatedModelCode } = await generateSchema(scene, config, cwd);
  allFiles.push(...schemaFiles);

  // Batch 2: Model index registration
  if (schemaFiles.length > 0) {
    const newModelNames = schemaFiles
      .map(f => path.basename(f.filePath, path.extname(f.filePath)))
      .filter(n => n !== 'index');
    const modelIndexUpdate = await generateModelIndexUpdate(scene, config, cwd, newModelNames);
    if (modelIndexUpdate) allFiles.push(modelIndexUpdate);
  }

  // Batch 3: Backend services
  onProgress?.('Generating backend services...');
  const serviceFiles = await generateServices(scene, config, cwd, generatedModelCode);
  allFiles.push(...serviceFiles);

  // Batch 4: Backend routes
  onProgress?.('Generating API routes...');
  const serviceCode = serviceFiles.map(f => f.content).join('\n');
  const { files: routeFiles } = await generateRoutes(scene, config, cwd, serviceCode);
  allFiles.push(...routeFiles);

  // Batch 5: Frontend API modules
  onProgress?.('Generating frontend API modules...');
  const apiModuleFiles = await generateApiModules(scene, config, cwd);
  allFiles.push(...apiModuleFiles);

  // Build API function list for downstream prompts
  const apiFunctions = apiModuleFiles.map(f => f.content).join('\n');

  // Batch 6: Frontend pages
  onProgress?.('Generating frontend pages...');
  const pageFiles = await generatePages(scene, config, cwd, apiFunctions || serviceCode);
  allFiles.push(...pageFiles);

  // Batch 7: Frontend hooks
  onProgress?.('Generating hooks...');
  const hookFiles = await generateHooks(scene, config, cwd, apiFunctions || serviceCode);
  allFiles.push(...hookFiles);

  // Batch 8: Frontend components
  onProgress?.('Generating components...');
  const componentFiles = await generateComponents(scene, config, cwd, apiFunctions || serviceCode);
  allFiles.push(...componentFiles);

  // Batch 9: Router registration
  if (pageFiles.length > 0 || componentFiles.length > 0) {
    const routerUpdate = await generateRouterRegistration(scene, config, cwd);
    if (routerUpdate) allFiles.push(routerUpdate);
  }

  return allFiles;
}
