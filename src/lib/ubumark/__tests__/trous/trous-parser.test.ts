/**
 * Bloc ```trous — texte à trous à étiquettes (chantier `docs/wip/trous-etiquettes-progress.md`)
 * ===========================================================================================
 *
 * Le prof écrit son texte, chaque trou étant sa bonne étiquette entre crochets
 * (`[arithmétique]`, `[$r$]`), hors formule ; en dernière ligne, `intrus: a ; b`.
 * `case: N` est posée par le générateur, qui réécrit le bloc avec des trous vides
 * (`[]`) et la réserve dans l'ordre affiché (`étiquettes: …`).
 */
import { describe, it, expect } from 'vitest';
import {
	findTrousBlocks,
	findTrousToPlace,
	hasTrousToPlace,
	parseTrousBody,
	parseTrousContent,
	replaceTrousBlocks,
	serializeTrousBlock
} from '$lib/ubumark/parser/trous-parser';
import { displayedTrousLabels, trousPieces } from '$lib/ubumark/utils/trous';
import { parseMarkdown } from '$lib/ubumark';

const block = (...body: string[]) => ['```trous', ...body, '```'].join('\n');

const SUITES = [
	'Une suite définie par $u_{n+1} = u_n + r$ est [arithmétique], de raison [$r$].',
	'Une suite définie par $u_{n+1} = q \\times u_n$ est [géométrique], de raison [$q$].',
	'intrus: croissante ; $u_0$'
];

describe('lecture du corps d’un bloc trous', () => {
	it('nominal : texte coupé aux trous, étiquettes une fois chacune, intrus en dernier', () => {
		const spec = parseTrousBody(SUITES);
		expect(spec.errors).toEqual([]);
		expect(spec.labels).toEqual([
			'arithmétique',
			'$r$',
			'géométrique',
			'$q$',
			'croissante',
			'$u_0$'
		]);
		expect(spec.answers).toEqual([0, 1, 2, 3]);
		expect(spec.lines).toEqual([
			[
				{ kind: 'text', text: 'Une suite définie par $u_{n+1} = u_n + r$ est ' },
				{ kind: 'hole', hole: 0 },
				{ kind: 'text', text: ', de raison ' },
				{ kind: 'hole', hole: 1 },
				{ kind: 'text', text: '.' }
			],
			[
				{ kind: 'text', text: 'Une suite définie par $u_{n+1} = q \\times u_n$ est ' },
				{ kind: 'hole', hole: 2 },
				{ kind: 'text', text: ', de raison ' },
				{ kind: 'hole', hole: 3 },
				{ kind: 'text', text: '.' }
			]
		]);
	});

	it('deux trous à la même étiquette : montrée une fois', () => {
		const spec = parseTrousBody([
			'$2$ est [pair], $4$ est [pair], $7$ est [impair].',
			'intrus: premier'
		]);
		expect(spec.errors).toEqual([]);
		expect(spec.labels).toEqual(['pair', 'impair', 'premier']);
		expect(spec.answers).toEqual([0, 0, 1]);
	});

	it('un crochet dans une formule n’est pas un trou', () => {
		const spec = parseTrousBody([
			'Sur $[0 ; 1]$, $f$ est [croissante].',
			'intrus: décroissante ; constante'
		]);
		expect(spec.errors).toEqual([]);
		expect(spec.answers).toEqual([0]);
		expect(spec.lines[0][0]).toEqual({ kind: 'text', text: 'Sur $[0 ; 1]$, $f$ est ' });
	});

	it('une formule avec des crochets dans une étiquette', () => {
		const spec = parseTrousBody([
			'$f$ est croissante sur [$[0 ; 1]$].',
			'intrus: $[1 ; 2]$ ; $\\R$'
		]);
		expect(spec.errors).toEqual([]);
		expect(spec.labels).toEqual(['$[0 ; 1]$', '$[1 ; 2]$', '$\\R$']);
	});

	it('gras et lignes vides : le texte garde son markdown, les lignes vides sont ignorées', () => {
		const spec = parseTrousBody([
			'**Une** suite est [arithmétique].',
			'',
			'Ou [géométrique].',
			'intrus: x'
		]);
		expect(spec.errors).toEqual([]);
		expect(spec.lines).toHaveLength(2);
		expect(spec.lines[0][0]).toEqual({ kind: 'text', text: '**Une** suite est ' });
	});

	it('forme d’instance : trous vides et réserve dans l’ordre écrit par `étiquettes:`', () => {
		const spec = parseTrousBody(['case: 2', 'A [] et B [].', 'étiquettes: y ; x ; z']);
		expect(spec.errors).toEqual([]);
		expect(spec.caseIndex).toBe(2);
		expect(spec.labels).toEqual(['y', 'x', 'z']);
		expect(spec.answers).toEqual([null, null]);
	});
});

