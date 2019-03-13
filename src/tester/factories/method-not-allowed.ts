import { PathTestFactory, UriFactory, isVerb, Verb } from '../types';
import { OpenAPI } from 'openapi-router';
import { createTestCase } from '../utils';

export const createMethodNotAllowed: PathTestFactory = {
  type: 'path',
  create: function*({ pathPattern, spec }, { uriFactory }) {
    const allowed = new Set<Verb>(
      Object.keys(spec.paths[pathPattern]).filter(isVerb),
    );
    const notAllowed = new Set<Verb>();

    if (!allowed.has('get')) notAllowed.add('get');
    if (!allowed.has('post')) notAllowed.add('post');
    if (!allowed.has('put')) notAllowed.add('put');
    if (!allowed.has('patch')) notAllowed.add('patch');
    if (!allowed.has('delete')) notAllowed.add('delete');

    // TODO: create valid parameters
    const params = {};

    for (const verb of notAllowed) {
      yield createTestCase(
        'Call with wrong method',
        verb,
        spec.basePath + pathPattern,
        { path: params },
        { status: 405 },
        uriFactory,
      );
    }
  },
};
