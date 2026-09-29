/**
 * QuestionPreviewCard — tuile de la grille Automaths
 *
 * L'aperçu n'est pas interactif : un trou reste une case statique, jamais un
 * champ de saisie dans la tuile.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import QuestionPreviewCard from '../QuestionPreviewCard.svelte';
import { previewCartItem } from '$lib/questions/cart-preview';
import type { QuestionTemplate } from '$lib/questions/types';
// Modèle réel relu (Entiers #139) : « Le double de … est … », avec un trou
import fixture from '../../../../docs/relecture/entiers/139.json';

const TEMPLATE = { ...(fixture.template as unknown as QuestionTemplate), id: 'modele-139' };
const { instance } = previewCartItem([TEMPLATE], {
	theme: TEMPLATE.theme,
	domain: TEMPLATE.domain,
	subdomain: TEMPLATE.subdomain ?? null,
	level: TEMPLATE.level
});

describe('QuestionPreviewCard', () => {
	it("n'affiche aucun champ de saisie dans la tuile", async () => {
		expect(instance).toBeDefined();
		const screen = await render(QuestionPreviewCard, { template: TEMPLATE, preview: instance! });

		expect(screen.container.querySelector('math-field, input, textarea')).toBeNull();
	});
});
