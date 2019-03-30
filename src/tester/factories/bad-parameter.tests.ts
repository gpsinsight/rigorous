import { expect } from 'chai';
import { createBadParameters } from './bad-parameter';
import { Mocker } from '../mocker';
import { OpenAPI } from 'openapi-router';
import { uriFactory } from '../utils';

describe('createBadParameters', () => {
  const sut = createBadParameters;
  it('is an "operation" test factory', () => {
    expect(sut.type).to.equal('operation');
  });

  it('works', () => {
    // ARRANGE
    const spec: OpenAPI.Schema = {
      swagger: '2.0',
      info: { title: 'test', version: 'test' },
      paths: {
        '/widgets/{widgetId}': {
          get: {
            parameters: [
              { in: 'path', name: 'widgetId', required: true, type: 'string' },
              { in: 'query', name: 'limit', required: false, type: 'number' },
            ],
            responses: {},
          },
        },
      },
    };

    const mocker = new Mocker();

    // ACT
    const results = sut.create(
      {
        verb: 'get',
        pathPattern: '/widgets/{widgetId}',
        spec,
        validRequest: { path: { widgetId: '367845345867' } },
      },
      { uriFactory, mocker },
    );

    // ASSERT
    // console.log(Array.from(results));
  });
});
