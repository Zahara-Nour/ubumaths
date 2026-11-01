/**
 * Bloc ```horloge — analyse (phase 0 : `docs/wip/horloge-progress.md` § 4)
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown, type ListNode } from '$lib/ubumark';
import { parseHorlogeContent } from '$lib/ubumark/parser/horloge-parser';
import { resolveText } from '$lib/ubumark/parameterization/resolver/text-resolver';
import type { HorlogeNode } from '$lib/ubumark/types/horloge';

const doc = (...lines: string[]) => parseMarkdown(lines.join('\n')).children;

function horlogeOf(children: readonly { type: string }[]): HorlogeNode {
	const node = children.find((c) => c.type === 'horloge');
	expect(node, 'un nœud horloge attendu').toBeDefined();
	return node as HorlogeNode;
}

const parse = (...lines: string[]) => parseHorlogeContent(lines.join('\n'));
const messages = (node: HorlogeNode) => node.errors.map((e) => e.message);

describe('bloc ```horloge — cas nominaux', () => {
	it('heure entière : réglages par défaut (comportement 1)', () => {
		const node = horlogeOf(doc('```horloge', 'heure: 9 h', '```'));
		expect(node.errors).toEqual([]);
		expect(node.spec).toEqual({
			times: [{ hours: 9, minutes: 0 }],
			captions: null,
			numbers: 'tous',
			ticks: 'minutes',
			minuteHand: true,
			dial24: false,
			sizeCm: null
		});
	});

	it('heures et minutes (comportements 2, 3)', () => {
		expect(parse('heure: 9 h 30').spec?.times).toEqual([{ hours: 9, minutes: 30 }]);
		expect(parse('heure: 15 h 45').spec?.times).toEqual([{ hours: 15, minutes: 45 }]);
	});

	it('9 h 05, 9 h 5, 9h05, 9h5 : identiques (comportement 14)', () => {
		for (const text of ['9 h 05', '9 h 5', '9h05', '9h5', '9 h05', '9h 5']) {
			expect(parse(`heure: ${text}`).spec?.times, text).toEqual([{ hours: 9, minutes: 5 }]);
		}
	});

	it('0 h, 12 h, 23 h 59 : acceptés (comportements 10, 12)', () => {
		expect(parse('heure: 0 h').spec?.times).toEqual([{ hours: 0, minutes: 0 }]);
		expect(parse('heure: 12 h').spec?.times).toEqual([{ hours: 12, minutes: 0 }]);
		expect(parse('heure: 23 h 59').spec?.times).toEqual([{ hours: 23, minutes: 59 }]);
	});

	it('minutes non multiples de 5, graduations heures : accepté (comportement 11)', () => {
		const node = parse('heure: 9 h 42', 'graduations: heures');
		expect(node.errors).toEqual([]);
		expect(node.spec?.ticks).toBe('heures');
	});

	it('tous les réglages (comportements 4, 5, 6)', () => {
		const node = parse(
			'heure: 3 h',
			'chiffres: quarts',
			'graduations: aucune',
			'minutes: cachées',
			'cadran: 24',
			'taille: 2,5 cm'
		);
		expect(node.errors).toEqual([]);
		expect(node.spec).toMatchObject({
			numbers: 'quarts',
			ticks: 'aucune',
			minuteHand: false,
			dial24: true,
			sizeCm: 2.5
		});
		expect(parse('heure: 3 h', 'chiffres: aucun').spec?.numbers).toBe('aucun');
		expect(parse('heure: 3 h', 'minutes: visibles').spec?.minuteHand).toBe(true);
		expect(parse('heure: 3 h', 'cadran: 12').spec?.dial24).toBe(false);
	});

	it('sans accent : cachees, legendes', () => {
		const node = parse('heure: 3 h ; 4 h', 'minutes: cachees', 'legendes: A ; B');
		expect(node.errors).toEqual([]);
		expect(node.spec?.minuteHand).toBe(false);
		expect(node.spec?.captions).toEqual(['A', 'B']);
	});

	it('plusieurs cadrans et leurs légendes (décision 3)', () => {
		const node = parse('heure: 8 h 30 ; 8 h 45', 'légendes: Départ ; Arrivée');
		expect(node.errors).toEqual([]);
		expect(node.spec?.times).toEqual([
			{ hours: 8, minutes: 30 },
			{ hours: 8, minutes: 45 }
		]);
		expect(node.spec?.captions).toEqual(['Départ', 'Arrivée']);
	});

	it('garde le texte du bloc pour l’éditeur riche', () => {
		expect(parse('heure: 9 h', 'chiffres: quarts').source).toBe('heure: 9 h\nchiffres: quarts');
	});

	it('variables d’un modèle résolues avant le bloc (comportement 7)', () => {
		const text = resolveText('```horloge\nheure: {{h}} h {{m}}\n```', [
			{ name: 'h', value: '8' },
			{ name: 'm', value: '5' }
		]);
		const node = horlogeOf(parseMarkdown(text).children);
		expect(node.spec?.times).toEqual([{ hours: 8, minutes: 5 }]);
	});

	it('ne prend pas un $ de l’énoncé autour pour une formule du bloc (comportement 15)', () => {
		const children = doc('Calcule $1+1$.', '', '```horloge', 'heure: 9 h', '```', '', 'Et $2+2$.');
		expect(horlogeOf(children).errors).toEqual([]);
		expect(children.map((c) => c.type)).toEqual(['paragraph', 'horloge', 'paragraph']);
	});
});

describe('bloc ```horloge — erreurs (le nœud reste, avec son message)', () => {
	it('pas de ligne heure: (comportement 17)', () => {
		const node = parse('chiffres: quarts');
		expect(node.spec).toBeNull();
		expect(messages(node).join()).toContain('heure:');
	});

	it('bloc vide', () => {
		const node = parse('');
		expect(node.spec).toBeNull();
		expect(messages(node).join()).toContain('heure:');
	});

	it.each(['24 h', '25 h', '-1 h', '-0 h'])(
		'heure hors de 0 à 23 : %s (comportement 18)',
		(text) => {
			const node = parse(`heure: ${text}`);
			expect(node.spec).toBeNull();
			expect(messages(node)).toEqual([expect.stringContaining('de 0 à 23')]);
			expect(messages(node)[0]).toMatch(/^Ligne 1 : /);
		}
	);

	it.each(['9 h 60', '9 h 75'])('minutes hors de 0 à 59 : %s (comportement 19)', (text) => {
		const node = parse(`heure: ${text}`);
		expect(node.spec).toBeNull();
		expect(messages(node)).toEqual([expect.stringContaining('de 0 à 59')]);
	});

	it.each(['9,5 h', 'neuf heures', '9:30', '9 h 40 s', '9', '{{h}} h', ''])(
		'heure illisible : « %s » (comportements 20, 21)',
		(text) => {
			const node = parse(`heure: ${text}`);
			expect(node.spec).toBeNull();
			expect(messages(node)).toEqual([expect.stringContaining('9 h 30')]);
		}
	);

	it('minutes cachées avec une heure non entière (comportement 13)', () => {
		const node = parse('heure: 9 h 30', 'minutes: cachées');
		expect(node.spec).toBeNull();
		expect(messages(node).join()).toContain('heure entière');
	});

	it('plus de 4 cadrans', () => {
		const node = parse('heure: 1 h ; 2 h ; 3 h ; 4 h ; 5 h');
		expect(node.spec).toBeNull();
		expect(messages(node).join()).toContain('4');
	});

	it('autant de légendes que de cadrans', () => {
		const node = parse('heure: 1 h ; 2 h', 'légendes: Départ');
		expect(node.spec).toBeNull();
		expect(messages(node).join()).toContain('2');
	});

	it('légende trop longue', () => {
		const node = parse('heure: 1 h', `légendes: ${'a'.repeat(41)}`);
		expect(node.spec).toBeNull();
		expect(messages(node).join()).toContain('40');
	});

	it.each([
		['chiffres: romains', 'tous, quarts, aucun'],
		['graduations: secondes', 'minutes, heures, aucune'],
		['minutes: floues', 'visibles, cachées'],
		['cadran: 10', '12, 24'],
		['taille: 20cm', '2 et 8'],
		['taille: 1cm', '2 et 8'],
		['taille: 4', 'cm']
	])('valeur refusée : %s (comportement 22)', (line, expected) => {
		const node = parse('heure: 9 h', line);
		expect(node.spec).toBeNull();
		expect(messages(node)).toEqual([expect.stringContaining(expected)]);
		expect(messages(node)[0]).toMatch(/^Ligne 2 : /);
	});

	it('clé inconnue, nommée dans le message (comportement 22)', () => {
		const node = parse('heure: 9 h', 'couleur: rouge');
		expect(node.spec).toBeNull();
		expect(messages(node)).toEqual([expect.stringContaining('« couleur »')]);
	});

	it('ligne non comprise', () => {
		const node = parse('heure: 9 h', 'n’importe quoi');
		expect(node.spec).toBeNull();
		expect(messages(node)[0]).toMatch(/^Ligne 2 : /);
	});

	it('clé donnée deux fois (comportement 23)', () => {
		const node = parse('heure: 9 h', 'heure: 10 h');
		expect(node.spec).toBeNull();
		expect(messages(node)).toEqual([expect.stringContaining('déjà donnée ligne 1')]);
	});
});

describe('bloc ```horloge non fermé (comportement 16)', () => {
	it('s’arrête à la première ligne vide, signale l’oubli, et la suite reste lue', () => {
		const children = doc('```horloge', 'heure: 9 h', '', 'La suite du texte.');
		const node = horlogeOf(children);
		expect(messages(node).join()).toContain('non fermé');
		expect(children.at(-1)?.type).toBe('paragraph');
	});
});

describe('bloc ```horloge dans un item de liste (comportement 8)', () => {
	it('est lu comme un nœud horloge', () => {
		const children = doc(
			'1. Quelle heure est-il ?',
			'',
			'   ```horloge',
			'   heure: 9 h',
			'   ```'
		);
		const list = children[0] as ListNode;
		const node = horlogeOf(list.items[0].children);
		expect(node.errors).toEqual([]);
		expect(node.spec?.times).toEqual([{ hours: 9, minutes: 0 }]);
	});
});
