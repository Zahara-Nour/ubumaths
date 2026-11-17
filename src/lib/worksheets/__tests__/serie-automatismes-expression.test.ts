/**
 * Série d'automatismes : expressions nommées `<<expr:NOM>>` (chantier automatismes-1spe,
 * lot « Calcul numérique et algébrique »)
 * ======================================================================================
 *
 * Les modèles de calcul littéral (« Développe et réduis : $$(x+3)^2$$ ») n'écrivent pas
 * leur case : la variable `expressionN` porte un `answerFormat`, et l'écran ajoute
 * « = case » après l'expression (`augmentASTForExpressions`). La fiche écrit de même :
 * « (x+3)² = …… » à l'énoncé, « = **x² + 6x + 9** » au corrigé. Une expression qui porte
 * ses propres `?` n'a pas d'`answerFormat` : seul le marqueur disparaît.
 */
import { describe, it, expect } from 'vitest';
import type { QuestionTemplate } from '$lib/questions/types';
import { buildSerie, BLANK_TEXT } from '../serie-automatismes';

/** Un modèle d'une variation : énoncé, variables, cases */
function modele(
	id: string,
	statement: string,
	variables: { name: string; expression: string }[],
	blanks: unknown[]
): QuestionTemplate {
	return {
		id,
		title: 't',
		grades: ['2'],
		level: 1,
		status: 'draft',
		type: 'fill_in_blanks',
		variations: [{ statement, variables, blanks }]
	} as unknown as QuestionTemplate;
}

const enBloc = modele(
	'en-bloc',
	'Développe et réduis :\n\n$${{expression1}}$$',
	[{ name: 'expression1', expression: '(x+3)^2' }],
	[{ expectedAnswer: 'x^2+6x+9' }]
);
const enLigne = modele(
	'en-ligne',
	'Factorise $${{expression1}}$$ puis réduis ${{expression2}}$.',
	[
		{ name: 'expression1', expression: 'x^2-9' },
		{ name: 'expression2', expression: '2x+3x' }
	],
	[{ expectedAnswer: '(x+3)(x-3)' }, { expectedAnswer: '5x' }]
);
const sesPropresCases = modele(
	'ses-propres-cases',
	'Complète :\n\n$${{expression1}}$$',
	[{ name: 'expression1', expression: '(x+3)^2=x^2+?x+9' }],
	[{ expectedAnswer: '6' }]
);

const modeles = new Map([enBloc, enLigne, sesPropresCases].map((t) => [t.id, t]));
const serie = (id: string) => buildSerie(modeles, [{ templateId: id, seed: 1 }]);

describe('buildSerie — expressions nommées <<expr:…>>', () => {
	it('écrit « expression = case » à l’énoncé, la réponse en gras au corrigé', () => {
		const { statement, solution } = serie('en-bloc');
		expect(statement).toMatch(/\\left\( x \+ 3 \\right\)\^2 = \\text\{……\}\$\$/);
		expect(statement).toContain(BLANK_TEXT);
		expect(solution).toMatch(/\\left\( x \+ 3 \\right\)\^2 = \\mathbf\{x\^2 \+ 6 x \+ 9\}\$\$/);
		expect(`${statement}${solution}`).not.toContain('<<expr');
	});

	it('déplie chaque expression d’un énoncé, en bloc comme en ligne, dans l’ordre des cases', () => {
		const { statement, solution } = serie('en-ligne');
		expect(statement.match(/= \\text\{……\}/g)).toHaveLength(2);
		expect(solution).toMatch(/x\^2 - 9 = \\mathbf\{[^}]*x \+ 3[^}]*x - 3[^}]*\}\$\$/);
		expect(solution).toMatch(/2 x \+ 3 x = \\mathbf\{5 x\}\$/);
	});

	it('une expression à cases propres perd son marqueur sans « = case » ajouté', () => {
		const { statement, solution } = serie('ses-propres-cases');
		expect(statement).not.toContain('<<expr');
		expect(statement.match(/\\text\{……\}/g)).toHaveLength(1);
		expect(statement).not.toMatch(/9 = \\text/);
		expect(solution).toContain('\\mathbf{6}');
	});
});
