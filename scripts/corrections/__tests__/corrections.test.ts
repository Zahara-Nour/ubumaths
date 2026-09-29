/**
 * Outil de corrections : génération R-PASS, injection, vérification
 * =================================================================
 *
 * Le vérificateur doit ROUGIR sur chaque classe de défaut qu'il prétend voir
 * (un vérificateur qui ne dit jamais non ne prouve rien) : calcul qui ne finit
 * pas sur la réponse, égalité fausse, marqueur non résolu, LaTeX déséquilibré,
 * « + 0 », mauvais choix de QCM. Le lot pilote, relu depuis son instantané
 * commité, doit passer en entier.
 */

import { describe, expect, it } from 'vitest';
import type { QuestionTemplate } from '../../../src/lib/questions/types';
import { templateMarkdown } from '../../../src/lib/ubumark';
import { readFileSync } from 'node:fs';
import { splitBinaryOperation, toEvalForm } from '../lib/operation';
import { buildRPassSteps, detectRPassCases, generateRPass } from '../lib/r-pass';
import { generateRInv, parseHoleOperation } from '../lib/r-inv';
import { injectCorrection, parseProposal, type Proposal } from '../lib/proposal';
import {
	alignChains,
	awkwardWritings,
	escapeRegExp,
	numericValue,
	stripDecorations,
	verifyProposal
} from '../lib/verify';
import { enumerateCombinations, planDraws } from '../lib/sampling';
import { generateInstanceWithFixedVariables } from '../../../src/lib/questions/generator/test-instance-builder';
import { publishRefusal } from '../lib/publish-gate';
import { readProposal, readSnapshot, withoutUserIds } from '../lib/files';
import { PILOT_LOT } from '../lots/pilote';
import { R_INV_LOT } from '../lots/r-inv';
import { buildCorrection } from '../lib/lot';
import type { QuestionTemplateRow } from '../../../src/lib/types/question-template';

// ============================================================================
// FIXTURES
// ============================================================================

const ID = '11111111-1111-4111-8111-111111111111';

/** Somme à passage de la dizaine, calquée sur 5fea90e6 (c = 9 possible) */
function sumTemplate(): QuestionTemplate {
	return {
		id: ID,
		title: 'Calculer une somme',
		theme: 'Entiers',
		domain: 'Calcul',
		level: 1,
		status: 'draft',
		grades: ['CP'],
		variations: [
			{
				statement: templateMarkdown('Calcule.\n\n$${{expression1}}$$'),
				variables: [
					{ name: 'a', expression: '2..8' },
					{ name: 'b', expression: '2..9' },
					{ name: 'c', expression: '{{eval:11-b}}..9' },
					{ name: 'expression1', expression: '{{eval:a*10 + b}} + {{c}}' }
				],
				blanks: [{ expectedAnswer: '{{eval:{{expression1}}}}' }]
			}
		]
	};
}

/** QCM de signe, calqué sur 4bee24f9 */
function signChoiceTemplate(): QuestionTemplate {
	return {
		id: ID,
		title: 'Signe d’un produit',
		theme: 'Relatifs',
		domain: 'Multiplier',
		level: 1,
		status: 'draft',
		grades: ['4'],
		options: { shuffleChoices: false },
		variations: [
			{
				statement: templateMarkdown('Quel est le signe ?\n\n$${{expression1}}$$'),
				variables: [
					{ name: 'a', expression: '30..99;±' },
					{ name: 'b', expression: '30..99;±' },
					{ name: 'expression1', expression: '(a)*(b)' }
				],
				choices: [
					{ content: templateMarkdown('positif') },
					{ content: templateMarkdown('négatif') }
				],
				correctChoiceIndex: ['{{eval:(1-a*b/abs(a*b))/2}}']
			}
		]
	};
}

function proposal(steps: string[], overrides: Partial<Proposal> = {}): Proposal {
	return {
		templateId: ID,
		title: 'Calculer une somme',
		classe: 'R',
		code: 'R-PASS',
		source: 'written',
		steps: { shared: steps },
		notes: [],
		...overrides
	};
}

