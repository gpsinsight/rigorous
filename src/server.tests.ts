import { expect } from 'chai';
import { OpenAPI } from 'openapi-router';

import { getPaths } from './server';

describe('getPaths', () => {
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
        '/list-a/x/subpath': {},
        '/list-a/qwerty/subpath': {},
      },
    };

    // ACT
    const result = getPaths(spec);

    // ASSERT
    expect(result).to.include.ordered.members([
      '/list-a/qwerty/subpath',
      '/list-a/x/subpath',
      '/list-a/{id}/subpath',
      '/list-a/{id}',
      '/list-a',
      '/list-b/{id}',
      '/list-c/{id}/subpath',
      '/list-c',
    ]);
  });

  it('places a static segment before a param segment', () => {
    // ARRANGE
    const spec: OpenAPI.Schema = {
      swagger: '2.0',
      info: {
        title: 'test',
        version: 'test',
      },
      paths: {
        '/widgets/{param}': {},
        '/widgets/static': {},
      },
    };

    // ACT
    const result = getPaths(spec);

    // ASSERT
    expect(result).to.include.ordered.members([
      '/widgets/static',
      '/widgets/{param}',
    ]);
  });

  it('places a long segment before a short segment', () => {
    // ARRANGE
    const spec: OpenAPI.Schema = {
      swagger: '2.0',
      info: {
        title: 'test',
        version: 'test',
      },
      paths: {
        '/widgets/x': {},
        '/widgets/xxx': {},
      },
    };

    // ACT
    const result = getPaths(spec);

    // ASSERT
    expect(result).to.include.ordered.members(['/widgets/xxx', '/widgets/x']);
  });

  it('places a multi segment before a single segment', () => {
    // ARRANGE
    const spec: OpenAPI.Schema = {
      swagger: '2.0',
      info: {
        title: 'test',
        version: 'test',
      },
      paths: {
        '/widgets': {},
        '/widgets/xxx': {},
      },
    };

    // ACT
    const result = getPaths(spec);

    // ASSERT
    expect(result).to.include.ordered.members(['/widgets/xxx', '/widgets']);
  });
});
