/**
 * Horloge à placer (` ```horloge ` + `placer:`, chantier
 * `docs/wip/reponses-a-placer-progress.md` § 13, 14) : parseur, lecture des
 * aiguilles de l'élève, jugement, phrases de la correction, PDF.
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { generateHorlogeTypst } from '$lib/ubumark/generators/horloge-typst';
import {
	findHorlogesToPlace,
	hasHorlogeToPlace,
	parseHorlogeContent
} from '$lib/ubumark/parser/horloge-parser';
import {
	handsAnswer,
	handsMistakes,
	handsOfAnswer,
	isPlacedTimeCorrect,
	timeText,
	readHands,
	timeOfAnswer
} from '$lib/ubumark/utils/horloge-placer';

const parse = (...lines: string[]) => parseHorlogeContent(lines.join('\n'));
const messages = (...lines: string[]) => parse(...lines).errors.map((e) => e.message);
const clock = (...body: string[]) => ['```horloge', ...body, '```'].join('\n');

describe('```horloge : placer:', () => {
	it('un cadran sans aiguilles, l’heure à placer gardée à part', () => {
		const node = parse('placer: 9 h 25');
		expect(node.errors).toEqual([]);
		expect(node.spec?.placer).toEqual({ hours: 9, minutes: 25 });
		// Aucune heure dessinée : un rendu qui ignore `placer` ne trahit pas la réponse
		expect(node.spec?.times).toEqual([]);
	});

	it('case: posée par le générateur', () => {
		expect(parse('case: 2', 'placer: 9 h').caseIndex).toBe(2);
	});

	it.each([
		[['placer: 9 h', 'heure: 9 h'], /placer: et heure: ne vont pas ensemble/],
		[['placer: 9 h', 'minutes: cachées'], /aiguille des minutes cachée/],
		[['placer: 9 h ; 10 h'], /une seule heure à placer/],
		[['placer: 9 h', 'légendes: A ; B'], /une seule légende/],
		[['placer: 25 h'], /de 0 à 23/],
		[['placer: 9:30'], /non comprise/],
		[['case: 1', 'heure: 9 h'], /case: sans objet sans placer:/]
	])('refusé : %s', (lines, message) => {
		const node = parse(...lines);
		expect(node.spec).toBeNull();
		expect(messages(...lines).join(' ')).toMatch(message);
	});

	it('sans heure: ni placer: : le message dit les deux', () => {
		expect(messages('chiffres: tous').join(' ')).toMatch(/heure: .*placer:/);
	});

	it('une légende permise', () => {
		expect(parse('placer: 9 h', 'légendes: Départ').spec?.captions).toEqual(['Départ']);
	});

	it('repérage dans un énoncé : premier niveau, ou cité / en retrait (signalé)', () => {
		const statement = [
			'Place les aiguilles.',
			'',
			clock('placer: 9 h'),
			'',
			clock('heure: 10 h'),
			'',
			'> ```horloge',
			'> placer: 3 h',
			'> ```'
		].join('\n');
		const found = findHorlogesToPlace(statement);
		expect(found.map((b) => [b.startIndex, b.nested, b.closed])).toEqual([
			[2, false, true],
			[10, true, true]
		]);
		expect(found[0].body).toEqual(['placer: 9 h']);
		expect(hasHorlogeToPlace(clock('heure: 9 h'))).toBe(false);
	});

	it('le parseur de document garde placer: et case:', () => {
		const node = parseMarkdown(clock('case: 0', 'placer: 4 h 15')).children[0];
		expect(node).toMatchObject({ type: 'horloge', caseIndex: 0, spec: { placer: { hours: 4 } } });
	});
});

describe('réponse de l’élève : les deux aiguilles, en crans de minute', () => {
	it('écriture et relecture', () => {
		expect(handsAnswer({ hour: 47, minute: 25 })).toBe('47 25');
		expect(handsAnswer({ hour: null, minute: 25 })).toBe('- 25');
		expect(handsAnswer({ hour: null, minute: null })).toBe('');
		expect(handsOfAnswer('47 25')).toEqual({ hour: 47, minute: 25 });
		expect(handsOfAnswer('- 25')).toEqual({ hour: null, minute: 25 });
		expect(handsOfAnswer('')).toEqual({ hour: null, minute: null });
		expect(handsOfAnswer('60 0')).toEqual({ hour: null, minute: null });
		expect(handsOfAnswer('n’importe quoi')).toEqual({ hour: null, minute: null });
	});

	it('lecture : petite aiguille pile sur l’heure à minutes = 0, entre deux heures sinon', () => {
		expect(readHands({ hour: 45, minute: 0 })).toEqual({ hours: 9, minutes: 0 });
		expect(readHands({ hour: 47, minute: 25 })).toEqual({ hours: 9, minutes: 25 });
		expect(readHands({ hour: 49, minute: 55 })).toEqual({ hours: 9, minutes: 55 });
		// 12 h, 12 h 10 : la petite aiguille sur le 12, ou juste après
		expect(readHands({ hour: 0, minute: 0 })).toEqual({ hours: 12, minutes: 0 });
		expect(readHands({ hour: 1, minute: 10 })).toEqual({ hours: 12, minutes: 10 });
		// L'erreur type : petite aiguille pile sur le 9 à 9 h 45
		expect(readHands({ hour: 45, minute: 45 })).toBeNull();
		expect(readHands({ hour: 47, minute: 0 })).toBeNull();
		expect(readHands({ hour: null, minute: 0 })).toBeNull();
	});

	it('réponse attendue sur le cadran de 12', () => {
		expect(timeText({ hours: 9, minutes: 25 })).toBe('9 h 25');
		expect(timeText({ hours: 9, minutes: 5 })).toBe('9 h 05');
		expect(timeText({ hours: 14, minutes: 0 })).toBe('2 h');
		expect(timeText({ hours: 0, minutes: 30 })).toBe('12 h 30');
		expect(timeOfAnswer('9 h 05')).toEqual({ hours: 9, minutes: 5 });
		expect(timeOfAnswer('9 h')).toEqual({ hours: 9, minutes: 0 });
		expect(timeOfAnswer('9:05')).toBeNull();
	});

	it.each([
		['9 h 25', '47 25', true],
		['9 h 25', '46 25', true],
		['9 h 25', '45 25', false],
		['9 h 25', '50 25', false],
		['9 h 25', '47 26', false],
		['9 h', '45 0', true],
		['9 h', '46 0', false],
		['2 h', '10 0', true],
		['12 h 30', '2 30', true],
		['9 h 25', '- 25', false],
		['9 h 25', '', false]
	])('attendu %s, aiguilles %s : %s', (expected, answer, correct) => {
		expect(isPlacedTimeCorrect(answer, expected)).toBe(correct);
	});

	it('toutes les positions : une seule minute, un seul secteur justes', () => {
		let correct = 0;
		for (let hour = 0; hour < 60; hour++) {
			for (let minute = 0; minute < 60; minute++) {
				if (isPlacedTimeCorrect(`${hour} ${minute}`, '9 h 25')) correct++;
			}
		}
		// Petite aiguille sur les 4 crans entre le 9 et le 10, grande sur le 25
		expect(correct).toBe(4);
	});
});

describe('phrases de la correction', () => {
	const expected = { hours: 9, minutes: 45 };

	it.each([
		[{ hour: null, minute: null }, 'Tu n’as rien placé.'],
		[{ hour: null, minute: 45 }, 'Tu n’as pas placé la petite aiguille.'],
		[{ hour: 48, minute: null }, 'Tu n’as pas placé la grande aiguille.'],
		[{ hour: 28, minute: 45 }, 'Tu as placé les aiguilles sur 5 h 45.'],
		[
			{ hour: 45, minute: 45 },
			'La petite aiguille est pile sur le 9 : quand la grande n’est pas sur le 12, la petite est entre deux nombres.'
		],
		[
			{ hour: 48, minute: 0 },
			'La grande aiguille est sur le 12 : la petite doit être pile sur un nombre.'
		]
	])('%o', (hands, message) => {
		expect(handsMistakes(hands, expected)).toContain(message);
	});

	it('aiguilles inversées : on le dit', () => {
		// 3 h : petite aiguille sur le 3 (crans 15), grande sur le 12 (0) ; inversées
		expect(handsMistakes({ hour: 0, minute: 15 }, { hours: 3, minutes: 0 })).toContain(
			'Tu as inversé les aiguilles : la petite montre les heures, la grande les minutes.'
		);
	});

	it('aiguilles inversées à 9 h 25 : grande sur le 9, petite sur le 5', () => {
		expect(handsMistakes({ hour: 25, minute: 45 }, { hours: 9, minutes: 25 })).toEqual([
			'Tu as inversé les aiguilles : la petite montre les heures, la grande les minutes.'
		]);
	});
});

describe('```horloge à placer au PDF', () => {
	it('un cadran de 6 cm, sans aiguilles', () => {
		const out = generateHorlogeTypst(parse('placer: 9 h 25'));
		expect(out).toContain('#box(width: 6cm, height: 6cm)');
		// Le bord, les traits, l'axe : aucune aiguille (traits partant du centre)
		expect(out).not.toMatch(/line\(start: \(3cm, 3cm\)/);
	});

	it('la taille demandée reste prioritaire', () => {
		expect(generateHorlogeTypst(parse('placer: 9 h', 'taille: 4cm'))).toContain(
			'#box(width: 4cm, height: 4cm)'
		);
	});
});
