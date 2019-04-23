import { TestCase } from './types';
import * as prettier from 'prettier';

export function generate(testCases: TestCase[], options?: {}): string {
  const categories: { [category: string]: TestCase[] } = {};

  for (const testCase of testCases) {
    categories[testCase.category] = categories[testCase.category] || [];
    categories[testCase.category].push(testCase);
  }

  return prettier.format(
    `
  // -----------------------------------------------------------
  // This code was generated by a tool.
  // 
  // Changes to this file may cause incorrect behavior and will
  // be lost if the code is regenerated.
  // -----------------------------------------------------------
    
  const { expect } = require('chai');
  
  const scheme = process.env['TEST_SCHEME'] || 'http';

  const { request } = require(scheme === 'https' ? 'https' : 'http');

  ${Object.keys(categories)
    .map(key => generateDescribe(key, categories[key]))
    .join('\n\n')}
  `,
    {
      singleQuote: true,
      useTabs: false,
      tabWidth: 2,
      trailingComma: 'all',
      parser: 'babel',
    },
  );
}

export function generateDescribe(name: string, testCases: TestCase[]): string {
  return `describe(${s(name)}, () => {
    ${testCases.map(generateIt).join('\n\n')}
  });`;
}

export function generateIt(testCase: TestCase): string {
  const uri = `\`\${scheme}://\${process.env['TEST_HOST'] || 'localhost'}${testCase.uri}\``;

  const options = {};
  options['method'] = testCase.verb.toUpperCase();
  if (testCase.headers && Object.keys(testCase.headers).length) {
    options['headers'] = testCase.headers;
  }
  const optionsStr = Object.keys(options).length
    ? JSON.stringify(options) + ','
    : '';

  const expectation =
    typeof testCase['status'] === 'number'
      ? `expect(resp.statusCode).to.equal(${testCase['status']});`
      : `expect(resp.statusCode).to.not.be.lessThan(${testCase['minStatus']});
          expect(resp.statusCode).to.be.lessThan(${testCase['maxStatus']});`;

  const bodyStr = testCase.body
    ? `const body = ${s(JSON.stringify(testCase.body))};\n\n`
    : '';

  const writeBodyStr = bodyStr ? 'req.write(body);' : '';

  return `it(${s(testCase.title)}, done => {
      ${bodyStr}
      const req = request(
        ${uri},
        ${optionsStr}
        resp => {
          ${expectation}
          done();
        },
      );
      ${writeBodyStr}req.end();
    });`;
}

function s(str: string): string {
  return `'${str.split("'").join("\\'")}'`;
}
