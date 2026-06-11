import { SceneDefinition, ProjectConfig, SceneApiRoute } from '../types';

// --- Schema prompt (existing) ---

export function buildSchemaPrompt(
  scene: SceneDefinition,
  config: ProjectConfig,
  existingSchema: string,
): string | null {
  const newEntities = scene.entities.filter(
    (e) => !existingSchema.includes(`model ${e.name}`) &&
           !existingSchema.includes(`${e.name}`) &&
           !existingSchema.includes(e.name.toLowerCase()),
  );

  if (newEntities.length === 0) {
    return null;
  }

  const entityDescriptions = newEntities
    .map((e) => {
      const fieldLines = Object.entries(e.fields)
        .map(([name, type]) => `    ${name} ${type}`)
        .join('\n');
      return `  - ${e.name}:\n${fieldLines}`;
    })
    .join('\n\n');

  if (config.orm === 'sequelize') {
    return `You are a Sequelize ORM expert. Given the required models below, output complete Sequelize model definition files.

Rules:
- Output each model as a separate JavaScript file using sequelize.define().
- Each file must export a function that takes (sequelize, DataTypes) and returns the model.
- Use the exact field definitions provided, converting Prisma syntax to Sequelize DataTypes.
- Add a comment: // [stacksnap] ${scene.name} - <ModelName>
- Use JavaScript (not TypeScript).
- Define associations in a comment block at the end of each file.
- Follow Sequelize v6 conventions.

--- NEW MODELS REQUIRED ---
${entityDescriptions}
--- END NEW MODELS REQUIRED ---

Prisma to Sequelize type mapping:
- String → DataTypes.STRING
- String @id @default(uuid()) → DataTypes.UUID with primaryKey and defaultValue: DataTypes.UUIDV4
- String @unique → DataTypes.STRING with unique: true
- Boolean @default(false) → DataTypes.BOOLEAN with defaultValue: false
- DateTime @default(now()) → DataTypes.DATE with defaultValue: DataTypes.NOW
- DateTime @updatedAt → DataTypes.DATE

Output the Sequelize model files now, one after another with a filename header like "// FILE: VerificationToken.js" (use ONLY the filename, no directory path). No explanations or markdown fences — output ONLY the code.`;
  }

  return `You are a Prisma schema expert. Given the existing schema and the required new models below, output ONLY the new model blocks to be appended.

Rules:
- Output only new model definitions, no explanations.
- Each new model must be preceded by a comment: // [stacksnap] ${scene.name} - <ModelName>
- Do NOT duplicate or modify any existing models.
- Use the exact field definitions provided.
- Follow the existing schema's conventions (e.g., id generation, timestamps).

--- EXISTING SCHEMA ---
${existingSchema}
--- END EXISTING SCHEMA ---

--- NEW MODELS REQUIRED ---
${entityDescriptions}
--- END NEW MODELS REQUIRED ---

Output the Prisma model blocks now:`;
}

// --- Helpers ---

function groupRoutesByPrefix(routes: SceneApiRoute[]): Map<string, SceneApiRoute[]> {
  const groups = new Map<string, SceneApiRoute[]>();
  for (const route of routes) {
    const parts = route.path.replace(/^\/api\//, '').split('/');
    const prefix = parts[0] || 'default';
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix)!.push(route);
  }
  return groups;
}

function formatRoutesForPrompt(routes: SceneApiRoute[]): string {
  return routes.map(r => `  ${r.method} ${r.path} — ${r.description}`).join('\n');
}

// --- Service prompt ---

