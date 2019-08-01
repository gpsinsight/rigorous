import { Arr, Bool, Int, Num, Obj, Str, Val } from '../types';

import { OpenAPI } from 'openapi-router';

import { Chance } from 'chance';
import { randexp } from 'randexp';

import * as integerFactory from './integer-factory';
import * as numberFactory from './number-factory';
import * as stringFactory from './string-factory';

export class Mocker {
  constructor(seed?: number | string) {
    this._seed = `${seed || Math.floor(Math.random() * 10000000)}`;
    this.r = new Chance(this._seed);
  }
  createPath(path: string, verb: string, spec: OpenAPI.Schema): string {
    const operation = spec.paths[path][verb] as OpenAPI.Operation;

    if (!operation) return path;

    const params = operation.parameters.filter(
      p => p['in'] === 'path',
    ) as OpenAPI.Parameter[];

    return params.reduce((result, param) => {
      if (param.in === 'path') {
        const mock = this.createValue(param)
          .split('%')
          .join('$');
        return result.split(`{${param.name}}`).join(mock);
      }
      return result;
    }, path);
  }

  createValue(val: any) {
    if (!val) return;
    switch (val.type) {
      case 'object':
        return this.createObject(val);
      case 'string':
        return this.createString(val);
      case 'integer':
        return this.createInteger(val);
      case 'number':
        return this.createNumber(val);
      case 'array':
        return this.createArray(val);
      case 'boolean':
        return this.createBoolean(val);
      default:
        return '//TODO';
    }
  }

  *createValueVariants(val: any): IterableIterator<Variant> {
    if (val)
      switch (val.type) {
        case 'object':
          yield* this.createObjectVariants(val);
          break;
        case 'string':
          yield* this.createStringVariants(val);
          break;
        case 'integer':
          yield* this.createIntegerVariants(val);
          break;
        case 'number':
          yield* this.createNumberVariants(val);
          break;
        case 'array':
          yield* this.createArrayVariants(val);
          break;
        case 'boolean':
          yield* this.createBooleanVariants();
          break;
        default:
          //yield* '//TODO';
          break;
      }
  }

  createObject(schema: Obj): any {
    return Object.keys(schema.properties).reduce((result, key) => {
      result[key] = this.createValue(schema.properties[key]);
      return result;
    }, {});
  }

  *createObjectVariants(schema: Obj): IterableIterator<Variant> {
    const propertyNames = Object.keys(schema.properties);
    const required = schema.required || [];

    const base = required.reduce(
      (result, key) => {
        result[key] = this.createValue(schema.properties[key]);
        return result;
      },
      {} as any,
    );

    // Bad property value
    for (const name of propertyNames) {
      const property = schema.properties[name];
      for (const variant of this.createValueVariants(property)) {
        yield {
          value: {
            ...base,
            [name]: variant.value,
          },
          reason: `${name} ${variant.reason}`,
        };
      }
    }

    // missing required property
    for (const name of required) {
      const x = { ...base };
      delete x[name];
      yield {
        value: x,
        reason: `is missing property '${name}'`,
      };
    }

    // TODO: min/max properties

    // TODO: additionalProperties: false

    yield {
      value: this.r.string(),
      reason: 'is a string',
    };

    yield {
      value: this.r.floating(),
      reason: 'is a number',
    };

    yield {
      value: this.r.integer(),
      reason: 'is an integer',
    };

    yield {
      value: [],
      reason: 'is an empty array',
    };
  }

  createString(schema: Str): string {
    if (schema.enum) {
      return this.r.pickone(schema.enum);
    } else if (schema.pattern) {
      return randexp(schema.pattern);
    }
    const options = schema['x-chance-options'] || {};

    const min = schema.minLength || 5;
    const max = schema.maxLength || min + 15;
    const length = this.r.integer({ min, max });

    if (schema['x-chance-type']) {
      const str = `${this.r[schema['x-chance-type']](options)}`;

      return str.length <= max ? str : str.substr(0, length);
    }

    return this.r.string({ length, ...options });
  }

  *createStringVariants(schema: Str): IterableIterator<Variant> {
    yield* stringFactory.longerThanMaxLength(schema, this.r);
    yield* stringFactory.shorterThanMinLength(schema, this.r);
    yield* stringFactory.invalidFormat();
    yield* stringFactory.invalidPattern(schema, this.r);
    yield* stringFactory.notInEnum(schema, this.r);
    yield* stringFactory.invalidType();
  }

  createNumber(schema: Num): number {
    const options = schema['x-chance-options'] || {};

    if (typeof schema.maximum === 'number') {
      options.max = schema.maximum;
    }
    if (typeof schema.minimum === 'number') {
      options.min = schema.minimum;
    }

    let value = this.r.floating(options);

    if (schema.multipleOf) {
      value -= value % schema.multipleOf;

      if (typeof schema.minimum === 'number' && value < schema.minimum) {
        value += schema.multipleOf;
      }
    }

    if (typeof schema.maximum !== 'number' || value < schema.maximum) {
      return value;
    } else {
      throw new Error('Cannot find valid value number');
    }
  }

