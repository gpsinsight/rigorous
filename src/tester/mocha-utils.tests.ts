import { readFileSync } from 'fs';
import { OpenAPI } from 'openapi-router';

import {
  createTestCases,
  createBadParameters,
  createMissingParameters,
  createMethodNotAllowed,
  createSmokeTests,
} from '.';

import { generate } from './mocha-utils';

describe('mocha-utils', () => {
  it('works', async () => {
    // ARRANGE
    const spec = JSON.parse(
      readFileSync(
        '/Users/skonves/code/api-specs/.resolved/attributes/v3.oas2.json',
      ).toString(),
    ) as OpenAPI.Schema;

    const testFactories = [
      createBadParameters,
      createMissingParameters,
      createMethodNotAllowed,
      createSmokeTests,
    ];

    const testCases = await createTestCases(spec, testFactories);

    // ACT
    const result = generate(testCases);

    // ASSERT
  });
});
