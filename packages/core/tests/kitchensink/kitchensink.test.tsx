import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {KitchensinkApp} from './App';

describe('Mobile Kitchensink (Konsta UI + @hammerjs/react)', () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '#inbox');
  });

  it('mounts Hammer Mail, switches across all 5 tabs, and renders @hammerjs/react code', () => {
    render(<KitchensinkApp />);

    // Starts on Hammer Mail with @hammerjs/react code and link to Debug Playground
    expect(screen.getAllByText('Hammer Mail').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/from '@hammerjs\/react'/).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', {name: /Debug Playground/i}).getAttribute('href')).toBe(
      './playground/'
    );

    // Searchbar filters mail rows natively
    const searchInput = screen.getByPlaceholderText('U Can Search This...') as HTMLInputElement;
    fireEvent.input(searchInput, {target: {value: 'MC Hammer'}});
    expect(screen.getByText('MC Hammer')).toBeTruthy();
    expect(screen.queryByText('Stanley Burrell')).toBeNull();

    // Switch to Map tab & verify "Can't Touch This" Lock toggle (enabled option)
    fireEvent.click(screen.getByText('Map'));
    expect(screen.getAllByText('Oaktown Tour Map').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/quickScale/).length).toBeGreaterThan(0);
    const lockToggle = screen.getByLabelText('Lock map gestures');
    fireEvent.click(lockToggle);
    expect(screen.getAllByText(/enabled: false/).length).toBeGreaterThan(0);

    // Switch to Cards tab & verify in-card flip button
    fireEvent.click(screen.getByText('Cards'));
    expect(screen.getAllByText('Hammer Deck').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('Tap card or button to flip'));
    expect(screen.getByText('Hide details')).toBeTruthy();

    // Switch to Reorder tab & verify native checkbox works with ignoreTarget: true
    fireEvent.click(screen.getByText('Reorder'));
    expect(screen.getAllByText('Hammer Setlist').length).toBeGreaterThan(0);
    const firstCheckbox = screen.getAllByRole('checkbox')[0] as HTMLInputElement;
    expect(firstCheckbox.checked).toBe(true);
    fireEvent.click(firstCheckbox);
    expect(firstCheckbox.checked).toBe(false);

    // Switch to Sheets tab & verify propagate toggle + drawer open button
    fireEvent.click(screen.getByText('Sheets'));
    expect(screen.getAllByText('Hammer Player').length).toBeGreaterThan(0);
    const propToggle = screen.getByLabelText('Toggle gesture propagation');
    fireEvent.click(propToggle);
    expect(screen.getAllByText(/propagate: true/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText('Open navigation drawer'));
    expect(screen.getByText('Hammer Time Drawer')).toBeTruthy();
  });
});
