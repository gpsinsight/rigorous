import { OperationTestFactory } from '../types';
import { isRef, createTestCase } from '../utils';

export const createBadParameters: OperationTestFactory = {
  type: 'operation',
  create: function*(
    { verb, pathPattern, spec, validRequest },
    { uriFactory, mocker },
  ) {
    const parameters = spec.paths[pathPattern][verb].parameters || [];
    for (const parameter of parameters) {
      if (!isRef(parameter)) {
        const schema = parameter.in === 'body' ? parameter.schema : parameter;

        for (const variant of mocker.createValueVariants(schema)) {
          // skip path, query, and header variants that are OK when stringified
          if (parameter.in !== 'body' && variant.allowInString) {
            continue;
          }

          // only allow body to contain objects
          if (
            parameter.in !== 'body' &&
            typeof variant.value === 'object' &&
            !Array.isArray(variant.value)
          ) {
            continue;
          }

          // TODO: correctly stringify arrays in path, query, and headers

          // TODO: add createTestCase method
          const title = `${parameter.in} parameter ${parameter.name} ${
            variant.reason
          }`;
          const body =
            parameter.in === 'body' ? variant.value : validRequest.body;
          const headers =
            parameter.in === 'header'
              ? { ...validRequest.headers, [parameter.name]: variant.value }
              : { ...validRequest.headers };
          const path =
            parameter.in === 'path'
              ? { ...validRequest.path, [parameter.name]: variant.value }
              : { ...validRequest.path };
          const query =
            parameter.in === 'query'
              ? { ...validRequest.query, [parameter.name]: variant.value }
              : { ...validRequest.query };

          yield createTestCase(
            title,
            verb,
            pathPattern,
            {
              body,
              headers,
              path,
              query,
            },
            { status: 400 },
            uriFactory,
          );
        }
      }
    }
  },
};
