import { IntegrationAdapter } from '../../types';
import { ProjectConfig } from '../../../types';
import { toPascalCasePath } from '../../utils';
import * as path from 'path';

export class ExpressReactIntegration implements IntegrationAdapter {
  resolvePagePath(config: ProjectConfig, pagePath: string): string {
    const pagesDir = config.directories.pages || 'src/pages';
    const pageName = toPascalCasePath(pagePath) + 'Page.tsx';
    return path.join(pagesDir, pageName);
  }
}
