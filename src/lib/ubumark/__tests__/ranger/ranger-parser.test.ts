/**
 * Bloc ```ranger — étiquettes à ranger (chantier `docs/wip/reponses-a-placer-progress.md` § 21, 22)
 * =================================================================================================
 *
 * Le prof écrit les étiquettes DANS LE BON ORDRE, une par ligne `- …` ; `signe: <`
 * (défaut) ou `signe: >`. `case: N` est posée par le générateur. Le tirage mélange
 * les étiquettes : jamais déjà rangées, ni à l'envers (dès 3 étiquettes).
 */
import { describe, it, expect } from 'vitest';
import {
	findRangerBlocks,
	findRangersToPlace,
	hasRangerToPlace,
	parseRangerBody,
	parseRangerContent,
	replaceRangerBlocks,
	serializeRangerBlock
} from '$lib/ubumark/parser/ranger-parser';
import { rangerOrder } from '$lib/ubumark/utils/ranger';
import { parseMarkdown } from '$lib/ubumark';
import { createRandomSource } from '$lib/utils/random';

const block = (...body: string[]) => ['```ranger', ...body, '```'].join('\n');

describe('lecture du corps d’un bloc ranger', () => {
	it('nominal : trois étiquettes, signe < par défaut', () => {
		const spec = parseRangerBody(['- $\\frac{2}{7}$', '- $\\frac{3}{7}$', '- $\\frac{6}{7}$']);
		expect(spec).toEqual({
			sign: '<',
			labels: ['$\\frac{2}{7}$', '$\\frac{3}{7}$', '$\\frac{6}{7}$'],
			errors: []
		});
	});

	it('signe: > (ordre décroissant)', () => {
		const spec = parseRangerBody(['signe: >', '- 9', '- 5', '- 1']);
		expect(spec.sign).toBe('>');
		expect(spec.errors).toEqual([]);
	});

	it('case: N lue (posée par le générateur)', () => {
		expect(parseRangerBody(['case: 4', '- a', '- b']).caseIndex).toBe(4);
	});

	it('lignes vides tolérées entre les étiquettes', () => {
		expect(parseRangerBody(['- 1', '', '- 2']).labels).toEqual(['1', '2']);
	});

	it('moins de 2 étiquettes : refusé', () => {
		expect(parseRangerBody(['- 1']).errors).toContain(
			'au moins 2 étiquettes (une ligne « - … » par étiquette)'
		);
	});

	it('plus de 8 étiquettes : refusé', () => {
		const nine = Array.from({ length: 9 }, (_, k) => `- ${k}`);
		expect(parseRangerBody(nine).errors).toContain('au plus 8 étiquettes');
	});

	it('deux étiquettes au texte identique : refusé (laquelle va où ?)', () => {
		expect(parseRangerBody(['- 3', '- 5', '- 3']).errors).toContain(
			'les étiquettes 1 et 3 sont identiques (« 3 ») : on ne saurait pas laquelle va où'
		);
	});

	it('étiquette vide : refusée', () => {
		expect(parseRangerBody(['- 1', '-', '- 2']).errors).toContain('l’étiquette 2 est vide');
	});

	it('signe inconnu : refusé', () => {
		expect(parseRangerBody(['signe: =', '- 1', '- 2']).errors).toContain(
			'signe: écrire < (croissant) ou > (décroissant)'
		);
	});

	it('réglage inconnu : refusé', () => {
		expect(parseRangerBody(['ordre: croissant', '- 1', '- 2']).errors).toContain(
			'réglage « ordre » inconnu (signe)'
		);
	});

	it('ligne qui n’est pas une étiquette : refusée', () => {
		expect(parseRangerBody(['- 1', 'deux', '- 3']).errors).toContain(
			'ligne « deux » : une étiquette commence par « - »'
		);
	});
});

describe('repérage des blocs ranger', () => {
	it('bloc fermé, au premier niveau', () => {
		const lines = ['Range.', '```ranger', '- 1', '- 2', '```', 'Fin'];
		expect(findRangerBlocks(lines)).toEqual([{ startIndex: 1, endIndex: 4, closed: true }]);
	});

	it('bloc non fermé : jusqu’à la fin du texte', () => {
		expect(findRangerBlocks(['```ranger', '- 1', '- 2'])).toEqual([
			{ startIndex: 0, endIndex: 2, closed: false }
		]);
	});

	it('à placer : tout bloc ranger, en retrait ou cité signalé', () => {
		const statement = `Range.\n\n${block('- 1', '- 2')}\n\n> \`\`\`ranger\n> - 3\n> - 4\n> \`\`\``;
		const found = findRangersToPlace(statement);
		expect(found).toEqual([
			{ startIndex: 2, body: ['- 1', '- 2'], closed: true, nested: false },
			{ startIndex: 7, body: ['- 3', '- 4'], closed: true, nested: true }
		]);
		expect(hasRangerToPlace(statement)).toBe(true);
		expect(hasRangerToPlace('Rien à ranger.')).toBe(false);
	});
});

describe('nœud et réécriture', () => {
	it('parseMarkdown : nœud ranger', () => {
		const ast = parseMarkdown(`Range.\n\n${block('case: 0', 'signe: >', '- 9', '- 5')}`);
		const node = ast.children.find((c) => c.type === 'ranger');
		expect(node).toMatchObject({
			type: 'ranger',
			caseIndex: 0,
			sign: '>',
			labels: ['9', '5'],
			errors: []
		});
	});

	it('parseRangerContent : le texte entre les clôtures', () => {
		expect(parseRangerContent('- a\n- b')).toMatchObject({ labels: ['a', 'b'], sign: '<' });
	});

	it('bloc d’instance : case, signe s’il diffère du défaut, étiquettes dans l’ordre donné', () => {
		expect(serializeRangerBlock({ caseIndex: 2, sign: '<', labels: ['b', 'a'] })).toBe(
			block('case: 2', '- b', '- a')
		);
		expect(serializeRangerBlock({ caseIndex: 0, sign: '>', labels: ['1', '9'] })).toBe(
			block('case: 0', 'signe: >', '- 1', '- 9')
		);
	});

	it('replaceRangerBlocks : le reste du texte intact', () => {
		const text = `Avant\n${block('- 1', '- 2')}\nAprès`;
		expect(replaceRangerBlocks(text, (b) => `[${b.labels.join(',')}]`)).toBe('Avant\n[1,2]\nAprès');
	});
});

describe('mélange des étiquettes', () => {
	const isIdentity = (order: number[]) => order.every((v, k) => v === k);
	const isReverse = (order: number[]) => order.every((v, k) => v === order.length - 1 - k);

	it('jamais rangé ni à l’envers (3 à 8 étiquettes)', () => {
		for (let count = 3; count <= 8; count++) {
			for (let seed = 0; seed < 200; seed++) {
				const order = rangerOrder(count, createRandomSource(seed));
				expect([...order].sort((a, b) => a - b)).toEqual(
					Array.from({ length: count }, (_, k) => k)
				);
				expect(isIdentity(order)).toBe(false);
				expect(isReverse(order)).toBe(false);
			}
		}
	});

	it('2 étiquettes : jamais rangées (l’envers est le seul désordre)', () => {
		for (let seed = 0; seed < 50; seed++) {
			expect(rangerOrder(2, createRandomSource(seed))).toEqual([1, 0]);
		}
	});

	it('même graine, même mélange', () => {
		expect(rangerOrder(5, createRandomSource(7))).toEqual(rangerOrder(5, createRandomSource(7)));
	});
});
