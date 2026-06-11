import * as fs from 'fs-extra';
import * as path from 'path';
import { GeneratedFile } from '../../types';
import { injectPrismaModels } from './schema-injector';

export interface InjectionResult {
  created: string[];
  modified: string[];
  skipped: string[];
}

// Extract function names from service file: "const fnName = async" or "const fnName ="
function extractFunctionNames(content: string): Set<string> {
  const names = new Set<string>();
  const regex = /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    names.add(match[1]);
  }
  return names;
}

// Extract route paths from route file: "router.get('/path'" or "router.post('/path'"
function extractRoutePaths(content: string): Set<string> {
  const paths = new Set<string>();
  const regex = /router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    paths.add(`${match[1].toUpperCase()} ${match[2]}`);
  }
  return paths;
}

// Split code block into individual function definitions
function splitIntoFunctions(content: string): Map<string, string> {
  const functions = new Map<string, string>();
  const lines = content.split('\n');
  let currentName = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    const fnMatch = line.match(/^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/);
    if (fnMatch) {
      if (currentName && currentLines.length > 0) {
        functions.set(currentName, currentLines.join('\n'));
      }
      currentName = fnMatch[1];
      currentLines = [line];
    } else if (currentName) {
      currentLines.push(line);
    }
  }
  if (currentName && currentLines.length > 0) {
    functions.set(currentName, currentLines.join('\n'));
  }
  return functions;
}

// Split route code into individual route definitions
function splitIntoRoutes(content: string): Map<string, string> {
  const routes = new Map<string, string>();
  const lines = content.split('\n');
  let currentKey = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    const routeMatch = line.match(/router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/);
    if (routeMatch) {
      if (currentKey && currentLines.length > 0) {
        routes.set(currentKey, currentLines.join('\n'));
      }
      currentKey = `${routeMatch[1].toUpperCase()} ${routeMatch[2]}`;
      currentLines = [line];
    } else if (currentKey) {
      currentLines.push(line);
      // Detect end of route handler (closing bracket + parenthesis + semicolon)
      if (/^\}\);?\s*$/.test(line.trim())) {
        routes.set(currentKey, currentLines.join('\n'));
        currentKey = '';
        currentLines = [];
      }
    }
  }
  if (currentKey && currentLines.length > 0) {
    routes.set(currentKey, currentLines.join('\n'));
  }
  return routes;
}

// Remove duplicate functions from new content that already exist in the file
function deduplicateContent(existing: string, newContent: string, filePath: string): string | null {
  const isRouteFile = filePath.includes('/routes/') || filePath.includes('\\routes\\');

  if (isRouteFile) {
    const existingPaths = extractRoutePaths(existing);
    const newRoutes = splitIntoRoutes(newContent);
    const uniqueRoutes: string[] = [];

    for (const [routeKey, routeCode] of newRoutes) {
      if (!existingPaths.has(routeKey)) {
        uniqueRoutes.push(routeCode);
      }
    }

    if (uniqueRoutes.length === 0) return null; // all routes already exist

    // Keep non-route parts (imports, router definition, module.exports) and unique routes
    const headerLines: string[] = [];
    const lines = newContent.split('\n');
    for (const line of lines) {
      if (line.match(/^(const|require|import|module\.exports|router\s*=)/)) {
        headerLines.push(line);
      }
    }
    return headerLines.join('\n') + '\n\n' + uniqueRoutes.join('\n\n');
  } else {
    // Service file deduplication
    const existingNames = extractFunctionNames(existing);
    const newFunctions = splitIntoFunctions(newContent);
    const uniqueFunctions: string[] = [];

    for (const [fnName, fnCode] of newFunctions) {
      if (!existingNames.has(fnName)) {
        uniqueFunctions.push(fnCode);
      }
    }

    if (uniqueFunctions.length === 0) return null; // all functions already exist

    // Keep header (imports) and unique functions
    const headerLines: string[] = [];
    const lines = newContent.split('\n');
    for (const line of lines) {
      if (line.match(/^(const|require|import|\/\/\s*\[stacksnap)/)) {
        headerLines.push(line);
      }
    }

    // Rebuild module.exports with only unique function names
    const uniqueNames = uniqueFunctions.map(fn => {
      const match = fn.match(/^(?:const|let|var)\s+(\w+)/);
      return match ? match[1] : '';
    }).filter(Boolean);

    const exportLine = `module.exports = {\n  ${uniqueNames.join(',\n  ')},\n};`;

    return headerLines.join('\n') + '\n\n' + uniqueFunctions.join('\n\n') + '\n\n' + exportLine;
  }
}

// Smart injection: insert content at a specific position in existing file
function injectIntoFile(
  existing: string,
  insertion: string,
  markers: { afterLast?: RegExp; beforeLine?: RegExp },
): string {
  const lines = existing.split('\n');
  let insertIndex = lines.length;

  if (markers.afterLast) {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (markers.afterLast.test(lines[i])) {
        insertIndex = i + 1;
        break;
      }
    }
  }

  if (markers.beforeLine) {
    for (let i = 0; i < lines.length; i++) {
      if (markers.beforeLine.test(lines[i])) {
        insertIndex = Math.min(insertIndex, i);
        break;
      }
    }
  }

  const insertionLines = insertion.split('\n');

  // Filter out lines that already exist in the file (for index registrations)
  const newLines = insertionLines.filter(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) return true; // keep comments and blank lines
    // Check for require() and router.use() duplicates
    if (trimmed.startsWith('const ') && trimmed.includes("require('./")) {
      return !existing.includes(trimmed);
    }
    if (trimmed.startsWith('router.use(')) {
      return !existing.includes(trimmed);
    }
    // For model associations and other code
    return !existing.includes(trimmed);
  });

  if (newLines.length === 0 || newLines.every(l => !l.trim())) {
    return existing; // nothing new to add
  }

  lines.splice(insertIndex, 0, ...newLines);
  return lines.join('\n');
}

