/**
 * Avertissement : nom grec écrit sans antislash dans une formule `~…~` (2026-09-24).
 *
 * Dans `~…~`, chaque lettre est une variable et deux lettres côte à côte se
 * multiplient : `~2pi~` se lit 2 × p × i, sans erreur. Les lettres grecques
 * s'écrivent `\pi`, `\alpha`… (même convention que LaTeX). On ne change pas la
 * notation : on prévient l'auteur dans l'éditeur.
 */

import { describe, it, expect } from 'vitest';
import { findBareGreekNames, bareGreekWarnings } from '../bare-greek-warnings';
import type { ExerciseVariation } from '../types';

describe('findBareGreekNames', () => {
	it.each([
		['Le périmètre vaut ~2pi r~.', ['pi']],
		['~a(x-alpha)^2+beta~', ['alpha', 'beta']],
		['~theta+theta~', ['theta']],
		['~mu~ et ~nu~', ['mu', 'nu']],
		['~lim_{x->infty} f(x)~', ['infty']],
		['~\\alpha+beta~', ['beta']],
		['~~omega t~~', ['omega']]
	])('%s → %j', (markdown, names) => {
		expect(findBareGreekNames(markdown)).toEqual(names);
	});

	it.each([
		['~2\\pi~', 'avec antislash'],
		['~api~', 'lettres collées à d’autres : pas un nom grec isolé'],
		['~sin(x)+ln(x)~', 'fonctions'],
		['$\\alpha$ puis pi en texte, $pi$', 'hors formule `~…~` (texte, LaTeX)'],
		['~x^2+3x-5~', 'rien de grec'],
		['', 'vide']
	])('%s : rien (%s)', (markdown) => {
		expect(findBareGreekNames(markdown)).toEqual([]);
	});
});

describe('bareGreekWarnings — par champ d’une variation', () => {
	const variation = {
		label: 'default',
		statement_md: 'Calculer ~2pi r~.',
		solution_md: '~2\\pi r~',
		hints: [
			{ id: 'h1', type: 'ubumark', title: 'Formule', content: 'Penser à ~theta~.' },
			{ id: 'h2', type: 'video', title: 'Vidéo', url: 'https://example.org' }
		],
		translations: {
			en: { statement_md: 'Compute ~alpha~.', solution_md: '~beta~' }
		}
	} as unknown as ExerciseVariation;

	it('liste les champs concernés, dans l’ordre de l’éditeur', () => {
		expect(bareGreekWarnings(variation)).toEqual([
			{ field: 'Énoncé', names: ['pi'] },
			{ field: 'Aide « Formule »', names: ['theta'] },
			{ field: 'Énoncé (anglais)', names: ['alpha'] },
			{ field: 'Solution (anglais)', names: ['beta'] }
		]);
	});

	it('rien à signaler : liste vide', () => {
		expect(
			bareGreekWarnings({
				label: 'default',
				statement_md: '~\\pi~',
				solution_md: ''
			} as unknown as ExerciseVariation)
		).toEqual([]);
	});
});
