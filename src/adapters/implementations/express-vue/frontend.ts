import { FrontendAdapter, LocaleConfig } from '../../types';
import { SceneDefinition, ProjectConfig } from '../../../types';
import { toPascalCasePath } from '../../utils';
import {
  buildVueApiModulePrompt,
  buildVuePagePrompt,
  buildVueHookPrompt,
  buildVueComponentPrompt,
  buildVueRouterPrompt,
  buildVueTypePrompt,
} from './prompts/frontend.vue';

export class ExpressVueFrontend implements FrontendAdapter {
  buildApiModulePrompt(
    scene: SceneDefinition,
    _config: ProjectConfig,
    refApiModule: string,
    _locale: LocaleConfig,
  ): string | null {
    return buildVueApiModulePrompt(scene.name, scene.api, refApiModule);
  }

  buildPagePrompt(
    scene: SceneDefinition,
    _config: ProjectConfig,
    refPage: string,
    apiFunctions: string,
    locale: LocaleConfig,
  ): string | null {
    return buildVuePagePrompt(scene.name, scene.frontend.pages, refPage, apiFunctions, locale);
  }

  buildHookPrompt(
    scene: SceneDefinition,
    _config: ProjectConfig,
    refHook: string,
    apiFunctions: string,
    locale: LocaleConfig,
  ): string | null {
    return buildVueHookPrompt(scene.name, scene.frontend.hooks, refHook, apiFunctions, locale);
  }

  buildComponentPrompt(
    scene: SceneDefinition,
    _config: ProjectConfig,
    refComponent: string,
    apiFunctions: string,
    locale: LocaleConfig,
  ): string | null {
    return buildVueComponentPrompt(scene.name, scene.frontend.components, refComponent, apiFunctions, locale);
  }

  buildRouterPrompt(
    scene: SceneDefinition,
    _config: ProjectConfig,
    existingRouterContent: string,
    _locale: LocaleConfig,
  ): string | null {
    return buildVueRouterPrompt(scene.frontend.pages, existingRouterContent);
  }

  buildTypePrompt(
    scene: SceneDefinition,
    _config: ProjectConfig,
    existingTypes: string,
    locale: LocaleConfig,
  ): string | null {
    return buildVueTypePrompt(scene.name, scene.types, existingTypes, locale);
  }

  pageFileNaming(pagePath: string): string {
    return toPascalCasePath(pagePath) + 'View.vue';
  }

  routerFile(): string | null {
    return 'router/index.js';
  }
}
