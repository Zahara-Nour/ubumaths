/**
 * Énoncé d'une évaluation notée sans la réponse (chantier `fuite-enonce`, lot 2)
 * ==============================================================================
 *
 * Décisions de David (journal § 7) :
 * - ```cubes `retrouver:` : les hauteurs deviennent `?` (les `0` restent : la vue de
 *   dessus est donnée), une ligne `vues:` porte les vues données ; `dessiner:` reste
 *   tel quel (la perspective est la figure) ;
 * - ```patron `completer:` : le patron amputé en grille, `completer: ?` par face à
 *   poser ;
 * - ```figure-a-completer : `verifier: ?`, l'outil écrit.
 * Pour chacun : rien de la réponse dans l'énoncé public, le bloc masqué se lit avec
 * le même écran, l'instance complète ne bouge pas, et la forme masquée écrite par un
 * auteur est refusée par le générateur.
 */
import { describe, it, expect } from 'vitest';
import { generateInstance } from '../generator/instance-generator';
import { toPublicQuestion } from '../public-question';
import type { QuestionInstance, QuestionTemplate } from '../types';
import { templateMarkdown } from '$lib/ubumark';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import { readConstructionHeader } from '$lib/ubumark/parser/construction-parser';
import { sideColumns } from '$lib/ubumark/utils/cubes-gestes';
import { completerStart } from '$lib/ubumark/utils/patron-gestes';
import type { CubesSpec, PatronSpec } from '$lib/ubumark/types/espace';

// Constantes
const META = { position: 0, delaySeconds: 20 };

// Functions
function template(statement: string): QuestionTemplate {
	return {
		id: 'test-fuite-enonce-lot2',
		title: 'Fuite',
		status: 'draft',
		type: 'fill_in_blanks',
		variations: [{ statement: templateMarkdown(statement) }],
		grades: ['5e'],
		theme: 'Test',
		domain: 'Test',
		level: 1
	} as unknown as QuestionTemplate;
}

