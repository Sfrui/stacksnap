import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { SceneDefinition } from '../types';

const SCENES_DIR = path.resolve(__dirname, '../../scenes');

let sceneCache: SceneDefinition[] | null = null;

export function loadAllScenes(): SceneDefinition[] {
  if (sceneCache) return sceneCache;

  const files = fs.readdirSync(SCENES_DIR).filter((f) => f.endsWith('.yml'));

  sceneCache = files.map((file) => {
    const content = fs.readFileSync(path.join(SCENES_DIR, file), 'utf-8');
    return yaml.load(content) as SceneDefinition;
  });

  return sceneCache;
}

export function getSceneByName(name: string): SceneDefinition | undefined {
  return loadAllScenes().find((s) => s.name === name);
}
