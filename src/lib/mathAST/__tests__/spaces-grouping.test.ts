/**
 * Espaces des milliers : par groupes de 3, pas seulement « une espace »
 * ====================================================================
 *
 * `checkSpacesViolation` ne vérifiait que la PRÉSENCE d'une espace : pour 3456,
 * « 34 56 », « 345 6 » ou « 3 4 5 6 » étaient jugés corrects (relevé sur les
 * questions #4, #5, #7 relues par David). La logique juste (groupes de 3)
 * existait dans `constraint-validators` ; elle est désormais unique.
 */

import { describe, it, expect } from 'vitest';
import { checkForm, checkSpacesViolation } from '../cosmetic-transforms';

const S = String.fromCharCode(92) + ',';

describe('checkSpacesViolation', () => {
	it.each([`3${S}456`, `1${S}234${S}567`, '123', `0,123${S}4`, '12'])('%s : correct', (latex) => {
		expect(checkSpacesViolation(latex)).toBe(false);
	});

	it.each(['3456', `34${S}56`, `345${S}6`, `3${S}4${S}5${S}6`, `12${S}34${S}567`, `1${S}234567`])(
		'%s : espaces mal placées',
		(latex) => {
			expect(checkSpacesViolation(latex)).toBe(true);
		}
	);
});

describe('checkForm — réponse 3456 mal espacée', () => {
	it('« 34 56 » : juste en valeur mais forme perfectible (espaces)', () => {
		const result = checkForm(`34${S}56`, '3456', {});
		expect(result.status).toBe('unoptimal_form');
		expect(result.violations.map((v) => v.id)).toContain('spaces');
	});
});
