/**
 * Bloc ```monnaie — centimes et billets de 200 / 500 €
 * (phase 0 : `docs/wip/monnaie-centimes-progress.md` § 2)
 */

import { describe, expect, it } from 'vitest';
import { parseMonnaieContent } from '$lib/ubumark/parser/monnaie-parser';
import { generateMonnaieTypst } from '$lib/ubumark/generators/monnaie-typst';
import {
	addToBuild,
	buildAnswer,
	buildFromAnswer,
	buildValue,
	canAdd,
	EMPTY_BUILD,
	solutionBuild
} from '$lib/ubumark/utils/monnaie-construire';
import { buildMonnaieScene } from '$lib/ubumark/utils/monnaie-scene';
import {
	amountAnswer,
	amountWords,
	denominationLabel,
	denominationName,
	readAmount,
	toCents
} from '$lib/ubumark/utils/monnaie-valeurs';
import { buildAnswerOf } from '$lib/questions/generator/build-answer';
import { MONNAIE_COINS, MONNAIE_NOTES, type MonnaieNode } from '$lib/ubumark/types/monnaie';

const parse = (...lines: string[]) => parseMonnaieContent(lines.join('\n'));
const messages = (node: MonnaieNode) => node.errors.map((e) => e.message);

describe('valeurs : centimes exacts', () => {
	it('les coupures du CE1 : six pièces de centimes, billets de 200 et 500 €', () => {
		expect(MONNAIE_COINS).toEqual([2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01]);
		expect(MONNAIE_NOTES).toEqual([500, 200, 100, 50, 20, 10, 5]);
	});

	it('montant écrit à virgule, en euros et centimes, ou en centimes (décision 2)', () => {
		expect(readAmount('3,45')).toBe(345);
		expect(readAmount('3.45')).toBe(345);
		expect(readAmount('3,45 €')).toBe(345);
		expect(readAmount('3,5')).toBe(350);
		expect(readAmount('3 € 45 c')).toBe(345);
		expect(readAmount('3€45c')).toBe(345);
		expect(readAmount('3 € et 45 c')).toBe(345);
		expect(readAmount('345c')).toBe(345);
		expect(readAmount('85 c')).toBe(85);
		expect(readAmount('0,85')).toBe(85);
		expect(readAmount('17,00')).toBe(1700);
		expect(readAmount('35')).toBe(3500);
		expect(readAmount('35 €')).toBe(3500);
	});

	it('espace des milliers, par groupes de trois chiffres (revue C2)', () => {
		expect(readAmount('1 000')).toBe(100000);
		expect(readAmount('1 000 €')).toBe(100000);
		expect(readAmount('1\u00a0000')).toBe(100000);
		expect(readAmount('1\u202f000,50')).toBe(100050);
		expect(readAmount('1 000 € 50 c')).toBe(100050);
		expect(readAmount('10 00')).toBeNull();
		expect(readAmount('1 0000')).toBeNull();
	});

	it('montant illisible : null', () => {
		expect(readAmount('3,456')).toBeNull();
		expect(readAmount('3 € 145 c')).toBeNull();
		expect(readAmount('trois')).toBeNull();
		expect(readAmount('')).toBeNull();
		expect(readAmount('-2')).toBeNull();
	});

	it('jamais 0,449999 : la somme se fait en centimes', () => {
		expect(toCents(0.2) + toCents(0.2) + toCents(0.05)).toBe(45);
		expect(toCents(0.1 + 0.2)).toBe(30);
	});

	it('réponse de la case : virgule et deux chiffres, entier inchangé (décision 3)', () => {
		expect(amountAnswer(345)).toBe('3,45');
		expect(amountAnswer(305)).toBe('3,05');
		expect(amountAnswer(85)).toBe('0,85');
		expect(amountAnswer(3500)).toBe('35');
	});

	it('réponse de la case : sans zéro final ni millier collé (revue B1, C1)', () => {
		expect(amountAnswer(220)).toBe('2,2');
		expect(amountAnswer(50)).toBe('0,5');
		expect(amountAnswer(110)).toBe('1,1');
		expect(amountAnswer(100000)).toBe('1 000');
	});

	it('correction en euros et centimes (décision 4)', () => {
		expect(amountWords(345)).toBe('3 € et 45 c');
		expect(amountWords(3200)).toBe('32 €');
		expect(amountWords(85)).toBe('85 c');
		expect(amountWords(1)).toBe('1 c');
	});

	it('ce qui s’écrit sur une coupure, et son nom accessible', () => {
		expect(denominationLabel(0.5)).toBe('50 c');
		expect(denominationLabel(2)).toBe('2 €');
		expect(denominationLabel(500)).toBe('500 €');
		expect(denominationName(0.5)).toBe('une pièce de 50 centimes');
		expect(denominationName(0.01)).toBe('une pièce de 1 centime');
		expect(denominationName(2)).toBe('une pièce de 2 €');
		expect(denominationName(200)).toBe('un billet de 200 €');
	});
});

