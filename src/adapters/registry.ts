import { TechStackAdapter } from './types';
import { ProjectConfig } from '../types';
import { ExpressVueAdapter } from './implementations/express-vue';
import { ExpressReactAdapter } from './implementations/express-react';
import { NextjsAdapter } from './implementations/nextjs';

const adapters = new Map<string, TechStackAdapter>();
let initialized = false;

export function registerAdapter(adapter: TechStackAdapter): void {
  adapters.set(adapter.id, adapter);
}

export function getAdapter(id: string): TechStackAdapter {
  ensureInitialized();
  const adapter = adapters.get(id);
  if (!adapter) {
    throw new Error(
      `No adapter registered for "${id}". Available: ${[...adapters.keys()].join(', ')}`,
    );
  }
  return adapter;
}

export function getAdapterForConfig(config: ProjectConfig): TechStackAdapter {
  return getAdapter(config.framework);
}

export function listAdapters(): string[] {
  ensureInitialized();
  return [...adapters.keys()];
}

function ensureInitialized(): void {
  if (!initialized) {
    registerBuiltinAdapters();
    initialized = true;
  }
}

export function registerBuiltinAdapters(): void {
  registerAdapter(new ExpressVueAdapter());
  registerAdapter(new ExpressReactAdapter());
  registerAdapter(new NextjsAdapter());
}
