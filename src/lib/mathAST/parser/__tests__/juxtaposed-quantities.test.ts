/**
 * Durées juxtaposées — chantier lecture-grandeurs, PR 5
 * (docs/wip/lecture-grandeurs-phase0.md § PR 5 ; décisions 6 et 10 de David, 2026-10-20)
 *
 * `2[h] 30[min]` = la somme 2 h + 30 min, marquée « juxtaposée » : un bloc face à `+`
 * et `−`, refusé collé à `*` ou `/`. Seules les durées (angles : unités ′ et ″ absentes,
 * David, 2026-10-20) ; `{2[m]}{3[m]}` reste un produit.
 *
 * Risque géré (phase 0) : la marque perdue par une transformation (« 2 h + 30 min »,
 * valeur juste). Chemins réels mesurés → un test de RENDU par chemin → une garde qui
 * échoue si une nouvelle recopie d'addition oublie la marque.
 */

import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCustomPrattSafeRaw, parseCustomRDSafeRaw } from '../custom/index';
import { parsePrattSafe, parseRDSafe } from '../latex';
import { JUXTAPOSITION_MESSAGES, type JuxtapositionRefusal } from '../juxtaposed-quantities';
import { toCustom } from '../../custom-generator';
import { toLatex } from '../../latex-generator';
import { buildStructure } from '../../structure/build-structure';
import { stripMarkers } from '../../structure/markers';
import { computeQuantity } from '../../cli/quantities';
import { findNodes, mapNode, mapNodeTopDown, cloneNode, replaceNode } from '../../transforms';
import { stripUnnecessaryBrackets, removeNullTermsAST } from '../../transforms';
import { transformAST } from '../../visitor';
import { substitute } from '../../eval/substitute';
import { isJuxtaposedSum } from '../../guards';
import { multiply, opposite } from '../../factory';
import type { MathNode } from '../../types';

// =============================================================================
// Constantes
// =============================================================================

const CUSTOM_PARSERS = [
	['Pratt', parseCustomPrattSafeRaw],
	['RD', parseCustomRDSafeRaw]
] as const;

const LATEX_PARSERS = [
	['Pratt', parsePrattSafe],
	['RD', parseRDSafe]
] as const;

/** Écriture maison → arbre (J = somme juxtaposée) */
const CUSTOM_READINGS: readonly (readonly [string, string])[] = [
	['2[h] 30[min]', 'J(2[h], 30[min])'],
	['2[h]30[min]', 'J(2[h], 30[min])'],
	['{2[h]}{30[min]}', 'J(2[h], 30[min])'],
	['1[h] 2[min] 3[s]', 'J(J(1[h], 2[min]), 3[s])'],
	// Le signe en tête porte sur tout le bloc
	['-2[h] 30[min]', '−J(2[h], 30[min])'],
	// Un bloc face à + et −
	['3[h] - 1[h] 30[min]', '(3[h] − J(1[h], 30[min]))'],
	['2[h] 30[min] - 2[h] 30[min]', '(J(2[h], 30[min]) − J(2[h], 30[min]))'],
	['2[h] 30[min] + 2[h] 30[min]', '(J(2[h], 30[min]) + J(2[h], 30[min]))'],
	// Entre parenthèses : un facteur
	['2*(1[h] 30[min])', '(2 × P(J(1[h], 30[min])))'],
	// La forme n'est pas jugée ici
	['30[min] 2[h]', 'J(30[min], 2[h])'],
	['2[h] 3[h]', 'J(2[h], 3[h])'],
	// Les autres grandeurs entre accolades : un produit, comme avant
	['{2[m]}{3[m]}', '(2[m] × 3[m])']
];

/** Écriture LaTeX → arbre */
const LATEX_READINGS: readonly (readonly [string, string])[] = [
	['2~\\unit{h}~30~\\unit{min}', 'J(2[h], 30[min])'],
	['2\\unit{h}30\\unit{min}', 'J(2[h], 30[min])'],
	['2\\unit{h}\\,30\\unit{min}', 'J(2[h], 30[min])'],
	['1~\\unit{h}~2~\\unit{min}~3~\\unit{s}', 'J(J(1[h], 2[min]), 3[s])'],
	['-2~\\unit{h}~30~\\unit{min}', '−J(2[h], 30[min])'],
	['3~\\unit{h}-1~\\unit{h}~30~\\unit{min}', '(3[h] − J(1[h], 30[min]))'],
	['2\\cdot\\left(1~\\unit{h}~30~\\unit{min}\\right)', '(2 × P(J(1[h], 30[min])))'],
	['\\frac{1~\\unit{h}~30~\\unit{min}}{2}', '(J(1[h], 30[min]) / 2)']
];

