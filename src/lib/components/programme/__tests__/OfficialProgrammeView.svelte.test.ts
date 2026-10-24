/**
 * Vue « BO (texte) » — demandé par David (2026-10-24) : des titres en couleur
 * pour se repérer dans un texte long, sobrement (« pas dans l'excès ») :
 * grandes parties et thèmes (`##`, `###`) dans une même couleur d'accent ;
 * titre du BO et niveaux suivants en couleur du texte.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';

import OfficialProgrammeView from '../OfficialProgrammeView.svelte';

// Constantes

const OFFICIAL = { title: 'Programme', pdfUrl: '/programmes/2de.pdf', transcription: ['2'] };
const SOURCE = ['# Titre', '## A', '### B', '#### C', '##### D', '###### E'].join('\n\n');

// Functions

/** Couleur calculée du titre de niveau source `level` */
function headingColor(container: HTMLElement, level: number): string {
	const heading = container.querySelector(`.md-h${level}`);
	if (!heading) throw new Error(`titre md-h${level} absent`);
	return getComputedStyle(heading).color;
}

describe('OfficialProgrammeView, vue texte', () => {
	it('une seule couleur d’accent, pour `##` et `###` ; le reste en couleur du texte', async () => {
		const { container } = await render(OfficialProgrammeView, {
			official: OFFICIAL,
			transcription: SOURCE,
			view: 'texte'
		});
		const article = container.querySelector('article');
		if (!article) throw new Error('article absent');

		const colors = [1, 2, 3, 4, 5, 6].map((level) => headingColor(container, level));
		const text = getComputedStyle(article).color;
		const [h1, h2, h3, ...rest] = colors;
		expect(h2).not.toBe(text);
		expect(h3).toBe(h2);
		expect([h1, ...rest]).toEqual([text, text, text, text]);
	});
});
