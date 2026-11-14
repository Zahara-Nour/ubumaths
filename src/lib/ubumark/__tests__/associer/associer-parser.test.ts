/**
 * Bloc ```associer — associer deux colonnes (chantier `docs/wip/associer-progress.md`)
 * ===================================================================================
 *
 * Le prof écrit `- élément -> étiquette`, un intrus `- -> étiquette` ; une étiquette
 * partagée n'est montrée qu'une fois. `case: N` est posée par le générateur, qui
 * réécrit le bloc sans les liens, étiquettes dans l'ordre affiché.
 */
import { describe, it, expect } from 'vitest';
import {
	findAssocierBlocks,
	findAssociersToPlace,
	hasAssocierToPlace,
	parseAssocierBody,
	parseAssocierContent,
	replaceAssocierBlocks,
	serializeAssocierBlock
} from '$lib/ubumark/parser/associer-parser';
import { displayedAssocierLabels, displayedOrder } from '$lib/ubumark/utils/associer';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';

const block = (...body: string[]) => ['```associer', ...body, '```'].join('\n');

const SUITES = [
	'- $u_{n+1} = u_n + 3$ -> arithmétique',
	'- $u_{n+1} = 2u_n$ -> géométrique',
	'- $u_n = 5 + 2n$ -> arithmétique',
	"- -> ni l'une ni l'autre"
];

describe('lecture du corps d’un bloc associer', () => {
	it('nominal : éléments, étiquettes une fois chacune, intrus, bonne étiquette de chaque élément', () => {
		const spec = parseAssocierBody(SUITES);
		expect(spec).toEqual({
			items: ['$u_{n+1} = u_n + 3$', '$u_{n+1} = 2u_n$', '$u_n = 5 + 2n$'],
			labels: ['arithmétique', 'géométrique', "ni l'une ni l'autre"],
			answers: [0, 1, 0],
			errors: []
		});
	});

	it('correspondance un à un', () => {
		const spec = parseAssocierBody(['- a -> 1', '- b -> 2', '- c -> 3']);
		expect(spec.answers).toEqual([0, 1, 2]);
		expect(spec.errors).toEqual([]);
	});

	it('case: N lue ; instance : éléments sans lien, étiquettes dans l’ordre donné', () => {
		const spec = parseAssocierBody(['case: 4', '- a ->', '- b ->', '- -> 3', '- -> 1', '- -> 2']);
		expect(spec.caseIndex).toBe(4);
		expect(spec.items).toEqual(['a', 'b']);
		expect(spec.labels).toEqual(['3', '1', '2']);
		expect(spec.answers).toEqual([null, null]);
		expect(spec.errors).toEqual([]);
	});

	it('erreur : élément sans étiquette dans le bloc du prof', () => {
		const spec = parseAssocierBody(['- a -> 1', '- b ->', '- c -> 3', '- -> 4']);
		expect(spec.errors.join(' ')).toContain('l’élément 2 (« b ») n’a pas d’étiquette');
	});

	it('erreur : ligne sans « -> »', () => {
		const spec = parseAssocierBody(['- a -> 1', '- b', '- c -> 3', '- -> 4']);
		expect(spec.errors.join(' ')).toContain('« - b » : écrire « - élément -> étiquette »');
	});

	it('erreur : moins de 2 éléments, plus de 8', () => {
		expect(parseAssocierBody(['- a -> 1', '- -> 2', '- -> 3']).errors[0]).toContain(
			'au moins 2 éléments'
		);
		const many = Array.from({ length: 9 }, (_, k) => `- e${k} -> ${k % 3}`);
		expect(parseAssocierBody(many).errors[0]).toContain('au plus 8 éléments');
	});

	it('erreur : moins de 3 étiquettes différentes (la réponse se devinerait), plus de 10', () => {
		expect(parseAssocierBody(['- a -> 1', '- b -> 2']).errors[0]).toContain(
			'au moins 3 étiquettes différentes'
		);
		const intrus = Array.from({ length: 9 }, (_, k) => `- -> i${k}`);
		expect(parseAssocierBody(['- a -> 1', '- b -> 2', ...intrus]).errors[0]).toContain(
			'au plus 10 étiquettes'
		);
	});

	it('erreur : deux éléments identiques', () => {
		const spec = parseAssocierBody(['- a -> 1', '- a -> 2', '- -> 3']);
		expect(spec.errors.join(' ')).toContain('les éléments 1 et 2 sont identiques');
	});

	it('erreur : une case [_] dans un élément', () => {
		const spec = parseAssocierBody(['- a [_] -> 1', '- b -> 2', '- -> 3']);
		expect(spec.errors.join(' ')).toContain('pas de case [_]');
	});

	it('erreur : réglage inconnu, ligne sans tiret', () => {
		expect(parseAssocierBody(['melanger: non', ...SUITES]).errors.join(' ')).toContain(
			'réglage « melanger » inconnu'
		);
		expect(parseAssocierBody([...SUITES, 'texte']).errors.join(' ')).toContain(
			'une ligne commence par « - »'
		);
	});
});