/** Opération à trou à une variation (`{{a}} + ? = …`) */
function holeTemplate(
	expression: string,
	expectedAnswer: string,
	variables = HOLE_VARIABLES
): QuestionTemplate {
	return {
		...sumTemplate(),
		title: 'Compléter',
		variations: [
			{
				statement: templateMarkdown('Complète.\n\n$${{expression1}}$$'),
				variables: [...variables, { name: 'expression1', expression }],
				blanks: [{ expectedAnswer }]
			}
		]
	};
}

const HOLE_VARIABLES = [
	{ name: 'a', expression: '2..9' },
	{ name: 'b', expression: '2..9' }
];

function failureReasons(template: QuestionTemplate, steps: string[]): string[] {
	const report = verifyProposal(template, proposal(steps), { seeds: 10 });
	return [...report.templateErrors, ...report.failures.flatMap((f) => f.reasons)];
}

// ============================================================================
// STRUCTURE DE L'OPÉRATION
// ============================================================================

describe('splitBinaryOperation', () => {
	it('coupe une somme de gabarits sur l’opérateur de premier niveau', () => {
		expect(splitBinaryOperation('{{eval:a*10 + b}} + {{c}}')).toEqual({
			operator: '+',
			left: '{{eval:a*10 + b}}',
			right: '{{c}}'
		});
	});

	it('lit une différence sans espaces', () => {
		expect(splitBinaryOperation('{{eval:a*10+b}}-{{c}}')?.operator).toBe('-');
	});

	it('refuse une expression à deux opérations ou sans opération', () => {
		expect(splitBinaryOperation('{{a}} + {{b}} + {{c}}')).toBeNull();
		expect(splitBinaryOperation('(-a)*b')).toBeNull();
	});

	it('donne la forme de calcul d’un opérande', () => {
		expect(toEvalForm('{{eval:a*10 + b}}')).toBe('(a*10 + b)');
		expect(toEvalForm('{{c}}')).toBe('c');
		expect(toEvalForm('{{eval:b}}')).toBe('b');
		expect(() => toEvalForm('{{random:1..9}}')).toThrow(/illisible/);
	});
});

// ============================================================================
// GÉNÉRATION R-PASS
// ============================================================================

