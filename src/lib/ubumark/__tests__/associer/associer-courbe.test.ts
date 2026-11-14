/**
 * Bloc ```associer, lot 2 — un bloc ```courbe dans un élément
 * ===========================================================
 *
 * Chantier `docs/wip/associer-progress.md`, phase 0 du lot 2 : la suite d'un élément
 * en retrait de 2 espaces (comme ```choix), lien `-> étiquette` sur sa dernière ligne,
 * clôture ```` du bloc associer dès qu'un élément contient un bloc.
 */
import { describe, it, expect } from 'vitest';
import {
	findAssocierBlocks,
	findAssociersToPlace,
	parseAssocierBody,
	parseAssocierContent,
	replaceAssocierBlocks,
	serializeAssocierBlock
} from '$lib/ubumark/parser/associer-parser';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';
import type { AssocierNode } from '$lib/ubumark/types/associer';

const COURBES = [
	'- ```courbe',
	'  x: -3 ; 3',
	'  y: -3 ; 3',
	'  f(x) = 2x + 1',
	'  ```',
	'  -> $x \\mapsto 2x + 1$',
	'- ```courbe',
	'  x: -3 ; 3',
	'  y: -3 ; 3',
	'  f(x) = -x + 3',
	'  ```',
	'  -> $x \\mapsto -x + 3$',
	'- ```courbe',
	'  x: -3 ; 3',
	'  y: -3 ; 3',
	'  f(x) = x^2',
	'  ```',
	'  -> $x \\mapsto x^2$',
	'- -> $x \\mapsto x + 3$'
];
const block = (...body: string[]) => ['````associer', ...body, '````'].join('\n');

describe('courbe dans un élément : lecture', () => {
	it('nominal : l’élément est le bloc (retrait retiré), le lien vient de la dernière ligne', () => {
		const spec = parseAssocierBody(COURBES);
		expect(spec.errors).toEqual([]);
		expect(spec.items).toEqual([
			'```courbe\nx: -3 ; 3\ny: -3 ; 3\nf(x) = 2x + 1\n```',
			'```courbe\nx: -3 ; 3\ny: -3 ; 3\nf(x) = -x + 3\n```',
			'```courbe\nx: -3 ; 3\ny: -3 ; 3\nf(x) = x^2\n```'
		]);
		expect(spec.labels).toEqual([
			'$x \\mapsto 2x + 1$',
			'$x \\mapsto -x + 3$',
			'$x \\mapsto x^2$',
			'$x \\mapsto x + 3$'
		]);
		expect(spec.answers).toEqual([0, 1, 2]);
	});

	it('texte sur la première ligne, bloc en dessous', () => {
		const spec = parseAssocierBody([
			'- Courbe A',
			'  ```courbe',
			'  f(x) = 2x',
			'  ```',
			'  -> linéaire',
			'- $x^2$ -> carré',
			'- -> affine'
		]);
		expect(spec.errors).toEqual([]);
		expect(spec.items[0]).toBe('Courbe A\n```courbe\nf(x) = 2x\n```');
		expect(spec.answers).toEqual([0, 1]);
	});

	it('un « -> » dans le bloc n’est pas le lien', () => {
		const spec = parseAssocierBody([
			'- ```courbe',
			'  f(x) = 1/x',
			'  légende: f -> 0',
			'  ```',
			'  -> inverse',
			'- $x$ -> identité',
			'- -> carré'
		]);
		expect(spec.errors).toEqual([]);
		expect(spec.items[0]).toBe('```courbe\nf(x) = 1/x\nlégende: f -> 0\n```');
	});

	it('bloc dans un énoncé : clôture ````, lu par le parseur markdown', () => {
		const md = `Associer chaque courbe à sa fonction.\n\n${block(...COURBES)}\n\nFin.`;
		expect(findAssocierBlocks(md.split('\n'))).toEqual([
			{ startIndex: 2, endIndex: 22, fence: '````', closed: true }
		]);
		const node = parseMarkdown(md).children.find((n) => n.type === 'associer') as AssocierNode;
		expect(node.errors).toEqual([]);
		expect(node.items).toHaveLength(3);
		expect(parseMarkdown(md).children.at(-1)?.type).toBe('paragraph');
	});

	it('findAssociersToPlace garde le retrait des lignes de suite', () => {
		const [found] = findAssociersToPlace(block(...COURBES));
		expect(found.nested).toBe(false);
		expect(parseAssocierContent(found.body.join('\n')).errors).toEqual([]);
	});
});

