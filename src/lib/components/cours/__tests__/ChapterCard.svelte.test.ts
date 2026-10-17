/**
 * Le badge d'un chapitre caché (décision du 2026-10-14)
 * =====================================================
 *
 * Un chapitre que les élèves ne voient pas se dit « Invisible des élèves » —
 * « Masqué » est réservé à ce qu'une classe écarte de son plan. La carte porte
 * ce badge UNE fois : la liste des cours en ajoutait une seconde pastille.
 */

import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { ChapterSummary } from '$lib/types/chapters';
import ChapterCard from '../ChapterCard.svelte';

// Constantes
const QUAND = '2026-10-14T05:36:02.215Z';

// Functions
function chapitre(isVisible: boolean): ChapterSummary {
	return {
		id: '11111111-1111-4111-8111-111111111111',
		classId: '22222222-2222-4222-8222-222222222222',
		title: 'Le second degré',
		description: null,
		displayOrder: 0,
		isVisible,
		color: null,
		icon: null,
		createdAt: QUAND,
		updatedAt: QUAND,
		documentCount: 0,
		checklistItemCount: 0,
		exerciseCount: 0
	};
}

function occurrences(texte: string, motif: string): number {
	return texte.split(motif).length - 1;
}

describe('ChapterCard — visibilité du chapitre', () => {
	it('un chapitre caché porte « Invisible des élèves », une seule fois', async () => {
		const { container } = await render(ChapterCard, {
			chapter: chapitre(false),
			href: '/dashboard/teacher/cours/x/y'
		});
		const texte = container.textContent ?? '';

		expect(occurrences(texte, 'Invisible des élèves')).toBe(1);
		expect(texte).not.toMatch(/Masqu/);
	});

	it('un chapitre visible ne porte aucun badge de visibilité', async () => {
		const { container } = await render(ChapterCard, {
			chapter: chapitre(true),
			href: '/dashboard/teacher/cours/x/y'
		});
		const texte = container.textContent ?? '';

		expect(texte).not.toContain('Invisible des élèves');
		expect(texte).not.toMatch(/Masqu/);
	});
});