  *createNumberVariants(schema: Num): IterableIterator<Variant> {
    yield* numberFactory.equalToExclusiveMaximum(schema);
    yield* numberFactory.equalToExclusiveMinimum(schema);
    yield* numberFactory.greaterThanMaximum(schema);
    yield* numberFactory.lessThanMinimum(schema);
    yield* numberFactory.invalidMultipleOf(schema);
    yield* numberFactory.invalidType(this.createNumber(schema), this.r);
  }

  createInteger(schema: Int): number {
    const options = schema['x-chance-options'] || {};

    if (typeof schema.maximum === 'number') {
      options.max = schema.maximum;
    }
    if (typeof schema.minimum === 'number') {
      options.min = schema.minimum;
    }

    let value = this.r.integer(options);

    if (schema.multipleOf) {
      value -= value % schema.multipleOf;

      if (typeof schema.minimum === 'number' && value < schema.minimum) {
        value += schema.multipleOf;
      }
    }

    if (typeof schema.maximum !== 'number' || value < schema.maximum) {
      return value;
    } else {
      throw new Error('Cannot find valid value number');
    }
  }

  *createIntegerVariants(schema: Int): IterableIterator<Variant> {
    yield* integerFactory.equalToExclusiveMaximum(schema);
    yield* integerFactory.equalToExclusiveMinimum(schema);
    yield* integerFactory.greaterThanMaximum(schema);
    yield* integerFactory.lessThanMinimum(schema);
    yield* integerFactory.invalidMultipleOf(schema);
    yield* integerFactory.invalidType(
      this.createInteger(schema),
      schema,
      this.r,
    );
  }

  createBoolean(schema: Bool): boolean {
    const options = schema['x-chance-options'] || {};
    return this.r.bool(options);
  }

  *createBooleanVariants(): IterableIterator<Variant> {
    yield {
      value: {},
      reason: 'is an empty object',
    };

    yield {
      value: [],
      reason: 'is an empty array',
    };

    yield {
      value: this.r.string(),
      reason: 'is a string',
    };

    yield {
      value: 'true',
      reason: 'is a string representation of true',
      allowInString: true,
    };

    yield {
      value: 'false',
      reason: 'is a string representation of false',
      allowInString: true,
    };
  }

  createArray(schema: Arr): any[] {
    const min = schema.minItems || 0;
    const max = schema.maxItems || min + 5;
    const count = this.r.integer({ min, max });

    if (schema.uniqueItems) {
      return this.r.unique(() => this.createValue(schema.items), count);
    } else {
      return this.r.n(() => this.createValue(schema.items), count);
    }
  }

  // TODO
  *createArrayVariants(schema: Arr): IterableIterator<Variant> {
    // min/max items
    if (schema.minItems) {
      if (schema.uniqueItems) {
        yield {
          value: this.r.unique(
            () => this.createValue(schema.items),
            schema.minItems - 1,
          ),
          reason: 'contains fewer items than minItems',
        };
      } else {
        yield {
          value: this.r.n(
            () => this.createValue(schema.items),
            schema.minItems - 1,
          ),
          reason: 'contains fewer items than minItems',
        };
      }
    }

    if (typeof schema.maxItems === 'number') {
      if (schema.uniqueItems) {
        yield {
          value: this.r.unique(
            () => this.createValue(schema.items),
            schema.maxItems + 1,
          ),
          reason: 'contains more items than maxItems',
        };
      } else {
        yield {
          value: this.r.n(
            () => this.createValue(schema.items),
            schema.maxItems + 1,
          ),
          reason: 'contains more items than maxItems',
        };
      }
    }

    // uniqueItems
    if (schema.uniqueItems) {
      const min = schema.minItems || 1;
      const max = schema.maxItems || min;

      const count = min <= max ? max : min;
      if (count > 1 && count <= max) {
        const base = this.r.unique(() => this.createValue(schema.items), count);

        base[1] = base[0];

        yield {
          value: base,
          reason: `contains a duplicate value`,
        };
      }
    }

    // invalid item
    const itemCount = schema.minItems || 0;
    const validArray = schema.uniqueItems
      ? this.r.unique(() => this.createValue(schema.items), itemCount)
      : this.r.n(() => this.createValue(schema.items), itemCount);
    for (const variant of this.createValueVariants(schema.items)) {
      const variantArray = [...validArray];
      variantArray[0] = variant.value;
      yield {
        value: variantArray,
        reason: `[0] ${variant.reason}`,
      };
    }

    // invalid types
    yield {
      value: {},
      reason: 'is an empty object',
    };

    yield {
      value: this.r.string(),
      reason: 'is a string',
    };

    yield {
      value: this.r.integer(),
      reason: 'is an integer',
    };

    yield {
      value: this.r.floating(),
      reason: 'is a number',
    };

    yield {
      value: true,
      reason: 'is a boolean',
    };
  }

  get seed(): string {
    return this._seed;
  }

  private readonly r: Chance.Chance;
  private readonly _seed: string;
}

/**
 * Represents an invalid variant of a value
 */
export type Variant = {
  value: any;
  reason: string;
  allowInString?: boolean;
};
