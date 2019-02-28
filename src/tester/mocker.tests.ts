import { expect } from 'chai';
import { Obj } from '../mocker';
import { Mocker } from './mocker';

describe('mocker', () => {
  it('works', () => {
    // ARRANGE
    const schema: Obj = {
      type: 'object',
      required: ['id'],
      properties: {
        id: {
          type: 'number',
          multipleOf: 6,
          minimum: 0,
          maximum: 96,
          exclusiveMaximum: true,
        },
        value: {
          type: 'number',
          minimum: 0,
        },
        meta: {
          type: 'object',
          properties: {
            count: {
              type: 'number',
            },
          },
        },
      },
    };

    const sut = new Mocker();

    // ACT
    const result = Array.from(sut.createObjectVariants(schema));

    // ASSERT
    console.log(result);
  });
});
