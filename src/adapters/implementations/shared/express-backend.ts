import { BackendAdapter, LocaleConfig, formatRoutesForPrompt } from '../../types';
import { SceneDefinition, ProjectConfig } from '../../../types';
import {
  buildPrismaSchemaPrompt,
  buildSequelizeSchemaPrompt,
  buildDrizzleSchemaPrompt,
  formatEntityDescriptions,
  buildExpressServicePrompt,
  buildExpressRoutePrompt,
  buildSequelizeModelIndexPrompt,
  buildDrizzleModelIndexPrompt,
} from './backend.express';

/**
 * Shared Express.js backend adapter.
 * Used by both Express+Vue and Express+React adapters.
 */
export class ExpressBackend implements BackendAdapter {
  private getOrm(config: ProjectConfig): string {
    return config.orm || 'prisma';
  }

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
    const orm = this.getOrm(config);

    if (orm === 'sequelize') {
      return buildSequelizeSchemaPrompt(scene.name, entityDescriptions);
    }
    if (orm === 'drizzle') {
      return buildDrizzleSchemaPrompt(scene.name, entityDescriptions, existingSchema);
    }
    return buildPrismaSchemaPrompt(scene.name, entityDescriptions, existingSchema);
  }

  buildServicePrompt(
    scene: SceneDefinition,
    config: ProjectConfig,
    modelCode: string,
    refService: string,
    locale: LocaleConfig,
  ): string | null {
    if (!scene.api || scene.api.length === 0) return null;

    const orm = this.getOrm(config);
    const ormImportInstruction = orm === 'sequelize'
      ? "Use Sequelize models imported from '../models' (e.g., const { User } = require('../models');)"
      : orm === 'drizzle'
      ? "Use Drizzle table definitions imported from '../schema' (e.g., const { users } = require('../schema');)"
      : "Use Prisma client imported from '../prisma' (e.g., const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient();)";

    const ormQueryPatterns = orm === 'sequelize'
      ? "Use Op from sequelize for queries: const { Op } = require('sequelize'); Use Model.findAndCountAll(), Model.findByPk(), Model.create(), .update()"
      : orm === 'drizzle'
      ? "Use Drizzle query builder: db.select(), db.insert(), db.update(), db.delete() with eq(), and() operators from 'drizzle-orm'"
      : "Use Prisma client methods: prisma.model.findMany(), prisma.model.findUnique(), prisma.model.create(), prisma.model.update()";

    const routeList = formatRoutesForPrompt(scene.api);

    return buildExpressServicePrompt({
      sceneName: scene.name,
      routeList,
      refService,
      modelCode,
      ormImportInstruction,
      ormQueryPatterns,
      locale,
    });
  }

  buildRoutePrompt(
    scene: SceneDefinition,
    config: ProjectConfig,
    serviceCode: string,
    refRoute: string,
    routeIndexContent: string,
    locale: LocaleConfig,
  ): string | null {
    if (!scene.api || scene.api.length === 0) return null;

    return buildExpressRoutePrompt({
      sceneName: scene.name,
      sceneApi: scene.api,
      serviceCode,
      refRoute,
      routeIndexContent,
      locale,
    });
  }

  buildModelIndexPrompt(
    scene: SceneDefinition,
    config: ProjectConfig,
    modelNames: string[],
    existingModelIndex: string,
    _locale: LocaleConfig,
  ): string | null {
    if (modelNames.length === 0) return null;

    const orm = this.getOrm(config);
    if (orm === 'prisma') return null;
    if (orm === 'drizzle') {
      return buildDrizzleModelIndexPrompt(scene.name, modelNames, existingModelIndex);
    }
    return buildSequelizeModelIndexPrompt(scene.name, modelNames, existingModelIndex);
  }

  isMultiFileModels(config?: ProjectConfig): boolean {
    const orm = config?.orm || 'prisma';
    return orm === 'sequelize' || orm === 'drizzle';
  }

  modelIndexFile(): string | null {
    return 'models/index.js';
  }

  registrationFiles(): string[] {
    return ['routes/index.js', 'models/index.js'];
  }
}