describe('blocs d’un énoncé', () => {
	it('repère les blocs, en retrait ou non', () => {
		const text = ['Associe :', '', block(...SUITES), '', '> ' + '```associer'].join('\n');
		expect(findAssocierBlocks(text.split('\n'))).toEqual([
			{ startIndex: 2, endIndex: 7, closed: true }
		]);
		expect(hasAssocierToPlace(text)).toBe(true);
		const nested = findAssociersToPlace(
			['- item', '  ```associer', '  - a -> 1', '  ```'].join('\n')
		);
		expect(nested[0].nested).toBe(true);
	});

	it('réécriture d’instance : sans liens, étiquettes dans l’ordre donné, relue à l’identique', () => {
		const text = ['Avant', block(...SUITES), 'Après'].join('\n');
		const out = replaceAssocierBlocks(text, (b) =>
			serializeAssocierBlock({ caseIndex: 2, items: b.items, labels: [...b.labels].reverse() })
		);
		expect(out).toBe(
			[
				'Avant',
				'```associer',
				'case: 2',
				'- $u_{n+1} = u_n + 3$ ->',
				'- $u_{n+1} = 2u_n$ ->',
				'- $u_n = 5 + 2n$ ->',
				"- -> ni l'une ni l'autre",
				'- -> géométrique',
				'- -> arithmétique',
				'```',
				'Après'
			].join('\n')
		);
		const node = parseMarkdown(out).children.find((c) => c.type === 'associer');
		expect(node).toMatchObject({
			type: 'associer',
			caseIndex: 2,
			labels: ["ni l'une ni l'autre", 'géométrique', 'arithmétique'],
			answers: [null, null, null],
			errors: []
		});
	});
});

describe('ordre affiché', () => {
	it('dans une question : tel quel ; hors question : mélange fixe, jamais l’ordre écrit', () => {
		const inQuestion = parseAssocierContent(
			['case: 0', '- a ->', '- b ->', '- -> x', '- -> y', '- -> z'].join('\n')
		);
		expect(displayedAssocierLabels(inQuestion)).toEqual(['x', 'y', 'z']);
		const free = parseAssocierContent(SUITES.join('\n'));
		const order = displayedOrder(free);
		expect(order).not.toEqual([0, 1, 2]);
		expect([...order].sort()).toEqual([0, 1, 2]);
		expect(displayedOrder(free)).toEqual(order);
	});
});

describe('PDF (Typst)', () => {
	it('deux colonnes à relier : éléments et points à gauche, points et étiquettes affichées à droite', () => {
		const typst = generateTypst(
			parseMarkdown(block('case: 0', '- a ->', '- b ->', '- -> z', '- -> x', '- -> y'))
		);
		expect(typst).toContain('grid(columns: (auto, auto, 2.5cm, auto, auto)');
		const grid = typst.split('\n').find((line) => line.includes('2.5cm')) ?? '';
		const cells = [...grid.matchAll(/\[([^\]]*)\]/g)].map((m) => m[1].trim());
		expect(cells).toEqual(['a', '•', '', '•', 'z', 'b', '•', '', '•', 'x', '', '', '', '•', 'y']);
	});

	it('bloc mal écrit : rien', () => {
		expect(generateTypst(parseMarkdown(block('- a -> 1')))).not.toContain('grid(');
	});
});
