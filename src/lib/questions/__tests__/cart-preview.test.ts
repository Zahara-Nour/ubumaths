/**
 * Aperçu d'une catégorie du panier : bon modèle, aperçu stable
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { findCategoryTemplate, previewCartItem } from '$lib/questions/cart-preview';
import type { QuestionTemplate } from '$lib/questions/types';
import type { QuestionCategory } from '$lib/stores/questionCart.svelte';

// Modèle réel relu (Entiers #139), forme de la base
const FIXTURE = (
	JSON.parse(readFileSync(resolve(process.cwd(), 'data/relecture/entiers/139.json'), 'utf-8')) as {
		template: QuestionTemplate;
	}
).template;

function template(overrides: Partial<QuestionTemplate>): QuestionTemplate {
	return { ...structuredClone(FIXTURE), ...overrides };
}

const CATEGORY: QuestionCategory = {
	theme: FIXTURE.theme,
	domain: FIXTURE.domain,
	subdomain: FIXTURE.subdomain ?? null,
	level: FIXTURE.level
};

describe('findCategoryTemplate', () => {
	it('retrouve le modèle de la catégorie parmi d’autres', () => {
		const other = template({ id: 'autre', domain: 'Autre domaine' });
		const target = template({ id: 'cible' });

		expect(findCategoryTemplate([other, target], CATEGORY)?.id).toBe('cible');
	});

	it('retrouve un modèle SANS sous-domaine (null côté panier, absent côté modèle)', () => {
		const target = template({ id: 'sans-sous-domaine', subdomain: undefined });

		expect(findCategoryTemplate([target], { ...CATEGORY, subdomain: null })?.id).toBe(
			'sans-sous-domaine'
		);
	});

	it('accepte un niveau en chaîne (ancien panier en localStorage)', () => {
		const target = template({ id: 'cible' });
		const legacy = { ...CATEGORY, level: String(CATEGORY.level) as unknown as number };

		expect(findCategoryTemplate([target], legacy)?.id).toBe('cible');
	});

	it('ne confond pas deux niveaux', () => {
		const target = template({ id: 'cible', level: CATEGORY.level + 1 });

		expect(findCategoryTemplate([target], CATEGORY)).toBeUndefined();
	});
});

describe('previewCartItem', () => {
	it('rend une instance avec un énoncé non vide', () => {
		const { instance } = previewCartItem([template({ id: 'cible' })], CATEGORY);

		expect(typeof instance?.statement).toBe('string');
		expect(instance?.statement.length).toBeGreaterThan(0);
	});

	it('rend le MÊME aperçu à chaque appel (le panier se recalcule à chaque clic)', () => {
		const templates = [template({ id: 'cible' })];

		const first = previewCartItem(templates, CATEGORY).instance?.statement;
		for (let attempt = 0; attempt < 5; attempt++) {
			expect(previewCartItem(templates, CATEGORY).instance?.statement).toBe(first);
		}
	});

	it('ne rend rien si aucun modèle ne correspond', () => {
		expect(previewCartItem([], CATEGORY)).toEqual({});
	});
});
