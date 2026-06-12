import { SceneDefinition, SceneApiRoute } from '../../../types';
import { LocaleConfig } from '../../types';
import { formatRoutesForPrompt, groupRoutesByPrefix } from '../../types';

// ============================================================
// Shared Express.js backend prompt fragments
// Used by both express-vue and express-react adapters
// ============================================================

// --- Schema prompts ---

export function buildPrismaSchemaPrompt(
  sceneName: string,
  entityDescriptions: string,
  existingSchema: string,
): string {
  return `You are a Prisma schema expert. Given the existing schema and the required new models below, output ONLY the new model blocks to be appended.

Rules:
- Output only new model definitions, no explanations.
- Each new model must be preceded by a comment: // [stacksnap] ${sceneName} - <ModelName>
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

export function buildSequelizeSchemaPrompt(
  sceneName: string,
  entityDescriptions: string,
): string {
  return `You are a Sequelize ORM expert. Given the required models below, output complete Sequelize model definition files.

Rules:
- Output each model as a separate JavaScript file using sequelize.define().
- Each file must export a function that takes (sequelize, DataTypes) and returns the model.
- Use the exact field definitions provided, converting Prisma syntax to Sequelize DataTypes.
- Add a comment: // [stacksnap] ${sceneName} - <ModelName>
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

export function buildDrizzleSchemaPrompt(
  sceneName: string,
  entityDescriptions: string,
  existingSchema: string,
): string {
  return `You are a Drizzle ORM expert. Given the existing schema and the required new models below, output Drizzle table definitions.

Rules:
- Output each table as a separate TypeScript file using pgTable() or mysqlTable().
- Use the exact field definitions provided, converting Prisma syntax to Drizzle column types.
- Add a comment: // [stacksnap] ${sceneName} - <TableName>
- Use TypeScript with proper imports from 'drizzle-orm/pg-core' or 'drizzle-orm/mysql-core'.
- Define relations in a separate file if needed.
- Follow Drizzle ORM conventions.

--- EXISTING SCHEMA ---
${existingSchema}
--- END EXISTING SCHEMA ---

--- NEW MODELS REQUIRED ---
${entityDescriptions}
--- END NEW MODELS REQUIRED ---

Prisma to Drizzle type mapping:
- String → text()
- String @id @default(uuid()) → uuid('id').primaryKey().defaultRandom()
- String @unique → text('field').unique()
- Boolean @default(false) → boolean('field').default(false)
- DateTime @default(now()) → timestamp('field').defaultNow()
- Int → integer()
- Float → real()
- Json → json()

Output Drizzle table definition files with "// FILE: <name>.ts" headers. No explanations or markdown fences — output ONLY the code.`;
}

// --- Entity description formatter ---

export function formatEntityDescriptions(entities: SceneDefinition['entities']): string {
  return entities
    .map((e) => {
      const fieldLines = Object.entries(e.fields)
        .map(([name, type]) => `    ${name} ${type}`)
        .join('\n');
      return `  - ${e.name}:\n${fieldLines}`;
    })
    .join('\n\n');
}

// --- Service prompt ---

export interface ServicePromptParams {
  sceneName: string;
  routeList: string;
  refService: string;
  modelCode: string;
  ormImportInstruction: string;
  ormQueryPatterns: string;
  locale: LocaleConfig;
}

export function buildExpressServicePrompt(params: ServicePromptParams): string {
  const { sceneName, routeList, refService, modelCode, ormImportInstruction, ormQueryPatterns, locale } = params;
  return `You are an Express.js backend expert. Generate service files for the following API endpoints.

Rules:
- Each service file uses CommonJS (require/module.exports).
- Export individual async functions: module.exports = { fn1, fn2, ... }
- ${ormImportInstruction}
- ${ormQueryPatterns}
- For list endpoints, accept { page = 1, pageSize = 10, ...filters } and return { list: rows, total: count }
- For single-item endpoints, use findByPk or findOne
- For create endpoints, use create()
- For update endpoints, find by pk, then call .update()
- Throw new Error('message') for error cases (the global error handler catches them).
- Use bcryptjs for password hashing: const bcrypt = require('bcryptjs'); await bcrypt.hash(password, 10) / await bcrypt.compare(password, hash)
- Use jsonwebtoken for JWT: const jwt = require('jsonwebtoken');
- Use uuid for token generation: const { v4: uuidv4 } = require('uuid');
- Add a comment: // [stacksnap] ${sceneName} - <ServiceName>
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

export interface RoutePromptParams {
  sceneName: string;
  sceneApi: SceneApiRoute[];
  serviceCode: string;
  refRoute: string;
  routeIndexContent: string;
  locale: LocaleConfig;
}

export function buildExpressRoutePrompt(params: RoutePromptParams): string {
  const { sceneName, sceneApi, serviceCode, refRoute, routeIndexContent, locale } = params;
  const groups = groupRoutesByPrefix(sceneApi);
  const routeList = formatRoutesForPrompt(sceneApi);

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
- Add a comment: // [stacksnap] ${sceneName} - <RouteName>
- ${locale.messageLanguageInstruction}

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

// --- Model index prompts ---

export function buildSequelizeModelIndexPrompt(
  sceneName: string,
  modelNames: string[],
  existingModelIndex: string,
): string {
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

export function buildDrizzleModelIndexPrompt(
  sceneName: string,
  modelNames: string[],
  existingModelIndex: string,
): string {
  return `You are a Drizzle ORM registry expert. Given the existing schema index file and newly generated table definitions, output ONLY the lines that need to be added.

Rules:
- Add import lines for each new table definition
- Add any relation definitions needed
- Output the lines to INSERT, wrapped in // @stacksnap added and // @stacksnap end markers
- Do NOT output the entire file — only the new lines

--- EXISTING INDEX ---
${existingModelIndex}
--- END EXISTING ---

--- NEW TABLE NAMES ---
${modelNames.join(', ')}
--- END NEW TABLE NAMES ---

Output the code to insert. Use "// FILE: __MODEL_INDEX__" as the header. No explanations or markdown fences — output ONLY the code.`;
}
