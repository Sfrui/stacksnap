import { SceneDefinition, SceneApiRoute } from '../../../../types';
import { LocaleConfig } from '../../../types';

// ============================================================
// React + Ant Design frontend prompt builders
// ============================================================

// --- Frontend API module prompt ---

export function buildReactApiModulePrompt(
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

  return `You are a frontend API module expert. Generate TypeScript API modules for calling the backend endpoints.

Rules:
- Use TypeScript with proper type annotations
- Use ESM syntax: import request from './request'
- Export named functions: export function xxx(params: XxxParams): Promise<XxxResponse> { return request.get/post/put/delete('/path', { params }) }
- For GET requests with query params: request.get('/path', { params })
- For POST/PUT requests with body data: request.post('/path', data) or request.put('/path', data)
- Paths must NOT include /api prefix (the axios baseURL already handles it)
- Function names should be descriptive (e.g., login, register, getProfile, updateProfile)
- Add a comment: // [stacksnap] ${sceneName}
- Group all endpoints from the same prefix into one module file
- Define request/response interfaces inline or import from '@/types'

--- REFERENCE API MODULE (follow this exact pattern) ---
${refApiModule}
--- END REFERENCE ---

--- ENDPOINTS TO IMPLEMENT ---
${routeList}
--- END ENDPOINTS ---

Output files with "// FILE: <name>.ts" headers. No explanations or markdown fences — output ONLY the code.`;
}

// --- Page prompt ---

export function buildReactPagePrompt(
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

  return `You are a React frontend expert. Generate React functional components for the following pages.

Rules:
- Use React functional components with hooks (useState, useEffect, useCallback, useMemo)
- Use Ant Design components: Button, Card, Form, Form.Item, Input, Table, Tag, Modal, Row, Col, message, Switch, Select, Upload, Avatar, Space, Typography
- Use Ant Design icons from '@ant-design/icons'
- Use react-router-dom for navigation: useNavigate, useParams, useLocation, Navigate
- Use TypeScript with proper type annotations for props and state
- Import API functions from '@/api/<module>'
- ${locale.uiLanguageInstruction}
- Use CSS Modules (import styles from './PageName.module.css') or styled-components
- For form pages: use Form with Form.Item and onFinish handler
- For login/register pages: use centered card layout with logo/branding area
- For table pages: use Table with columns definition and dataSource
- Use message.success(), message.error() for notifications
- Page structure: export default function PageName() { ... }

--- REFERENCE PAGE (follow this exact style) ---
${refPage}
--- END REFERENCE ---

--- AVAILABLE API FUNCTIONS ---
${apiFunctions}
--- END API FUNCTIONS ---

--- PAGES TO GENERATE ---
${pageDescriptions}
--- END PAGES ---

Output React component files with "// FILE: <name>.tsx" headers. Each file must be a complete, working React component. No explanations or markdown fences — output ONLY the code.`;
}

// --- Hook prompt ---

export function buildReactHookPrompt(
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

  return `You are a React hooks expert. Generate custom React hook files.

Rules:
- Export named hook functions: export function useXxx() { ... }
- Use React hooks: useState, useEffect, useCallback, useMemo, useRef, useContext
- Use react-router-dom: useNavigate, useParams, useLocation
- Import API functions from '@/api/<module>'
- Return an object with state and methods: { data, loading, error, fetchData }
- Use Ant Design message for success/error notifications
- ${locale.uiLanguageInstruction}
- Use TypeScript with proper type annotations

--- REFERENCE HOOK (follow this exact pattern) ---
${refHook}
--- END REFERENCE ---

--- AVAILABLE API FUNCTIONS ---
${apiFunctions}
--- END API FUNCTIONS ---

--- HOOKS TO GENERATE ---
${hookDescriptions}
--- END HOOKS ---

Output hook files with "// FILE: <name>.ts" headers. No explanations or markdown fences — output ONLY the code.`;
}

// --- Component prompt ---

export function buildReactComponentPrompt(
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

  return `You are a React component expert. Generate reusable React components.

Rules:
- Use React functional components with TypeScript
- Use Ant Design components: Form, Form.Item, Input, Button, Select, Upload, Avatar, Modal, Tag, Switch, Space
- Use Ant Design icons from '@ant-design/icons'
- Use TypeScript interface for component props: interface XxxProps { ... }
- ${locale.uiLanguageInstruction}
- Use CSS Modules (import styles from './ComponentName.module.css') or inline styles
- Each component should be self-contained and reusable
- Export default or named export

--- REFERENCE COMPONENT (follow this exact style) ---
${refComponent}
--- END REFERENCE ---

--- AVAILABLE API FUNCTIONS ---
${apiFunctions}
--- END API FUNCTIONS ---

--- COMPONENTS TO GENERATE ---
${componentDescriptions}
--- END COMPONENTS ---

Output React component files with "// FILE: <name>.tsx" headers. Each file must be a complete, working React component. No explanations or markdown fences — output ONLY the code.`;
}

// --- Router prompt ---

export function buildReactRouterPrompt(
  pages: SceneDefinition['frontend']['pages'],
  existingRouterContent: string,
): string | null {
  if (!pages || pages.length === 0) return null;

  const routeEntries = pages.map(p => {
    const parts = p.path.split('/');
    const componentName = parts.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
    return { path: p.path, componentName, description: p.description };
  });

  const routeListStr = routeEntries
    .map(r => `  { path: '/${r.path}', element: <${r.componentName}Page /> }`)
    .join(',\n');

  return `You are a React Router expert. Output ONLY the route entries that need to be added to the router config.

Rules:
- Each route needs: path and element (using React.lazy or direct import)
- Wrap output in // @stacksnap added and // @stacksnap end markers
- Use "// FILE: __ROUTER_REGISTRATION__" as the header
- Use React Router v6 syntax

--- EXISTING ROUTER CONFIG ---
${existingRouterContent}
--- END EXISTING ---

--- NEW ROUTES TO ADD ---
${routeListStr}
--- END NEW ROUTES ---

Output the route entries to insert. No explanations or markdown fences — output ONLY the code.`;
}

// --- Type prompt ---

export function buildReactTypePrompt(
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
- Include both request input types and response types where applicable

--- EXISTING TYPES ---
${existingTypes}
--- END EXISTING ---

--- TYPE DEFINITIONS TO GENERATE ---
${typeDescriptions}
--- END TYPE DEFINITIONS ---

Output .ts files with "// FILE: <name>.ts" headers. No explanations or markdown fences — output ONLY the code.`;
}
