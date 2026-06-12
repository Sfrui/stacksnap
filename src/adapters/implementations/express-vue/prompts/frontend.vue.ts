import { SceneDefinition, SceneApiRoute } from '../../../../types';
import { LocaleConfig } from '../../../types';

// ============================================================
// Vue 3 + Element Plus frontend prompt builders
// ============================================================

// --- Frontend API module prompt ---

export function buildVueApiModulePrompt(
  sceneName: string,
  sceneApi: SceneApiRoute[],
  refApiModule: string,
): string | null {
  if (!sceneApi || sceneApi.length === 0) return null;

  const routeList = sceneApi.map(r => {
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
- Add a comment: // [stacksnap] ${sceneName}
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

export function buildVuePagePrompt(
  sceneName: string,
  pages: SceneDefinition['frontend']['pages'],
  refPage: string,
  apiFunctions: string,
  locale: LocaleConfig,
): string | null {
  if (!pages || pages.length === 0) return null;

  const pageDescriptions = pages
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
- ${locale.uiLanguageInstruction}
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

export function buildVueHookPrompt(
  sceneName: string,
  hooks: SceneDefinition['frontend']['hooks'],
  refHook: string,
  apiFunctions: string,
  locale: LocaleConfig,
): string | null {
  if (!hooks || hooks.length === 0) return null;

  const hookDescriptions = hooks
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
- ${locale.uiLanguageInstruction}

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

export function buildVueComponentPrompt(
  sceneName: string,
  components: SceneDefinition['frontend']['components'],
  refComponent: string,
  apiFunctions: string,
  locale: LocaleConfig,
): string | null {
  if (!components || components.length === 0) return null;

  const componentDescriptions = components
    .map(c => `  - ${c.path}: ${c.description}`)
    .join('\n');

  return `You are a Vue 3 component expert. Generate reusable Vue 3 SFC components.

Rules:
- Use Vue 3 <script setup> with Composition API
- Use Element Plus components: el-form, el-form-item, el-input, el-button, el-select, el-option, el-upload, el-avatar, el-dialog, el-tag, el-switch
- Use Element Plus icons from '@element-plus/icons-vue'
- Use defineProps() and defineEmits() for component API
- Use CSS custom properties: var(--text-primary), var(--text-secondary), var(--bg-primary), var(--radius-lg), var(--radius-md), var(--shadow-sm), var(--border-light), var(--success-color), var(--warning-color), var(--danger-color)
- ${locale.uiLanguageInstruction}
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

// --- Router prompt ---

export function buildVueRouterPrompt(
  pages: SceneDefinition['frontend']['pages'],
  existingRouterContent: string,
): string | null {
  if (!pages || pages.length === 0) return null;

  const routeEntries = pages.map(p => {
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

// --- Type prompt ---

export function buildVueTypePrompt(
  sceneName: string,
  types: SceneDefinition['types'],
  existingTypes: string,
  locale: LocaleConfig,
): string | null {
  if (!types || types.length === 0) return null;

  const typeDescriptions = types
    .map(t => `  - ${t.path}: ${t.description}`)
    .join('\n');

  return `You are a TypeScript type expert. Generate type definition files for the following type definitions.

Rules:
- Export TypeScript interfaces and types
- Use proper TypeScript syntax (not Prisma syntax)
- Add a comment: // [stacksnap] ${sceneName}
- ${locale.uiLanguageInstruction}
- Each type file should export all related interfaces and types
- Use proper TypeScript conventions (readonly, optional, generics where appropriate)

--- EXISTING TYPES ---
${existingTypes}
--- END EXISTING ---

--- TYPE DEFINITIONS TO GENERATE ---
${typeDescriptions}
--- END TYPE DEFINITIONS ---

Output .ts files with "// FILE: <name>.ts" headers. No explanations or markdown fences — output ONLY the code.`;
}
