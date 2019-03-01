import { readFileSync } from 'fs';
import { join, resolve } from 'path';

import { Chance } from 'chance';

import { request, get } from 'http';

import axios from 'axios';
import { expect } from 'chai';
import { resolveRefs } from 'json-refs';
import { OpenAPI } from 'openapi-router';

import { walkSync } from '../walk';
import { getAllowedVerbs } from '../utils';
import { Mocker } from './mocker';
import { TestCase, Verb, isVerb } from './types';
import { Val } from '../mocker';

export class Tester {
  constructor(
    private readonly spec: OpenAPI.Schema,
    private readonly host: string,
    private readonly scheme: 'http' | 'https' = 'http',
    seed?: string | number,
  ) {
    this.mocker = new Mocker(seed);
  }

  private readonly mocker: Mocker;

  run() {
    const categories: { [category: string]: TestCase[] } = {};

    for (const testCase of this.createTestCases()) {
      categories[testCase.category] = categories[testCase.category] || [];
      categories[testCase.category].push(testCase);
    }

    for (const category in categories) {
      describe(category, () => {
        for (const testCase of categories[category]) {
          it(testCase.title, done => {
            //console.log(testCase);
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

  *createTestCases(): IterableIterator<TestCase> {
    yield* this.createSmokeTests();
    yield* this.createPathTestCases();
  }

  *createSmokeTests(): IterableIterator<TestCase> {
    yield {
      category: 'Smoke tests',
      title: 'Serves HTTP traffic',
      verb: 'head',
      uri: `${this.scheme}://${this.host}`,
      minStatus: 100,
      maxStatus: 600,
    };
  }

  *createPathTestCases(): IterableIterator<TestCase> {
    for (const pathPattern in this.spec.paths) {
      for (const verb in this.spec.paths[pathPattern]) {
        if (isVerb(verb)) {
          yield* this.createOperationTestCases(pathPattern, verb);
        }
      }
    }
  }

  *createOperationTestCases(
    pathPattern: string,
    verb: Verb,
  ): IterableIterator<TestCase> {
    const { parameters } = this.spec.paths[pathPattern][verb];

    const required = parameters.filter(p => !isRef(p) && p.required);

    const nominal: RequestParams = {
      path: {},
      headers: {},
      query: {},
      body: null,
    };

    for (const parameter of required) {
      if (isRef(parameter)) {
      } else if (parameter.in === 'body') {
        nominal.body = this.mocker.createValue(parameter.schema);
      } else if (parameter.in === 'path') {
        nominal.path[parameter.name] = this.mocker.createValue(parameter);
      } else if (parameter.in === 'query') {
        nominal.query[parameter.name] = this.mocker.createValue(parameter);
      } else if (parameter.in === 'header') {
        nominal.headers[parameter.name] = this.mocker.createValue(parameter);
      }
    }

    const security =
      this.spec.paths[pathPattern][verb].security || this.spec.security || [];

    if (security.length) {
      yield this.createTestCase(
        'missing authentication',
        verb,
        pathPattern,
        {
          body: nominal.body ? { ...nominal.body } : nominal.body,
          headers: { ...nominal.headers },
          query: { ...nominal.query },
          path: { ...nominal.path },
        },
        { status: 401 },
      );

      const securityRequirement = security[0];

      for (const key in securityRequirement) {
        const definition = this.spec.securityDefinitions[key];

        const value = '74tybcqo874tbyqo874t3';

        switch (definition.type) {
          case 'basic':
            nominal.headers['Authorization'] = value;
            break;
          case 'apiKey':
            if (definition.in === 'header') {
              nominal.headers[definition.name] = value;
            } else {
              nominal.query[definition.name] = value;
            }
            break;
          default:
            console.warn(
              `Security type ${definition.type} is not yet supported.`,
            );
        }
      }
    }

    for (const parameter of parameters) {
      if (isRef(parameter)) {
      } else {
        yield* this.createVariants(verb, pathPattern, nominal, parameter);
      }
    }

    // add test cases for missing required parameters
    for (const parameter of required) {
      if (isRef(parameter)) {
      } else if (parameter.in === 'body') {
        yield this.createTestCase(
          'request is missing body',
          verb,
          pathPattern,
          { ...nominal, body: null },
          { status: 400 },
        );
      } else if (parameter.in === 'path') {
      } else if (parameter.in === 'query') {
        const { [parameter.name]: removed, ...query } = nominal.query;
        yield this.createTestCase(
          `request is missing required query parameter "${parameter.name}"`,
          verb,
          pathPattern,
          { ...nominal, query },
          { status: 400 },
        );
      } else if (parameter.in === 'header') {
        const { [parameter.name]: removed, ...headers } = nominal.headers;
        yield this.createTestCase(
          `request is missing required header "${parameter.name}"`,
          verb,
          pathPattern,
          { ...nominal, headers },
          { status: 400 },
        );
      }
    }
  }

  *createVariants(
    verb: Verb,
    pathPattern: string,
    baseline: RequestParams,
    parameter: OpenAPI.Parameter,
  ): IterableIterator<TestCase> {
    const schema = parameter.in === 'body' ? parameter.schema : parameter;

    for (const variant of this.mocker.createValueVariants(schema)) {
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
      const body = parameter.in === 'body' ? variant.value : baseline.body;
      const headers =
        parameter.in === 'header'
          ? { ...baseline.headers, [parameter.name]: variant.value }
          : { ...baseline.headers };
      const path =
        parameter.in === 'path'
          ? { ...baseline.path, [parameter.name]: variant.value }
          : { ...baseline.path };
      const query =
        parameter.in === 'query'
          ? { ...baseline.query, [parameter.name]: variant.value }
          : { ...baseline.query };

      yield this.createTestCase(
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
      );

      // let uri = pathPattern;
      // for (const pathParam in pathParams) {
      //   uri = uri
      //     .split(`{${pathParam}}`)
      //     .join(`${encodeURIComponent(pathParams[pathParam])}`);
      // }

      // const queryString = Object.keys(queryParams)
      //   .reduce(
      //     (acc, key) => [
      //       `${encodeURIComponent(key)}=${encodeURIComponent(
      //         queryParams[key],
      //       )}`,
      //     ],
      //     [],
      //   )
      //   .join('&');

      // if (queryString) {
      //   uri += `?${queryString}`;
      // }

      // yield {
      //   category,
      //   title,
      //   verb,
      //   uri,
      //   headers,
      //   body,
      //   status: 400,
      // };
    }
  }

  createTestCase(
    title: string,
    verb: Verb,
    pathPattern: string,
    requestParams: RequestParams,
    status: { status: number } | { minStatus: number; maxStatus: number },
  ): TestCase {
    const category = `${verb.toUpperCase()} ${pathPattern}`;
    const { path, query, headers, body } = requestParams;

    let uri = pathPattern;
    for (const paramName in path) {
      uri = uri
        .split(`{${paramName}}`)
        .join(`${encodeURIComponent(path[paramName])}`);
    }

    const queryString = Object.keys(query)
      .reduce(
        (acc, key) => [
          `${encodeURIComponent(key)}=${encodeURIComponent(query[key])}`,
        ],
        [],
      )
      .join('&');

    if (queryString) {
      uri += `?${queryString}`;
    }

    return {
      category,
      title,
      verb,
      uri: `${this.scheme || 'http'}://${this.host}${this.spec.basePath ||
        ''}${uri}`,
      headers,
      body,
      ...status,
    };
  }
}

function forRequest<T>(value: T, parameter: OpenAPI.Parameter): string | T {
  if (parameter.in === 'body') {
    return value;
  }

  if (Array.isArray(value)) {
    const encoded =
      parameter.in === 'header'
        ? value
        : value.map(x => encodeURIComponent(`${x}`));

    switch (parameter.collectionFormat) {
      case 'pipes':
        return encoded.join('|');
      case 'ssv':
        return encoded.join(' ');
      case 'tsv':
        return encoded.join('\t');
      default:
        return encoded.join(',');
    }
  }

  if (parameter.in === 'header') {
    return `${value}`;
  }

  return encodeURIComponent(`${value}`);
}

type RequestParams = {
  path: { [name: string]: any };
  headers: { [name: string]: any };
  query: { [name: string]: any };
  body: any;
};

function isRef(obj: any): obj is OpenAPI.Reference {
  return !!obj['$ref'];
}

export function test(dir: string, host: string) {
  describe(host, async () => {
    runSmokeTests(host);
    for (const specpath of walkSync(dir, '', /oas2\.json/)) {
      const spec = (await resolveRefs(
        JSON.parse(readFileSync(join(dir, specpath)).toString()),
      )).resolved as OpenAPI.Schema;
      if (!spec.basePath) continue;

      const tester = new Tester(spec, host);

      tester.run();

      //testSpec(`http://${host}`, spec);
    }
  });
}

function runSmokeTests(host: string) {
  it('Serves HTTP traffic', async () => {
    try {
      const result = await axios.head(`http://${host}`);
      expect(result.status).to.not.be.lessThan(100);
      expect(result.status).to.be.lessThan(600);
    } catch (err) {
      if (err.response) {
        expect(err.response.status).to.not.be.lessThan(100);
        expect(err.response.status).to.be.lessThan(600);
      } else {
        expect(err.code).to.not.be.ok;
      }
    }
  });
}

function testSpec(root: string, spec: OpenAPI.Schema) {
  describe(`${spec.info.title} v${spec.info.version}`, () => {
    for (const path in spec.paths) {
      testPath(root + spec.basePath, path, spec);
    }
  });
}

function testPath(root: string, path: string, spec: OpenAPI.Schema) {
  describe(root + path, () => {
    const verbs = new Set(['options', ...Object.keys(spec.paths[path])]);
    for (const verb of verbs) {
      testVerb(root, path, verb, spec);
    }
  });
}

function testVerb(
  root: string,
  path: string,
  verb: string,
  spec: OpenAPI.Schema,
) {
  describe(verb.toUpperCase(), () => {
    switch (verb.toUpperCase()) {
      case 'OPTIONS':
        testOptions(root, path, spec);
        break;
      case 'GET':
        testGet(root, path, verb, spec);
        break;
      default:
        it('works');
    }
  });
}

function testOptions(root: string, path: string, spec: OpenAPI.Schema) {
  it('200 response code', done => {
    const mocker = new Mocker();
    get(
      root + mocker.createPath(path, 'get', spec),
      { method: 'OPTIONS' },
      resp => {
        expect(resp.statusCode).to.equal(200);
        done();
      },
    );
  });

  it('Allow header', done => {
    const expectedHeaders = getAllowedVerbs(path, spec);
    const mocker = new Mocker();

    get(
      root + mocker.createPath(path, 'get', spec),
      { method: 'OPTIONS' },
      resp => {
        const actualHeaders = new Set<string>(
          (resp.headers.allow || '').split(',').map(x => x.trim()),
        );

        expect(Array.from(actualHeaders).sort()).to.deep.equal(
          Array.from(expectedHeaders).sort(),
        );

        done();
      },
    );
  });
}

function testGet(
  root: string,
  path: string,
  verb: string,
  spec: OpenAPI.Schema,
) {
  const mocker = new Mocker();
  for (const { title, statusCode, param, value } of permuteQuery(
    path,
    verb,
    spec,
  )) {
    it(title, done => {
      get(
        root + mocker.createPath(path, verb, spec) + '?' + param + '=' + value,
        resp => {
          expect(resp.statusCode).to.equal(statusCode);
          done();
        },
      );
    });
  }
}

function* permuteQuery(
  path: string,
  verb: string,
  spec: OpenAPI.Schema,
): IterableIterator<{
  title: string;
  param: string;
  value: any;
  statusCode: number;
}> {
  const operation = spec.paths[path][verb] as OpenAPI.Operation;
  const params = operation.parameters.filter(
    p => p['in'] === 'query',
  ) as OpenAPI.Parameter[];

  for (const param of params) {
    for (const { title, value, statusCode } of permuteQueryParam(param)) {
      yield { title, value, param: param.name, statusCode };
    }
  }
}

function* permuteQueryParam(
  param: OpenAPI.Parameter,
): IterableIterator<{ title: string; value: any; statusCode: number }> {
  const mocker = new Chance();
  if (param.in === 'query') {
    switch (param.type) {
      case 'boolean':
        yield {
          title: `Rejects string value in ${param.name} (${param.type})`,
          value: mocker.string({
            pool:
              '0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM',
          }),
          statusCode: 400,
        };
        yield {
          title: `Rejects number value in ${param.name} (${param.type})`,
          value: mocker.floating(),
          statusCode: 400,
        };
        yield {
          title: `Rejects integer value in ${param.name} (${param.type})`,
          value: mocker.integer(),
          statusCode: 400,
        };
        break;
      case 'integer':
        yield {
          title: `Rejects string value in ${param.name} (${param.type})`,
          value: mocker.string({
            pool:
              '0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM',
          }),
          statusCode: 400,
        };
        yield {
          title: `Rejects number value in ${param.name} (${param.type})`,
          value: mocker.floating(),
          statusCode: 400,
        };
        yield {
          title: `Rejects boolean value in ${param.name} (${param.type})`,
          value: mocker.bool(),
          statusCode: 400,
        };
        break;
      case 'number':
        yield {
          title: `Rejects string value in ${param.name} (${param.type})`,
          value: mocker.string({
            pool:
              '0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM',
          }),
          statusCode: 400,
        };
        yield {
          title: `Rejects boolean value in ${param.name} (${param.type})`,
          value: mocker.bool(),
          statusCode: 400,
        };
        break;
    }
  }
}