describe('erreurs (message au prof)', () => {
	const errorsOf = (...body: string[]) => parseTrousBody(body).errors.join(' | ');

	it('aucun trou', () => {
		expect(errorsOf('Un texte sans trou.', 'intrus: a ; b ; c')).toMatch(/aucun trou/);
	});

	it('plus de 10 trous', () => {
		const holes = Array.from({ length: 11 }, (_, k) => `[e${k % 3}]`).join(' ');
		expect(errorsOf(holes)).toMatch(/au plus 10 trous/);
	});

	it('trou vide []', () => {
		expect(errorsOf('A [x] et B [].', 'intrus: y ; z')).toMatch(/trou 2 est vide/);
	});

	it('plus de 12 étiquettes différentes', () => {
		const holes = Array.from({ length: 10 }, (_, k) => `[e${k}]`).join(' ');
		expect(errorsOf(holes, 'intrus: f ; g ; h')).toMatch(/au plus 12 étiquettes différentes/);
	});

	it('moins de 3 étiquettes différentes', () => {
		expect(errorsOf('A [x] et B [y].')).toMatch(/au moins 3 étiquettes différentes/);
	});

	it('[_] ou ? en formule : une autre case', () => {
		expect(errorsOf('A [x] et [_].', 'intrus: y ; z')).toMatch(/pas de case \[_\]/);
		expect(errorsOf('A [x] et $1 + ? = 2$.', 'intrus: y ; z')).toMatch(/pas de case/);
	});

	it('un bloc dans le texte', () => {
		expect(errorsOf('A [x].', '```courbe', 'f(x) = x', 'intrus: y ; z')).toMatch(
			/pas de bloc dans le texte/
		);
	});

	it('crochet non fermé : un intervalle s’écrit en formule', () => {
		expect(errorsOf('Sur ]2 ; 3[, f est [croissante].', 'intrus: a ; b')).toMatch(
			/crochet « \[ » sans « \] »/
		);
	});

	it('intrus: ailleurs qu’en dernière ligne', () => {
		expect(errorsOf('intrus: a ; b', 'A [x].')).toMatch(/intrus: va sur la dernière ligne/);
	});

	it('« ; » hors formule dans une étiquette', () => {
		expect(errorsOf('A [x ; y].', 'intrus: a ; b')).toMatch(/« ; »/);
	});

	it('étiquettes: avec un trou rempli', () => {
		expect(errorsOf('A [x].', 'étiquettes: x ; y ; z')).toMatch(/trous restent vides/);
	});
});

describe('repérage des blocs', () => {
	it('blocs du premier niveau ; cité : nested', () => {
		const md = ['Texte', block(...SUITES), '', '> ```trous', '> A [x].', '> ```'].join('\n');
		const found = findTrousToPlace(md);
		expect(found.map((b) => b.nested)).toEqual([false, true]);
		expect(found[0].body).toEqual(SUITES);
		expect(hasTrousToPlace(md)).toBe(true);
		expect(findTrousBlocks(md.split('\n'))).toHaveLength(1);
	});

	it('réécriture et sérialisation de l’instance', () => {
		const spec = parseTrousBody(SUITES);
		const written = serializeTrousBlock({
			caseIndex: 4,
			lines: spec.lines,
			labels: ['$q$', 'croissante', 'arithmétique', '$u_0$', '$r$', 'géométrique']
		});
		expect(written).toBe(
			[
				'```trous',
				'case: 4',
				'Une suite définie par $u_{n+1} = u_n + r$ est [], de raison [].',
				'Une suite définie par $u_{n+1} = q \\times u_n$ est [], de raison [].',
				'étiquettes: $q$ ; croissante ; arithmétique ; $u_0$ ; $r$ ; géométrique',
				'```'
			].join('\n')
		);
		const back = parseTrousContent(written.split('\n').slice(1, -1).join('\n'));
		expect(back.errors).toEqual([]);
		expect(back.answers).toEqual([null, null, null, null]);
		expect(displayedTrousLabels(back)).toEqual(back.labels);
		const replaced = replaceTrousBlocks(`Avant\n${block(...SUITES)}\nAprès`, () => 'X');
		expect(replaced).toBe('Avant\nX\nAprès');
	});

	it('hors question : la réserve est mélangée, jamais dans l’ordre écrit', () => {
		const spec = parseTrousBody(SUITES);
		const shown = displayedTrousLabels(spec);
		expect([...shown].sort()).toEqual([...spec.labels].sort());
		expect(shown).not.toEqual(spec.labels);
	});

	it('parseMarkdown : un nœud trous, même dans un item de liste', () => {
		const node = parseMarkdown(block(...SUITES)).children[0];
		expect(node.type).toBe('trous');
		const list = parseMarkdown(
			['- Question', '', '  ```trous', '  A [x], B [y].', '  intrus: z', '  ```'].join('\n')
		);
		const item = list.children[0];
		expect(item.type).toBe('list');
		expect(JSON.stringify(item)).toContain('"type":"trous"');
	});

	it('bloc non fermé : signalé', () => {
		const node = parseMarkdown(['```trous', 'A [x], B [y].', 'intrus: z'].join('\n')).children[0];
		expect(node.type).toBe('trous');
		if (node.type !== 'trous') return;
		expect(node.errors.join(' ')).toMatch(/bloc non fermé/);
	});
});

describe('écran : la ponctuation suit le trou', () => {
	it('« [x]. » : le point passe dans le trou, jamais seul en début de ligne', () => {
		const { lines } = parseTrousBody(['A [x], puis [y].', 'intrus: z']);
		expect(trousPieces(lines[0])).toEqual([
			{ kind: 'text', text: 'A ' },
			{ kind: 'hole', hole: 0, glue: ',' },
			{ kind: 'text', text: ' puis ' },
			{ kind: 'hole', hole: 1, glue: '.' }
		]);
	});
});