export function buildServicePrompt(
  scene: SceneDefinition,
  config: ProjectConfig,
  modelCode: string,
  refService: string,
): string | null {
  if (!scene.api || scene.api.length === 0) return null;

  const groups = groupRoutesByPrefix(scene.api);
  const routeList = formatRoutesForPrompt(scene.api);

  return `You are an Express.js backend expert. Generate service files for the following API endpoints.

Rules:
- Each service file uses CommonJS (require/module.exports).
- Export individual async functions: module.exports = { fn1, fn2, ... }
- Use Sequelize models imported from '../models' (e.g., const { User, VerificationToken } = require('../models');)
- For list endpoints, accept { page = 1, pageSize = 10, ...filters } and return { list: rows, total: count } using Model.findAndCountAll()
- For single-item endpoints, use Model.findByPk() or Model.findOne()
- For create endpoints, use Model.create()
- For update endpoints, find by pk, then call .update()
- Throw new Error('message') for error cases (the global error handler catches them).
- Use Op from sequelize for queries: const { Op } = require('sequelize');
- Use bcryptjs for password hashing: const bcrypt = require('bcryptjs'); await bcrypt.hash(password, 10) / await bcrypt.compare(password, hash)
- Use jsonwebtoken for JWT: const jwt = require('jsonwebtoken');
- Use uuid for token generation: const { v4: uuidv4 } = require('uuid');
- Add a comment: // [stacksnap] ${scene.name} - <ServiceName>
- Group related endpoints into one service file named <prefix>Service.js

--- REFERENCE SERVICE (follow this exact pattern) ---
${refService}
--- END REFERENCE ---

--- GENERATED MODEL DEFINITIONS ---
${modelCode}
--- END MODEL DEFINITIONS ---

--- API ENDPOINTS TO IMPLEMENT ---
${routeList}
--- END API ENDPOINTS ---

Group the endpoints by URL prefix (e.g., all /api/auth/* go into authService.js).
Output one file after another with "// FILE: <name>Service.js" headers. No explanations or markdown fences — output ONLY the code.`;
}

// --- Route prompt ---

export function buildRoutePrompt(
  scene: SceneDefinition,
  config: ProjectConfig,
  serviceCode: string,
  refRoute: string,
  routeIndexContent: string,
): string | null {
  if (!scene.api || scene.api.length === 0) return null;

  const groups = groupRoutesByPrefix(scene.api);
  const routeList = formatRoutesForPrompt(scene.api);

  const registrationLines: string[] = [];
  for (const [prefix] of groups) {
    const routeFileName = prefix === 'auth' ? 'auth' : prefix;
    registrationLines.push(`const ${prefix}Routes = require('./${routeFileName}');`);
    registrationLines.push(`router.use('/${prefix}', ${prefix}Routes);`);
  }

  return `You are an Express.js routing expert. Generate route files for the following API endpoints.

Rules:
- Each route file uses CommonJS (require/module.exports).
- Pattern: const express = require('express'); const router = express.Router();
- Import the matching service: const xxxService = require('../services/xxxService');
- Import auth middleware: const { auth } = require('../middleware/auth');
- Import rbac middleware: const { checkPermission } = require('../middleware/rbac');
- Import response utils: const { success, error, page } = require('../utils/response');
- Every protected route MUST use: auth, checkPermission('module:action')
- Route handler pattern: router.method('/path', auth, checkPermission('module:action'), async (req, res, next) => { try { ... } catch (err) { next(err); } })
- Use page(res, list, total, pageNum, pageSize) for paginated GET endpoints
- Use success(res, data, 'message') for successful responses
- Use error(res, 'message', 400) for validation errors
- module.exports = router;
- Add a comment: // [stacksnap] ${scene.name} - <RouteName>
- Use Chinese error/success messages matching the reference

--- REFERENCE ROUTE FILE (follow this exact pattern) ---
${refRoute}
--- END REFERENCE ---

--- GENERATED SERVICE CODE ---
${serviceCode}
--- END SERVICE CODE ---

--- API ENDPOINTS TO IMPLEMENT ---
${routeList}
--- END API ENDPOINTS ---

After all route files, output ONE MORE block with header "// FILE: __ROUTE_REGISTRATION__" containing ONLY the registration lines for routes/index.js:
${registrationLines.join('\n')}

Output all files with "// FILE: <name>.js" headers. No explanations or markdown fences — output ONLY the code.`;
}

// --- Frontend API module prompt ---

