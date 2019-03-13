import { Verb, RequestParams, TestCase, UriFactory } from './types';
import { OpenAPI } from 'openapi-router';
import { Mocker } from './mocker';

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
    headers,
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

  const required = parameters.filter(p => !isRef(p) && p.required);
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

export const getUriFactory = (
  scheme: 'http' | 'https',
  host: string,
): UriFactory => (
  pathPattern: string,
  options?: {
    path?: { [key: string]: string | number | boolean };
    query?: { [key: string]: string | number | boolean };
  },
) => {
  const path = options && options.path ? options.path : {};
  const query = options && options.query ? options.query : {};

  let uri = pathPattern;
  for (const paramName in path) {
    uri = uri
      .split(`{${paramName}}`)
      .join(`${encodeURIComponent(`${path[paramName]}`)}`);
  }

  const queryString = Object.keys(query)
    .map(
      key => [
        `${encodeURIComponent(key)}=${encodeURIComponent(`${query[key]}`)}`,
      ],
      [],
    )
    .join('&');

  if (queryString) {
    uri += `?${queryString}`;
  }

  return uri;
};