function instance(statement: string): QuestionInstance {
	const result = generateInstance(template(statement), 42);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

/** L'énoncé public d'une question, et l'instance d'où il vient */
function sent(statement: string): { full: QuestionInstance; statement: string } {
	const full = instance(statement);
	const before = full.statement;
	const question = toPublicQuestion(full, META);
	expect(full.statement, 'instance complète inchangée').toBe(before);
	return { full, statement: question.statement };
}

/** Corps du premier bloc ```kind (sans clôtures) */
function body(markdown: string, kind: string): string {
	const lines = markdown.split('\n');
	const start = lines.findIndex((line) => line.trim() === '```' + kind);
	const end = lines.findIndex((line, i) => i > start && line.trim() === '```');
	return lines.slice(start + 1, end).join('\n');
}

function block(kind: string, ...lines: string[]): string {
	return ['```' + kind, ...lines, '```'].join('\n');
}

function cubesOf(source: string): CubesSpec {
	const node = parseEspaceContent(source, 'cubes');
	expect(node.errors).toEqual([]);
	return node.spec as CubesSpec;
}

function patronOf(source: string): PatronSpec {
	const node = parseEspaceContent(source, 'patron');
	expect(node.errors).toEqual([]);
	return node.spec as PatronSpec;
}

describe('assemblage à retrouver (```cubes retrouver:)', () => {
	const STATEMENT = `Retrouve l’assemblage.\n\n${block('cubes', 'hauteurs: 3 1 2 / 1 0 2', 'retrouver: face, droite')}`;

	it('les hauteurs deviennent ?, les 0 restent, les vues données sont écrites', () => {
		const { full, statement } = sent(STATEMENT);
		expect(full.statement).toContain('hauteurs: 3 1 2 / 1 0 2');
		const masked = body(statement, 'cubes');
		expect(masked).toContain('hauteurs: ? ? ? / ? 0 ?');
		expect(masked).not.toMatch(/hauteurs:.*[1-9]/);
		expect(masked).toMatch(/^vues: /m);
	});

	it('le bloc masqué se lit : même vue de dessus, mêmes vues données, même case', () => {
		const { full, statement } = sent(STATEMENT);
		const before = parseEspaceContent(body(full.statement, 'cubes'), 'cubes');
		const spec = cubesOf(body(statement, 'cubes'));
		const real = before.spec as CubesSpec;
		expect(spec.task).toEqual(real.task);
		expect(spec.heights.map((row) => row.map((h) => h > 0))).toEqual(
			real.heights.map((row) => row.map((h) => h > 0))
		);
		expect(spec.givenViews).toEqual({
			face: sideColumns(real.heights, 'face'),
			droite: sideColumns(real.heights, 'droite')
		});
		expect(parseEspaceContent(body(statement, 'cubes'), 'cubes').caseIndex).toBe(before.caseIndex);
	});

	it('rangées en retrait sous hauteurs:, vue de gauche : masquées aussi', () => {
		const { statement } = sent(
			`Retrouve.\n\n${block('cubes', 'hauteurs:', '  2 1', '  0 3', 'retrouver: gauche')}`
		);
		const masked = body(statement, 'cubes');
		const withoutViews = masked
			.split('\n')
			.filter((line) => !line.startsWith('vues:'))
			.join('\n');
		expect(withoutViews).not.toMatch(/[1-9]/);
		expect(cubesOf(masked).givenViews).toEqual({ gauche: [2, 3] });
	});

	it('dessiner: reste tel quel (la perspective est la figure)', () => {
		const statement = `Dessine la vue de face.\n\n${block('cubes', 'hauteurs: 2 1 / 1 1', 'dessiner: face')}`;
		const { full, statement: masked } = sent(statement);
		expect(masked).toBe(full.statement);
	});
});

describe('patron à compléter (```patron completer:)', () => {
	it.each([
		['catalogue', ['solide: cube', 'forme: 1', 'completer: 5']],
		// Sans forme: : le patron par défaut (revue de #2130)
		['patron par défaut, sans forme:', ['solide: cube', 'completer: 5']],
		['patron par défaut tourné, sans forme:', ['solide: cube', 'tourner: 90', 'completer: 2']],
		[
			'tourné et retourné, deux faces',
			['solide: cube', 'forme: 3', 'tourner: 90', 'retourner: oui', 'completer: 1 5']
		],
		['grille écrite', ['solide: cube', 'forme:', '  X...', '  XXXX', '  X...', 'completer: 6']]
	])('%s : patron amputé, completer: ?, même quadrillage', (_name, lines) => {
		const { full, statement } = sent(`Complète le patron.\n\n${block('patron', ...lines)}`);
		const masked = body(statement, 'patron');
		expect(masked).toMatch(/^completer: \?( \?)*$/m);
		expect(masked).not.toMatch(/tourner|retourner|dessous|forme: \d/);
		const real = patronOf(body(full.statement, 'patron'));
		const spec = patronOf(masked);
		expect(completerStart(spec)).toEqual(completerStart(real));
		expect(parseEspaceContent(masked, 'patron').caseIndex).toBe(
			parseEspaceContent(body(full.statement, 'patron'), 'patron').caseIndex
		);
	});

	it('Compléter: accentué : repéré comme un geste, masqué (revue de #2145)', () => {
		const { full, statement } = sent(
			`Complète le patron.\n\n${block('patron', 'solide: cube', 'forme: 1', 'Compléter: 5')}`
		);
		expect(parseEspaceContent(body(full.statement, 'patron'), 'patron').caseIndex).toBe(0);
		expect(body(statement, 'patron')).toMatch(/^completer: \?$/m);
		expect(statement).not.toMatch(/ompl[eé]ter: *5/);
	});

	it('designer: reste tel quel', () => {
		const statement = `Touche la face opposée.\n\n${block('patron', 'solide: cube', 'forme: 1', 'marquer: face 1', 'designer: opposee')}`;
		const { full, statement: masked } = sent(statement);
		expect(masked).toBe(full.statement);
	});
});

describe('figure à compléter (```figure-a-completer)', () => {
	it('verifier: devient ?, l’outil est écrit, la figure reste', () => {
		const { full, statement } = sent(
			`Termine le carré.\n\n${block('figure-a-completer', 'fenetre: 0 ; 10 ; 0 ; 6', 'verifier: carre A ; B', '---', 'A = point(1, 2)', 'B = point(4, 2)')}`
		);
		const masked = body(statement, 'figure-a-completer');
		expect(masked).not.toContain('carre');
		expect(masked).toMatch(/^verifier: \?$/m);
		const real = readConstructionHeader(body(full.statement, 'figure-a-completer'));
		const header = readConstructionHeader(masked);
		expect(header.errors).toEqual([]);
		expect(header.spec.tools).toEqual(['segment']);
		expect(header.spec.checks).toEqual([]);
		expect(header.spec.caseIndex).toBe(real.spec.caseIndex);
		expect(header.figureSource.split('---')[1]).toBe(real.figureSource.split('---')[1]);
	});

	it('deux droites, outil écrit : plus aucun point nommé dans verifier:', () => {
		const { statement } = sent(
			`Trace (AB) et (AC).\n\n${block('figure-a-completer', 'fenetre: 0 ; 10 ; 0 ; 6', 'outils: droite', 'verifier: droite_par A ; B', 'verifier: droite_par A ; C', '---', 'A = point(2, 1)', 'B = point(8, 2)', 'C = point(4, 5)')}`
		);
		const masked = body(statement, 'figure-a-completer');
		expect(masked).not.toMatch(/verifier:.*[A-Z]/);
		expect(readConstructionHeader(masked).errors).toEqual([]);
		expect(readConstructionHeader(masked).spec.tools).toEqual(['droite']);
	});
});

describe('forme masquée écrite par un auteur : refusée par le générateur', () => {
	it.each([
		['cubes', block('cubes', 'hauteurs: ? 1', 'vues: face 1 1', 'retrouver: face')],
		[
			'patron',
			block('patron', 'solide: cube', 'forme:', '  X...', '  XXX.', '  X...', 'completer: ?')
		],
		[
			'figure-a-completer',
			block('figure-a-completer', 'outils: droite', 'verifier: ?', '---', 'A = point(1, 2)')
		]
	])('%s', (_kind, source) => {
		const result = generateInstance(template(`Question.\n\n${source}`), 42);
		expect(result.success).toBe(false);
		if (result.success) return;
		expect(result.errors.join(' ')).toContain('« ? »');
	});
});
