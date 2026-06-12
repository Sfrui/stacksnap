import {
  TechStackAdapter,
  FileType,
  ArtifactType,
} from '../../types';
import { ExpressVueBackend } from './backend';
import { ExpressVueFrontend } from './frontend';
import { ExpressVueIntegration } from './integration';

export class ExpressVueAdapter implements TechStackAdapter {
  readonly id = 'express-vue';
  readonly displayName = 'Express + Vue 3';

  readonly backend = new ExpressVueBackend();
  readonly frontend = new ExpressVueFrontend();
  readonly integration = new ExpressVueIntegration();

  fileExtension(type: FileType): string {
    switch (type) {
      case 'page':
      case 'component':
        return '.vue';
      case 'model':
        return this.backend.isMultiFileModels() ? '.js' : '.prisma';
      case 'type':
        return '.ts';
      default:
        return '.js';
    }
  }

  directoryFor(artifact: ArtifactType): string | undefined {
    return artifact;
  }
}
