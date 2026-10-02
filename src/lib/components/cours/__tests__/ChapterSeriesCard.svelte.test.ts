/**
 * Une série du chapitre, vue par l'élève (S6)
 * ===========================================
 *
 * Le titre de la série EST le lien, et il lance la série dans la forme choisie
 * par le professeur (Q124 a), sans note. Une composition illisible ne donne pas
 * de lien mort : on le dit.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ChapterSeriesCard from '../ChapterSeriesCard.svelte';
import type { ChapterSeries } from '$lib/types/chapters';

function serie(partiel: Partial<ChapterSeries> = {}): ChapterSeries {
	return {
		id: 'lien-1',
		chapterId: 'chap-1',
		seriesId: 'serie-1',
		form: 'flash',
		displayOrder: 0,
		sectionId: null,
		sectionOrder: 0,
		createdAt: '2026-10-02T00:00:00Z',
		publishedAt: '2026-10-02T00:00:00Z',
		title: 'Étude de fonction — méthode',
		questionCount: 4,
		launchHref: '/automaths/test?categories=abc&mode=flash',
		...partiel
	};
}

const texte = (container: HTMLElement) => container.textContent!.replace(/\s+/g, ' ').trim();

describe('ChapterSeriesCard', () => {
	it('le titre est un lien qui lance la série dans sa forme', async () => {
		const { container } = await render(ChapterSeriesCard, { series: serie() });
		const lien = container.querySelector('a');
		expect(lien?.textContent?.trim()).toBe('Étude de fonction — méthode');
		expect(lien?.getAttribute('href')).toBe('/automaths/test?categories=abc&mode=flash');
		expect(texte(container as HTMLElement)).toContain('Flash-cards');
		expect(texte(container as HTMLElement)).toContain('4 questions');
	});

	it('affiche « Entraînement » pour la forme interactive', async () => {
		const { container } = await render(ChapterSeriesCard, {
			series: serie({ form: 'interactive', launchHref: '/automaths/test?mode=interactive' })
		});
		expect(texte(container as HTMLElement)).toContain('Entraînement');
		expect(texte(container as HTMLElement)).not.toContain('Flash-cards');
	});

	it('sans lien de lancement : pas de lien mort, un message', async () => {
		const { container } = await render(ChapterSeriesCard, {
			series: serie({ launchHref: null })
		});
		expect(container.querySelector('a')).toBeNull();
		expect(texte(container as HTMLElement)).toContain('ne peut pas être lancée');
	});

	it('ne parle jamais de note', async () => {
		const { container } = await render(ChapterSeriesCard, { series: serie() });
		expect(texte(container as HTMLElement)).not.toMatch(/note|évaluation/i);
	});
});
