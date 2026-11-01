/**
 * Trotteuse du bloc ```horloge (chantier `docs/wip/cercle-trotteuse-progress.md`
 * § 3, 6) : lire et placer des secondes (CM2-082, 083, 084, 153).
 */

import { describe, expect, it } from 'vitest';
import { generateHorlogeTypst } from '$lib/ubumark/generators/horloge-typst';
import { parseHorlogeContent } from '$lib/ubumark/parser/horloge-parser';
import { buildHorlogeScene } from '$lib/ubumark/utils/horloge-scene';
import {
	handsAnswer,
	handsMistakes,
	handsOfAnswer,
	isPlacedTimeCorrect,
	readHands,
	timeOfAnswer,
	timeText
} from '$lib/ubumark/utils/horloge-placer';
import { maskGestureAnswers, findUnmaskedAnswers } from '$lib/questions/masked-statement';

const parse = (...lines: string[]) => parseHorlogeContent(lines.join('\n'));
const messages = (...lines: string[]) => parse(...lines).errors.map((e) => e.message);

describe('écriture des secondes', () => {
	it('`9 h 25 min 40 s` : heures, minutes, secondes', () => {
		expect(parse('heure: 9 h 25 min 40 s').spec?.times).toEqual([
			{ hours: 9, minutes: 25, seconds: 40 }
		]);
	});

	it('`0 s` écrit : la trotteuse est là, sur le 12', () => {
		expect(parse('heure: 9 h 25 min 0 s').spec?.times).toEqual([
			{ hours: 9, minutes: 25, seconds: 0 }
		]);
	});

	it('`9 h 25 min` reste une heure sans secondes ; `9 h 25` et `9 h` inchangés', () => {
		expect(parse('heure: 9 h 25 min').spec?.times).toEqual([{ hours: 9, minutes: 25 }]);
		expect(parse('heure: 9 h 25').spec?.times).toEqual([{ hours: 9, minutes: 25 }]);
		expect(parse('heure: 9 h').spec?.times).toEqual([{ hours: 9, minutes: 0 }]);
	});

	it('un cadran à secondes à côté d’un cadran sans (durées)', () => {
		expect(parse('heure: 9 h 25 min 40 s ; 9 h 30').spec?.times).toEqual([
			{ hours: 9, minutes: 25, seconds: 40 },
			{ hours: 9, minutes: 30 }
		]);
	});

	it('placer: à secondes', () => {
		expect(parse('placer: 14 h 5 min 7 s').spec?.placer).toEqual({
			hours: 14,
			minutes: 5,
			seconds: 7
		});
	});

	it('refus : secondes hors de 0-59, secondes sans minutes', () => {
		expect(messages('heure: 9 h 25 min 60 s').join(' ')).toMatch(/secondes de 0 à 59/);
		expect(messages('heure: 9 h 40 s').join(' ')).toMatch(/non comprise/);
	});

	it('refus : des secondes avec l’aiguille des minutes cachée', () => {
		expect(messages('heure: 9 h 0 min 40 s', 'minutes: cachées').join(' ')).toMatch(
			/minutes cachée/
		);
	});
});

