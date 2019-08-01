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
  exclusiveMaximum?: boolean;
  exclusiveMinimum?: boolean;
  maximum?: number;
  minimum?: number;
  multipleOf?: number;
  'x-chance-options'?: any;
};

export type Num = {
  type: 'number';
  exclusiveMaximum?: boolean;
  exclusiveMinimum?: boolean;
  maximum?: number;
  minimum?: number;
  multipleOf?: number;
  'x-chance-options'?: any;
};

export type Str = {
  type: 'string';
  enum?: string[];
  pattern?: string;
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
  required?: string[];
  'x-chance-options'?: any;
};
