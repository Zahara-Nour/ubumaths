/**
 * Fonctions génériques déclarées par un modèle (`shared.genericFunctions`)
 * =========================================================================
 *
 * `["P", "C"]` complète la liste par défaut du parseur (f, g, h, u, v, w, F, G, H) :
 * `P(x)` est une fonction, `P'(2)` sa dérivée en 2. Sans l'option, rien ne change.
 * Cf. docs/wip/modele-fonctions-generiques-progress.md.
 */

import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { questionTemplateSchema } from '../template-schema';
import { runTestSpec } from '../test-spec-runner';
import { gradeQuestion } from '../grading';
import { toPublicQuestion, toDisplayInstance } from '../public-question';
import {
	templateGenericFunctions,
	genericFunctionNamesSchema,
	parseGenericFunctionNames,
	formatGenericFunctionNames
} from '../generic-functions';
import { validateAnswer } from '$lib/utils/answer-validator';
import { createQuestionTemplateSchema } from '$lib/server/validation/questions';
import { DEFAULT_GENERIC_FUNCTION_NAMES } from '$lib/mathAST';
import { parseCustomSafe } from '$lib/mathAST';
import type { QuestionInstance, QuestionTemplate } from '../types';
import { templateMarkdown } from '$lib/ubumark';

// ============================================================================
// HELPERS
// ============================================================================

/** Énoncé avec `P(x)` et `P'(b)`, réponse attendue `P'(b)` (écriture, pas valeur) */
function polynomialTemplate(
	genericFunctions?: string[],
	constraints?: NonNullable<QuestionTemplate['options']>['constraints']
): QuestionTemplate {
	return {
		id: 'test-generic-functions',
		title: 'Dérivée d’un polynôme',
		status: 'draft',
		shared: genericFunctions ? { genericFunctions } : undefined,
		...(constraints && { options: { constraints } }),
		variations: [
			{
				statement: templateMarkdown(
					'Soit $P(x)={{a}}x^2$. Le nombre dérivé de $P$ en ${{b}}$ s’écrit : $?$'
				),
				variables: [
					{ name: 'a', expression: '3' },
					{ name: 'b', expression: '2' }
				],
				blanks: [{ expectedAnswer: "P'({{b}})" }]
			}
		],
		grades: ['1_SPE'],
		theme: 'Fonctions',
		domain: 'Dérivation',
		level: 1
	};
}