describe('bloc ```monnaie — centimes à lire (nominal 1, 2 ; limites 8, 9, 11)', () => {
	it('pièces de centimes et billets de 200 / 500 €', () => {
		const node = parse('billets: 500 200', 'pièces: 2 1 50c 20c 5c');
		expect(node.errors).toEqual([]);
		expect(node.spec?.sets).toEqual([{ notes: [500, 200], coins: [2, 1, 0.5, 0.2, 0.05] }]);
	});

	it('forme comptée et écriture `50 c`', () => {
		expect(parse('pièces: 3×20c 50 c').spec?.sets).toEqual([
			{ notes: [], coins: [0.5, 0.2, 0.2, 0.2] }
		]);
	});

	it('montant: à virgule, le moins d’objets', () => {
		expect(parse('montant: 3,45').spec?.sets).toEqual([
			{ notes: [], coins: [2, 1, 0.2, 0.2, 0.05] }
		]);
		expect(parse('montant: 3 € 45 c').spec?.sets).toEqual(parse('montant: 3,45').spec?.sets);
		expect(parse('montant: 0,85').spec?.sets).toEqual([
			{ notes: [], coins: [0.5, 0.2, 0.1, 0.05] }
		]);
		expect(parse('montant: 17,00').spec?.sets).toEqual([{ notes: [10, 5], coins: [2] }]);
		expect(parse('montant: 750').spec?.sets).toEqual([{ notes: [500, 200, 50], coins: [] }]);
	});

	it('décomposition exacte de chaque montant de 0 à 10 € au centime près', () => {
		for (let cents = 0; cents <= 1000; cents++) {
			const set = parse(`montant: ${amountAnswer(cents)}`).spec?.sets[0];
			expect(set).toBeDefined();
			const total = [...set!.notes, ...set!.coins].reduce((s, v) => s + toCents(v), 0);
			expect(total).toBe(cents);
		}
	});

	it('comparer 12 € et 60 c (054) : deux ensembles', () => {
		const node = parse('montant: 12 ; 60c');
		expect(node.errors).toEqual([]);
		expect(node.spec?.sets).toEqual([
			{ notes: [10], coins: [2] },
			{ notes: [], coins: [0.5, 0.1] }
		]);
	});

	it('1 000 € par ensemble au plus (limite 10)', () => {
		expect(parse('billets: 500 500').errors).toEqual([]);
		expect(parse('montant: 1000').errors).toEqual([]);
		expect(messages(parse('billets: 500 500', 'pièces: 1'))).toEqual([
			'Ligne 2 : 1 001 € : 1 000 € au plus'
		]);
	});

	it('scène : les pièces de centimes plus petites que 1 €, croissantes avec la valeur (décision 1)', () => {
		const scene = buildMonnaieScene(
			{
				sets: [{ notes: [500, 200], coins: [2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01] }],
				captions: null,
				layout: 'rangé',
				sizeCm: null
			},
			0
		);
		const width = (value: number) => scene.items.find((it) => it.value === value)!.width;
		const coins = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2].map(width);
		expect(coins).toEqual([...coins].sort((a, b) => a - b));
		expect(new Set(coins).size).toBe(coins.length);
		expect(width(500)).toBeGreaterThan(width(200));
	});
});

describe('bloc ```monnaie — erreurs des centimes (13 à 16)', () => {
	it('trois chiffres après la virgule', () => {
		expect(messages(parse('montant: 3,456'))).toEqual([
			'Ligne 1 : montant « 3,456 » : écris un montant en euros et centimes, ex. 3,45 ou 3 € 45 c (2 chiffres après la virgule au plus)'
		]);
	});

	it('pièce qui n’existe pas, pièce écrite en billet', () => {
		expect(messages(parse('pièces: 3c'))).toEqual([
			"Ligne 1 : 3 c n'existe pas (pièces : 1 c, 2 c, 5 c, 10 c, 20 c, 50 c, 1 €, 2 € ; billets : 5 €, 10 €, 20 €, 50 €, 100 €, 200 €, 500 €)"
		]);
		expect(messages(parse('billets: 50c'))).toEqual([
			"Ligne 1 : 50 c est une pièce : écris-la dans pièces: (forme comptée : quantité d'abord, ex. 3×2)"
		]);
	});

	it('pièces: 5 → billet de 5 €, ou 5c pour 5 centimes (revue M2)', () => {
		expect(messages(parse('pièces: 5'))).toEqual([
			"Ligne 1 : 5 € est un billet : écris-le dans billets: (forme comptée : quantité d'abord, ex. 2×10) ; pour 5 centimes, écris 5c"
		]);
	});

	it('montant en fraction (eval sans ;d) : la manière de l’écrire en décimal (revue M1)', () => {
		expect(messages(parse('montant: \\dfrac{69}{20}'))).toEqual([
			'Ligne 1 : montant « \\dfrac{69}{20} » : une fraction n’est pas un montant ; écris {{eval:…;d}} pour un résultat décimal, ex. {{eval:p/100;d}}'
		]);
		expect(messages(parse('construire: \\frac{69}{20}'))).toEqual([
			'Ligne 1 : construire « \\frac{69}{20} » : une fraction n’est pas un montant ; écris {{eval:…;d}} pour un résultat décimal, ex. {{eval:p/100;d}}'
		]);
	});

	it('montant au-delà de 1 000 €', () => {
		expect(messages(parse('montant: 1000,01'))).toEqual([
			'Ligne 1 : montant « 1000,01 » : de 0 à 1 000 € au plus'
		]);
	});
});

