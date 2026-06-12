import { BackendAdapter, LocaleConfig } from '../../types';
import { SceneDefinition, ProjectConfig } from '../../../types';
import {
  buildNextjsServicePrompt,
  buildNextjsApiRoutePrompt,
} from './prompts/nextjs';
import { formatEntityDescriptions, buildPrismaSchemaPrompt, buildDrizzleSchemaPrompt } from '../shared/backend.express';

export class NextjsBackend implements BackendAdapter {
  buildSchemaPrompt(
    scene: SceneDefinition,
    config: ProjectConfig,
    existingSchema: string,
    _locale: LocaleConfig,
  ): string | null {
    const newEntities = scene.entities.filter(
      (e) => !existingSchema.includes(`model ${e.name} {`),
    );

    if (newEntities.length === 0) return null;

    const entityDescriptions = formatEntityDescriptions(newEntities);
    const orm = config.orm || 'prisma';

    if (orm === 'prisma') {
      return buildPrismaSchemaPrompt(scene.name, entityDescriptions, existingSchema);
    }
    return buildDrizzleSchemaPrompt(scene.name, entityDescriptions, existingSchema);
  }

  buildServicePrompt(
    scene: SceneDefinition,
    config: ProjectConfig,
    modelCode: string,
    refService: string,
    locale: LocaleConfig,
  ): string | null {
    return buildNextjsServicePrompt(scene.name, scene.api, modelCode, refService, locale, config.orm || 'prisma');
  }

  buildRoutePrompt(
    scene: SceneDefinition,
    config: ProjectConfig,
    serviceCode: string,
    _refRoute: string,
    _routeIndexContent: string,
    locale: LocaleConfig,
  ): string | null {
    return buildNextjsApiRoutePrompt(scene.name, scene.api, serviceCode, locale);
  }

  buildModelIndexPrompt(
    _scene: SceneDefinition,
    _config: ProjectConfig,
    _modelNames: string[],
    _existingModelIndex: string,
    _locale: LocaleConfig,
  ): string | null {
    // Next.js + Prisma/Drizzle doesn't use model index files
    return null;
  }

  isMultiFileModels(config?: ProjectConfig): boolean {
    return config?.orm === 'drizzle';
  }

  modelIndexFile(): string | null {
    return null;
  }

  registrationFiles(): string[] {
    return [];
  }
}
