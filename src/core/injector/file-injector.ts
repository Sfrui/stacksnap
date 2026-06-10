import * as fs from 'fs-extra';
import * as path from 'path';
import { GeneratedFile } from '../../types';
import { injectPrismaModels } from './schema-injector';

export interface InjectionResult {
  created: string[];
  modified: string[];
  skipped: string[];
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
      } else {
        newContent = existing + '\n' + file.content;
      }

      fs.writeFileSync(absPath, newContent, 'utf-8');
      result.modified.push(file.filePath);
      console.log(`Modified: ${file.filePath}`);
    }
  }

  return result;
}
