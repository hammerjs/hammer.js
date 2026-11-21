import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {afterEach, describe, expect, it} from 'vitest';
import {KitchensinkApp} from './App';

describe('Mobile Kitchensink (Konsta UI + @hammerjs/react)', () => {
  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '#inbox');
  });

  it('mounts Inbox, switches across all 5 tabs, and renders @hammerjs/react code', () => {
    render(<KitchensinkApp />);

    // Starts on Inbox Feed with @hammerjs/react code and link to Debug Playground
    expect(screen.getAllByText('Inbox Feed').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/from '@hammerjs\/react'/).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', {name: /Debug Playground/i}).getAttribute('href')).toBe(
      './playground/'
    );

    // Searchbar filters mail rows natively
    const searchInput = screen.getByPlaceholderText('Filter messages...') as HTMLInputElement;
    fireEvent.input(searchInput, {target: {value: 'Maya'}});
    expect(screen.getByText('Maya Lin')).toBeTruthy();
    expect(screen.queryByText('Jonas Berg')).toBeNull();

    // Switch to Map tab & verify Lock toggle (enabled option)
    fireEvent.click(screen.getByText('Map'));
    expect(screen.getAllByText('Interactive Map').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/quickScale/).length).toBeGreaterThan(0);
    const lockToggle = screen.getByLabelText('Lock map gestures');
    fireEvent.click(lockToggle);
    expect(screen.getAllByText(/enabled: false/).length).toBeGreaterThan(0);

    // Switch to Cards tab & verify in-card flip button
    fireEvent.click(screen.getByText('Cards'));
    expect(screen.getAllByText('Card Deck').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByText('Tap card or button to flip'));
    expect(screen.getByText('Hide details')).toBeTruthy();

    // Switch to Reorder tab & verify native checkbox works with ignoreTarget: true
    fireEvent.click(screen.getByText('Reorder'));
    expect(screen.getAllByText('Drag to Reorder').length).toBeGreaterThan(0);
    const firstCheckbox = screen.getAllByRole('checkbox')[0] as HTMLInputElement;
    expect(firstCheckbox.checked).toBe(true);
    fireEvent.click(firstCheckbox);
    expect(firstCheckbox.checked).toBe(false);

    // Switch to Sheets tab & verify propagate toggle + drawer open button
    fireEvent.click(screen.getByText('Sheets'));
    expect(screen.getAllByText('Sheets & Drawer').length).toBeGreaterThan(0);
    const propToggle = screen.getByLabelText('Toggle gesture propagation');
    fireEvent.click(propToggle);
    expect(screen.getAllByText(/propagate: true/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText('Open navigation drawer'));
    expect(screen.getByText('Edge Drawer')).toBeTruthy();
  });
});
