import { OperationTestFactory } from '../types';
import { createTestCase } from '../utils';

export const createValidRequests: OperationTestFactory = {
  type: 'operation',
  create: function*(
    { verb, pathPattern, spec, validRequest },
    { uriFactory, mocker },
  ) {
    // TODO: get min/max if multiple non-error codes
    const status =
      Object.keys(spec.paths[pathPattern][verb].responses)
        .filter(code => code !== 'default')
        .map(Number.parseInt)[0] || 200;

    yield createTestCase(
      `returns a ${status} for a valid request`,
      verb,
      spec.basePath + pathPattern,
      validRequest,
      { status },
      uriFactory,
    );
  },
};
