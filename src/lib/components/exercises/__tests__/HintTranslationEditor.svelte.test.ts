import { page } from '@vitest/browser/context';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import HintTranslationEditor from '../HintTranslationEditor.svelte';
import type { ExerciseHint } from '$lib/exercises/types';

/**
 * The French hints are the fixed frame: same ids, same types, same URLs. The
 * panel only ever offers their text, because `{{hint:id}}` in the statement
 * depends on the structure staying put.
 */
describe('HintTranslationEditor', () => {
	const hints: ExerciseHint[] = [
		{ id: 'pythagore', type: 'ubumark', title: 'Rappel', content: 'Pense au théorème' },
		{
			id: 'video',
			type: 'video',
			title: 'Vidéo',
			url: 'https://example.org/v',
			description: 'À voir'
		}
	];

	it("invite à créer les indices en français quand il n'y en a pas", async () => {
		render(HintTranslationEditor, { hints: [] });

		await expect.element(page.getByText(/Aucun indice à traduire/)).toBeInTheDocument();
	});

	it("ancre chaque champ sur l'identifiant français", async () => {
		render(HintTranslationEditor, { hints });

		await expect.element(page.getByText('pythagore')).toBeInTheDocument();
		await expect.element(page.getByText('video')).toBeInTheDocument();
	});

	it('offre le contenu seulement pour un indice en ligne', () => {
		const { container } = render(HintTranslationEditor, { hints });

		// ubumark porte du texte inline ; une vidéo porte une URL, rien à traduire.
		expect(container.querySelector('#hint-en-content-pythagore')).not.toBeNull();
		expect(container.querySelector('#hint-en-content-video')).toBeNull();
	});

	it('offre la description seulement quand le français en a une', () => {
		const { container } = render(HintTranslationEditor, { hints });

		expect(container.querySelector('#hint-en-desc-video')).not.toBeNull();
		expect(container.querySelector('#hint-en-desc-pythagore')).toBeNull();
	});

	it("n'offre jamais de champ pour l'identifiant, le type ou le lien", () => {
		const { container } = render(HintTranslationEditor, { hints });

		const champs = [...container.querySelectorAll('input, textarea')].map((e) => e.id);
		expect(champs.length).toBeGreaterThan(0);
		expect(champs.every((id) => /^hint-en-(title|desc|content)-/.test(id))).toBe(true);
	});

	it('affiche la traduction déjà saisie', () => {
		const { container } = render(HintTranslationEditor, {
			hints,
			translations: { en: { hints: { pythagore: { title: 'Reminder' } } } }
		});

		const input = container.querySelector('#hint-en-title-pythagore') as HTMLInputElement;
		expect(input.value).toBe('Reminder');
	});
});
