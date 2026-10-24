/**
 * Vue « BO (texte) » — demandé par David (2026-10-24) : une couleur par niveau
 * de titre de la transcription, pour se repérer dans un texte long ; le titre
 * du BO (`#`) garde la couleur du texte.
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
	it('une couleur par niveau de titre, le titre du BO en couleur du texte', async () => {
		const { container } = await render(OfficialProgrammeView, {
			official: OFFICIAL,
			transcription: SOURCE,
			view: 'texte'
		});
		const article = container.querySelector('article');
		if (!article) throw new Error('article absent');

		const colors = [1, 2, 3, 4, 5, 6].map((level) => headingColor(container, level));
		expect(colors[0]).toBe(getComputedStyle(article).color);
		expect(new Set(colors).size).toBe(6);
	});
});
