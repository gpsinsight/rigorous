import { expect } from 'chai';
import { OpenAPI } from 'openapi-router';

import { getPaths } from './server';

describe('stuff', () => {
  it('works', () => {
    // ARRANGE
    const spec: OpenAPI.Schema = {
      swagger: '2.0',
      info: {
        title: 'test',
        version: 'test',
      },
      paths: {
        '/list-c': {},
        '/list-a/{id}': {},
        '/list-a': {},
        '/list-a/{id}/subpath': {},
        '/list-c/{id}/subpath': {},
        '/list-b/{id}': {},
      },
    };

    // ACT
    const result = getPaths(spec);

    // ASSERT
    expect(result).to.include.ordered.members([
      '/list-a/{id}/subpath',
      '/list-a/{id}',
      '/list-a',
      '/list-b/{id}',
      '/list-c/{id}/subpath',
      '/list-c',
    ]);
  });
});
