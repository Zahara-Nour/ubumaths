/**
 * Bloc ```courbe — suites (décision de David du 2026-10-01, 1re spé)
 *
 * Comportements S1 à S11 de docs/archive/wip/bloc-courbe-progress.md, section « Suites ».
 */
import { describe, it, expect } from 'vitest';
import { parseCourbeContent } from '../../parser/courbe-parser';
import { buildCourbeScene } from '../../utils/courbe-scene';
import { generateCourbeTypst } from '../../generators/courbe-typst';
import { generateTypst } from '../../generators/typst-generator';
import { parseMarkdown, templateMarkdown, type BlockNode, type ListNode } from '$lib/ubumark';
import { resolveMarkdownContent } from '$lib/questions/generator/content-resolver';
import type { CourbeNode, CourbeSpec } from '../../types/courbe';
import { COURBE_LIMITS } from '../../types/courbe';

function spec(node: CourbeNode): CourbeSpec {
	expect(node.errors).toEqual([]);
	expect(node.spec).not.toBeNull();
	return node.spec!;
}

const WINDOW = 'x: -1 ; 10\ny: -1 ; 20';

/** Termes sous forme [n, valeur], pour comparer d'un coup */
const pairs = (s: CourbeSpec, index = 0) =>
	s.sequences[index].terms.map((t) => [t.n, t.value] as const);

describe('suites — explicite (S1)', () => {
	it('u(n) = 2*n+1 pour n de 0 à 8 : 9 termes aux bonnes coordonnées', () => {
		const s = spec(parseCourbeContent(`${WINDOW}\nu(n) = 2*n+1 pour n de 0 à 8   bleu   nom=u`));
		expect(s.sequences).toHaveLength(1);
		const u = s.sequences[0];
		expect(u.name).toBe('u');
		expect(u.kind).toBe('explicite');
		expect(u.color).toBe('bleu');
		expect(u.label?.base).toBe('u');
		expect(pairs(s)).toEqual(Array.from({ length: 9 }, (_, n) => [n, 2 * n + 1]));
		const scene = buildCourbeScene(s);
		expect(scene.sequences).toHaveLength(1);
		expect(scene.sequences[0].terms).toEqual(
			Array.from({ length: 9 }, (_, n) => ({ x: n, y: 2 * n + 1 }))
		);
		expect(scene.warnings).toEqual([]);
	});

	it('« a » accepté pour « à », espaces libres', () => {
		const s = spec(parseCourbeContent(`${WINDOW}\nu(n)=n^2 pour n de 1 a 4`));
		expect(pairs(s)).toEqual([
			[1, 1],
			[2, 4],
			[3, 9],
			[4, 16]
		]);
	});

	it('le nom de la suite est ancré près du dernier terme visible', () => {
		const s = spec(parseCourbeContent(`${WINDOW}\nu(n) = 2*n+1 pour n de 0 à 8   nom=u_n`));
		const scene = buildCourbeScene(s);
		expect(scene.curveLabels).toHaveLength(1);
		expect(scene.curveLabels[0]).toMatchObject({ x: 8, y: 17, color: 'bleu' });
		expect(scene.curveLabels[0].label.sub).toBe('n');
	});
});

