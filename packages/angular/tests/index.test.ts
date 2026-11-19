import {describe, expect, it} from 'vitest';
import {createHammer} from '../src/index.js';

describe('@hammerjs/angular', () => {
  it('exports createHammer helper', () => {
    expect(typeof createHammer).toBe('function');
  });
});
