/**
 * Avatar du Palotin, « réduire les animations »
 * =============================================
 *
 * L'élève qui demande moins d'animations voit la version fixe du Palotin :
 * chargé par une <img>, le SVG animé ne reçoit pas la préférence. Le choix est
 * laissé au navigateur (<source media>), pour que le HTML du serveur soit déjà
 * juste (Svelte ne corrige pas `src` à l'hydratation).
 */

import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BuddyAvatar from '../BuddyAvatar.svelte';

describe('BuddyAvatar, moins d’animations', () => {
	it('propose la version fixe quand le système demande moins d’animations', async () => {
		const { container } = await render(BuddyAvatar, { palotin: 'pile', expression: 'happy' });
		const source = container.querySelector('picture source')!;
		expect(source.getAttribute('media')).toBe('(prefers-reduced-motion: reduce)');
		expect(source.getAttribute('srcset')).toBe('/images/buddies/pile-happy-fixe.svg');
		expect(container.querySelector('picture img')!.getAttribute('src')).toBe(
			'/images/buddies/pile-happy.svg'
		);
	});
});