describe('R-PASS', () => {
	it('n’écrit la branche « +9 » que si un tirage a c = 9', () => {
		const { byVariation, notes } = generateRPass(sumTemplate());
		expect(byVariation[0][0]).toContain('{{if:c=9|');
		expect(notes[0]).toContain('R = 9');
		const plain = buildRPassSteps(splitBinaryOperation('{{a}} + {{b}}')!, {
			nine: false,
			plain: false,
			roundMinuend: false
		});
		expect(plain[0]).not.toContain('{{if:');
	});

	it('produit une correction qui passe le vérificateur sur tout le domaine (252 combinaisons)', () => {
		const template = sumTemplate();
		const { byVariation } = generateRPass(template);
		const report = verifyProposal(template, proposal([], { steps: { byVariation } }));
		expect(report.samplings).toEqual([{ mode: 'exhaustive', size: 252 }]);
		expect(report.instances).toBe(252);
		expect(report.failures).toEqual([]);
		expect(report.passed).toBe(true);
	});

	it('voit un cas rare (1 combinaison sur 10 000) que 300 graines manqueraient', () => {
		// c = 9 seulement pour a = 100 et b = 100
		const template: QuestionTemplate = {
			...sumTemplate(),
			variations: [
				{
					statement: templateMarkdown('Calcule.\n\n$${{expression1}}$$'),
					variables: [
						{ name: 'a', expression: '1..100' },
						{ name: 'b', expression: '1..100' },
						{ name: 'c', expression: '{{eval:8+floor(a/100)*floor(b/100)}}' },
						{ name: 'expression1', expression: '{{eval:a*10 + 1}} + {{c}}' }
					],
					blanks: [{ expectedAnswer: '{{eval:{{expression1}}}}' }]
				}
			]
		};
		const op = splitBinaryOperation('{{eval:a*10 + 1}} + {{c}}')!;
		const cases = detectRPassCases(template, 0, op);
		expect(cases.sampling).toEqual({ mode: 'exhaustive', size: 10000 });
		expect(cases.nine).toBe(true);
	});

	it('différence à diminuende rond (30 − 6) : passage par la dizaine, pas « sans passage »', () => {
		const template: QuestionTemplate = {
			...sumTemplate(),
			variations: [
				{
					statement: templateMarkdown('Calcule.\n\n$${{expression1}}$$'),
					variables: [
						{ name: 'a', expression: '2..9' },
						{ name: 'c', expression: '2..8' },
						{ name: 'expression1', expression: '{{eval:a*10}} - {{c}}' }
					],
					blanks: [{ expectedAnswer: '{{eval:{{expression1}}}}' }]
				}
			]
		};
		const { byVariation, notes } = generateRPass(template);
		expect(notes[0]).toContain('diminuende rond');
		const report = verifyProposal(template, proposal([], { steps: { byVariation } }));
		expect(report.failures).toEqual([]);
		const injected = injectCorrection(template, proposal([], { steps: { byVariation } }));
		const result = generateInstanceWithFixedVariables(injected, { a: '3', c: '6' }, 0);
		expect(result.success).toBe(true);
		if (!result.success) return;
		const steps = (result.instance.correction?.steps ?? []).map((s) => stripDecorations(String(s)));
		expect(steps.join('\n')).not.toContain('pas de passage');
		expect(steps[1]).toContain('30 - 6 &= 20 + 10 - 6');
		expect(steps[1]).toContain('&= 20 + 4');
	});
});

// ============================================================================
// TIRAGES : domaine entier
// ============================================================================

describe('planDraws / enumerateCombinations', () => {
	it('énumère toutes les combinaisons, bornes dépendantes comprises', () => {
		const result = enumerateCombinations(sumTemplate(), 0);
		expect('combinations' in result && result.combinations.length).toBe(252);
	});

	it('lit les unions, les listes et le signe ±', () => {
		const template = holeTemplate('{{a}} + ? = {{b}}', '{{b}}', [
			{ name: 'a', expression: '1..3|10' },
			{ name: 'b', expression: '2..3;±' }
		]);
		const result = enumerateCombinations(template, 0);
		expect('combinations' in result && result.combinations.length).toBe(16);
	});

	it('repasse à 5 000 graines au-delà de 20 000 combinaisons ou sur une écriture non lue', () => {
		const big = holeTemplate('{{a}} + ? = {{b}}', '{{b}}', [
			{ name: 'a', expression: '1..200' },
			{ name: 'b', expression: '1..200' }
		]);
		expect(planDraws(big, 0).sampling).toMatchObject({ mode: 'seeds', size: 5000 });
		const digits = holeTemplate('{{a}} + ? = {{b}}', '{{b}}', [
			{ name: 'a', expression: 'digits:2.1' },
			{ name: 'b', expression: '1..2' }
		]);
		expect(planDraws(digits, 0).sampling.reason).toMatch(/non énumérée/);
	});

	it('écarte les combinaisons refusées par les conditions du modèle', () => {
		const template = holeTemplate('{{a}} + ? = {{b}}', '{{b}}');
		template.variations[0].conditions = ['a<b'];
		const draws = [...planDraws(template, 0).draws];
		expect(draws).toHaveLength(28);
	});
});

// ============================================================================
// GÉNÉRATION R-INV
// ============================================================================

