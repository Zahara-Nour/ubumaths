/**
 * Garde : aucune variable ne s'appelle `e`
 *
 * `e` est réservée à la constante d'Euler (David, 2026-11-16) : une variable `e`
 * est lue comme 2,718… par le moteur (`1 + 2g + e` → `1 + \exponentialE`,
 * `{{if:e==0|…}}` toujours faux). Les modèles publiés touchés (CP, CM1, 2de, 5e)
 * ont été renommés ; la garde refuse tout nouveau modèle qui en déclarerait une.
 */

import { describe, it, expect } from 'vitest';
import { checkTemplate } from '../check-template';
import type { QuestionTemplate, QuestionVariable } from '#lib/questions/types.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';

// ============================================================================
// FIXTURES
// ============================================================================

/** Somme de deux entiers ; `nom` = nom de la 2e variable, déclarée dans la variation ou partagée. */
function sumTemplate(nom: string, ou: 'variation' | 'shared' = 'variation'): QuestionTemplate {
	const seconde: QuestionVariable[] = [{ name: nom, expression: '1..5' }];
	return {
		id: 'tmp',
		title: 'Somme',
		status: 'draft',
		...(ou === 'shared' && { shared: { variables: seconde } }),
		variations: [
			{
				statement: templateMarkdown('Calculer $${{a}} + {{' + nom + '}}$$ : $?$'),
				variables: [{ name: 'a', expression: '1..5' }, ...(ou === 'variation' ? seconde : [])],
				blanks: [{ expectedAnswer: `{{eval:a+${nom}}}` }],
				correction: { steps: [] }
			}
		],
		grades: ['CP'],
		level: 1,
		testSpecs: [
			{
				description: 'bonne réponse',
				variables: { a: '2', [nom]: '3' },
				answers: ['5'],
				expected: { status: 'correct' }
			}
		]
	};
}

const RAISON = /variable « e »/;

// ============================================================================
// TESTS
// ============================================================================

describe('checkTemplate : variable « e » interdite', () => {
	it('refuse une variable `e` déclarée dans une variation', () => {
		const rapport = checkTemplate(sumTemplate('e'));
		expect(rapport.passed).toBe(false);
		expect(rapport.reasons.some((r) => RAISON.test(r))).toBe(true);
	});

	it('refuse une variable `e` partagée entre les variations', () => {
		const rapport = checkTemplate(sumTemplate('e', 'shared'));
		expect(rapport.passed).toBe(false);
		expect(rapport.reasons.some((r) => RAISON.test(r))).toBe(true);
	});

	it('la raison dit pourquoi : constante d’Euler', () => {
		const raison = checkTemplate(sumTemplate('e')).reasons.find((r) => RAISON.test(r));
		expect(raison).toMatch(/Euler/);
	});

	it('laisse passer le même modèle avec une autre lettre', () => {
		const rapport = checkTemplate(sumTemplate('h'));
		expect(rapport.reasons.filter((r) => RAISON.test(r))).toEqual([]);
		expect(rapport.passed).toBe(true);
	});

	it('ne confond pas `e` avec un nom qui la contient (`E`, `ex`)', () => {
		for (const nom of ['E', 'ex']) {
			expect(checkTemplate(sumTemplate(nom)).reasons.filter((r) => RAISON.test(r))).toEqual([]);
		}
	});
});