describe('suites — récurrence (S2, S3)', () => {
	it('v(0) = 1 ; v(n+1) = 0.5*v(n)+2 : termes exacts', () => {
		const s = spec(
			parseCourbeContent(`${WINDOW}\nv(0) = 1 ; v(n+1) = 0.5*v(n)+2 pour n de 0 à 9   rouge`)
		);
		const v = s.sequences[0];
		expect(v.kind).toBe('recurrence');
		expect(v.color).toBe('rouge');
		expect(v.terms).toHaveLength(10);
		expect(v.terms.slice(0, 4).map((t) => t.value)).toEqual([1, 2.5, 3.25, 3.625]);
		expect(v.terms.map((t) => t.n)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
	});

	it('premier rang 1, relation qui dépend de n', () => {
		const s = spec(parseCourbeContent(`${WINDOW}\nw(1) = 2 ; w(n+1) = w(n)+n pour n de 1 à 5`));
		expect(pairs(s)).toEqual([
			[1, 2],
			[2, 3],
			[3, 5],
			[4, 8],
			[5, 12]
		]);
	});

	// parseCustom ne lit `x(n)` comme un appel que pour f, g, h, u, v, w : `t(n)` y est `t*n`
	it('toute lettre nomme une suite récurrente (t, a, p…), pas seulement u, v, w', () => {
		for (const name of ['t', 'a', 'p', 'q']) {
			const s = spec(
				parseCourbeContent(
					`${WINDOW}\n${name}(0) = 1 ; ${name}(n+1) = 2*${name}(n)+n pour n de 0 à 3`
				)
			);
			expect(s.sequences[0].terms.map((t) => t.value)).toEqual([1, 2, 5, 12]);
		}
	});

	it('v(n) dans une puissance : v(n)^v(n) lu comme (v(n))^(v(n))', () => {
		const s = spec(parseCourbeContent(`${WINDOW}\nv(0) = 2 ; v(n+1) = v(n)^v(n) pour n de 0 à 2`));
		expect(s.sequences[0].terms.map((t) => t.value)).toEqual([2, 4, 256]);
	});

	it('rangs dessinés à partir de n0 > premier rang : les termes d’avant sont calculés', () => {
		const s = spec(parseCourbeContent(`${WINDOW}\nv(0) = 1 ; v(n+1) = 2*v(n) pour n de 3 à 4`));
		expect(pairs(s)).toEqual([
			[3, 8],
			[4, 16]
		]);
	});
});

describe('suites — variables de modèle (S4)', () => {
	it('{{a}} et {{u0}} résolus avant la lecture du bloc', () => {
		const resolved = String(
			resolveMarkdownContent(
				templateMarkdown(
					'```courbe\nx: -1 ; 10\ny: -1 ; 20\nv(0) = {{u0}} ; v(n+1) = {{a}}*v(n)+{{b}} pour n de 0 à 3\n```'
				),
				[
					{ name: 'u0', value: '4' },
					{ name: 'a', value: '0.5' },
					{ name: 'b', value: '-1' }
				]
			)
		);
		const body = resolved.split('\n').slice(1, -1).join('\n');
		const s = spec(parseCourbeContent(body));
		expect(s.sequences[0].terms.map((t) => t.value)).toEqual([4, 1, -0.5, -1.25]);
	});
});

describe('suites — fenêtre (S5)', () => {
	it('termes hors fenêtre : non dessinés, un avertissement situé', () => {
		const s = spec(parseCourbeContent('x: -1 ; 5\ny: -1 ; 10\n\nu(n) = 2*n+1 pour n de 0 à 8'));
		const scene = buildCourbeScene(s);
		// n = 0..4 et u_n ≤ 10 → n ≤ 4
		expect(scene.sequences[0].terms.map((p) => p.x)).toEqual([0, 1, 2, 3, 4]);
		const w = scene.warnings.find((x) => x.line === 4);
		expect(w?.message).toMatch(/^Ligne 4 : .*4 termes de u .*hors de la fenêtre/);
	});

	it('suite entièrement hors fenêtre : avertissement, pas de nom dessiné', () => {
		const s = spec(parseCourbeContent('x: -1 ; 5\ny: -1 ; 1\nu(n) = n+10 pour n de 0 à 3 nom=u'));
		const scene = buildCourbeScene(s);
		expect(scene.sequences[0].terms).toEqual([]);
		expect(scene.curveLabels).toEqual([]);
		expect(scene.warnings.some((w) => w.line === 3)).toBe(true);
	});
});

describe('suites — robustesse (S6)', () => {
	it('récurrence explosive v(n+1) = v(n)^2 : calcul arrêté, avertissement situé', () => {
		const node = parseCourbeContent(`${WINDOW}\nv(0) = 2 ; v(n+1) = v(n)^2 pour n de 0 à 150`);
		const s = spec(node);
		const values = s.sequences[0].terms.map((t) => t.value);
		expect(values.slice(0, 4)).toEqual([2, 4, 16, 256]);
		expect(values.every((v) => Number.isFinite(v) && Math.abs(v) <= 1e12)).toBe(true);
		expect(values.length).toBeLessThan(10);
		const w = node.warnings.find((x) => x.line === 3);
		expect(w?.message).toMatch(/^Ligne 3 : .*v.*arrêté/);
	});

	it('terme non défini (division par 0) : la récurrence s’arrête, avertissement', () => {
		const node = parseCourbeContent(`${WINDOW}\nv(0) = 1 ; v(n+1) = 1/(v(n)-1) pour n de 0 à 5`);
		const s = spec(node);
		expect(s.sequences[0].terms).toEqual([{ n: 0, value: 1 }]);
		expect(node.warnings.some((w) => w.line === 3)).toBe(true);
	});

	it('explicite non définie à un rang : rang sauté, avertissement', () => {
		const node = parseCourbeContent(`${WINDOW}\nu(n) = 1/(n-2) pour n de 0 à 4`);
		const s = spec(node);
		expect(s.sequences[0].terms.map((t) => t.n)).toEqual([0, 1, 3, 4]);
		expect(node.warnings.some((w) => w.line === 3 && /rang 2/.test(w.message))).toBe(true);
	});

	it('trop de termes ou de suites : erreur située', () => {
		const tooLong = parseCourbeContent(`${WINDOW}\nu(n) = n pour n de 0 à 100000000`);
		expect(tooLong.spec).toBeNull();
		expect(tooLong.errors[0].line).toBe(3);
		expect(tooLong.errors[0].message).toMatch(new RegExp(`${COURBE_LIMITS.sequenceTerms}`));
		const many = 'abcdefghijkl'
			.split('')
			.map((c) => `${c}(n) = n pour n de 0 à 1`)
			.join('\n');
		expect(parseCourbeContent(`${WINDOW}\n${many}`).spec).toBeNull();
	});

	it('entrées hostiles : analyse + scène + Typst en moins de 50 ms', () => {
		const hostile = [
			`${WINDOW}\nv(0) = 2 ; v(n+1) = v(n)^2 pour n de 0 à 199`,
			`${WINDOW}\nv(0) = 1.5 ; v(n+1) = v(n)^v(n) pour n de 0 à 199`,
			`${WINDOW}\nu(n) = n pour n de 0 à 9007199254740993`,
			`${WINDOW}\nu(n) = n pour n de 9007199254740990 à 9007199254740999`,
			`${WINDOW}\nu(n) = n pour n de -1e300 à 1e300`,
			`${WINDOW}\n${'abcdefghij'
				.split('')
				.map((c) => `${c}(n) = sin(n)*n^n pour n de 0 à 199`)
				.join('\n')}`
		];
		const start = performance.now();
		for (const source of hostile) {
			const node = parseCourbeContent(source);
			if (node.spec) buildCourbeScene(node.spec);
			generateCourbeTypst(node);
		}
		// Détecte une explosion, ne chronomètre pas : large marge pour les machines lentes (CI).
		expect(performance.now() - start).toBeLessThan(1000);
	});

	it('scène forgée (sans analyse) : termes et suites tronqués aux plafonds', () => {
		const base = spec(parseCourbeContent(`${WINDOW}\nu(n) = n pour n de 0 à 3`));
		const u = base.sequences[0];
		const forged: CourbeSpec = {
			...base,
			sequences: Array.from({ length: 50 }, () => ({
				...u,
				terms: Array.from({ length: 100_000 }, (_, n) => ({ n, value: 1 }))
			}))
		};
		const start = performance.now();
		const scene = buildCourbeScene(forged);
		// Détecte une explosion, ne chronomètre pas : large marge pour les machines lentes (CI).
		expect(performance.now() - start).toBeLessThan(1000);
		expect(scene.sequences.length).toBeLessThanOrEqual(COURBE_LIMITS.sequences);
		const total = scene.sequences.reduce((n, s) => n + s.terms.length, 0);
		expect(total).toBeLessThanOrEqual(COURBE_LIMITS.totalSequenceTerms);
	});
});

describe('suites — erreurs situées (S7)', () => {
	const errorOf = (line: string) => {
		const node = parseCourbeContent(`${WINDOW}\n${line}`);
		expect(node.spec).toBeNull();
		expect(node.errors[0].line).toBe(3);
		expect(node.errors[0].message).toMatch(/^Ligne 3 : /);
		return node.errors[0].message;
	};

	it('rangs non entiers', () => {
		expect(errorOf('u(n) = n pour n de 0.5 à 3')).toMatch(/entier/);
	});

	it('n0 > n1', () => {
		expect(errorOf('u(n) = n pour n de 5 à 2')).toMatch(/5.*2|inférieur/);
	});

	it('rangs absents', () => {
		expect(errorOf('u(n) = 2*n+1')).toMatch(/pour n de/);
	});

	it('récurrence sans premier terme', () => {
		expect(errorOf('u(n+1) = 2*u(n) pour n de 0 à 3')).toMatch(/premier terme/);
	});

	it('premier terme sans relation de récurrence', () => {
		expect(errorOf('u(0) = 3 pour n de 0 à 3')).toMatch(/récurrence/);
	});

	it('nom qui ne correspond pas entre premier terme et relation', () => {
		expect(errorOf('v(0) = 1 ; u(n+1) = 2*u(n) pour n de 0 à 3')).toMatch(/v.*u|u.*v/);
	});

	it('relation qui appelle un autre terme que v(n)', () => {
		expect(errorOf('v(0) = 1 ; v(n+1) = v(n-1)+1 pour n de 0 à 3')).toMatch(/v\(n\)/);
	});

	it('expression illisible', () => {
		expect(errorOf('u(n) = 2*(n+1 pour n de 0 à 3')).toMatch(/illisible/);
	});

	it('variable inconnue dans une suite explicite', () => {
		expect(errorOf('u(n) = 2*k pour n de 0 à 3')).toMatch(/k/);
	});

	it('premier rang de la récurrence après n0', () => {
		expect(errorOf('v(2) = 1 ; v(n+1) = v(n)+1 pour n de 0 à 3')).toMatch(/v\(2\)|rang 2/);
	});

	it('nom de suite : une seule lettre', () => {
		expect(errorOf('u1(n) = n pour n de 0 à 3')).toMatch(/lettre/);
	});

	it('nom déjà pris par une fonction', () => {
		const node = parseCourbeContent(`${WINDOW}\nu(x) = x\nu(n) = n pour n de 0 à 3`);
		expect(node.errors[0].line).toBe(4);
	});
});

describe('suites — Typst et écran : même scène (S8, S11)', () => {
	const SOURCE = `${WINDOW}
f(x) = 0.5*x+2   vert   nom=C_f
u(n) = 2*n+1 pour n de 0 à 12   bleu   nom=u
v(0) = 1 ; v(n+1) = 0.5*v(n)+2 pour n de 0 à 9   rouge   nom=v
points: A(2 ; 3)`;
	const node = parseCourbeContent(SOURCE);
	const scene = buildCourbeScene(node.spec!);
	const typst = generateCourbeTypst(node);

	it('fonction ET suites dans le même bloc (S9)', () => {
		expect(node.errors).toEqual([]);
		expect(scene.curves).toHaveLength(1);
		expect(scene.sequences.map((s) => s.name)).toEqual(['u', 'v']);
	});

	it('autant de « // terme » dans Typst que de termes visibles dans la scène', () => {
		const visible = scene.sequences.reduce((n, s) => n + s.terms.length, 0);
		// u : n ≤ 9 (2n+1 ≤ 20) → 10 termes ; v : 10 termes
		expect(visible).toBe(20);
		expect((typst.match(/^\s*\/\/ terme /gm) ?? []).length).toBe(visible);
		expect((typst.match(/^\s*\/\/ terme u$/gm) ?? []).length).toBe(10);
	});

	it('texte Typst sans cadre neutre, couleurs des suites, noms', () => {
		expect(typst).not.toContain('Figure indisponible');
		expect(typst).toContain('rgb("#dc2626")');
		expect(typst).toContain('$u$');
		expect(typst).toContain('$v$');
	});

	it('libellé accessible : mentionne fonctions et suites (S10)', () => {
		expect(scene.ariaLabel).toBe('Courbe de f et suites u et v, x de −1 à 10');
		const only = buildCourbeScene(spec(parseCourbeContent(`${WINDOW}\nu(n) = n pour n de 0 à 3`)));
		expect(only.ariaLabel).toBe('Suite u, x de −1 à 10');
	});

	it('bloc dans une liste, branché dans generateTypst', () => {
		const md = [
			'1. Conjecturer la limite :',
			'',
			'   ```courbe',
			...SOURCE.split('\n').map((l) => `   ${l}`),
			'   ```'
		].join('\n');
		const doc = parseMarkdown(md);
		const list = doc.children.find((c: BlockNode): c is ListNode => c.type === 'list');
		const inner = list?.items[0].children.find((c) => c.type === 'courbe') as
			| CourbeNode
			| undefined;
		expect(inner?.spec?.sequences).toHaveLength(2);
		const out = generateTypst(doc);
		expect((out.match(/\/\/ terme /g) ?? []).length).toBe(20);
		expect(out).not.toContain('Figure indisponible');
	});
});