describe('R-INV', () => {
	it('lit une opération à un seul trou, à gauche ou à droite', () => {
		expect(parseHoleOperation('{{c}}+?={{eval:c+g;d}}')).toEqual({
			operator: '+',
			missing: 'right',
			known: '{{c}}',
			result: '{{eval:c+g;d}}'
		});
		expect(parseHoleOperation('?:b=a')).toMatchObject({
			operator: ':',
			missing: 'left',
			known: '{{b}}'
		});
		expect(parseHoleOperation('{{eval: a*100 + c }} - ? =  {{eval: a*100 }}')?.operator).toBe('-');
		expect(parseHoleOperation('?*? = 4')).toBeNull();
		expect(parseHoleOperation('{{a}} + {{b}}')).toBeNull();
		expect(parseHoleOperation('{{a}} + ? = ?')).toBeNull();
		expect(parseHoleOperation('{{a}} + ? = {{b}} = {{c}}')).toBeNull();
	});

	it.each([
		['{{a}} + ? = {{eval:a+b}}', '{{b}}'],
		['? + {{a}} = {{eval:a+b}}', '{{b}}'],
		['? - {{a}} = {{b}}', '{{eval:a+b}}'],
		['{{eval:a+b}} - ? = {{a}}', '{{b}}'],
		['{{a}}*? = {{eval:a*b}}', '{{b}}'],
		['?:{{a}} = {{b}}', '{{eval:a*b}}'],
		['{{eval:a*b}}:? = {{a}}', '{{b}}'],
		['?:10 = {{eval:a:10;d}}', '{{a}}']
	])(
		'%s : la correction générée passe le vérificateur sur tout le domaine',
		(expression, expected) => {
			const template = holeTemplate(expression, expected);
			const { byVariation } = generateRInv(template);
			const report = verifyProposal(template, proposal([], { steps: { byVariation } }));
			expect(report.samplings[0].mode).toBe('exhaustive');
			expect(report.failures).toEqual([]);
			expect(report.passed).toBe(true);
		}
	);
});

// ============================================================================
// INJECTION
// ============================================================================

describe('injectCorrection', () => {
	it('écrit les étapes dans chaque variation', () => {
		const injected = injectCorrection(sumTemplate(), proposal(['$$1$$']));
		expect(injected.variations[0].correction?.steps?.map(String)).toEqual(['$$1$$']);
	});

	it('refuse d’écraser une correction existante', () => {
		const template = sumTemplate();
		template.variations[0].correction = { steps: [templateMarkdown('déjà là')] };
		expect(() => injectCorrection(template, proposal(['x']))).toThrow(/écrasement/);
	});

	it('refuse un nombre de listes d’étapes différent du nombre de variations', () => {
		expect(() =>
			injectCorrection(sumTemplate(), proposal([], { steps: { byVariation: [['a'], ['b']] } }))
		).toThrow(/2 liste/);
	});

	it('refuse un fichier de proposition mal formé (Zod)', () => {
		expect(() => parseProposal({ templateId: 'pas-un-uuid' }, 'f.json')).toThrow(/f\.json/);
		expect(() => parseProposal({ ...proposal(['x']), extra: 1 }, 'f.json')).toThrow();
	});
});

// ============================================================================
// VÉRIFICATEUR : chaque classe de défaut rougit
// ============================================================================

