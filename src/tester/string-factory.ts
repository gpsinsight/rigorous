import { Chance } from 'chance';

import { Str } from '../types';
import { Variant } from './mocker';

export function* longerThanMaxLength(
  schema: Str,
  chance: Chance.Chance,
): IterableIterator<Variant> {
  if (!schema.enum && typeof schema.maxLength === 'number') {
    yield {
      value: chance.string({ length: schema.maxLength + 1 }),
      reason: `is longer than the maxLength of ${schema.maxLength}`,
    };
  }
}

export function* shorterThanMinLength(
  schema: Str,
  chance: Chance.Chance,
): IterableIterator<Variant> {
  if (
    !schema.enum &&
    typeof schema.minLength === 'number' &&
    schema.minLength > 0
  ) {
    yield {
      value: chance.string({ length: schema.minLength - 1 }),
      reason: `is shorter than the minLength of ${schema.minLength}`,
    };
  }
}

export function* invalidFormat(): IterableIterator<Variant> {
  // TODO
}

export function* invalidPattern(
  schema: Str,
  chance: Chance.Chance,
): IterableIterator<Variant> {
  if (schema.pattern) {
    let value = '';

    const min = schema.minLength || 1;
    const max = schema.maxLength || min + 50;

    let regex: RegExp;
    try {
      regex = new RegExp(schema.pattern);
    } catch (e) {
      console.error(e);
    }

    if (regex) {
      for (let length = min; length < max + 1; length++) {
        value = chance.string({ length });

        if (!regex.test(value)) {
          yield {
            value,
            reason: `does not match pattern.`,
          };
          break;
        }
      }
    }
  }
}

export function* notInEnum(
  schema: Str,
  chance: Chance.Chance,
): IterableIterator<Variant> {
  if (schema.enum) {
    yield {
      value: chance.string(),
      reason: `is not in enum`,
    };
  }
}

export function* invalidType(): IterableIterator<Variant> {
  yield {
    value: {},
    reason: 'is an empty object',
  };

  yield {
    value: [],
    reason: 'is an empty array',
    allowInString: true,
  };

  yield {
    value: 123.456,
    reason: 'is a number',
    allowInString: true,
  };

  yield {
    value: 123,
    reason: 'is an integer',
    allowInString: true,
  };

  yield {
    value: true,
    reason: 'is a boolean',
    allowInString: true,
  };
}
