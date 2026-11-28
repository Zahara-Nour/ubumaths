/**
 * Carnet de liaison — la forme acceptée des semaines (chantier `carnet-heatmap`)
 * ==========================================================================
 *
 * Le carnet montre la régularité depuis la rentrée : jusqu'à 53 semaines
 * (une année scolaire, même mal saisie), pas une de plus ; un palier inconnu
 * est refusé (E1 : rien de partiel).
 */

import { describe, it, expect } from 'vitest';
import { carnetSchema } from '../carnet';

function carnetAvec(nSemaines: number, level = '2-3') {
	const debut = Date.UTC(2026, 7, 31);
	return {
		firstname: 'Léa',
		weeks: Array.from({ length: nSemaines }, (_, i) => ({
			week_start: new Date(debut + i * 7 * 86_400_000).toISOString().slice(0, 10),
			level,
			holiday: false
		})),
		revisions: { overdue: 0 },
		evaluations: [],
		classes: []
	};
}

describe('carnetSchema — semaines', () => {
	it('accepte une année entière depuis la rentrée (40 et 53 semaines)', () => {
		expect(carnetSchema.safeParse(carnetAvec(40)).success).toBe(true);
		expect(carnetSchema.safeParse(carnetAvec(53)).success).toBe(true);
	});

	it('refuse 54 semaines', () => {
		expect(carnetSchema.safeParse(carnetAvec(54)).success).toBe(false);
	});

	it('refuse un palier inconnu (jamais un nombre exact de jours)', () => {
		expect(carnetSchema.safeParse(carnetAvec(5, '3')).success).toBe(false);
	});
});