export function buildApiModulePrompt(
  scene: SceneDefinition,
  config: ProjectConfig,
  refApiModule: string,
): string | null {
  if (!scene.api || scene.api.length === 0) return null;

  const routeList = scene.api.map(r => {
    const method = r.method.toLowerCase();
    const apiPath = r.path.replace(/^\/api/, '');
    return `  ${method} '${apiPath}' — ${r.description}`;
  }).join('\n');

  return `You are a frontend API module expert. Generate JavaScript API modules for calling the backend endpoints.

Rules:
- Use ESM syntax: import request from './index'
- Export named functions: export function xxx(params/data) { return request.get/post/put/delete('/path', { params }) }
- For GET requests with query params: request.get('/path', { params })
- For POST/PUT requests with body data: request.post('/path', data) or request.put('/path', data)
- Paths must NOT include /api prefix (the axios baseURL already handles it)
- Function names should be descriptive (e.g., login, register, getProfile, updateProfile)
- Add a comment: // [stacksnap] ${scene.name}
- Group all endpoints from the same prefix into one module file

--- REFERENCE API MODULE (follow this exact pattern) ---
${refApiModule}
--- END REFERENCE ---

--- ENDPOINTS TO IMPLEMENT ---
${routeList}
--- END ENDPOINTS ---

Output files with "// FILE: <name>.js" headers. No explanations or markdown fences — output ONLY the code.`;
}

// --- Page prompt ---

export function buildPagePrompt(
  scene: SceneDefinition,
  config: ProjectConfig,
  refPage: string,
  apiFunctions: string,
): string | null {
  if (!scene.frontend.pages || scene.frontend.pages.length === 0) return null;

  const pageDescriptions = scene.frontend.pages
    .map(p => `  - ${p.path}: ${p.description}`)
    .join('\n');

  return `You are a Vue 3 frontend expert. Generate Vue 3 Single File Components (SFC) for the following pages.

Rules:
- Use Vue 3 <script setup> with Composition API (ref, computed, onMounted, reactive)
- Use Element Plus components: el-button, el-card, el-form, el-form-item, el-input, el-table, el-tag, el-dialog, el-row, el-col, el-message, el-switch, el-select, el-option, el-upload, el-avatar
- Use Element Plus icons from '@element-plus/icons-vue'
- Import DataTable from '@/components/common/DataTable.vue' for table views
- Import API functions from '@/api/<module>'
- Use CSS custom properties: var(--text-primary), var(--text-secondary), var(--bg-primary), var(--bg-tertiary), var(--radius-lg), var(--radius-md), var(--shadow-sm), var(--shadow-md), var(--border-light), var(--success-color), var(--warning-color), var(--danger-color), var(--transition-normal)
- All UI text must be in Chinese
- Use scoped CSS with modern design (gradient backgrounds, rounded corners, shadows)
- For form pages: use el-form with :model and :rules for validation
- For login/register pages: use centered card layout with logo/branding area
- Page structure: <template> at top, <script setup> in middle, <style scoped> at bottom

--- REFERENCE PAGE (follow this exact style) ---
${refPage}
--- END REFERENCE ---

--- AVAILABLE API FUNCTIONS ---
${apiFunctions}
--- END API FUNCTIONS ---

--- PAGES TO GENERATE ---
${pageDescriptions}
--- END PAGES ---

Output Vue SFC files with "// FILE: <name>.vue" headers. Each file must be a complete, working Vue 3 SFC. No explanations or markdown fences — output ONLY the code.`;
}

// --- Hook prompt ---

export function buildHookPrompt(
  scene: SceneDefinition,
  config: ProjectConfig,
  refHook: string,
  apiFunctions: string,
): string | null {
  if (!scene.frontend.hooks || scene.frontend.hooks.length === 0) return null;

  const hookDescriptions = scene.frontend.hooks
    .map(h => `  - ${h.path}: ${h.description}`)
    .join('\n');

  return `You are a Vue 3 composable expert. Generate composable hook files.

Rules:
- Export named composable functions: export function useXxx() { ... }
- Use Vue Composition API: ref, computed, reactive, watch
- Use vue-router: useRouter, useRoute
- Import Pinia stores if needed: import { useUserStore } from '@/stores/user'
- Import API functions from '@/api/<module>'
- Return an object with reactive state and methods
- Use ElMessage from 'element-plus' for success/error notifications
- All messages in Chinese

--- REFERENCE HOOK (follow this exact pattern) ---
${refHook}
--- END REFERENCE ---

--- AVAILABLE API FUNCTIONS ---
${apiFunctions}
--- END API FUNCTIONS ---

--- HOOKS TO GENERATE ---
${hookDescriptions}
--- END HOOKS ---

Output hook files with "// FILE: <name>.js" headers. No explanations or markdown fences — output ONLY the code.`;
}

