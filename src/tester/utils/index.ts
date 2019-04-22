import { Verb, RequestParams, TestCase, UriFactory } from '../types';
import { OpenAPI } from 'openapi-router';
import { Mocker } from '../mocker';

export { uriFactory } from './uri-factory';

export function createTestCase(
  title: string,
  verb: Verb,
  pathPattern: string,
  requestParams: RequestParams,
  status: { status: number } | { minStatus: number; maxStatus: number },
  uriFactory: UriFactory,
): TestCase {
  const category = `${verb.toUpperCase()} ${pathPattern}`;
  const { path, query, headers, body } = requestParams;

  const uri = uriFactory(pathPattern, {
    path: path,
    query: query,
  });

  return {
    category,
    title,
    verb,
    uri,
    headers:
      body && Object.keys(body).length
        ? { ...headers, 'content-type': 'application/json' } // TODO: build from spec
        : headers,
    body,
    ...status,
  };
}

export function createValidRequest(
  operation: OpenAPI.Operation,
  spec: OpenAPI.Schema,
  mocker: Mocker,
): RequestParams {
  const { parameters } = operation;

  const required = parameters
    ? parameters.filter(p => !isRef(p) && p.required)
    : [];
  const request: RequestParams = {
    path: {},
    headers: {},
    query: {},
    body: null,
  };

  for (const parameter of required) {
    if (!isRef(parameter)) {
      if (parameter.in === 'body') {
        request.body = mocker.createValue(parameter.schema);
      } else if (parameter.in === 'path') {
        request.path[parameter.name] = mocker.createValue(parameter);
      } else if (parameter.in === 'query') {
        request.query[parameter.name] = mocker.createValue(parameter);
      } else if (parameter.in === 'header') {
        request.headers[parameter.name] = mocker.createValue(parameter);
      }
    }
  }

  const security = operation.security || spec.security || [];

  if (security.length) {
    const securityRequirement = security[0];

    for (const key in securityRequirement) {
      const definition = spec.securityDefinitions[key];

      // TODO: allow preconfigured security values
      const value = '74tybcqo874tbyqo874t3';

      switch (definition.type) {
        case 'basic':
          request.headers['Authorization'] = value;
          break;
        case 'apiKey':
          if (definition.in === 'header') {
            request.headers[definition.name] = value;
          } else {
            request.query[definition.name] = value;
          }
          break;
        default:
          console.warn(
            `Security type ${definition.type} is not yet supported.`,
          );
      }
    }
  }

  return request;
}

export function isRef(obj: any): obj is OpenAPI.Reference {
  return !!obj['$ref'];
}
