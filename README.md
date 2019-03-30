[![build](https://img.shields.io/travis/gpsinsight/rigorous.svg)](https://travis-ci.org/gpsinsight/rigorous)
[![code coverage](https://img.shields.io/codecov/c/gh/gpsinsight/rigorous.svg)](https://codecov.io/gh/gpsinsight/rigorous)
[![npm](https://img.shields.io/npm/v/rigorous.svg)](https://www.npmjs.com/package/rigorous)

# rigorous

Mocking and testing utilities for developing APIs with Swagger/OpenAPI

## Quickstart

### Run a mock server

The following example starts a mock server that hosts each of the spec files in the specified folder. The server will restart when any of the spec files are updated. The regex determines which files should be run. But default, any file ending with `.oas2.json` will be run.

```js
const { watch } = require('rigorous');

watch('/path/to/my/spec/folder', {
  port: 8080,
  regex: /^spec\.json$/,
});
```

### Generate integration tests

The following example will generate Mocha tests for negative cases based on the provided specs. The tests can then be run as you would run any suite of Mocha tests.

```js
const fs = require('fs');

const {
  createTestCases,
  createBadParameters,
  createMethodNotAllowed,
  createMissingParameters,
  createSmokeTests,
  generate,
} = require('rigorous');

const spec = fs.readFileSync('/path/to/spec.oas2.json');

createTestCases(spec, [
  createBadParameters,
  createMethodNotAllowed,
  createMissingParameters,
  createSmokeTests,
]).then(testCases =>
  fs.writeFileSync('/path/to/spec.tests.js', generate(testCases)),
);
```

## How to:

### Run this project

1.  Build the code: `npm run build`
1.  Run it! `npm start`

### Create and run tests

1.  Add tests by creating files with the `.tests.ts` suffix
1.  Run the tests: `npm t`
1.  Test coverage can be viewed at `/coverage/lcov-report/index.html`
