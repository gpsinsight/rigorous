import { expect } from 'chai';
import { debounce } from './debounce';

describe('debounce', () => {
  it('runs a function TWICE when called NOT immediately AFTER the wait period', async () => {
    // ARRANGE
    let x = 0;
    const wait = 5;
    const fn = () => ++x;
    const sut = debounce(fn, wait);

    // ACT
    sut();
    await sleep(wait * 2);
    sut();
    await sleep(wait * 2);

    // ASSERT
    expect(x).to.equal(2);
  });

  it('runs a function ONCE when called NOT immediately BEFORE the wait period', async () => {
    // ARRANGE
    let x = 0;
    const wait = 5;
    const fn = () => ++x;
    const sut = debounce(fn, wait);

    // ACT
    sut();
    sut();
    await sleep(wait * 2);

    // ASSERT
    expect(x).to.equal(1);
  });

  it('runs a function TWICE when called immediately AFTER the wait period', async () => {
    // ARRANGE
    let x = 0;
    const wait = 5;
    const fn = () => ++x;
    const sut = debounce(fn, wait, true);

    // ACT
    sut();
    await sleep(wait * 2);
    sut();

    // ASSERT
    expect(x).to.equal(2);
  });

  it('runs a function ONCE when called immediately BEFORE the wait period', async () => {
    // ARRANGE
    let x = 0;
    const wait = 5;
    const fn = () => ++x;
    const sut = debounce(fn, wait, true);

    // ACT
    sut();
    sut();

    // ASSERT
    expect(x).to.equal(1);
  });

  it('does NOT run a function immediately', async () => {
    // ARRANGE
    let x = 0;
    const wait = 5;
    const fn = () => ++x;
    const sut = debounce(fn, wait);

    // ACT
    sut();

    // ASSERT
    expect(x).to.equal(0);
  });

  it('DOES run a function immediately', async () => {
    // ARRANGE
    let x = 0;
    const wait = 5;
    const fn = () => ++x;
    const sut = debounce(fn, wait, true);

    // ACT
    sut();

    // ASSERT
    expect(x).to.equal(1);
  });
});

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
