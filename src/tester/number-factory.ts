import { Num } from '../mocker';
import { Variant } from './mocker';

export function* valid(
  schema: Num,
  chance: Chance.Chance,
): IterableIterator<Variant> {
  const options = schema['x-chance-options'] || {};

  if (typeof schema.maximum === 'number') {
    options.max = schema.maximum;
  }
  if (typeof schema.minimum === 'number') {
    options.min = schema.minimum;
  }

  let value = chance.floating(options);

  if (schema.multipleOf) {
    value -= value % schema.multipleOf;

    if (typeof schema.minimum === 'number' && value < schema.minimum) {
      value += schema.multipleOf;
    }
  }

  if (typeof schema.maximum !== 'number' || value < schema.maximum) {
    yield {
      value,
      isValid: true,
      reason: 'is valid',
    };
  }
}

export function* equalToExclusiveMaximum(
  schema: Num,
): IterableIterator<Variant> {
  if (
    typeof schema.maximum === 'number' &&
    schema.exclusiveMaximum &&
    (typeof schema.multipleOf !== 'number' ||
      schema.maximum % schema.multipleOf === 0)
  ) {
    yield {
      value: schema.maximum,
      isValid: false,
      reason: `is equal to the exclusive maximum of ${schema.maximum}`,
    };
  }
}

export function* equalToExclusiveMinimum(
  schema: Num,
): IterableIterator<Variant> {
  if (
    typeof schema.minimum === 'number' &&
    schema.exclusiveMinimum &&
    (typeof schema.multipleOf !== 'number' ||
      schema.minimum % schema.multipleOf === 0)
  ) {
    yield {
      value: schema.minimum,
      isValid: false,
      reason: `is equal to the exclusive minimum of ${schema.minimum}`,
    };
  }
}

export function* greaterThanMaximum(schema: Num): IterableIterator<Variant> {
  if (typeof schema.maximum === 'number') {
    if (typeof schema.multipleOf === 'number') {
      const difference =
        schema.multipleOf - (schema.maximum % schema.multipleOf);

      yield {
        value: schema.maximum + difference,
        isValid: false,
        reason: `is greater than the maximum of ${schema.maximum}`,
      };
    } else {
      yield {
        value: schema.maximum + 1,
        isValid: false,
        reason: `is greater than the maximum of ${schema.maximum}`,
      };
    }
  }
}

export function* lessThanMinimum(schema: Num): IterableIterator<Variant> {
  if (typeof schema.minimum === 'number') {
    if (typeof schema.multipleOf === 'number') {
      const difference =
        schema.multipleOf + (schema.minimum % schema.multipleOf);

      yield {
        value: schema.minimum - difference,
        isValid: false,
        reason: `is less than the minimum of ${schema.minimum}`,
      };
    } else {
      yield {
        value: schema.minimum - 1,
        isValid: false,
        reason: `is less than the minimum of ${schema.minimum}`,
      };
    }
  }
}

export function* invalidMultipleOf(schema: Num): IterableIterator<Variant> {
  const { multipleOf, maximum, minimum } = schema;
  if (multipleOf) {
    if (typeof maximum === 'number') {
      const value = maximum - (maximum % multipleOf) - 0.5 * multipleOf;
      if (typeof minimum === 'number') {
        if (value > minimum) {
          yield {
            value,
            isValid: false,
            reason: `is not a multiple of ${multipleOf}`,
          };
        }
      } else {
        yield {
          value,
          isValid: false,
          reason: `is not a multiple of ${multipleOf}`,
        };
      }
    } else if (typeof minimum === 'number') {
      yield {
        value: minimum + (minimum % multipleOf) + 0.5 * multipleOf,
        isValid: false,
        reason: `is not a multiple of ${multipleOf}`,
      };
    } else {
      yield {
        value: 1.5 * multipleOf,
        isValid: false,
        reason: `is not a multiple of ${multipleOf}`,
      };
    }
  }
}

export function* invalidType(
  valid: number,
  chance: Chance.Chance,
): IterableIterator<Variant> {
  yield {
    value: chance.string(),
    isValid: false,
    reason: 'is a string',
  };

  yield {
    value: true,
    isValid: false,
    reason: 'is a boolean',
  };

  yield {
    value: `${valid}`,
    isValid: false,
    reason: 'is a string representation of a valid number',
  };
}
