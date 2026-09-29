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
import { splitBinaryOperation, toEvalForm } from '../lib/operation';
import { buildRPassSteps, generateRPass } from '../lib/r-pass';
import { injectCorrection, parseProposal, type Proposal } from '../lib/proposal';
import {
	alignChains,
	awkwardWritings,
	numericValue,
	stripDecorations,
	verifyProposal
} from '../lib/verify';
import { readProposal, readSnapshot } from '../lib/files';
import { PILOT_LOT } from '../lots/pilote';
import { buildCorrection } from '../lib/lot';

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

function failureReasons(template: QuestionTemplate, steps: string[]): string[] {
	const report = verifyProposal(template, proposal(steps), 10);
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
			plain: false
		});
		expect(plain[0]).not.toContain('{{if:');
	});

	it('produit une correction qui passe le vérificateur sur 50 tirages', () => {
		const template = sumTemplate();
		const { byVariation } = generateRPass(template);
		const report = verifyProposal(template, proposal([], { steps: { byVariation } }));
		expect(report.instances).toBe(50);
		expect(report.failures).toEqual([]);
		expect(report.passed).toBe(true);
	});
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

describe('lot pilote', () => {
	const templates = readSnapshot(PILOT_LOT.name);

	it.each(PILOT_LOT.entries.map((entry) => [entry.code, entry.templateId, entry] as const))(
		'%s %s : la proposition commitée est à jour et passe 20 tirages par variation',
		(_code, templateId, entry) => {
			const template = templates.get(templateId);
			expect(template).toBeDefined();
			if (!template) return;
			const committed = readProposal(PILOT_LOT.name, templateId);
			// La proposition commitée est bien celle que le lot produit aujourd'hui
			expect(committed.steps).toEqual(buildCorrection(entry, template).steps);
			const report = verifyProposal(template, committed, 20);
			expect(report.templateErrors).toEqual([]);
			expect(report.failures).toEqual([]);
		}
	);
});
