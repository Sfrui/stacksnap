import { IntegrationAdapter } from '../../types';
import { ProjectConfig } from '../../../types';
import { toPascalCasePath } from '../../utils';
import * as path from 'path';

export class ExpressVueIntegration implements IntegrationAdapter {
  resolvePagePath(config: ProjectConfig, pagePath: string): string {
    const pagesDir = config.directories.pages || 'frontend/src/views';
    const viewName = toPascalCasePath(pagePath) + 'View.vue';
    return path.join(pagesDir, viewName);
  }
}
