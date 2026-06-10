import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { SceneDefinition, ProjectConfig, GeneratedFile } from '../types';
import { buildSchemaPrompt } from './prompt-factory';

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

function parseSequelizeFiles(aiOutput: string, schemaDir: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const fileRegex = /\/\/\s*FILE:\s*(\S+)\s*\n([\s\S]*?)(?=\/\/\s*FILE:|$)/g;
  let match;
  const dirBase = path.basename(schemaDir);

  while ((match = fileRegex.exec(aiOutput)) !== null) {
    let fileName = match[1].trim();
    if (fileName.startsWith(dirBase + '/') || fileName.startsWith(dirBase + '\\')) {
      fileName = fileName.slice(dirBase.length + 1);
    }
    const content = match[2].trim();
    files.push({
      action: 'create',
      filePath: path.join(schemaDir, fileName),
      content,
    });
  }

  if (files.length === 0) {
    files.push({
      action: 'create',
      filePath: path.join(schemaDir, 'generated.js'),
      content: aiOutput,
    });
  }

  return files;
}

export async function generateSceneCode(
  scene: SceneDefinition,
  config: ProjectConfig,
  cwd: string,
): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];

  if (scene.entities.length > 0 && config.directories.schema) {
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

    if (prompt !== null) {
      const aiOutput = await callAI(prompt);

      if (config.orm === 'sequelize' && isDirectory) {
        const sequelizeFiles = parseSequelizeFiles(aiOutput, schemaRelPath);
        files.push(...sequelizeFiles);
      } else {
        files.push({
          action: fs.existsSync(schemaAbsPath) ? 'modify' : 'create',
          filePath: schemaRelPath,
          content: aiOutput,
        });
      }
    }
  }

  return files;
}
