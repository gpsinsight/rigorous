import { SpecTestFactory } from '../types';

export const createSmokeTests: SpecTestFactory = {
  type: 'spec',
  create: function*({ spec }, { uriFactory }) {
    yield {
      category: 'Smoke tests',
      title: 'Serves HTTP traffic',
      verb: 'head',
      uri: uriFactory(spec.basePath),
      minStatus: 100,
      maxStatus: 600,
    };
  },
};
