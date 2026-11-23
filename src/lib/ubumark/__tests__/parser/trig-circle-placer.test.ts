/**
 * Bloc ```trig — `placer:` (point à placer, chantier `docs/wip/cercle-trotteuse-progress.md`
 * § 4 et § 6) et `case:` (posée par le générateur)
 *
 * `placer: M = 2*pi/3 ; N = -pi/4` : des points nommés que l'élève pose sur le
 * cercle, sur un cran de π/12. Refusé quand le cercle montrerait la réponse
 * (`angles:`, un préréglage, un point donné à cet angle) ou quand le mode ne s'y
 * prête pas (`mode: interactive`, `equation:`, `display: table`).
 */
import { describe, it, expect } from 'vitest';
import { parseTrigCircleContent } from '../../parser/trig-circle-parser';
import { parseMarkdown } from '../../parser/markdown-parser';
import { MASKED_VALUE } from '../../utils/masked-value';
import type { TrigCircleNode } from '../../types/trig-circle';

const parse = (...lines: string[]) => parseTrigCircleContent(lines.join('\n'));
const messages = (...lines: string[]) =>
	parse(...lines)
		.errors.map((e) => e.message)
		.join(' ; ');

describe('```trig — `placer:`', () => {
	it('un point : nom et angle, rien d’autre ne change', () => {
		const result = parse('placer: M = 2*pi/3');
		expect(result.errors).toEqual([]);
		const node = result.node!;
		expect(node.placer?.map((p) => p.name)).toEqual(['M']);
		expect(node.placer?.[0].angle.radians).toBeCloseTo((2 * Math.PI) / 3);
		// Repères : le préréglage `quarters` par défaut
		expect(node.angles).toHaveLength(4);
		expect(node.points).toEqual([]);
	});

	it('plusieurs points séparés par « ; »', () => {
		const result = parse('placer: M = 2*pi/3 ; N = -pi/4 ; P = 13*pi/6');
		expect(result.errors).toEqual([]);
		expect(result.node!.placer!.map((p) => p.name)).toEqual(['M', 'N', 'P']);
		expect(result.node!.placer![1].angle.radians).toBeCloseTo((7 * Math.PI) / 4);
		expect(result.node!.placer![2].angle.radians).toBeCloseTo(Math.PI / 6);
	});

	it('angle en degrés, sur un cran', () => {
		expect(parse('placer: M = 135°').errors).toEqual([]);
	});

	it('un point sur un repère (π/2) : permis, le cercle l’étiquette sans dire son écriture', () => {
		expect(parse('placer: M = 5*pi/2').errors).toEqual([]);
		expect(parse('preset: quarters', 'placer: M = -pi/2').errors).toEqual([]);
	});

	it('sans `placer:`, rien à placer', () => {
		expect(parse('preset: quarters').node!.placer).toBeUndefined();
	});

	it('angle hors des crans : refusé', () => {
		expect(messages('placer: M = pi/5')).toMatch(
			/^Ligne 1 : .*M.*un point à placer tombe sur un multiple de π\/12/
		);
	});

	it('point sans nom, mal écrit, angle illisible : refusés', () => {
		expect(messages('placer: 2*pi/3')).toMatch(/Ligne 1 : .*chaque point porte un nom/);
		expect(messages('placer: MN = pi/3')).toMatch(/nom de point invalide/);
		expect(messages('placer: M = truc')).toMatch(/angle illisible « truc »/);
		expect(messages('placer:')).toMatch(/placer: » sans point/);
		expect(messages('placer: M = pi/3 ;')).toMatch(/point vide/);
	});

	it('nom en double : refusé', () => {
		expect(messages('placer: M = pi/3 ; M = pi/4')).toMatch(/point « M » nommé deux fois/);
	});

	it('nom déjà pris par un point donné : refusé', () => {
		expect(messages('points: M = pi', 'placer: M = pi/3')).toMatch(
			/M est déjà un point donné \(points:\)/
		);
	});

	it('9 points : refusé (8 au plus)', () => {
		const nine = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'K'].map((n) => `${n} = pi/12`);
		expect(messages(`placer: ${nine.join(' ; ')}`)).toMatch(/8 points à placer au plus/);
	});

	it('un mode qui ne s’y prête pas : refusé', () => {
		expect(messages('mode: interactive', 'placer: M = pi/3')).toMatch(
			/placer: ne se combine pas avec mode: interactive/
		);
		expect(messages('equation: cos(x) = 1/2', 'placer: M = pi/3')).toMatch(
			/placer: ne se combine pas avec equation:/
		);
		expect(messages('display: table', 'placer: M = pi/3')).toMatch(
			/placer: ne se combine pas avec display: table/
		);
		expect(messages('display: circle+table', 'placer: M = pi/3')).toMatch(
			/placer: ne se combine pas avec display: circle\+table/
		);
	});

	it('le cercle montrerait l’angle attendu : refusé', () => {
		expect(messages('angles: 2*pi/3', 'placer: M = 2*pi/3')).toMatch(
			/l’angle de M est déjà sur le cercle \(angles:\)/
		);
		expect(messages('preset: sixths', 'placer: M = -2*pi/3')).toMatch(
			/l’angle de M est déjà sur le cercle \(preset: sixths\)/
		);
		expect(messages('points: A = pi/4', 'placer: M = 9*pi/4')).toMatch(
			/l’angle de M est déjà sur le cercle \(points:\)/
		);
	});

	it('`angles:`, préréglage, point donné ailleurs : permis', () => {
		expect(
			parse('preset: thirds', 'angles: pi/6', 'points: A = pi', 'placer: M = pi/4').errors
		).toEqual([]);
	});

	it('énoncé d’une évaluation notée : `M = ?` lu sans angle à vérifier', () => {
		const result = parse(`placer: M = ${MASKED_VALUE} ; N = ${MASKED_VALUE}`, 'angles: pi/3');
		expect(result.errors).toEqual([]);
		expect(result.node!.placer!.map((p) => p.name)).toEqual(['M', 'N']);
	});
});

describe('```trig — `case:`', () => {
	it('numéro de case lu', () => {
		const result = parse('case: 3', 'placer: M = pi/3');
		expect(result.errors).toEqual([]);
		expect(result.node!.caseIndex).toBe(3);
	});

	it('sans placer: : refusé', () => {
		expect(messages('case: 0', 'preset: quarters')).toMatch(/case: sans objet sans placer:/);
	});

	it('numéro illisible : refusé', () => {
		expect(messages('case: a', 'placer: M = pi/3')).toMatch(/case « a » : numéro de case entier/);
	});
});

describe('```trig — `placer:` dans un énoncé', () => {
	it('le nœud du document porte ses points à placer et sa source', () => {
		const ast = parseMarkdown(['```trig', 'case: 0', 'placer: M = pi/3', '```'].join('\n'));
		const node = ast.children[0] as TrigCircleNode;
		expect(node.type).toBe('trig-circle');
		expect(node.caseIndex).toBe(0);
		expect(node.placer?.[0].name).toBe('M');
		expect(node.source).toBe('case: 0\nplacer: M = pi/3');
	});
});
