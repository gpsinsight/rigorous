import { readFileSync } from 'fs';
import { join } from 'path';

import { get } from 'http';

import { expect } from 'chai';
import { resolveRefs } from 'json-refs';
import { OpenAPI } from 'openapi-router';

import { walkSync } from '../walk';
import { Mocker } from './mocker';
import {
  TestCase,
  isVerb,
  TestFactory,
  isSpecTestFactory,
  isPathTestFactory,
  isOperationTestFactory,
} from './types';
import { createValidRequest, getUriFactory } from './utils';
import { createBadParameters } from './factories/bad-parameter';
import { createMissingParameters } from './factories/missing-parameter';
import { createMethodNotAllowed } from './factories/method-not-allowed';
import { createSmokeTests } from './factories/smoke-tests';

export async function createTestCases(
  spec: OpenAPI.Schema,
  testFactories: TestFactory<any, any>[],
  options?: {
    scheme?: 'http' | 'https';
    host?: string;
    mocker?: Mocker;
  },
): Promise<TestCase[]> {
  const resolvedSpec = (await resolveRefs(spec)).resolved as OpenAPI.Schema;

  return Array.from(_createTestCases(resolvedSpec, testFactories, options));
}

function* _createTestCases(
  spec: OpenAPI.Schema,
  testFactories: TestFactory<any, any>[],
  options?: {
    scheme?: 'http' | 'https';
    host?: string;
    mocker?: Mocker;
  },
): IterableIterator<TestCase> {
  const scheme = options && options.scheme ? options.scheme : 'http';
  const host =
    options && options.host ? options.host : spec.host || 'localhost';
  const mocker = options && options.mocker ? options.mocker : new Mocker();

  const uriFactory = getUriFactory(scheme, host);

  for (const factory of testFactories) {
    if (isSpecTestFactory(factory)) {
      yield* factory.create({ spec }, { uriFactory, mocker });
    }
  }

  for (const pathPattern in spec.paths) {
    for (const factory of testFactories) {
      if (isPathTestFactory(factory)) {
        yield* factory.create({ pathPattern, spec }, { uriFactory, mocker });
      }
    }

    for (const verb in spec.paths[pathPattern]) {
      if (isVerb(verb)) {
        for (const factory of testFactories) {
          if (isOperationTestFactory(factory)) {
            const operation = spec.paths[pathPattern][verb];
            const validRequest = createValidRequest(operation, spec, mocker);
            yield* factory.create(
              { verb, pathPattern, spec, validRequest },
              { uriFactory, mocker },
            );
          }
        }
      }
    }
  }
}

export function runTestCases(testCases: TestCase[]): void {
  const categories: { [category: string]: TestCase[] } = {};

  for (const testCase of testCases) {
    categories[testCase.category] = categories[testCase.category] || [];
    categories[testCase.category].push(testCase);
  }

  for (const category in categories) {
    describe(category, () => {
      for (const testCase of categories[category]) {
        it(testCase.title, done => {
          get(
            testCase.uri,
            { method: testCase.verb, headers: testCase.headers },
            resp => {
              if (typeof testCase['status'] === 'number') {
                expect(resp.statusCode).to.equal(testCase['status']);
              } else {
                expect(resp.statusCode).to.not.be.lessThan(
                  testCase['minStatus'],
                );
                expect(resp.statusCode).to.be.lessThan(testCase['maxStatus']);
              }
              done();
            },
          );
        });
      }
    });
  }
}