// --- Component prompt ---

export function buildComponentPrompt(
  scene: SceneDefinition,
  config: ProjectConfig,
  refComponent: string,
  apiFunctions: string,
): string | null {
  if (!scene.frontend.components || scene.frontend.components.length === 0) return null;

  const componentDescriptions = scene.frontend.components
    .map(c => `  - ${c.path}: ${c.description}`)
    .join('\n');

  return `You are a Vue 3 component expert. Generate reusable Vue 3 SFC components.

Rules:
- Use Vue 3 <script setup> with Composition API
- Use Element Plus components: el-form, el-form-item, el-input, el-button, el-select, el-option, el-upload, el-avatar, el-dialog, el-tag, el-switch
- Use Element Plus icons from '@element-plus/icons-vue'
- Use defineProps() and defineEmits() for component API
- Use CSS custom properties: var(--text-primary), var(--text-secondary), var(--bg-primary), var(--radius-lg), var(--radius-md), var(--shadow-sm), var(--border-light), var(--success-color), var(--warning-color), var(--danger-color)
- All UI text must be in Chinese
- Use scoped CSS with modern design
- Component structure: <template> at top, <script setup> in middle, <style scoped> at bottom
- Each component should be self-contained and reusable

--- REFERENCE COMPONENT (follow this exact style) ---
${refComponent}
--- END REFERENCE ---

--- AVAILABLE API FUNCTIONS ---
${apiFunctions}
--- END API FUNCTIONS ---

--- COMPONENTS TO GENERATE ---
${componentDescriptions}
--- END COMPONENTS ---

Output Vue SFC files with "// FILE: <name>.vue" headers. Each file must be a complete, working Vue 3 SFC. No explanations or markdown fences — output ONLY the code.`;
}

// --- Model index update prompt ---

export function buildModelIndexPrompt(
  scene: SceneDefinition,
  config: ProjectConfig,
  modelNames: string[],
  existingModelIndex: string,
): string | null {
  if (modelNames.length === 0) return null;

  return `You are a Sequelize model registry expert. Given the existing models/index.js and newly generated models, output ONLY the lines that need to be added.

Rules:
- Add require() lines for each new model (e.g., const NewModel = require('./NewModel');)
- Add association definitions (belongsTo/hasMany) if the new models have foreign keys
- Output the lines to INSERT into models/index.js, wrapped in // @stacksnap added and // @stacksnap end markers
- Do NOT output the entire file — only the new lines

--- EXISTING models/index.js ---
${existingModelIndex}
--- END EXISTING ---

--- NEW MODEL NAMES ---
${modelNames.join(', ')}
--- END NEW MODEL NAMES ---

Output the code to insert. Use "// FILE: __MODEL_INDEX__" as the header. No explanations or markdown fences — output ONLY the code.`;
}

// --- Router registration prompt ---

export function buildRouterPrompt(
  scene: SceneDefinition,
  config: ProjectConfig,
  existingRouterContent: string,
): string | null {
  if (!scene.frontend.pages || scene.frontend.pages.length === 0) return null;

  const routeEntries = scene.frontend.pages.map(p => {
    const parts = p.path.split('/');
    const name = parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
    return { path: p.path, name, description: p.description };
  });

  const routeListStr = routeEntries
    .map(r => `  { path: '/${r.path}', name: '${r.name}', component: () => import('@/views/${r.path}/${r.name}View.vue') }`)
    .join(',\n');

  return `You are a Vue Router expert. Output ONLY the route entries that need to be added to the router config.

Rules:
- Each route needs: path, name, and component (lazy-loaded with () => import(...))
- Wrap output in // @stacksnap added and // @stacksnap end markers
- Use "// FILE: __ROUTER_REGISTRATION__" as the header

--- EXISTING ROUTER CONFIG ---
${existingRouterContent}
--- END EXISTING ---

--- NEW ROUTES TO ADD ---
${routeListStr}
--- END NEW ROUTES ---

Output the route entries to insert. No explanations or markdown fences — output ONLY the code.`;
}
