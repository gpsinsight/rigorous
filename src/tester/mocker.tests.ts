import { expect } from 'chai';
import { Obj, Int } from '../types';
import { Mocker } from './mocker';
import * as Ajv from 'ajv';

const ajv = new Ajv({ allErrors: true });

describe('mocker', () => {
  it('works', () => {
    // ARRANGE
    const schema: Obj = {
      type: 'object',
      required: ['id'],
      properties: {
        id: {
          type: 'number',
          multipleOf: 6,
          minimum: 0,
          maximum: 96,
          exclusiveMaximum: true,
        },
        stuff: {
          type: 'array',
          items: { type: 'string' },
          uniqueItems: true,
          minItems: 2,
        },
        // value: {
        //   type: 'string',
        //   minLength: 19,
        //   maxLength: 52,
        //   pattern: '^[0-9]+$',
        // },
        // position: {
        //   type: 'number',
        //   minimum: 0,
        // },
        // meta: {
        //   type: 'object',
        //   properties: {
        //     count: {
        //       type: 'number',
        //     },
        //   },
        // },
      },
    };

    const sut = new Mocker();

    // ACT
    const result = Array.from(sut.createObjectVariants(schema));

    // ASSERT
    //result.forEach(x => console.log(x));
  });

  describe('valid integers', () => {
    it('mocks an interger greater than a minimum of zero', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        minimum: 0,
      };
      const validate = ajv.compile(schema);

      const sut = new Mocker();

      // ACT
      const result = sut.createInteger(schema);

      // ASSERT
      validate(result);
      expect(validate.errors || []).to.be.empty;
    });

    it('mocks an interger greater than a minimum of a positive integer', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        minimum: 20,
      };
      const validate = ajv.compile(schema);

      const sut = new Mocker();

      // ACT
      const result = sut.createInteger(schema);

      // ASSERT
      validate(result);
      expect(validate.errors || []).to.be.empty;
    });

    it('mocks an interger greater than a minimum of a negative integer', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        minimum: -20,
      };
      const validate = ajv.compile(schema);

      const sut = new Mocker();

      // ACT
      const result = sut.createInteger(schema);

      // ASSERT
      validate(result);
      expect(validate.errors || []).to.be.empty;
    });

    it('mocks an interger less than a maximum of zero', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        maximum: 0,
      };
      const validate = ajv.compile(schema);

      const sut = new Mocker();

      // ACT
      const result = sut.createInteger(schema);

      // ASSERT
      validate(result);
      expect(validate.errors || []).to.be.empty;
    });

    it('mocks an interger less than a maximum of a positive integer', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        maximum: 20,
      };
      const validate = ajv.compile(schema);

      const sut = new Mocker();

      // ACT
      const result = sut.createInteger(schema);

      // ASSERT
      validate(result);
      expect(validate.errors || []).to.be.empty;
    });

    it('mocks an interger less than a maximum of a negative integer', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        maximum: -20,
      };
      const validate = ajv.compile(schema);

      const sut = new Mocker();

      // ACT
      const result = sut.createInteger(schema);

      // ASSERT
      validate(result);
      expect(validate.errors || []).to.be.empty;
    });

    it('mocks an interger that is a multiple of another integer', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        multipleOf: 1000,
      };
      const validate = ajv.compile(schema);

      const sut = new Mocker();

      // ACT
      const result = sut.createInteger(schema);

      // ASSERT
      validate(result);
      expect(validate.errors || []).to.be.empty;
    });

    it('mocks an interger (with a mimimum) that is a multiple of another integer', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        multipleOf: 1000,
        minimum: 6453,
      };
      const validate = ajv.compile(schema);

      const sut = new Mocker();

      // ACT
      const result = sut.createInteger(schema);

      // ASSERT
      validate(result);
      expect(validate.errors || []).to.be.empty;
    });
  });
});
