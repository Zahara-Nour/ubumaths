/**
 * Les séries dans le plan du chapitre, côté professeur
 * ====================================================
 *
 * Une série rattachée se range comme les autres ressources, et porte trois
 * gestes : changer sa forme (Q124 a), publier / retirer (ADR 0005), la
 * détacher du chapitre (S4). Chaque geste part vers SA propre action, avec le
 * bon champ — une erreur de nom de champ serait muette (rien ne serait écrit).
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { ChapterSection, ChapterSeries } from '$lib/types/chapters';
import ChapterSectionsEditor from '../ChapterSectionsEditor.svelte';

const CHAPITRE = '11111111-1111-4111-8111-111111111111';
const METHODES = '33333333-3333-4333-8333-333333333333';
const LIEN = '55555555-5555-4555-8555-555555555555';
const QUAND = '2026-10-02T05:36:02.215Z';

function section(id: string, title: string, displayOrder: number): ChapterSection {
	return { id, chapterId: CHAPITRE, title, displayOrder, createdAt: QUAND, updatedAt: QUAND };
}

function serie(partiel: Partial<ChapterSeries> = {}): ChapterSeries {
	return {
		id: LIEN,
		chapterId: CHAPITRE,
		seriesId: '66666666-6666-4666-8666-666666666666',
		form: 'flash',
		displayOrder: 0,
		sectionId: METHODES,
		sectionOrder: 0,
		createdAt: QUAND,
		publishedAt: null,
		title: 'Étude de fonction — méthode',
		questionCount: 4,
		launchHref: '/automaths/test?mode=flash',
		...partiel
	};
}

async function rendre(series: ChapterSeries[]) {
	const { container } = await render(ChapterSectionsEditor, {
		chapterId: CHAPITRE,
		sections: [section(METHODES, 'Méthodes', 1)],
		documents: [],
		exercises: [],
		checklistItems: [],
		worksheets: [],
		chapterSeries: series,
		onAdd: () => {},
		onEditChecklistItem: () => {}
	});
	return container as HTMLElement;
}

function formulaire(racine: HTMLElement, action: string): HTMLFormElement | null {
	return racine.querySelector<HTMLFormElement>(`form[action="${action}"]`);
}

function champ(form: HTMLFormElement | null, nom: string): string | null {
	return form?.querySelector<HTMLInputElement>(`input[name="${nom}"]`)?.value ?? null;
}

describe('ChapterSectionsEditor — séries de chapitre', () => {
	it('range la série dans sa section, sous l’étiquette « Série »', async () => {
		const racine = await rendre([serie()]);
		const listes = racine.querySelectorAll('[role="list"]');
		// [0] = liste des sections, [1] = Méthodes, [2] = Non classé
		expect(listes[1].textContent).toContain('Étude de fonction — méthode');
		expect(listes[1].textContent).toContain('Série');
		expect(listes[2].textContent).not.toContain('Étude de fonction');
	});

	it('le bouton de forme affiche la forme actuelle et bascule vers l’autre', async () => {
		const racine = await rendre([serie({ form: 'flash' })]);
		const form = formulaire(racine, '?/setSeriesForm');
		expect(form?.textContent).toContain('Flash-cards');
		expect(champ(form, 'chapterSeriesId')).toBe(LIEN);
		expect(champ(form, 'form')).toBe('interactive');
	});

	it('forme interactive : bascule vers flash', async () => {
		const racine = await rendre([serie({ form: 'interactive' })]);
		const form = formulaire(racine, '?/setSeriesForm');
		expect(form?.textContent).toContain('Entraînement');
		expect(champ(form, 'form')).toBe('flash');
	});

	it('publier vise le type « series » et le rattachement', async () => {
		const racine = await rendre([serie()]);
		const form = formulaire(racine, '?/setPublication');
		expect(champ(form, 'contentType')).toBe('series');
		expect(champ(form, 'itemId')).toBe(LIEN);
		expect(champ(form, 'published')).toBe('true');
		expect(racine.textContent).toContain('Préparé');
	});

	it('une série publiée se dit visible, et le bouton la retire', async () => {
		const racine = await rendre([serie({ publishedAt: QUAND })]);
		const form = formulaire(racine, '?/setPublication');
		expect(champ(form, 'published')).toBe('false');
		expect(racine.textContent).toContain('Visible par les élèves');
	});

	it('retirer détache via unlinkSeries, avec le bon champ', async () => {
		const racine = await rendre([serie()]);
		const form = formulaire(racine, '?/unlinkSeries');
		expect(champ(form, 'chapterSeriesId')).toBe(LIEN);
	});
});
