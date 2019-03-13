import { expect } from 'chai';
import { getUriFactory } from './utils';

describe('uriFactory', () => {
  const uriFactory = getUriFactory('http', 'somehost:9001');

  it('replaces a single path param with a string', () => {
    // ARRANGE
    const pathPattern = '/widgets/{widgetId}';
    const path = { widgetId: '1234' };

    // ACT
    const result = uriFactory(pathPattern, { path });

    // ASSERT
    expect(result).to.equal('http://somehost:9001/widgets/1234');
  });

  it('replaces a single path param with a number', () => {
    // ARRANGE
    const pathPattern = '/widgets/{widgetId}';
    const path = { widgetId: 12.34 };

    // ACT
    const result = uriFactory(pathPattern, { path });

    // ASSERT
    expect(result).to.equal('http://somehost:9001/widgets/12.34');
  });

  it('replaces a single path param with a boolean', () => {
    // ARRANGE
    const pathPattern = '/widgets/{widgetId}';
    const path = { widgetId: true };

    // ACT
    const result = uriFactory(pathPattern, { path });

    // ASSERT
    expect(result).to.equal('http://somehost:9001/widgets/true');
  });

  it('replaces multiple path params', () => {
    // ARRANGE
    const pathPattern = '/widgets/{widgetId}/gizmos/{gizmoId}';
    const path = { widgetId: '1234', gizmoId: '9876' };

    // ACT
    const result = uriFactory(pathPattern, { path });

    // ASSERT
    expect(result).to.equal('http://somehost:9001/widgets/1234/gizmos/9876');
  });

  it('replaces duplicate path param', () => {
    // ARRANGE
    const pathPattern = '/widgets/{id}/gizmos/{id}';
    const path = { id: '1234' };

    // ACT
    const result = uriFactory(pathPattern, { path });

    // ASSERT
    expect(result).to.equal('http://somehost:9001/widgets/1234/gizmos/1234');
  });

  it('tolerates extra params in path', () => {
    // ARRANGE
    const pathPattern = '/widgets/{id}/gizmos/{extra}';
    const path = { id: '1234' };

    // ACT
    const result = uriFactory(pathPattern, { path });

    // ASSERT
    expect(result).to.equal('http://somehost:9001/widgets/1234/gizmos/{extra}');
  });

  it('tolerates extra params in options', () => {
    // ARRANGE
    const pathPattern = '/widgets/{id}';
    const path = { id: '1234', extra: '9876' };

    // ACT
    const result = uriFactory(pathPattern, { path });

    // ASSERT
    expect(result).to.equal('http://somehost:9001/widgets/1234');
  });

  it('adds a single string query parameter', () => {
    // ARRANGE
    const pathPattern = '/widgets';
    const query = { foo: 'bar' };

    // ACT
    const result = uriFactory(pathPattern, { query });

    // ASSERT
    expect(result).to.equal('http://somehost:9001/widgets?foo=bar');
  });

  it('adds a single numeric query parameter', () => {
    // ARRANGE
    const pathPattern = '/widgets';
    const query = { foo: 12.34 };

    // ACT
    const result = uriFactory(pathPattern, { query });

    // ASSERT
    expect(result).to.equal('http://somehost:9001/widgets?foo=12.34');
  });

  it('adds a single boolean query parameter', () => {
    // ARRANGE
    const pathPattern = '/widgets';
    const query = { foo: false };

    // ACT
    const result = uriFactory(pathPattern, { query });

    // ASSERT
    expect(result).to.equal('http://somehost:9001/widgets?foo=false');
  });

  it('adds multiple query parameters', () => {
    // ARRANGE
    const pathPattern = '/widgets';
    const query = { foo: 'bar', fizz: 'buzz' };

    // ACT
    const result = uriFactory(pathPattern, { query });

    // ASSERT
    expect(result).to.equal('http://somehost:9001/widgets?foo=bar&fizz=buzz');
  });
});