function isRouteIndex(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.endsWith('routes/index.js');
}

function isModelIndex(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.endsWith('models/index.js');
}

function isRouterIndex(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return normalized.endsWith('router/index.js');
}

export function injectFiles(files: GeneratedFile[], cwd: string): InjectionResult {
  const result: InjectionResult = { created: [], modified: [], skipped: [] };

  for (const file of files) {
    const absPath = path.resolve(cwd, file.filePath);

    if (file.action === 'create') {
      if (fs.existsSync(absPath)) {
        console.warn(`Skipped (already exists): ${file.filePath}`);
        result.skipped.push(file.filePath);
        continue;
      }
      fs.mkdirpSync(path.dirname(absPath));
      fs.writeFileSync(absPath, file.content, 'utf-8');
      result.created.push(file.filePath);
      console.log(`Created: ${file.filePath}`);
    }

    if (file.action === 'modify') {
      if (!fs.existsSync(absPath)) {
        console.warn(`Skipped (file not found for modify): ${file.filePath}`);
        result.skipped.push(file.filePath);
        continue;
      }
      const existing = fs.readFileSync(absPath, 'utf-8');
      let newContent: string;

      if (file.filePath.endsWith('.prisma')) {
        newContent = injectPrismaModels(existing, file.content);
      } else if (isRouteIndex(file.filePath)) {
        // Smart injection for routes/index.js
        newContent = injectIntoFile(existing, file.content, {
          afterLast: /router\.use\(/,
          beforeLine: /module\.exports/,
        });
      } else if (isModelIndex(file.filePath)) {
        // Smart injection for models/index.js
        newContent = injectIntoFile(existing, file.content, {
          afterLast: /require\('\.\/\w+'\);?$/,
          beforeLine: /module\.exports/,
        });
      } else if (isRouterIndex(file.filePath)) {
        // Smart injection for router/index.js
        newContent = injectIntoFile(existing, file.content, {
          afterLast: /path:\s*['"]/,
          beforeLine: /^\s*\]\s*$/m,
        });
      } else {
        // For regular JS/TS files: deduplicate then append
        const deduplicated = deduplicateContent(existing, file.content, file.filePath);
        if (deduplicated === null) {
          console.log(`Skipped (all code already exists): ${file.filePath}`);
          result.skipped.push(file.filePath);
          continue;
        }
        newContent = existing + '\n\n// @stacksnap added\n' + deduplicated + '\n// @stacksnap end\n';
      }

      fs.writeFileSync(absPath, newContent, 'utf-8');
      result.modified.push(file.filePath);
      console.log(`Modified: ${file.filePath}`);
    }
  }

  return result;
}
