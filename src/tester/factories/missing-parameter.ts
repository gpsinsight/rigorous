import { OperationTestFactory } from '../types';
import { isRef, createTestCase } from '../utils';

export const createMissingParameters: OperationTestFactory = {
  type: 'operation',
  create: function*({ verb, pathPattern, spec, validRequest }, { uriFactory }) {
    const { parameters } = spec.paths[pathPattern][verb];
    const required = parameters.filter(p => !isRef(p) && p.required);

    for (const parameter of required) {
      if (!isRef(parameter)) {
        if (parameter.in === 'body') {
          yield createTestCase(
            'request is missing body',
            verb,
            spec.basePath + pathPattern,
            { ...validRequest, body: null },
            { status: 400 },
            uriFactory,
          );
        } else if (parameter.in === 'query') {
          const { [parameter.name]: removed, ...query } = validRequest.query;
          yield createTestCase(
            `request is missing required query parameter "${parameter.name}"`,
            verb,
            spec.basePath + pathPattern,
            { ...validRequest, query },
            { status: 400 },
            uriFactory,
          );
        } else if (parameter.in === 'header') {
          const {
            [parameter.name]: removed,
            ...headers
          } = validRequest.headers;
          yield createTestCase(
            `request is missing required header "${parameter.name}"`,
            verb,
            spec.basePath + pathPattern,
            { ...validRequest, headers },
            { status: 400 },
            uriFactory,
          );
        }
      }
    }
  },
};