/** Écriture maison refusée → cause */
const CUSTOM_REFUSALS: readonly (readonly [string, JuxtapositionRefusal])[] = [
	// Collée à `*` ou `/`, d'un côté comme de l'autre, avec ou sans espaces
	['2*1[h] 30[min]', 'operator'],
	['2 * 1[h] 30[min]', 'operator'],
	['1[h] 30[min]*2', 'operator'],
	['1[h] 30[min] * 2', 'operator'],
	['1[h] 30[min]/2', 'operator'],
	['2/1[h] 30[min]', 'operator'],
	['1[h] 30[min]:2', 'operator'],
	['{1[h]}{30[min]}*2', 'operator'],
	['2*{1[h]}{30[min]}', 'operator'],
	['{1[h]}{30[min]}x', 'operator'],
	// D'autres grandeurs, ou une durée et un angle
	['2[m] 30[cm]', 'notDuration'],
	['2[m]3[m]', 'notDuration'],
	['2[h] 30[°]', 'notDuration'],
	// Un nombre sans unité au bout
	['2[h] 30', 'missingUnit']
];

/** Écriture LaTeX refusée → cause */
const LATEX_REFUSALS: readonly (readonly [string, JuxtapositionRefusal])[] = [
	// Une durée composée ne se compose pas (revue : Pratt et RD divergeaient)
	['2\\unit{h}~30\\unit{min}\\circ f', 'operator'],
	['2\\cdot 1~\\unit{h}~30~\\unit{min}', 'operator'],
	['2\\times1\\unit{h}\\,30\\unit{min}', 'operator'],
	['1~\\unit{h}~30~\\unit{min}\\times 2', 'operator'],
	['1~\\unit{h}~30~\\unit{min}\\cdot2', 'operator'],
	['2~\\unit{m}~30~\\unit{cm}', 'notDuration'],
	['2~\\unit{h}~30', 'missingUnit']
];

const SRC_LIB = fileURLToPath(new URL('../../../', import.meta.url));

// =============================================================================
// Helpers
// =============================================================================

/** L'arbre lisible : J = somme juxtaposée, P = parenthèses */
function shape(node: MathNode): string {
	switch (node.type) {
		case 'number':
			return node.value;
		case 'variable':
			return node.name;
		case 'unit':
			return `${shape(node.expression)}[${node.unit.original}]`;
		case 'addition':
			return node.displayStyle === 'juxtaposed'
				? `J(${shape(node.left)}, ${shape(node.right)})`
				: `(${shape(node.left)} + ${shape(node.right)})`;
		case 'subtraction':
			return `(${shape(node.left)} − ${shape(node.right)})`;
		case 'multiplication':
			return `(${shape(node.left)} × ${shape(node.right)})`;
		case 'division':
			return `(${shape(node.numerator)} / ${shape(node.denominator)})`;
		case 'opposite':
			return `−${shape(node.operand)}`;
		case 'delimiter':
			return `P(${shape(node.content)})`;
		default:
			return node.type;
	}
}

function customAst(input: string): MathNode {
	const ast = parseCustomPrattSafeRaw(input).ast;
	if (!ast) throw new Error(`illisible : ${input}`);
	return ast;
}

/** Les fichiers `.ts` de `src/lib`, tests exclus */
function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sourceFiles(path);
		return name.endsWith('.ts') && !name.endsWith('.test.ts') ? [path] : [];
	});
}

// =============================================================================
// Lecture
// =============================================================================

describe.each(CUSTOM_PARSERS)('parseur maison %s : durées juxtaposées', (_, parse) => {
	it.each(CUSTOM_READINGS)('%s → %s', (input, expected) => {
		const result = parse(input);
		expect(result.errors).toEqual([]);
		expect(shape(result.ast!)).toBe(expected);
	});

	it.each(CUSTOM_REFUSALS)('%s : refusé (%s)', (input, cause) => {
		const result = parse(input);
		expect(result.ast).toBeNull();
		expect(result.errors[0]).toMatchObject({
			code: 'JUXTAPOSED_QUANTITIES',
			message: JUXTAPOSITION_MESSAGES[cause]
		});
	});

	it('2[m] 30 : le refus habituel d’un nombre après un facteur', () => {
		expect(parse('2[m] 30').errors[0]).toMatchObject({ code: 'MISSING_OPERATOR' });
	});
});

