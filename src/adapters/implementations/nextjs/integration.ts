import { IntegrationAdapter } from '../../types';
import { ProjectConfig } from '../../../types';
import * as path from 'path';

export class NextjsIntegration implements IntegrationAdapter {
  resolvePagePath(config: ProjectConfig, pagePath: string): string {
    const pagesDir = config.directories.pages || 'app';
    // Next.js App Router: app/auth/login/page.tsx
    return path.join(pagesDir, pagePath, 'page.tsx');
  }
}