function instanceOf(template: QuestionTemplate): QuestionInstance {
	const result = generateInstance(template, 1);
	if (!result.success) throw new Error(result.errors.join('; '));
	return result.instance;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

describe('templateGenericFunctions — union avec la liste par défaut', () => {
	it('absent ou vide : aucune configuration (défauts du parseur)', () => {
		expect(templateGenericFunctions(undefined)).toBeUndefined();
		expect(templateGenericFunctions(null)).toBeUndefined();
		expect(templateGenericFunctions([])).toBeUndefined();
	});

	it('complète les défauts, dérivées et réciproque permises', () => {
		const config = templateGenericFunctions(['P', 'C']);
		expect(config?.names).toEqual([...DEFAULT_GENERIC_FUNCTION_NAMES, 'P', 'C']);
		expect(config?.allowDerivatives).toBe(true);
		expect(config?.allowInverse).toBe(true);
	});

	it('un nom déjà par défaut n’est pas dupliqué ; un nom invalide en base est ignoré', () => {
		const config = templateGenericFunctions(['f', 'P', 'e', 'PQ']);
		expect(config?.names).toEqual([...DEFAULT_GENERIC_FUNCTION_NAMES, 'P']);
	});
});

// ============================================================================
// SCHÉMAS ZOD
// ============================================================================

describe('Schéma des noms de fonctions', () => {
	it.each([[['P']], [['P', 'C']], [['p', 'Q', 'R']]])('accepte %j', (names) => {
		expect(genericFunctionNamesSchema.safeParse(names).success).toBe(true);
	});

	it.each([
		['deux lettres', ['PQ']],
		['lettre + chiffre', ['P1']],
		['indice', ['C_1']],
		['vide', ['']],
		['constante e', ['e']],
		['constante i', ['i']],
		['doublon', ['P', 'P']],
		['non-lettre', ['é']],
		['onze noms', ['A', 'B', 'C', 'D', 'E', 'I', 'J', 'K', 'L', 'M', 'N']]
	])('refuse : %s', (_label, names) => {
		expect(genericFunctionNamesSchema.safeParse(names).success).toBe(false);
	});

	it('schéma strict du modèle : shared.genericFunctions accepté', () => {
		const { id: _id, ...template } = polynomialTemplate(['P', 'C']);
		const result = questionTemplateSchema.safeParse(template);
		expect(result.success).toBe(true);
	});

	it('schéma strict du modèle : nom invalide refusé', () => {
		const { id: _id, ...template } = polynomialTemplate(['PQ']);
		expect(questionTemplateSchema.safeParse(template).success).toBe(false);
	});

	it('route serveur (création) : nom invalide refusé, liste valide acceptée', () => {
		const base = {
			title: 'Dérivée',
			variations: [{ statement: 'Soit $P(x)$' }],
			grades: ['1_SPE'],
			theme: 'Fonctions',
			domain: 'Dérivation',
			level: 1
		};
		expect(
			createQuestionTemplateSchema.safeParse({ ...base, shared: { genericFunctions: ['P'] } })
				.success
		).toBe(true);
		expect(
			createQuestionTemplateSchema.safeParse({ ...base, shared: { genericFunctions: ['e'] } })
				.success
		).toBe(false);
		expect(
			createQuestionTemplateSchema.safeParse({ ...base, shared: { genericFunctions: 'P' } }).success
		).toBe(false);
	});
});

// ============================================================================
// GÉNÉRATION
// ============================================================================

describe('Génération — énoncé et réponse attendue', () => {
	it('avec ["P"] : P(x) et P\'(2) sont des nœuds function', () => {
		const instance = instanceOf(polynomialTemplate(['P']));
		const statement = String(instance.statement);
		expect(statement).toContain('P\\left( x \\right)');
		expect(statement).not.toContain('P \\left( x \\right)');

		// `P\left( x \right)` (sans espace) est le rendu d'un nœud `function` ; un
		// produit s'écrit `P \left( x \right)`. (Relire ce LaTeX en fonction dépend du
		// chantier parallèle `f\left(1\right)` du parseur LaTeX.)
		const blank = instance.blanks![0];
		expect(blank.expectedAnswer).toBe("P'(2)");
		expect(blank.expectedAnswerLatex).toBe("P'\\left( 2 \\right)");
		// La réponse attendue (syntaxe maison) est bien lue comme un nœud function
		const config = templateGenericFunctions(instance.genericFunctions);
		expect(parseCustomSafe(blank.expectedAnswer, { genericFunctions: config }).ast?.type).toBe(
			'function'
		);
	});

	it('copie la liste déclarée sur l’instance', () => {
		expect(instanceOf(polynomialTemplate(['P'])).genericFunctions).toEqual(['P']);
	});

	it('sans l’option : énoncé inchangé (produit), aucune clé sur l’instance', () => {
		const instance = instanceOf(polynomialTemplate());
		expect(String(instance.statement)).toContain('P \\left( x \\right)');
		expect(instance.blanks![0].expectedAnswerLatex).toBe("P'(2)");
		expect(instance).not.toHaveProperty('genericFunctions');
	});

	it('liste vide : identique à l’absence d’option', () => {
		const withEmpty = instanceOf(polynomialTemplate([]));
		const without = instanceOf(polynomialTemplate());
		expect(String(withEmpty.statement)).toBe(String(without.statement));
		expect(withEmpty).not.toHaveProperty('genericFunctions');
	});
});

// ============================================================================
// VALIDATION, BARÈME, SPECS
// ============================================================================

describe('Validation de la réponse de l’élève', () => {
	// `form: 'off'` : la VALEUR seule (le contrôle de forme, `checkForm`, est hors périmètre)
	const formOff = { form: 'off' as const };

	it("avec ['P'] : P'(1+1) a la valeur de P'(2)", () => {
		const instance = instanceOf(polynomialTemplate(['P'], formOff));
		const result = validateAnswer(["P'(1+1)"], instance, ["P'\\left(1+1\\right)"]);
		expect(result.isCorrect).toBe(true);
	});

	it("avec ['P'] : P'(3) reste faux", () => {
		const instance = instanceOf(polynomialTemplate(['P'], formOff));
		expect(validateAnswer(["P'(3)"], instance, ["P'\\left(3\\right)"]).isCorrect).toBe(false);
	});

	it("sans l'option : P'(1+1) illisible, comparé en texte → faux (inchangé)", () => {
		const instance = instanceOf(polynomialTemplate(undefined, formOff));
		expect(validateAnswer(["P'(1+1)"], instance, ["P'\\left(1+1\\right)"]).isCorrect).toBe(false);
	});

	// Point ouvert : `checkForm` (cosmetic-transforms.ts, hors périmètre) relit avec les
	// défauts → « Parse error on answer » → mauvaise forme. Ce test basculera (et
	// échouera) le jour où `checkForm` recevra la configuration : retirer `.fails`.
	it.fails("contrôle de forme par défaut : P'(2) tapé tel quel est juste", () => {
		const instance = instanceOf(polynomialTemplate(['P']));
		const result = validateAnswer(["P'(2)"], instance, ["P'\\left(2\\right)"]);
		expect(result.status).toBe('correct');
	});

	it('barème serveur : même verdict que validateAnswer', () => {
		const instance = instanceOf(polynomialTemplate(['P'], formOff));
		expect(gradeQuestion(instance, { values: ["P'(1+1)"] }).points).toBe(1);
		const without = instanceOf(polynomialTemplate(undefined, formOff));
		expect(gradeQuestion(without, { values: ["P'(1+1)"] }).points).toBe(0);
	});

	it('runTestSpec : la spec voit la configuration du modèle', () => {
		const spec = {
			description: "P'(1+1) juste",
			variables: { a: '3', b: '2' },
			answers: ["P'(1+1)"],
			expected: { status: 'correct' as const }
		};
		expect(runTestSpec(polynomialTemplate(['P'], formOff), spec).passed).toBe(true);
		expect(runTestSpec(polynomialTemplate(undefined, formOff), spec).passed).toBe(false);
	});
});

// ============================================================================
// QUESTION PUBLIQUE (évaluation)
// ============================================================================

describe('Question publique', () => {
	it('transporte la liste (affichage), et la rhabille en instance', () => {
		const instance = instanceOf(polynomialTemplate(['P']));
		const pub = toPublicQuestion(instance, { position: 0, delaySeconds: 30 });
		expect(pub.genericFunctions).toEqual(['P']);
		expect(toDisplayInstance(pub).genericFunctions).toEqual(['P']);
	});

	it('sans l’option : aucune clé', () => {
		const pub = toPublicQuestion(instanceOf(polynomialTemplate()), {
			position: 0,
			delaySeconds: 30
		});
		expect(pub).not.toHaveProperty('genericFunctions');
		expect(toDisplayInstance(pub)).not.toHaveProperty('genericFunctions');
	});
});

// ============================================================================
// ÉDITEUR : champ « Fonctions : P, C »
// ============================================================================

describe('Champ « Fonctions » de l’éditeur', () => {
	it('lit une liste séparée par virgules ou espaces', () => {
		expect(parseGenericFunctionNames('P, C')).toEqual(['P', 'C']);
		expect(parseGenericFunctionNames(' P  C ')).toEqual(['P', 'C']);
		expect(parseGenericFunctionNames('P;C')).toEqual(['P', 'C']);
	});

	it('vide : aucune fonction', () => {
		expect(parseGenericFunctionNames('')).toEqual([]);
		expect(parseGenericFunctionNames(' , ')).toEqual([]);
	});

	it('garde les noms invalides tels quels (le schéma les refuse avec un message)', () => {
		expect(parseGenericFunctionNames('PQ, e')).toEqual(['PQ', 'e']);
	});

	it('affiche la liste déclarée', () => {
		expect(formatGenericFunctionNames(['P', 'C'])).toBe('P, C');
		expect(formatGenericFunctionNames(undefined)).toBe('');
	});
});
