import * as fs from 'fs';

import { resolveRefsAt } from 'json-refs';
import { OpenAPI } from 'openapi-router';

import { walk } from '../walk';
import {
  createTestCases,
  createBadParameters,
  createMethodNotAllowed,
  createMissingParameters,
  createSmokeTests,
  createValidRequests,
  generate,
} from '..';

import { srcDir } from './constants';
import {} from '../tester/utils';

run()
  .then()
  .catch(console.error);

async function run() {
  for await (const file of walk(process.cwd(), srcDir, /oas2\.json$/)) {
    await writeTestFile(file);
  }
}

async function writeTestFile(filepath: string) {
  const res = await resolveRefsAt(filepath);
  const spec = res.resolved as OpenAPI.Schema;

  if (spec.basePath) {
    const testCases = await createTestCases(spec, [
      createBadParameters,
      createMethodNotAllowed,
      createMissingParameters,
      createSmokeTests,
      createValidRequests,
    ]);

    const outFile = filepath.split('oas2.json').join('tests.g.js');

    if (outFile === filepath) {
      throw new Error(
        `Generated test file name is the same as the spec file: '${filepath}'`,
      );
    }

    fs.writeFileSync(outFile, generate(testCases));
  }
}