describe('verifyProposal', () => {
	const good = '$$\\begin{align} {{eval:a*10 + b}} + {{c}} &= {{solution}} \\end{align}$$';

	it('accepte un calcul juste qui finit sur la réponse', () => {
		expect(failureReasons(sumTemplate(), [good])).toEqual([]);
	});

	it('rougit quand le calcul ne finit pas sur la réponse attendue', () => {
		const reasons = failureReasons(sumTemplate(), [
			'$$\\begin{align} {{eval:a*10 + b}} + {{c}} &= {{eval:a*10 + b}} + {{c}} \\end{align}$$',
			'$$\\begin{align} {{c}} &= {{c}} \\end{align}$$'
		]);
		expect(reasons.some((r) => r.includes('le calcul finit sur'))).toBe(true);
	});

	it('rougit sur une égalité fausse au milieu de la chaîne', () => {
		const reasons = failureReasons(sumTemplate(), [
			'$$\\begin{align} {{eval:a*10 + b}} + {{c}} &= {{eval:a*10 + b + c + 1}} \\\\ &= {{solution}} \\end{align}$$'
		]);
		expect(reasons.some((r) => r.startsWith('égalités fausses'))).toBe(true);
	});

	it('rougit sur un marqueur non résolu (condition illisible laissée au client)', () => {
		const reasons = failureReasons(sumTemplate(), [`{{if:isCorrect|bravo|raté}} ${good}`]);
		expect(reasons.some((r) => r.includes('marqueur non résolu'))).toBe(true);
	});

	it('rougit sur un environnement LaTeX non refermé', () => {
		const reasons = failureReasons(sumTemplate(), [
			'$$\\begin{align} {{eval:a*10 + b}} + {{c}} &= {{solution}}$$'
		]);
		expect(reasons.some((r) => r.includes('LaTeX invalide'))).toBe(true);
	});

	it('rougit sur « + 0 » et « + -3 »', () => {
		expect(awkwardWritings('26 + 0')).toHaveLength(1);
		expect(awkwardWritings('26 + \\textcolor{#FF5722}{-3}')).toHaveLength(1);
		expect(awkwardWritings('26 + 10 - 1')).toEqual([]);
		expect(awkwardWritings('\\left( -3 \\right) \\times 2')).toEqual([]);
	});

	it('rougit quand la conclusion d’un QCM nomme le mauvais choix', () => {
		const wrong = '{{if:a*b>0|Le produit est négatif.|Le produit est positif.}}';
		const reasons = failureReasons(signChoiceTemplate(), [wrong]);
		expect(reasons.some((r) => r.includes('mauvais choix'))).toBe(true);
		expect(failureReasons(signChoiceTemplate(), ['Le produit est donc {{solution}}.'])).toEqual([]);
	});
});

describe('verifyProposal : chaînes strictes', () => {
	const hole = () => holeTemplate('{{a}} + ? = {{eval:a+b}}', '{{b}}');

	it('rougit sur un membre non numérique (inconnue ailleurs qu’en tête d’un trou)', () => {
		const reasons = failureReasons(sumTemplate(), [
			'$$\\begin{align} {{eval:a*10 + b}} + {{c}} &= x + {{c}} \\\\ &= {{solution}} \\end{align}$$'
		]);
		expect(reasons.some((r) => r.startsWith('membre non numérique « x + '))).toBe(true);
	});

	it('rougit sur « ? » dans une question qui n’est pas à trou', () => {
		const reasons = failureReasons(sumTemplate(), [
			'$$\\begin{align} ? &= {{eval:a*10 + b}} + {{c}} \\\\ &= {{solution}} \\end{align}$$'
		]);
		expect(reasons.some((r) => r.startsWith('membre non numérique « ? »'))).toBe(true);
	});

	it('accepte « ? » en tête d’un trou quand le membre suivant vaut la réponse', () => {
		expect(
			failureReasons(hole(), [
				'$$\\begin{align} ? &= {{eval:a+b}} - {{a}} \\\\ &= {{solution}} \\end{align}$$'
			])
		).toEqual([]);
	});

	it('rougit quand « ? » est suivi d’une autre valeur que la réponse', () => {
		const reasons = failureReasons(hole(), [
			'$$\\begin{align} ? &= {{eval:a+b+1}} \\end{align}$$',
			'$$\\begin{align} {{eval:a+b}} - {{a}} &= {{solution}} \\end{align}$$'
		]);
		expect(reasons.some((r) => r.startsWith('« ? » doit être suivi de la réponse attendue'))).toBe(
			true
		);
	});

	it('rougit quand le calcul ne part pas de l’opération posée', () => {
		// Un calcul annexe en premier, puis un calcul juste : seul le point de départ est faux
		const reasons = failureReasons(sumTemplate(), [
			'$$\\begin{align} {{c}} &= {{c}} \\end{align}$$',
			'$$\\begin{align} {{eval:a*10 + b}} + {{c}} &= {{solution}} \\end{align}$$'
		]);
		expect(reasons.some((r) => r.startsWith("le calcul ne part pas de l'opération posée"))).toBe(
			true
		);
	});

	it('rougit quand une question à trou ne part pas de « ? »', () => {
		const reasons = failureReasons(hole(), [
			'$$\\begin{align} {{eval:a+b}} - {{a}} &= {{solution}} \\end{align}$$'
		]);
		expect(
			reasons.some((r) => r.startsWith('question à trou : le calcul doit partir de « ? »'))
		).toBe(true);
	});

	it('QCM : un choix aux caractères spéciaux est cherché littéralement', () => {
		expect(escapeRegExp('(+) a.b')).toBe('\\(\\+\\) a\\.b');
		const template = signChoiceTemplate();
		template.variations[0].choices = [
			{ content: templateMarkdown('positif (+)') },
			{ content: templateMarkdown('négatif (−)') }
		];
		expect(failureReasons(template, ['Le produit est donc {{solution}}.'])).toEqual([]);
		const wrong = failureReasons(template, [
			'{{if:a*b>0|Le produit est négatif (−).|Le produit est positif (+).}}'
		]);
		expect(wrong.some((r) => r.includes('mauvais choix'))).toBe(true);
	});
});

