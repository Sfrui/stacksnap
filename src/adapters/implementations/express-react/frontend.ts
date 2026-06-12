import { FrontendAdapter, LocaleConfig } from '../../types';
import { SceneDefinition, ProjectConfig } from '../../../types';
import { toPascalCasePath } from '../../utils';
import {
  buildReactApiModulePrompt,
  buildReactPagePrompt,
  buildReactHookPrompt,
  buildReactComponentPrompt,
  buildReactRouterPrompt,
  buildReactTypePrompt,
} from './prompts/frontend.react';

export class ExpressReactFrontend implements FrontendAdapter {
  buildApiModulePrompt(
    scene: SceneDefinition,
    _config: ProjectConfig,
    refApiModule: string,
    _locale: LocaleConfig,
  ): string | null {
    return buildReactApiModulePrompt(scene.name, scene.api, refApiModule);
  }

  buildPagePrompt(
    scene: SceneDefinition,
    _config: ProjectConfig,
    refPage: string,
    apiFunctions: string,
    locale: LocaleConfig,
  ): string | null {
    return buildReactPagePrompt(scene.name, scene.frontend.pages, refPage, apiFunctions, locale);
  }

  buildHookPrompt(
    scene: SceneDefinition,
    _config: ProjectConfig,
    refHook: string,
    apiFunctions: string,
    locale: LocaleConfig,
  ): string | null {
    return buildReactHookPrompt(scene.name, scene.frontend.hooks, refHook, apiFunctions, locale);
  }

  buildComponentPrompt(
    scene: SceneDefinition,
    _config: ProjectConfig,
    refComponent: string,
    apiFunctions: string,
    locale: LocaleConfig,
  ): string | null {
    return buildReactComponentPrompt(scene.name, scene.frontend.components, refComponent, apiFunctions, locale);
  }

  buildRouterPrompt(
    scene: SceneDefinition,
    _config: ProjectConfig,
    existingRouterContent: string,
    _locale: LocaleConfig,
  ): string | null {
    return buildReactRouterPrompt(scene.frontend.pages, existingRouterContent);
  }

  buildTypePrompt(
    scene: SceneDefinition,
    _config: ProjectConfig,
    existingTypes: string,
    locale: LocaleConfig,
  ): string | null {
    return buildReactTypePrompt(scene.name, scene.types, existingTypes, locale);
  }

  pageFileNaming(pagePath: string): string {
    return toPascalCasePath(pagePath) + 'Page.tsx';
  }

  routerFile(): string | null {
    return 'router/index.tsx';
  }
}
