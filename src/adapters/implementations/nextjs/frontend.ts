import { FrontendAdapter, LocaleConfig } from '../../types';
import { SceneDefinition, ProjectConfig } from '../../../types';
import {
  buildNextjsPagePrompt,
  buildNextjsHookPrompt,
  buildNextjsComponentPrompt,
  buildNextjsTypePrompt,
} from './prompts/nextjs';

export class NextjsFrontend implements FrontendAdapter {
  buildApiModulePrompt(
    _scene: SceneDefinition,
    _config: ProjectConfig,
    _refApiModule: string,
    _locale: LocaleConfig,
  ): string | null {
    // Next.js uses Server Components or Server Actions, not separate API modules
    return null;
  }

  buildPagePrompt(
    scene: SceneDefinition,
    _config: ProjectConfig,
    refPage: string,
    apiFunctions: string,
    locale: LocaleConfig,
  ): string | null {
    return buildNextjsPagePrompt(scene.name, scene.frontend.pages, refPage, apiFunctions, locale);
  }

  buildHookPrompt(
    scene: SceneDefinition,
    _config: ProjectConfig,
    refHook: string,
    apiFunctions: string,
    locale: LocaleConfig,
  ): string | null {
    return buildNextjsHookPrompt(scene.name, scene.frontend.hooks, refHook, apiFunctions, locale);
  }

  buildComponentPrompt(
    scene: SceneDefinition,
    _config: ProjectConfig,
    refComponent: string,
    apiFunctions: string,
    locale: LocaleConfig,
  ): string | null {
    return buildNextjsComponentPrompt(scene.name, scene.frontend.components, refComponent, apiFunctions, locale);
  }

  buildRouterPrompt(
    _scene: SceneDefinition,
    _config: ProjectConfig,
    _existingRouterContent: string,
    _locale: LocaleConfig,
  ): string | null {
    // Next.js uses file-based routing — no explicit router registration needed
    return null;
  }

  buildTypePrompt(
    scene: SceneDefinition,
    _config: ProjectConfig,
    existingTypes: string,
    locale: LocaleConfig,
  ): string | null {
    return buildNextjsTypePrompt(scene.name, scene.types, existingTypes, locale);
  }

  pageFileNaming(pagePath: string): string {
    // Next.js App Router: app/auth/login/page.tsx
    return 'page.tsx';
  }

  routerFile(): string | null {
    return null; // No router file in Next.js
  }
}
