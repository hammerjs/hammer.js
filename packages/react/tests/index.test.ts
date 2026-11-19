import {describe, expect, it} from 'vitest';
import {useHammer} from '../src/index.js';

describe('@hammerjs/react', () => {
  it('exports useHammer hook', () => {
    expect(typeof useHammer).toBe('function');
  });
});