describe.each(LATEX_PARSERS)('parseur LaTeX %s : durées juxtaposées', (_, parse) => {
	it.each(LATEX_READINGS)('%s → %s', (input, expected) => {
		const result = parse(input);
		expect(result.errors).toEqual([]);
		expect(shape(result.ast!)).toBe(expected);
	});

	it.each(LATEX_REFUSALS)('%s : refusé (%s)', (input, cause) => {
		const result = parse(input);
		expect(result.ast).toBeNull();
		expect(result.errors[0]).toMatchObject({
			code: 'JUXTAPOSED_QUANTITIES',
			message: JUXTAPOSITION_MESSAGES[cause]
		});
	});

	it('2\\unit{m}~30 : le refus habituel d’un nombre après un facteur', () => {
		expect(parse('2\\unit{m}~30').errors[0]).toMatchObject({ code: 'MISSING_OPERATOR' });
	});
});

// =============================================================================
// Rendu, chemin par chemin
// =============================================================================

describe('rendu : une durée composée s’écrit sans + et se relit à l’identique', () => {
	it.each([
		['2[h] 30[min]', '2[h] 30[min]', '2~\\unit{h}~30~\\unit{min}'],
		['1[h] 2[min] 3[s]', '1[h] 2[min] 3[s]', '1~\\unit{h}~2~\\unit{min}~3~\\unit{s}'],
		['-2[h] 30[min]', '-2[h] 30[min]', '-2~\\unit{h}~30~\\unit{min}'],
		['3[h] - 1[h] 30[min]', '3[h]-1[h] 30[min]', '3~\\unit{h} - 1~\\unit{h}~30~\\unit{min}'],
		[
			'2*(1[h] 30[min])',
			'2*(1[h] 30[min])',
			'2 \\times \\left( 1~\\unit{h}~30~\\unit{min} \\right)'
		]
	])('%s → %s ; %s', (input, custom, latex) => {
		const ast = customAst(input);
		expect(toCustom(ast)).toBe(custom);
		expect(toLatex(ast)).toBe(latex);
		// Aller-retour : la même somme marquée
		expect(parseCustomPrattSafeRaw(custom).ast).toEqual(ast);
		expect(parsePrattSafe(latex).ast).toEqual(ast);
	});

	// Revue : RD ne refermait pas la couleur ; le signe en tête perdait la sienne
	it.each([
		'@red{2[h] 30[min]}',
		'2[h] @red{30[min]}',
		'-@red{2[h] 30[min]}',
		'@red{-2[h] 30[min]}'
	])('rendu coloré (spans) de %s : sans +, relu par les quatre parseurs', (input) => {
		const ast = customAst(input);
		const custom = toCustom(ast, { renderMetadata: true });
		const latex = toLatex(ast, { renderMetadata: true });
		expect(custom).not.toContain('+');
		expect(latex).not.toContain('+');
		for (const [, parse] of CUSTOM_PARSERS) expect(parse(custom).ast).toEqual(ast);
		for (const [, parse] of LATEX_PARSERS) {
			expect(findNodes(parse(latex).ast!, isJuxtaposedSum)).toHaveLength(1);
		}
	});

	it('le signe en tête garde sa couleur', () => {
		const ast = customAst('@red{-2[h] 30[min]}');
		expect(ast.type === 'opposite' && ast.metadata?.color).toBe('red');
	});

	// Revue : signée, en facteur, elle s'écrivait sans parenthèses, refusée à la relecture
	it.each(['(-2[h] 30[min])*2', '(-2[h] 30[min]):2', '(-2[h] 30[min])x', '2*(-2[h] 30[min])'])(
		'%s, parenthèses retirées puis remises par l’écriture : relu',
		(input) => {
			const ast = stripUnnecessaryBrackets(customAst(input));
			expect(parseCustomPrattSafeRaw(toCustom(ast)).errors).toEqual([]);
			expect(parsePrattSafe(toLatex(ast)).errors).toEqual([]);
		}
	);

	it('un produit implicite de grandeurs signé s’écrit avec × (sinon relu en durée composée)', () => {
		const product = multiply(opposite(customAst('2[h]')), customAst('30[min]'), 'implicit');
		expect(toLatex(product)).toBe('-2~\\unit{h} \\times 30~\\unit{min}');
	});

	it('structure (survol) : un bloc, rendu comme toLatex', () => {
		const ast = customAst('x + 2[h] 30[min]');
		const structure = buildStructure(ast);
		expect(stripMarkers(structure.latex)).toBe(toLatex(ast));
		const block = structure.nodes.find((node) => isJuxtaposedSum(node.ast));
		expect(block?.children).toEqual([]);
	});

	it('calcul de grandeurs (console, atelier) : 2 h 30 min, sans +', () => {
		const outcome = computeQuantity(customAst('2[h] 30[min] + 45[min]'), 'exact');
		expect(outcome.ok).toBe(true);
		if (outcome.ok !== true) return;
		expect(outcome.answer.text).toBe('3 h 15 min');
		expect(isJuxtaposedSum(outcome.answer.node)).toBe(true);
		expect(toLatex(outcome.answer.node)).toBe('3~\\unit{h}~15~\\unit{min}');
	});

	it('calcul de grandeurs négatif : −(2 h 30 min), sans parenthèses ni +', () => {
		const outcome = computeQuantity(customAst('1[h] - 3[h] 30[min]'), 'exact');
		expect(outcome.ok === true && toLatex(outcome.answer.node)).toBe('-2~\\unit{h}~30~\\unit{min}');
	});

	it('la valeur : 2 h 30 min = 150 min', () => {
		const outcome = computeQuantity(customAst('2[h] 30[min] - 150[min]'), 'exact');
		expect(outcome.ok === true && outcome.answer.text).toBe('0 h');
	});

	it('marque perdue (terme changé) : la somme s’écrit avec +, valeur juste — échec bénin', () => {
		const ast = mapNode(customAst('2[h] 30[min]'), (node) =>
			node.type === 'number' && node.value === '30' ? { ...node, value: '-30' } : node
		);
		expect(toCustom(ast)).toContain('+');
		const outcome = computeQuantity(ast, 'exact');
		expect(outcome.ok === true && outcome.answer.text).toBe('1.5 h');
	});
});

