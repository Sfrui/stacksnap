import { SceneDefinition, ProjectConfig } from '../types';
import * as fs from 'fs';
import * as path from 'path';

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
