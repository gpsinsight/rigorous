import { OpenAPI } from 'openapi-router';

import { Chance } from 'chance';

export class Mocker {
  constructor(seed?: number | string) {
    this._seed = `${seed || Math.floor(Math.random() * 10000000)}`;
    this.r = new Chance(this._seed);
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

  createObject(schema: Obj): any {
    return Object.keys(schema.properties).reduce((result, key) => {
      result[key] = this.createValue(schema.properties[key]);
      return result;
    }, {});
  }

  createString(schema: Str): string {
    if (schema.enum) {
      return this.r.pickone(schema.enum);
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

  createNumber(schema: Num): number {
    const options = schema['x-chance-options'] || {};
    return this.r.floating(options);
  }

  createInteger(schema: Int): number {
    const options = schema['x-chance-options'] || {};
    return this.r.integer(options);
  }

  createBoolean(schema: Bool): boolean {
    const options = schema['x-chance-options'] || {};
    return this.r.bool(options);
  }

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

  get seed(): string {
    return this._seed;
  }

  private readonly r: Chance.Chance;
  private readonly _seed: string;
}

export type Val = Str | Num | Int | Bool | Arr | Obj | Multi;

export type Multi = {
  type: (
    | Int['type']
    | Num['type']
    | Str['type']
    | Bool['type']
    | Arr['type']
    | Obj['type'])[];
};

export type Int = {
  type: 'integer';
  'x-chance-options'?: any;
};

export type Num = {
  type: 'number';
  'x-chance-options'?: any;
};

export type Str = {
  type: 'string';
  enum?: string[];
  minLength?: number;
  maxLength?: number;
  'x-chance-type'?: string;
  'x-chance-options'?: any;
};

export type Bool = {
  type: 'boolean';
  'x-chance-options'?: any;
};

export type Arr = {
  type: 'array';
  items: Val;
  uniqueItems?: boolean;
  minItems?: number;
  maxItems?: number;
};

export type Obj = {
  type: 'object';
  properties: { [name: string]: Val };
  'x-chance-options'?: any;
};
