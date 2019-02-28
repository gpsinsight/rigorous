import { Arr, Bool, Int, Num, Obj, Str, Val } from '../mocker';

import { OpenAPI } from 'openapi-router';

import { Chance } from 'chance';
import { randexp } from 'randexp';

import * as numberFactory from './number-factory';

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
          yield* this.createBooleanVariants(val);
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

  // TODO
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
          isValid: false,
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
        isValid: false,
        reason: `is missing property '${name}'`,
      };
    }

    yield {
      value: this.r.string(),
      isValid: false,
      reason: 'is a string',
    };

    yield {
      value: this.r.floating(),
      isValid: false,
      reason: 'is a number',
    };

    yield {
      value: this.r.integer(),
      isValid: false,
      reason: 'is an integer',
    };

    yield {
      value: [],
      isValid: false,
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

  // TODO
  *createStringVariants(schema: Str): IterableIterator<Variant> {}

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
    //yield* numberFactory.valid(schema, this.r);
    yield* numberFactory.equalToExclusiveMaximum(schema);
    yield* numberFactory.equalToExclusiveMinimum(schema);
    yield* numberFactory.greaterThanMaximum(schema);
    yield* numberFactory.lessThanMinimum(schema);
    yield* numberFactory.invalidMultipleOf(schema);
    yield* numberFactory.invalidType(this.createNumber(schema), this.r);
  }

  createInteger(schema: Int): number {
    const options = schema['x-chance-options'] || {};
    return this.r.integer(options);
  }

  // TODO
  *createIntegerVariants(schema: Int): IterableIterator<Variant> {}

  createBoolean(schema: Bool): boolean {
    const options = schema['x-chance-options'] || {};
    return this.r.bool(options);
  }

  // TODO
  *createBooleanVariants(schema: Bool): IterableIterator<Variant> {}

  createArray(schema: Arr): any[] {
    const min = schema.minItems || 0;
    const max = schema.maxItems || min + this.r.integer({ min: 0, max: 5 });
    const count = this.r.integer({ min, max });

    if (schema.uniqueItems) {
      return this.r.unique(() => this.createValue(schema.items), count);
    } else {
      return this.r.n(() => this.createValue(schema.items), count);
    }
  }

  // TODO
  *createArrayVariants(schema: Arr): IterableIterator<Variant> {}

  get seed(): string {
    return this._seed;
  }

  private readonly r: Chance.Chance;
  private readonly _seed: string;
}

export type Variant = {
  value: any;
  reason: string;
  isValid: boolean;
};
