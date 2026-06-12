import {
  TechStackAdapter,
  FileType,
  ArtifactType,
} from '../../types';
import { NextjsBackend } from './backend';
import { NextjsFrontend } from './frontend';
import { NextjsIntegration } from './integration';

export class NextjsAdapter implements TechStackAdapter {
  readonly id = 'nextjs';
  readonly displayName = 'Next.js';

  readonly backend = new NextjsBackend();
  readonly frontend = new NextjsFrontend();
  readonly integration = new NextjsIntegration();

  fileExtension(type: FileType): string {
    switch (type) {
      case 'page':
        return '.tsx';
      case 'component':
        return '.tsx';
      case 'type':
        return '.ts';
      case 'model':
        return '.ts';
      default:
        return '.ts';
    }
  }

  directoryFor(artifact: ArtifactType): string | undefined {
    return artifact;
  }
}
