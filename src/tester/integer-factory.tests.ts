import { expect } from 'chai';

import { Int } from '../mocker';

import {
  equalToExclusiveMaximum,
  equalToExclusiveMinimum,
  greaterThanMaximum,
  lessThanMinimum,
  invalidMultipleOf,
} from './integer-factory';

describe('integer-factory', () => {
  describe('equalToExclusiveMaximum', () => {
    const sut = equalToExclusiveMaximum;
    it('no-ops when no maximum is specified', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result).to.be.empty;
    });
    it('no-ops when maximum is not exclusive', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        maximum: 100,
        exclusiveMaximum: false,
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result).to.be.empty;
    });
    it('no-ops when exclusive maximum is not a valid multiple', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        maximum: 13,
        exclusiveMaximum: true,
        multipleOf: 7,
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result).to.be.empty;
    });
    it('returns a variant when no multiple is specified', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        maximum: 100,
        exclusiveMaximum: true,
      };

      const expectedValue = 100;

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result.length).to.equal(1);
      expect(result[0].value).to.equal(expectedValue);
      expect(result[0].value % 1, 'Variant value is an integer').to.equal(0);
    });
    it('returns a variant when exclusive maximum is a valid multiple', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        maximum: 100,
        exclusiveMaximum: true,
        multipleOf: 10,
      };

      const expectedValue = 100;

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result.length).to.equal(1);
      expect(result[0].value).to.equal(expectedValue);
      expect(result[0].value % 1, 'Variant value is an integer').to.equal(0);
    });
  });
  describe('greaterThanMaximum', () => {
    const sut = greaterThanMaximum;
    it('no-ops when no maximum is specified', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result).to.be.empty;
    });
    it('returns a variant when no multiple is specified', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        maximum: 100,
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result.length).to.equal(1);
      expect(result[0].value).to.be.greaterThan(schema.maximum);
      expect(result[0].value % 1, 'Variant value is an integer').to.equal(0);
    });
    it('returns a variant when maximum is a valid multiple', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        maximum: 100,
        multipleOf: 10,
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result.length, 'Result has a single variant').to.equal(1);
      expect(
        result[0].value,
        'Variant value is greater than maximum',
      ).to.be.greaterThan(schema.maximum);
      expect(
        result[0].value % schema.multipleOf,
        'Variant value is evenly divisible by multipleOf',
      ).to.equal(0);
      expect(result[0].value % 1, 'Variant value is an integer').to.equal(0);
    });
    it('returns a variant when maximum is an invalid multiple', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        maximum: 51,
        multipleOf: 10,
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result.length, 'Result has a single variant').to.equal(1);
      expect(
        result[0].value,
        'Variant value is greater than maximum',
      ).to.be.greaterThan(schema.maximum);
      expect(
        result[0].value % schema.multipleOf,
        'Variant value is evenly divisible by multipleOf',
      ).to.equal(0);
      expect(result[0].value % 1, 'Variant value is an integer').to.equal(0);
    });
  });
  describe('equalToExclusiveMinimum', () => {
    const sut = equalToExclusiveMinimum;
    it('no-ops when no minimum is specified', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result).to.be.empty;
    });
    it('no-ops when minimum is not exclusive', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        minimum: 100,
        exclusiveMinimum: false,
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result).to.be.empty;
    });
    it('no-ops when exclusive minimum is not a valid multiple', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        minimum: 13,
        exclusiveMinimum: true,
        multipleOf: 7,
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result).to.be.empty;
    });
    it('returns a variant when no multiple is specified', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        minimum: 100,
        exclusiveMinimum: true,
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result.length).to.equal(1);
      expect(result[0].value).to.equal(schema.minimum);
      expect(result[0].value % 1, 'Variant value is an integer').to.equal(0);
    });
    it('returns a variant when exclusive minimum is a valid multiple', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        minimum: 100,
        exclusiveMinimum: true,
        multipleOf: 10,
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result.length).to.equal(1);
      expect(result[0].value).to.equal(schema.minimum);
      expect(result[0].value % 1, 'Variant value is an integer').to.equal(0);
    });
  });
  describe('lessThanMinimum', () => {
    const sut = lessThanMinimum;
    it('no-ops when no minimum is specified', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result).to.be.empty;
    });
    it('returns a variant when no multiple is specified', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        minimum: 100,
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result.length).to.equal(1);
      expect(result[0].value).to.be.lessThan(schema.minimum);
      expect(result[0].value % 1, 'Variant value is an integer').to.equal(0);
    });
    it('returns a variant when minimum is a valid multiple', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        minimum: 100,
        multipleOf: 10,
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result.length, 'Result has a single variant').to.equal(1);
      expect(
        result[0].value,
        'Variant value is less than minimum',
      ).to.be.lessThan(schema.minimum);
      expect(
        result[0].value % schema.multipleOf,
        'Variant value is evenly divisible by multipleOf',
      ).to.equal(0);
      expect(result[0].value % 1, 'Variant value is an integer').to.equal(0);
    });
    it('returns a variant when minimum is an invalid multiple', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        minimum: 51,
        multipleOf: 10,
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result.length, 'Result has a single variant').to.equal(1);
      expect(
        result[0].value,
        'Variant value is less than minimum',
      ).to.be.lessThan(schema.minimum);
      expect(
        result[0].value % schema.multipleOf,
        'Variant value is evenly divisible by multipleOf',
      ).to.equal(0);
      expect(result[0].value % 1, 'Variant value is an integer').to.equal(0);
    });
  });
  describe('invalidMultipleOf', () => {
    const sut = invalidMultipleOf;
    it('no-ops when no multipleOf is specified', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result).to.be.empty;
    });
    it('no-ops when there is no valid multiple between minimum and maximum', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        minimum: 40,
        maximum: 45,
        multipleOf: 25,
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result).to.be.empty;
    });
    it('returns a variant when no mininum or maximum is specified', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        multipleOf: 25,
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result.length, 'Result has a single variant').to.equal(1);
      expect(
        result[0].value % schema.multipleOf,
        'Variant value is not evenly divisible by multipleOf',
      ).to.not.equal(0);
      expect(result[0].value % 1, 'Variant value is an integer').to.equal(0);
    });
    it('returns a variant when maximum is specified', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        maximum: 90,
        multipleOf: 25,
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result.length, 'Result has a single variant').to.equal(1);
      expect(
        result[0].value,
        'Variant value is less than maximum',
      ).to.be.lessThan(schema.maximum);
      expect(
        result[0].value % schema.multipleOf,
        'Variant value is not evenly divisible by multipleOf',
      ).to.not.equal(0);
      expect(result[0].value % 1, 'Variant value is an integer').to.equal(0);
    });
    it('returns a variant when minimum is specified', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        minimum: 90,
        multipleOf: 25,
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result.length, 'Result has a single variant').to.equal(1);
      expect(
        result[0].value,
        'Variant value is greater than minimum',
      ).to.be.greaterThan(schema.minimum);
      expect(
        result[0].value % schema.multipleOf,
        'Variant value is not evenly divisible by multipleOf',
      ).to.not.equal(0);
      expect(result[0].value % 1, 'Variant value is an integer').to.equal(0);
    });
    it('returns a variant when minimum and maximum are specified', () => {
      // ARRANGE
      const schema: Int = {
        type: 'integer',
        minimum: 100,
        maximum: 200,
        multipleOf: 25,
      };

      // ACT
      const result = Array.from(sut(schema));

      // ASSERT
      expect(result.length, 'Result has a single variant').to.equal(1);
      expect(
        result[0].value,
        'Variant value is less than maximum',
      ).to.be.lessThan(schema.maximum);
      expect(
        result[0].value,
        'Variant value is greater than minimum',
      ).to.be.greaterThan(schema.minimum);
      expect(
        result[0].value % schema.multipleOf,
        'Variant value is not evenly divisible by multipleOf',
      ).to.not.equal(0);
      expect(result[0].value % 1, 'Variant value is an integer').to.equal(0);
    });
  });
});
