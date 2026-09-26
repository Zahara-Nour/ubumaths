/**
 * Contrôle de forme : « * » (réponse attendue) et « × » (élève) sont le même signe
 * ==============================================================================
 *
 * Les réponses attendues des templates s'écrivent `2*100` (style « star ») ;
 * le clavier de l'élève envoie `2\times100` (style « cross »). La comparaison
 * finale portait sur l'écriture LaTeX (`2 * 100` ≠ `2 \times 100`) → une bonne
 * réponse contenant une multiplication était refusée en `bad_form`.
 * Révélé par les specs de David (#15, #19 : « Décompose ce nombre »).
 */

import { describe, it, expect } from 'vitest';
import { checkForm } from '../cosmetic-transforms';
import { runAllTestSpecs } from '$lib/questions/test-spec-runner';
import type { QuestionTemplate } from '$lib/questions/types';
import decomposition from './fixtures/david-15-decomposition.json';

const B = String.fromCharCode(92);

describe('checkForm — signe de multiplication', () => {
	it.each([
		[`2${B}times100`, '2*100'],
		['2*100', `2${B}times100`],
		[`2${B}times100+4`, '2*100+4'],
		[`${B}left(3${B}times10${B}right)+4`, '(3*10)+4']
	])('%s contre %s : même forme', (answer, expected) => {
		const result = checkForm(answer, expected, { brackets: 'off' });
		expect(result.status).toBe('correct');
	});

	it('une vraie différence de forme reste détectée (2×100 contre 200)', () => {
		expect(checkForm(`2${B}times100`, '200', {}).status).toBe('bad_form');
	});
});

describe('#15 « Décompose ce nombre » : les specs de David', () => {
	it('sont toutes vertes', () => {
		const results = runAllTestSpecs(decomposition as unknown as QuestionTemplate);
		expect(results.length).toBe(9);
		expect(results.filter((r) => !r.passed).map((r) => r.spec.description)).toEqual([]);
	});
});