// ============================================================================
// PUBLICATION ET INSTANTANÉ
// ============================================================================

describe('publishRefusal', () => {
	it('refuse le lot entier dès qu’une entrée n’est pas prête', () => {
		expect(publishRefusal(35, 36)).toMatch(/1 modèle\(s\) sur 36/);
		expect(publishRefusal(0, 0)).toMatch(/vide/);
		expect(publishRefusal(36, 36)).toBeNull();
	});
});

describe('instantané sans identifiant d’utilisateur', () => {
	it('retire created_by (et tout *_by / user_id) d’une ligne', () => {
		const row = {
			id: ID,
			title: 't',
			created_by: 'u',
			updated_by: 'v',
			user_id: 'w',
			updated_at: 'x'
		} as unknown as QuestionTemplateRow;
		expect(Object.keys(withoutUserIds(row))).toEqual(['id', 'title', 'updated_at']);
	});

	it.each([PILOT_LOT.name, R_INV_LOT.name])(
		'l’instantané commité du lot %s n’en contient pas',
		(lot) => {
			const raw = readFileSync(`docs/corrections/${lot}/_modeles.json`, 'utf8');
			expect(raw).not.toMatch(/"(created_by|updated_by|user_id)"/);
		}
	);
});

describe('outils LaTeX du vérificateur', () => {
	it('retire les couleurs, même imbriquées', () => {
		expect(stripDecorations('\\textcolor{#1}{2 + \\textcolor{#2}{3}}')).toBe('2 + 3');
	});

	it('découpe les membres d’un align', () => {
		expect(alignChains('\\begin{align} a &= b \\\\ &= c \\end{align}')).toEqual([['a', 'b', 'c']]);
	});

	it('lit la division « : » et les parenthèses', () => {
		expect(numericValue('\\left( -6 \\right) : \\left( -3 \\right)')).toBe(2);
		expect(numericValue('?')).toBeNull();
	});
});

// ============================================================================
// LOT PILOTE (instantané commité)
// ============================================================================

describe.each([PILOT_LOT, R_INV_LOT])('lot $name', (lot) => {
	const templates = readSnapshot(lot.name);

	it.each(lot.entries.map((entry) => [entry.code, entry.templateId, entry] as const))(
		'%s %s : la proposition commitée est à jour et passe 20 tirages par variation',
		(_code, templateId, entry) => {
			const template = templates.get(templateId);
			expect(template).toBeDefined();
			if (!template) return;
			const committed = readProposal(lot.name, templateId);
			// La proposition commitée est bien celle que le lot produit aujourd'hui
			expect(committed.steps).toEqual(buildCorrection(entry, template).steps);
			const report = verifyProposal(template, committed, { seeds: 20 });
			expect(report.templateErrors).toEqual([]);
			expect(report.failures).toEqual([]);
		}
	);
});
