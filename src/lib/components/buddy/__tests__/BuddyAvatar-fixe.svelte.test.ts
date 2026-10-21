/**
 * Avatar du Palotin, « réduire les animations »
 * =============================================
 *
 * L'élève qui demande moins d'animations voit la version fixe du Palotin, sans
 * réaction : chargé par une <img>, le SVG animé ne reçoit pas la préférence.
 */

import { describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BuddyAvatar from '../BuddyAvatar.svelte';

vi.mock('svelte/motion', () => ({ prefersReducedMotion: { current: true } }));

describe('BuddyAvatar, moins d’animations', () => {
	it('charge la version fixe, sans réaction', async () => {
		const { container } = await render(BuddyAvatar, { palotin: 'pile', expression: 'happy' });
		const img = container.querySelector('img')!;
		expect(img.getAttribute('src')).toBe('/images/buddies/pile-happy-fixe.svg');
		expect(img.className).not.toContain('reaction-');
	});
});
