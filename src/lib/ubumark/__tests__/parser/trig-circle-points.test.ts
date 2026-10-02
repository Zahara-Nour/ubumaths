/**
 * Bloc ```trig : points nommés et erreurs situées (décision de David, 2026-10-02)
 *
 * `points: M = 2*pi/3, N = -pi/4` dessine des points NOMMÉS sur le cercle,
 * sans leur valeur. Une clé inconnue, un point mal écrit ou un nom en double
 * produisent une erreur située (« Ligne N : … »), comme le bloc ```courbe.
 */
import { describe, it, expect } from 'vitest';
import { parseTrigCircleContent } from '../../parser/trig-circle-parser';
import { parseMarkdown } from '../../parser/markdown-parser';
import type { TrigCircleNode } from '../../types/trig-circle';

describe('```trig — clé `points:`', () => {
	it('analyse les noms et les angles (valeurs normalisées dans [0 ; 2π[)', () => {
		const result = parseTrigCircleContent(`preset: custom\npoints: M = 2*pi/3, N = -pi/4`);
		expect(result.errors).toEqual([]);
		const points = result.node!.points!;
		expect(points.map((p) => p.name)).toEqual(['M', 'N']);
		expect(points[0].angle.radians).toBeCloseTo((2 * Math.PI) / 3);
		expect(points[1].angle.radians).toBeCloseTo((7 * Math.PI) / 4);
	});

	it('accepte chiffres et primes dans le nom', () => {
		const result = parseTrigCircleContent(`points: A1 = pi/6, M' = pi, B2'' = 0`);
		expect(result.errors).toEqual([]);
		expect(result.node!.points!.map((p) => p.name)).toEqual(['A1', "M'", "B2''"]);
	});

	it('les points s’ajoutent aux angles du preset, sans s’y mêler', () => {
		const result = parseTrigCircleContent(`preset: quarters\npoints: M = pi/3`);
		expect(result.node!.angles).toHaveLength(4);
		expect(result.node!.points).toHaveLength(1);
	});

	it('`preset: custom` avec seulement des points est valide', () => {
		const result = parseTrigCircleContent(`preset: custom\npoints: M = pi/3\nlabels: false`);
		expect(result.errors).toEqual([]);
		expect(result.node!.angles).toEqual([]);
		expect(result.node!.config.showLabels).toBe(false);
	});

	it('sans `points:`, la liste est vide', () => {
		const result = parseTrigCircleContent('preset: quarters');
		expect(result.node!.points).toEqual([]);
	});

	it('point mal écrit : erreur située', () => {
		const result = parseTrigCircleContent(`preset: quarters\npoints: M = 2*pi/3, N pi/4`);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].message).toMatch(/^Ligne 2 : /);
		expect(result.errors[0].message).toContain('N pi/4');
	});

	it('angle illisible : erreur située', () => {
		const result = parseTrigCircleContent(`points: M = truc`);
		expect(result.errors[0].message).toMatch(/^Ligne 1 : /);
		expect(result.errors[0].message).toContain('truc');
	});

	it('nom invalide (deux lettres) : erreur située', () => {
		const result = parseTrigCircleContent(`points: AB = pi/3`);
		expect(result.errors[0].message).toMatch(/^Ligne 1 : /);
		expect(result.errors[0].message).toContain('AB');
	});

	it('nom en double, même sur deux lignes : erreur située', () => {
		const result = parseTrigCircleContent(`points: M = pi/3\npoints: N = pi, M = 0`);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].message).toMatch(/^Ligne 2 : /);
		expect(result.errors[0].message).toContain('« M »');
	});

	it('plafond : 8 points', () => {
		const huit = 'ABCDEFGH'
			.split('')
			.map((n, i) => `${n} = ${i}*pi/4`)
			.join(', ');
		expect(parseTrigCircleContent(`points: ${huit}`).errors).toEqual([]);
		const neuf = parseTrigCircleContent(`points: ${huit}, K = pi/5`);
		expect(neuf.errors).toHaveLength(1);
		expect(neuf.errors[0].message).toMatch(/^Ligne 1 : .*8/);
	});

	it('`points:` vide : erreur située', () => {
		const result = parseTrigCircleContent(`points:`);
		expect(result.errors[0].message).toMatch(/^Ligne 1 : /);
	});
});

describe('```trig — erreurs situées', () => {
	it('clé inconnue : « Ligne N : clé inconnue « noms » (clés possibles : …) »', () => {
		const result = parseTrigCircleContent(`preset: quarters\nnoms: M`);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].message).toMatch(
			/^Ligne 2 : clé inconnue « noms » \(clés possibles : .*points.*\)$/
		);
	});

	it('le nœud existe toujours et porte ses erreurs (rendu : message prof / cadre élève)', () => {
		const result = parseTrigCircleContent(`noms: M`);
		expect(result.node).not.toBeNull();
		expect(result.node!.errors).toHaveLength(1);
	});

	it('un bloc valide n’a pas d’erreurs', () => {
		expect(parseTrigCircleContent('preset: quarters').node!.errors).toEqual([]);
	});

	it('dans un document : le bloc en erreur reste un nœud (il ne disparaît plus)', () => {
		const doc = parseMarkdown(['Avant.', '', '```trig', 'noms: M', '```', '', 'Après.'].join('\n'));
		const trig = doc.children.find((c) => c.type === 'trig-circle') as TrigCircleNode | undefined;
		expect(trig).toBeDefined();
		expect(trig!.errors![0].message).toContain('noms');
	});
});
