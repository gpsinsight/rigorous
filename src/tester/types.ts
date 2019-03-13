import { OpenAPI } from 'openapi-router';
import { Mocker } from './mocker';

export type TestCase = {
  category: string;
  title: string;
  verb: Verb;
  uri: string;
  headers?: { [header: string]: string };
  body?: any;
} & ({ status: number } | { minStatus: number; maxStatus: number });

export type Verb =
  | 'get'
  | 'head'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'options';

export function isVerb(obj: any): obj is Verb {
  return (
    obj === 'get' ||
    obj === 'head' ||
    obj === 'post' ||
    obj === 'put' ||
    obj === 'patch' ||
    obj === 'delete' ||
    obj === 'options'
  );
}

export interface TestFactory<
  TType extends 'spec' | 'path' | 'operation',
  TValues
> {
  type: TType;
  create(
    values: TValues,
    tools: {
      uriFactory: UriFactory;
      mocker: Mocker;
    },
  ): IterableIterator<TestCase>;
}

export interface SpecTestFactory
  extends TestFactory<'spec', { spec: OpenAPI.Schema }> {}

export function isSpecTestFactory(
  factory: TestFactory<any, any>,
): factory is SpecTestFactory {
  return factory.type === 'spec';
}

export interface PathTestFactory
  extends TestFactory<'path', { pathPattern: string; spec: OpenAPI.Schema }> {}

export function isPathTestFactory(
  factory: TestFactory<any, any>,
): factory is PathTestFactory {
  return factory.type === 'path';
}

export interface OperationTestFactory
  extends TestFactory<
    'operation',
    {
      verb: Verb;
      pathPattern: string;
      spec: OpenAPI.Schema;
      validRequest: RequestParams;
    }
  > {}

export function isOperationTestFactory(
  factory: TestFactory<any, any>,
): factory is OperationTestFactory {
  return factory.type === 'operation';
}

export type UriFactory = (
  pathPattern: string,
  params?: {
    path?: { [key: string]: string | number | boolean };
    query?: { [key: string]: string | number | boolean };
  },
) => string;

export type RequestParams = {
  path?: { [name: string]: any };
  headers?: { [name: string]: any };
  query?: { [name: string]: any };
  body?: any;
};