describe('courbe dans un élément : réécriture d’instance', () => {
	it('sans liens, suite en retrait, clôture ````, relue à l’identique', () => {
		const spec = parseAssocierBody(COURBES);
		const written = serializeAssocierBlock({
			caseIndex: 0,
			gesture: 'relier',
			items: spec.items,
			labels: spec.labels
		});
		expect(written.split('\n').slice(0, 9)).toEqual([
			'````associer',
			'case: 0',
			'- ```courbe',
			'  x: -3 ; 3',
			'  y: -3 ; 3',
			'  f(x) = 2x + 1',
			'  ```',
			'  ->',
			'- ```courbe'
		]);
		expect(written.split('\n').at(-1)).toBe('````');
		const reread = parseAssocierContent(written.split('\n').slice(1, -1).join('\n'));
		expect(reread.errors).toEqual([]);
		expect(reread.items).toEqual(spec.items);
		expect(reread.labels).toEqual(spec.labels);
		expect(reread.answers).toEqual([null, null, null]);
	});

	it('replaceAssocierBlocks remplace tout le bloc ````', () => {
		const md = `Avant\n${block(...COURBES)}\nAprès`;
		expect(replaceAssocierBlocks(md, () => 'X')).toBe('Avant\nX\nAprès');
	});
});

describe('courbe dans un élément : erreurs', () => {
	const errorsOf = (...body: string[]) => parseAssocierBody(body).errors.join(' | ');

	it('bloc autre que courbe', () => {
		expect(errorsOf('- ```figure', '  A(0;0)', '  ```', '  -> a', '- b -> b', '- -> c')).toMatch(
			/seul un bloc ```courbe/
		);
	});

	it('courbe à geste (placer:, tracer:)', () => {
		expect(
			errorsOf('- ```courbe', '  placer: A=(1;2)', '  ```', '  -> a', '- b -> b', '- -> c')
		).toMatch(/pas de placer: ni de tracer:/);
	});

	it('bloc dans une étiquette ou un intrus', () => {
		expect(errorsOf('- a -> a', '- b -> b', '- ->', '  ```courbe', '  f(x) = x', '  ```')).toMatch(
			/pas de bloc dans une étiquette/
		);
	});

	it('élément à bloc sans lien en fin de suite', () => {
		expect(errorsOf('- ```courbe', '  f(x) = x', '  ```', '- b -> b', '- -> c', '- -> d')).toMatch(
			/n’a pas d’étiquette/
		);
	});

	it('plus de 6 éléments dès qu’un élément contient un bloc', () => {
		const courbe = (k: number) => ['- ```courbe', `  f(x) = ${k}x`, '  ```', `  -> e${k}`];
		const body = [1, 2, 3, 4, 5, 6, 7].flatMap(courbe);
		expect(parseAssocierBody(body).errors.join(' | ')).toMatch(/au plus 6 éléments/);
		expect(parseAssocierBody([1, 2, 3, 4, 5, 6].flatMap(courbe)).errors).toEqual([]);
	});

	it('bloc associer à ``` alors qu’un élément contient un bloc', () => {
		const md = ['```associer', ...COURBES, '```'].join('\n');
		const node = parseMarkdown(md).children.find((n) => n.type === 'associer') as AssocierNode;
		expect(node.errors.join(' | ')).toMatch(/````associer/);
	});
});

describe('courbe dans un élément : PDF', () => {
	it('la courbe dessinée à gauche, numérotée, le point en face', () => {
		const typst = generateTypst(parseMarkdown(block(...COURBES)));
		expect(typst).toContain('*1.*');
		expect(typst).toContain('*3.*');
		expect(typst).not.toContain('```courbe');
		expect(typst).toContain('[•]');
		expect(typst).not.toContain('Figure indisponible');
	});
});
