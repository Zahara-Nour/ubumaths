/**
 * Expressions des Palotins
 * ========================
 *
 * Après une erreur ou une Constance perdue, le Palotin est « déterminé » (on
 * repart). Il n'est triste qu'au retour d'une longue absence (« tu m'as
 * manqué », décision du 2026-10-21). Chaque expression a son image pour chaque Palotin :
 * une image manquante ferait tomber l'avatar sur le cercle de repli. La version
 * « -fixe » sert à l'élève qui demande moins d'animations : chargé par une
 * <img>, le SVG animé ne reçoit pas cette préférence (Chromium).
 */

import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buddyMessageEngine } from '../buddy-message-engine';
import type { PalotinType } from '$lib/config/buddy-messages';
import type { BuddyExpression } from '$lib/types/buddy';

// Constantes
/** Toutes les expressions : le `satisfies` casse si une expression est ajoutée au type sans ici. */
const EXPRESSIONS = Object.keys({
	neutral: true,
	happy: true,
	sad: true,
	thinking: true,
	excited: true,
	encouraging: true,
	determined: true
} satisfies Record<BuddyExpression, true>) as BuddyExpression[];
const PALOTINS: PalotinType[] = ['giron', 'pile', 'cotice'];

describe('expression selon le contexte', () => {
	it('après une erreur, le Palotin est déterminé', () => {
		expect(buddyMessageEngine.getExpression('incorrect')).toBe('determined');
	});

	it('Constance perdue : déterminé aussi (les répliques disent « on repart »)', () => {
		expect(buddyMessageEngine.getExpression('streak_lost')).toBe('determined');
	});

	it('retour après une longue absence : triste', () => {
		expect(buddyMessageEngine.getExpression('long_absence')).toBe('sad');
	});
});

describe('images des Palotins', () => {
	for (const palotin of PALOTINS) {
		for (const expression of EXPRESSIONS) {
			it(`${palotin}-${expression} : une version animée et une version fixe`, () => {
				const anime = `static/images/buddies/${palotin}-${expression}.svg`;
				const fixe = `static/images/buddies/${palotin}-${expression}-fixe.svg`;
				expect(existsSync(anime)).toBe(true);
				expect(readFileSync(anime, 'utf8')).toContain('@keyframes');
				expect(existsSync(fixe)).toBe(true);
				expect(readFileSync(fixe, 'utf8')).not.toContain('@keyframes');
			});
		}
	}
});
