import { SceneDefinition, SceneApiRoute } from '../../../../types';
import { LocaleConfig } from '../../../types';

// ============================================================
// Next.js App Router + API Route Handlers prompt builders
// ============================================================

export function buildNextjsServicePrompt(
  sceneName: string,
  sceneApi: SceneApiRoute[],
  modelCode: string,
  refService: string,
  locale: LocaleConfig,
  orm: string = 'prisma',
): string | null {
  if (!sceneApi || sceneApi.length === 0) return null;

  const routeList = sceneApi.map(r => `  ${r.method} ${r.path} — ${r.description}`).join('\n');

  const ormImportInstruction = orm === 'drizzle'
    ? `Use Drizzle ORM: import { db } from '@/lib/db'; import { eq, and } from 'drizzle-orm';`
    : `Use Prisma client: import { prisma } from '@/lib/prisma'`;

  const ormQueryPatterns = orm === 'drizzle'
    ? `Use Drizzle query builder: db.select(), db.insert(), db.update(), db.delete() with eq(), and() operators from 'drizzle-orm'`
    : `Use Prisma client methods: prisma.model.findMany(), prisma.model.findUnique(), prisma.model.create(), prisma.model.update()`;

  return `You are a Next.js backend expert. Generate service files for the following API endpoints.

Rules:
- Use TypeScript with ES modules (import/export)
- Export async functions for each operation
- ${ormImportInstruction}
- ${ormQueryPatterns}
- For list endpoints, accept { page = 1, pageSize = 10, ...filters } and return { list: rows, total: count }
- Throw new Error('message') for error cases
- Use bcryptjs for password hashing
- Use jsonwebtoken for JWT
- Add a comment: // [stacksnap] ${sceneName}
- Group related endpoints into one service file

--- REFERENCE SERVICE ---
${refService}
--- END REFERENCE ---

--- GENERATED MODEL DEFINITIONS ---
${modelCode}
--- END MODEL DEFINITIONS ---

--- API ENDPOINTS TO IMPLEMENT ---
${routeList}
--- END API ENDPOINTS ---

Group the endpoints by URL prefix. Output files with "// FILE: <name>.ts" headers. No explanations or markdown fences — output ONLY the code.`;
}

export function buildNextjsApiRoutePrompt(
  sceneName: string,
  sceneApi: SceneApiRoute[],
  serviceCode: string,
  locale: LocaleConfig,
): string | null {
  if (!sceneApi || sceneApi.length === 0) return null;

  const routeList = sceneApi.map(r => `  ${r.method} ${r.path} — ${r.description}`).join('\n');

  return `You are a Next.js App Router API expert. Generate route.ts files for the following API endpoints.

Rules:
- Each route file is a route.ts in the app/api/ directory structure
- Use NextRequest and NextResponse from 'next/server'
- Export named functions for each HTTP method: export async function GET(request: NextRequest) { ... }
- For dynamic routes, use [param] folder naming: app/api/users/[id]/route.ts
- Use the matching service for business logic
- Import auth helpers: import { getServerSession } from 'next-auth'
- Use NextResponse.json() for responses
- Add a comment: // [stacksnap] ${sceneName}
- Handle errors with try/catch and NextResponse.json({ error: 'message' }, { status: xxx })

--- GENERATED SERVICE CODE ---
${serviceCode}
--- END SERVICE CODE ---

--- API ENDPOINTS TO IMPLEMENT ---
${routeList}
--- END API ENDPOINTS ---

Group endpoints by URL prefix into route.ts files under app/api/.
For example, all /api/auth/* endpoints go into app/api/auth/route.ts.
Dynamic routes like /api/users/:id go into app/api/users/[id]/route.ts.

Output files with "// FILE: <relative-path>/route.ts" headers. No explanations or markdown fences — output ONLY the code.`;
}

export function buildNextjsPagePrompt(
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

  return `You are a Next.js App Router frontend expert. Generate page.tsx files for the following pages.

Rules:
- Use Next.js App Router conventions (app/ directory)
- Use 'use client' directive for pages with interactivity (forms, state, events)
- Use Server Components by default when no client-side interactivity is needed
- Use Ant Design components: Button, Card, Form, Form.Item, Input, Table, Tag, Modal, message, Space
- Use TypeScript with proper type annotations
- Import API functions from '@/api/<module>' or use server actions
- ${locale.uiLanguageInstruction}
- Use CSS Modules or Tailwind CSS for styling
- For form pages: use Form with onFinish handler and 'use client'
- For data-display pages: use 'use client' with API calls or Server Components that call service functions
- Export default function: export default function PageName() { ... }

--- REFERENCE PAGE ---
${refPage}
--- END REFERENCE ---

--- AVAILABLE API FUNCTIONS ---
${apiFunctions}
--- END API FUNCTIONS ---

--- PAGES TO GENERATE ---
${pageDescriptions}
--- END PAGES ---

Output page.tsx files with "// FILE: <path>/page.tsx" headers. Each file must be a complete, working Next.js page. No explanations or markdown fences — output ONLY the code.`;
}

export function buildNextjsHookPrompt(
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

  return `You are a React hooks expert for Next.js. Generate custom hook files.

Rules:
- Export named hook functions: export function useXxx() { ... }
- Use React hooks: useState, useEffect, useCallback, useMemo
- Import API functions from '@/api/<module>'
- Return an object with state and methods
- ${locale.uiLanguageInstruction}
- Use TypeScript with proper type annotations

--- REFERENCE HOOK ---
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

export function buildNextjsComponentPrompt(
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

  return `You are a React component expert for Next.js. Generate reusable components.

Rules:
- Use React functional components with TypeScript
- Add 'use client' directive if the component uses hooks, events, or browser APIs
- Use Ant Design components: Form, Input, Button, Select, Upload, Avatar, Modal, Tag, Space
- Use TypeScript interface for props
- ${locale.uiLanguageInstruction}
- Each component should be self-contained and reusable

--- REFERENCE COMPONENT ---
${refComponent}
--- END REFERENCE ---

--- AVAILABLE API FUNCTIONS ---
${apiFunctions}
--- END API FUNCTIONS ---

--- COMPONENTS TO GENERATE ---
${componentDescriptions}
--- END COMPONENTS ---

Output component files with "// FILE: <name>.tsx" headers. No explanations or markdown fences — output ONLY the code.`;
}

export function buildNextjsTypePrompt(
  sceneName: string,
  types: SceneDefinition['types'],
  existingTypes: string,
  locale: LocaleConfig,
): string | null {
  if (!types || types.length === 0) return null;

  const typeDescriptions = types
    .map(t => `  - ${t.path}: ${t.description}`)
    .join('\n');

  return `You are a TypeScript type expert for Next.js. Generate type definition files.

Rules:
- Export TypeScript interfaces and types
- Add a comment: // [stacksnap] ${sceneName}
- ${locale.uiLanguageInstruction}
- Include both request input types and response types

--- EXISTING TYPES ---
${existingTypes}
--- END EXISTING ---

--- TYPE DEFINITIONS TO GENERATE ---
${typeDescriptions}
--- END TYPE DEFINITIONS ---

Output .ts files with "// FILE: <name>.ts" headers. No explanations or markdown fences — output ONLY the code.`;
}
