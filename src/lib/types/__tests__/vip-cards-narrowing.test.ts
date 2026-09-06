import { describe, expect, it } from 'vitest';
import { asStudentVipCards, asVipCardCategory, asVipCardAction } from '../vip-card';

/**
 * `profiles.vip_cards` est une colonne jsonb. Sa valeur était castée à
 * l'intérieur d'un `try/catch` qui ne pouvait jamais se déclencher — un cast ne
 * lève rien. La sécurité était imaginaire ; ces tests couvrent la vraie.
 */
describe('asStudentVipCards', () => {
	it('conserve une instance complète', () => {
		const cartes = asStudentVipCards({
			'inst-1': { cardId: 'carte-a', earnedAt: '2026-01-01T00:00:00Z', usedAt: null }
		});

		expect(cartes['inst-1'].cardId).toBe('carte-a');
	});

	it('écarte une instance sans identité', () => {
		// Sans `cardId`, la carte s'afficherait dans l'inventaire sans savoir
		// laquelle elle est.
		const cartes = asStudentVipCards({
			bonne: { cardId: 'carte-a', earnedAt: '2026-01-01T00:00:00Z' },
			orpheline: { earnedAt: '2026-01-01T00:00:00Z' },
			datee: { cardId: 'carte-b' }
		});

		expect(Object.keys(cartes)).toEqual(['bonne']);
	});

	it('rend un inventaire vide pour toute valeur non exploitable', () => {
		expect(asStudentVipCards(null)).toEqual({});
		expect(asStudentVipCards('carte')).toEqual({});
		expect(asStudentVipCards([{ cardId: 'x', earnedAt: 'y' }])).toEqual({});
	});
});

describe('asVipCardCategory', () => {
	it('conserve les quatre catégories connues', () => {
		for (const c of ['bonus', 'privilege', 'social', 'power'] as const) {
			expect(asVipCardCategory(c)).toBe(c);
		}
	});

	it('rend null pour une catégorie inconnue ou absente', () => {
		expect(asVipCardCategory('legendaire')).toBeNull();
		expect(asVipCardCategory(null)).toBeNull();
	});
});

describe('asVipCardAction', () => {
	it('conserve une action discriminée par son type', () => {
		expect(asVipCardAction({ type: 'draw_cards', count: 2 })).toEqual({
			type: 'draw_cards',
			count: 2
		});
	});

	it('rend null sans discriminant exploitable', () => {
		expect(asVipCardAction({ count: 2 })).toBeNull();
		expect(asVipCardAction({ type: 42 })).toBeNull();
		expect(asVipCardAction(null)).toBeNull();
		expect(asVipCardAction([{ type: 'draw_cards' }])).toBeNull();
	});
});
