import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe, expect, it} from 'vitest';
import {userEvent} from '@testing-library/user-event';

describe('Playground UI & Diagnostics', () => {
  it('mounts playground.html, switches presets, updates touch-action, and logs gestures', async () => {
    const html = readFileSync(resolve(__dirname, './playground.html'), 'utf8');
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    document.body.innerHTML = parsed.body.innerHTML;

    await import('./playground');

    const hitarea = document.getElementById('hitarea')!;
    const presetSelect = document.getElementById('presetSelect') as HTMLSelectElement;
    const childButton = document.getElementById('childButton') as HTMLButtonElement;
    const childClickCount = document.getElementById('childClickCount')!;
    const eventLogCode = document.getElementById('eventLogCode')!;
    const codePreview = document.getElementById('codePreview')!;
    const arenaStates = document.getElementById('arenaStates')!;

    // Default preset includes 2D Pan -> computed touch-action is `none`
    expect(hitarea.style.touchAction).toBe('none');
    expect(arenaStates.textContent).toContain('SingleTap: possible');
    expect(codePreview.textContent).toContain("from 'hammerjs';");

    // Switch to Horizontal Carousel preset -> touch-action becomes `pan-y pinch-zoom`
    presetSelect.value = 'carousel';
    presetSelect.dispatchEvent(new Event('change', {bubbles: true}));
    expect(hitarea.style.touchAction).toBe('pan-y pinch-zoom');
    expect(codePreview.textContent).toContain("direction: 'horizontal'");

    // Switch to Feed Card preset -> touch-action becomes `manipulation`
    presetSelect.value = 'feed-card';
    presetSelect.dispatchEvent(new Event('change', {bubbles: true}));
    expect(hitarea.style.touchAction).toBe('manipulation');

    // Disable DoubleTap so SingleTap confirms immediately on click, then click Child Button
    const enableDoubleTap = document.getElementById('enableDoubleTap') as HTMLInputElement;
    enableDoubleTap.checked = false;
    enableDoubleTap.dispatchEvent(new Event('change', {bubbles: true}));

    const user = userEvent.setup();
    await user.click(childButton);

    expect(childClickCount.textContent).toBe('1');
    expect(eventLogCode.textContent).toContain('SingleTap');
    expect(eventLogCode.textContent).toContain('ChildButtonClick');
  });
});
