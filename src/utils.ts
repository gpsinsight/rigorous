import { OpenAPI } from 'openapi-router';

export function getAllowedVerbs(path: string, spec: OpenAPI.Schema): string[] {
  const expectedHeaders = new Set<string>(
    Object.keys(spec.paths[path]).map(x => x.toUpperCase()),
  );
  expectedHeaders.add('OPTIONS');
  if (expectedHeaders.has('GET')) {
    expectedHeaders.add('HEAD');
  }
  return Array.from(expectedHeaders);
}