describe('construire: avec des centimes (nominal 3 à 6)', () => {
	it('somme à virgule, réserve donnée', () => {
		const node = parse('construire: 3,45', 'réserve: 2 1 50c 20c 10c 5c');
		expect(node.errors).toEqual([]);
		expect(node.spec).toMatchObject({ build: 3.45, reserve: [2, 1, 0.5, 0.2, 0.1, 0.05] });
	});

	it('réserve par défaut : les centimes ajoutés seulement si la somme en a (décision 5)', () => {
		expect(parse('construire: 35').spec?.reserve).toEqual([50, 20, 10, 5, 2, 1]);
		expect(parse('construire: 3,45').spec?.reserve).toEqual([
			50, 20, 10, 5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01
		]);
	});

	it('pas de pièce de 1 € (056) : la réserve suffit', () => {
		const node = parse('construire: 0,80', 'réserve: 50c 20c 10c');
		expect(node.errors).toEqual([]);
		expect(solutionBuild(0.8, node.spec!.reserve!)).toEqual({ notes: [], coins: [0.5, 0.2, 0.1] });
	});

	it('limites : 1 c, 1 000 €, 3,99 € en 8 objets', () => {
		expect(parse('construire: 0,01').errors).toEqual([]);
		expect(parse('construire: 1000', 'réserve: 500').errors).toEqual([]);
		expect(solutionBuild(3.99, parse('construire: 3,99').spec!.reserve!)).toEqual({
			notes: [],
			coins: [2, 1, 0.5, 0.2, 0.2, 0.05, 0.02, 0.02]
		});
	});

	it('somme infaisable avec la réserve (15) ; hors bornes', () => {
		expect(messages(parse('construire: 3,45', 'réserve: 2 1'))).toEqual([
			'Ligne 1 : 3 € et 45 c ne se fait pas avec la réserve (1 €, 2 €)'
		]);
		expect(messages(parse('construire: 0'))).toEqual([
			'Ligne 1 : construire « 0 » : écris une somme de 1 c à 1 000 €, ex. 35 ou 3,45'
		]);
		expect(messages(parse('construire: 1000,50'))).toEqual([
			'Ligne 1 : construire « 1000,50 » : écris une somme de 1 c à 1 000 €, ex. 35 ou 3,45'
		]);
	});

	it('la construction de l’élève, comptée en centimes', () => {
		let build = EMPTY_BUILD;
		for (const value of [2, 1, 0.2, 0.2, 0.05]) build = addToBuild(build, value);
		expect(buildValue(build)).toBe(3.45);
		expect(buildAnswer(build)).toBe('3,45');
		expect(buildAnswer(addToBuild(EMPTY_BUILD, 0.5))).toBe('0,5');
		expect(buildAnswer({ notes: [20, 10], coins: [2] })).toBe('32');
	});

	it('plafond du plan : 1 000 €', () => {
		// 999 € posés : 1 € passe encore, 2 € non
		const full = { notes: [500, 200, 200, 50, 20, 20], coins: [2, 2, 2, 2, 1] };
		expect(canAdd(full, 1)).toBe(true);
		expect(canAdd(full, 2)).toBe(false);
		expect(canAdd(full, 0.5)).toBe(true);
	});

	it('réponse relue (composant remonté) : 3,45 redessiné', () => {
		const reserve = [2, 1, 0.5, 0.2, 0.1, 0.05];
		expect(buildFromAnswer('3,45', reserve)).toEqual({ notes: [], coins: [2, 1, 0.2, 0.2, 0.05] });
		expect(buildFromAnswer('35', [20, 10, 5])).toEqual({ notes: [20, 10, 5], coins: [] });
		expect(buildFromAnswer('3,456', reserve)).toEqual(EMPTY_BUILD);
	});

	it('réponse attendue d’une question : 3,45 ; 35 inchangé (modèles du CP)', () => {
		expect(buildAnswerOf('monnaie', 'construire: 3,45')).toEqual({ answer: '3,45' });
		expect(buildAnswerOf('monnaie', 'construire: 2,20')).toEqual({ answer: '2,2' });
		expect(buildAnswerOf('monnaie', 'construire: 35')).toEqual({ answer: '35' });
	});
});

describe('PDF : centimes écrits sur les pièces (nominal 7)', () => {
	it('« 50 c » et « 200 € » écrits', () => {
		const typst = generateMonnaieTypst(parse('billets: 200', 'pièces: 50c 5c'));
		expect(typst).toContain('"50 c"');
		expect(typst).toContain('"5 c"');
		expect(typst).toContain('"200 €"');
		expect(typst).not.toContain('0.5 €');
	});
});
