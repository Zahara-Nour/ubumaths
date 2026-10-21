/**
 * Avatar du Palotin
 * =================
 *
 * L'image suit l'expression, et le Palotin réagit quand elle arrive : il bondit
 * de joie (content), tressaute (excité), ou s'affaisse puis se relève (déterminé,
 * après une erreur). Au repos, aucune réaction.
 */

import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import BuddyAvatar from '../BuddyAvatar.svelte';
import type { BuddyExpression } from '$lib/types/buddy';

// Constantes
const REACTIONS = ['reaction-bond', 'reaction-tressaut', 'reaction-affaisse'];

// Functions
async function reactionsOf(expression: BuddyExpression): Promise<string[]> {
	const { container } = await render(BuddyAvatar, { palotin: 'giron', expression });
	const img = container.querySelector('img')!;
	return REACTIONS.filter((r) => img.classList.contains(r));
}

describe('BuddyAvatar', () => {
	it("charge l'image de l'expression", async () => {
		const { container } = await render(BuddyAvatar, {
			palotin: 'cotice',
			expression: 'determined'
		});
		expect(container.querySelector('img')!.getAttribute('src')).toBe(
			'/images/buddies/cotice-determined.svg'
		);
	});

	it('content : le Palotin bondit', async () => {
		expect(await reactionsOf('happy')).toEqual(['reaction-bond']);
	});

	it('excité : il tressaute', async () => {
		expect(await reactionsOf('excited')).toEqual(['reaction-tressaut']);
	});

	it("déterminé (après une erreur) : il s'affaisse puis se relève", async () => {
		expect(await reactionsOf('determined')).toEqual(['reaction-affaisse']);
	});

	it('neutre, pensif, encourageant, triste : aucune réaction', async () => {
		for (const expression of ['neutral', 'thinking', 'encouraging', 'sad'] as const) {
			expect(await reactionsOf(expression)).toEqual([]);
		}
	});
});