describe('la scène : trotteuse', () => {
	const spec = parse('heure: 9 h 25 min 40 s').spec!;

	it('trotteuse sur la seconde, grande aiguille pile sur sa minute (décision 2)', () => {
		const scene = buildHorlogeScene(spec, spec.times[0]);
		expect(scene.secondAngle).toBe(240);
		expect(scene.minuteAngle).toBe(150);
		expect(scene.secondHand).not.toBeNull();
		expect(scene.secondTail).not.toBeNull();
	});

	it('sans secondes écrites : pas de trotteuse (décision 3)', () => {
		const plain = parse('heure: 9 h 25').spec!;
		const scene = buildHorlogeScene(plain, plain.times[0]);
		expect(scene.secondAngle).toBeNull();
		expect(scene.secondHand).toBeNull();
	});

	it('PDF : la trotteuse est dessinée (une ligne de plus que sans secondes)', () => {
		const lines = (text: string) =>
			(generateHorlogeTypst(parse(text)).match(/line\(/g) ?? []).length;
		expect(lines('heure: 9 h 25 min 40 s')).toBeGreaterThan(lines('heure: 9 h 25'));
	});
});

describe('réponse et juge : trois aiguilles', () => {
	it('réponse `47 25 40` ; aller-retour', () => {
		const hands = { hour: 47, minute: 25, second: 40 };
		expect(handsAnswer(hands)).toBe('47 25 40');
		expect(handsOfAnswer('47 25 40')).toEqual(hands);
		expect(handsOfAnswer('47 25 -')).toEqual({ hour: 47, minute: 25, second: null });
		expect(handsAnswer({ hour: null, minute: null, second: null })).toBe('');
	});

	it('deux aiguilles : la réponse ne change pas (`47 25`)', () => {
		expect(handsAnswer({ hour: 47, minute: 25 })).toBe('47 25');
		expect(handsOfAnswer('47 25')).toEqual({ hour: 47, minute: 25 });
	});

	it('timeText : `9 h 25 min 40 s`, `2 h 5 min 7 s` (cadran de 12), aller-retour', () => {
		expect(timeText({ hours: 9, minutes: 25, seconds: 40 })).toBe('9 h 25 min 40 s');
		expect(timeText({ hours: 14, minutes: 5, seconds: 7 })).toBe('2 h 5 min 7 s');
		expect(timeText({ hours: 9, minutes: 0, seconds: 0 })).toBe('9 h 0 min 0 s');
		expect(timeOfAnswer('2 h 5 min 7 s')).toEqual({ hours: 2, minutes: 5, seconds: 7 });
		expect(timeText({ hours: 9, minutes: 5 })).toBe('9 h 05');
	});

	it('readHands lit les secondes', () => {
		expect(readHands({ hour: 47, minute: 25, second: 40 })).toEqual({
			hours: 9,
			minutes: 25,
			seconds: 40
		});
	});

	it('juste : trotteuse à la seconde exacte (décision 4)', () => {
		expect(isPlacedTimeCorrect('47 25 40', '9 h 25 min 40 s')).toBe(true);
		expect(isPlacedTimeCorrect('47 25 41', '9 h 25 min 40 s')).toBe(false);
		expect(isPlacedTimeCorrect('47 25 -', '9 h 25 min 40 s')).toBe(false);
		expect(isPlacedTimeCorrect('47 25', '9 h 25 min 40 s')).toBe(false);
	});

	it('à 0 s : la trotteuse doit être posée sur le 12', () => {
		expect(isPlacedTimeCorrect('45 0 0', '9 h 0 min 0 s')).toBe(true);
		expect(isPlacedTimeCorrect('45 0 -', '9 h 0 min 0 s')).toBe(false);
	});
});

describe('phrases de la correction, trotteuse', () => {
	const expected = { hours: 9, minutes: 25, seconds: 40 };

	it('trotteuse pas posée', () => {
		expect(handsMistakes({ hour: 47, minute: 25, second: null }, expected)).toEqual([
			'Tu n’as pas placé la trotteuse.'
		]);
	});

	it('grande aiguille et trotteuse échangées', () => {
		expect(handsMistakes({ hour: 47, minute: 40, second: 25 }, expected)).toEqual([
			'Tu as inversé la grande aiguille et la trotteuse : la trotteuse montre les secondes.'
		]);
	});

	it('mauvaise seconde : l’heure lue, secondes comprises', () => {
		expect(handsMistakes({ hour: 47, minute: 25, second: 10 }, expected)).toEqual([
			'Tu as placé les aiguilles sur 9 h 25 min 10 s.'
		]);
	});
});

describe('énoncé masqué (évaluation notée)', () => {
	const statement = 'Place les aiguilles.\n\n```horloge\nplacer: 9 h 25 min 40 s\n```';

	it('`placer: ? s` : la réponse est cachée, la trotteuse reste à poser', () => {
		const masked = maskGestureAnswers(statement);
		expect(masked).toContain('placer: ? s');
		expect(masked).not.toContain('40');
		expect(findUnmaskedAnswers(masked)).toEqual([]);
		const spec = parseHorlogeContent('placer: ? s').spec;
		expect(spec?.placer?.seconds).toBe(0);
	});

	it('sans secondes : `placer: ?` comme avant', () => {
		const masked = maskGestureAnswers(statement.replace(' min 40 s', ''));
		expect(masked).toContain('placer: ?');
		expect(masked).not.toContain('? s');
		expect(parseHorlogeContent('placer: ?').spec?.placer?.seconds).toBeUndefined();
	});
});
