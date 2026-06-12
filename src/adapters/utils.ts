/**
 * Shared naming utilities for adapters.
 */

/** PascalCase a single string segment (handles hyphenated names) */
export function pascalCase(str: string): string {
  return str
    .split('-')
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .join('');
}

/** Convert a multi-segment path to a PascalCase filename (all segments joined) */
export function toPascalCasePath(pagePath: string): string {
  return pagePath.split('/').map(pascalCase).join('');
}
