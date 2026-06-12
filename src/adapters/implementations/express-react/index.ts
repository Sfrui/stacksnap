import {
  TechStackAdapter,
  FileType,
  ArtifactType,
} from '../../types';
import { ExpressReactBackend } from './backend';
import { ExpressReactFrontend } from './frontend';
import { ExpressReactIntegration } from './integration';

export class ExpressReactAdapter implements TechStackAdapter {
  readonly id = 'express-react';
  readonly displayName = 'Express + React';

  readonly backend = new ExpressReactBackend();
  readonly frontend = new ExpressReactFrontend();
  readonly integration = new ExpressReactIntegration();

  fileExtension(type: FileType): string {
    switch (type) {
      case 'page':
        return '.tsx';
      case 'component':
        return '.tsx';
      case 'type':
        return '.ts';
      case 'model':
        return this.backend.isMultiFileModels() ? '.js' : '.prisma';
      default:
        return '.js';
    }
  }

  directoryFor(artifact: ArtifactType): string | undefined {
    return artifact;
  }
}
