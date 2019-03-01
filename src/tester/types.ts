export type TestCase = {
  category: string;
  title: string;
  verb: Verb;
  uri: string;
  headers?: { [header: string]: string };
  body?: any;
} & ({ status: number } | { minStatus: number; maxStatus: number });

export type Verb =
  | 'get'
  | 'head'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'options';

export function isVerb(obj: any): obj is Verb {
  return (
    obj === 'get' ||
    obj === 'head' ||
    obj === 'post' ||
    obj === 'put' ||
    obj === 'patch' ||
    obj === 'delete' ||
    obj === 'options'
  );
}