// =============================================================================
// Garde : les parcours génériques gardent la marque
// =============================================================================

describe('garde : une recopie d’arbre garde la marque « juxtaposée »', () => {
	const ast = customAst('x + 2[h] 30[min]');
	const three = { type: 'number', value: '3' } as const;

	it.each([
		['mapNode', () => mapNode(ast, (node) => node)],
		['mapNodeTopDown', () => mapNodeTopDown(ast, (node) => node)],
		['cloneNode', () => cloneNode(ast)],
		['replaceNode', () => replaceNode(ast, (node) => node.type === 'variable', three)],
		['stripUnnecessaryBrackets', () => stripUnnecessaryBrackets(ast)],
		['removeNullTermsAST', () => removeNullTermsAST(ast)],
		['transformAST', () => transformAST(ast, {})],
		['substitute', () => substitute(ast, { x: 3 })]
	] as const)('%s', (_, run) => {
		expect(findNodes(run(), isJuxtaposedSum)).toHaveLength(1);
	});

	/**
	 * Une recopie d'addition écrite `case 'addition': return add(…)` doit passer
	 * `displayStyle` : sans lui, une durée composée retombe en « 2 h + 30 min ».
	 */
	it('toute recopie `case addition → add(…)` de src/lib passe displayStyle', () => {
		const forgotten: string[] = [];
		for (const file of sourceFiles(SRC_LIB)) {
			const text = readFileSync(file, 'utf-8');
			const rebuild = /case 'addition':\s*(?:return|[\w.]+\s*=)\s*(?:MathAST\.)?add\(/g;
			for (const match of text.matchAll(rebuild)) {
				const call = text.slice(match.index, text.indexOf(';', match.index));
				if (!call.includes('displayStyle')) {
					forgotten.push(
						`${file.slice(SRC_LIB.length)}:${text.slice(0, match.index).split('\n').length}`
					);
				}
			}
		}
		expect(forgotten).toEqual([]);
	});
});
