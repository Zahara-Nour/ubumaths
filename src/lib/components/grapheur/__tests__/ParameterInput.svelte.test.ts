import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import ParameterInput from '../ParameterInput.svelte';
import FunctionPanel from '../FunctionPanel.svelte';
import { grapheurStore } from '$lib/stores/grapheur.svelte';
import type { Parameter } from '$lib/grapheur/types';

const parameter: Parameter = {
	id: '11111111-1111-4111-8111-111111111111',
	name: 'a',
	value: 3,
	min: -5,
	max: 5
};

/**
 * Un paramètre se lit par son nom dans une expression et se balaie au curseur :
 * `y = ax + b` avec `a` réglable fait voir ce que change un coefficient
 * directeur, ce qu'aucune saisie au clavier ne montre.
 */
describe('ParameterInput', () => {
	beforeEach(() => {
		grapheurStore.fullReset();
	});

	it('affiche le nom, la valeur et le curseur', () => {
		const { container } = render(ParameterInput, { parameter });

		// Le nom vit dans un champ depuis qu'il est modifiable, plus dans le texte.
		expect(
			container.querySelector<HTMLInputElement>('[aria-label="Nom du paramètre a"]')?.value
		).toBe('a');
		expect(container.querySelector('[aria-label="Curseur du paramètre a"]')).not.toBeNull();
		expect(
			container.querySelector<HTMLInputElement>('[aria-label="Valeur du paramètre a"]')?.value
		).toBe('3');
	});

	it('expose des bornes réglables', () => {
		const { container } = render(ParameterInput, { parameter });

		expect(
			container.querySelector<HTMLInputElement>('[aria-label="Borne inférieure de a"]')?.value
		).toBe('-5');
		expect(
			container.querySelector<HTMLInputElement>('[aria-label="Borne supérieure de a"]')?.value
		).toBe('5');
	});

	it('permet de renommer le paramètre', () => {
		const { container } = render(ParameterInput, { parameter });

		expect(
			container.querySelector<HTMLInputElement>('[aria-label="Nom du paramètre a"]')?.value
		).toBe('a');
	});

	it('propose de supprimer le paramètre', () => {
		const { container } = render(ParameterInput, { parameter });

		expect(container.querySelector('[aria-label="Supprimer le paramètre a"]')).not.toBeNull();
	});
});

describe('FunctionPanel — section des paramètres', () => {
	beforeEach(() => {
		grapheurStore.fullReset();
	});

	it('propose d’ajouter un paramètre', () => {
		const { container } = render(FunctionPanel);

		expect(container.querySelector('[aria-label="Ajouter un paramètre"]')).not.toBeNull();
	});

	it('n’affiche aucune section tant qu’il n’y a pas de paramètre', () => {
		const { container } = render(FunctionPanel);

		expect(container.querySelector('[aria-label="Paramètres"]')).toBeNull();
	});

	it('liste les paramètres déclarés, nommés a puis b', () => {
		grapheurStore.addParameter();
		grapheurStore.addParameter();

		const { container } = render(FunctionPanel);
		const section = container.querySelector('[aria-label="Paramètres"]');

		expect(section).not.toBeNull();
		expect(section?.querySelectorAll('[aria-label^="Curseur du paramètre"]')).toHaveLength(2);
		expect(container.querySelector('[aria-label="Curseur du paramètre a"]')).not.toBeNull();
		expect(container.querySelector('[aria-label="Curseur du paramètre b"]')).not.toBeNull();
	});
});
