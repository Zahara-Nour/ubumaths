/**
 * Bloc ```monnaie à construire — analyse, calcul, PDF
 * (phase 0 : `docs/wip/construire-progress.md` § 3, 4 bis, 6)
 */

import { describe, expect, it } from 'vitest';
import { parseMonnaieContent } from '$lib/ubumark/parser/monnaie-parser';
import { generateMonnaieTypst } from '$lib/ubumark/generators/monnaie-typst';
import {
	addToBuild,
	BUILD_LIMITS,
	buildAnswer,
	buildFromAnswer,
	buildScene,
	buildValue,
	canAdd,
	DEFAULT_RESERVE,
	EMPTY_BUILD,
	removeFromBuild,
	reserveScene,
	solutionBuild
} from '$lib/ubumark/utils/monnaie-construire';
import { MONNAIE_UNAVAILABLE, type MonnaieNode } from '$lib/ubumark/types/monnaie';

const parse = (...lines: string[]) => parseMonnaieContent(lines.join('\n'));
const messages = (node: MonnaieNode) => node.errors.map((e) => e.message);

describe('construire: — analyse', () => {
	it('la somme à construire, réserve par défaut 1, 2, 5, 10, 20, 50 €, aucun ensemble dessiné', () => {
		const node = parse('construire: 35');
		expect(node.errors).toEqual([]);
		expect(node.spec).toMatchObject({ build: 35, reserve: [50, 20, 10, 5, 2, 1], sets: [] });
		expect(DEFAULT_RESERVE).toEqual([50, 20, 10, 5, 2, 1]);
	});

	it('réserve donnée, rangée de la plus grande à la plus petite ; taille gardée', () => {
		const node = parse('construire: 35', 'réserve: 1 2 5 10 20€', 'taille: 6cm');
		expect(node.errors).toEqual([]);
		expect(node.spec).toMatchObject({ build: 35, reserve: [20, 10, 5, 2, 1], sizeCm: 6 });
		expect(parse('construire: 35', 'reserve: 10 5').spec?.reserve).toEqual([10, 5]);
	});

	it('somme de 1 à 100 €, entière', () => {
		expect(parse('construire: 100').errors).toEqual([]);
		expect(messages(parse('construire: 0'))).toEqual([
			'Ligne 1 : construire « 0 » : écris un nombre entier d’euros de 1 à 100'
		]);
		expect(messages(parse('construire: 101'))).toEqual([
			'Ligne 1 : construire « 101 » : écris un nombre entier d’euros de 1 à 100'
		]);
		expect(messages(parse('construire: 50c'))).toEqual([
			'Ligne 1 : construire « 50c » : centimes pas encore disponibles'
		]);
	});

	it('réserve : coupures existantes, une fois chacune', () => {
		expect(messages(parse('construire: 35', 'réserve: 3'))).toEqual([
			'Ligne 2 : 3 € n’existe pas (pièces : 1, 2 ; billets : 5, 10, 20, 50, 100)'
		]);
		expect(messages(parse('construire: 35', 'réserve: 200'))).toEqual([
			'Ligne 2 : billet de 200 € : pas encore disponible (pièces : 1, 2 ; billets : 5, 10, 20, 50, 100)'
		]);
		expect(messages(parse('construire: 35', 'réserve: 5 5'))).toEqual([
			'Ligne 2 : réserve : 5 € écrit deux fois'
		]);
		expect(messages(parse('construire: 35', 'réserve:'))).toEqual([
			'Ligne 2 : réserve vide : écris les coupures permises, ex. réserve: 1 2 5 10'
		]);
		expect(messages(parse('réserve: 1 2'))).toEqual([
			'Ligne 1 : réserve: sans objet sans construire:'
		]);
	});

	it('somme impossible avec la réserve, ou en plus de 30 objets : refusée', () => {
		expect(messages(parse('construire: 1', 'réserve: 2 5'))).toEqual([
			'Ligne 1 : 1 € ne se fait pas avec la réserve (2, 5 €)'
		]);
		expect(messages(parse('construire: 35', 'réserve: 1'))).toEqual([
			'Ligne 1 : 35 € demande plus de 30 objets avec la réserve (1 €)'
		]);
		expect(parse('construire: 6', 'réserve: 2 5').errors).toEqual([]);
	});

	it('pas d’ensemble de départ : billets, pièces, montant, légendes, disposition refusées', () => {
		expect(messages(parse('construire: 35', 'billets: 10'))).toEqual([
			'Ligne 2 : billets : sans objet avec construire: (l’élève part d’un plan vide)'
		]);
		expect(messages(parse('construire: 35', 'pièces: 2'))).toEqual([
			'Ligne 2 : pièces : sans objet avec construire: (l’élève part d’un plan vide)'
		]);
		expect(messages(parse('construire: 35', 'montant: 3'))).toEqual([
			'Ligne 2 : montant : sans objet avec construire: (l’élève part d’un plan vide)'
		]);
		expect(messages(parse('construire: 35', 'disposition: mélangé'))).toEqual([
			'Ligne 2 : disposition : sans objet avec construire: (les coupures se rangent d’office)'
		]);
		expect(messages(parse('construire: 35', 'légendes: Léa'))).toEqual([
			'Ligne 2 : légendes : sans objet avec construire:'
		]);
	});

	it('case: lue (posée par le générateur), refusée sans construire:', () => {
		const node = parse('case: 2', 'construire: 35');
		expect(node.errors).toEqual([]);
		expect(node.caseIndex).toBe(2);
		expect(messages(parse('case: 0', 'billets: 10'))).toEqual([
			'Ligne 1 : case: sans objet sans construire:'
		]);
	});

	it('un ensemble à dessiner reste sans construire', () => {
		const node = parse('billets: 10');
		expect(node.spec?.build).toBeUndefined();
		expect(node.caseIndex).toBeUndefined();
	});
});

describe('construire: — la construction de l’élève', () => {
	it('plan vide : réponse vide (Q6)', () => {
		expect(buildValue(EMPTY_BUILD)).toBe(0);
		expect(buildAnswer(EMPTY_BUILD)).toBe('');
	});

	it('la somme posée, quelles que soient les coupures', () => {
		expect(buildAnswer({ notes: [20, 10, 5], coins: [] })).toBe('35');
		expect(buildAnswer({ notes: [10, 10, 10], coins: [2, 2, 1] })).toBe('35');
	});

	it('ajouter range billets et pièces, de la plus grande à la plus petite ; enlever une', () => {
		let build = addToBuild(EMPTY_BUILD, 2);
		build = addToBuild(build, 10);
		build = addToBuild(build, 5);
		build = addToBuild(build, 2);
		build = addToBuild(build, 20);
		expect(build).toEqual({ notes: [20, 10, 5], coins: [2, 2] });
		expect(removeFromBuild(build, 2)).toEqual({ notes: [20, 10, 5], coins: [2] });
		expect(removeFromBuild(build, 50)).toEqual(build);
	});

	it('plafonds : jamais au-delà de 100 € ni de 30 objets', () => {
		expect(BUILD_LIMITS).toEqual({ total: 100, objects: 30 });
		const full = { notes: [50, 20, 20], coins: [2, 2, 2] };
		expect(canAdd(full, 2)).toBe(true);
		expect(canAdd(full, 5)).toBe(false);
		expect(addToBuild(full, 5)).toEqual(full);
		const many = { notes: [], coins: Array.from({ length: 30 }, () => 1) };
		expect(canAdd(many, 1)).toBe(false);
	});

	it('une construction juste : le moins d’objets AVEC la réserve (Q8)', () => {
		expect(solutionBuild(35, DEFAULT_RESERVE)).toEqual({ notes: [20, 10, 5], coins: [] });
		expect(solutionBuild(48, DEFAULT_RESERVE)).toEqual({ notes: [20, 20, 5], coins: [2, 1] });
		// Le glouton prendrait 5 € et resterait coincé à 1 €
		expect(solutionBuild(6, [5, 2])).toEqual({ notes: [], coins: [2, 2, 2] });
		expect(solutionBuild(1, [5, 2])).toBeNull();
		expect(solutionBuild(35, [1])).toBeNull();
	});

	it('remontée avec une seule valeur : redessinée avec la réserve, le moins d’objets', () => {
		expect(buildFromAnswer('35', DEFAULT_RESERVE)).toEqual({ notes: [20, 10, 5], coins: [] });
		expect(buildFromAnswer('', DEFAULT_RESERVE)).toEqual(EMPTY_BUILD);
		expect(buildFromAnswer('abc', DEFAULT_RESERVE)).toEqual(EMPTY_BUILD);
		expect(buildFromAnswer('1', [5, 2])).toEqual(EMPTY_BUILD);
	});

	it('la scène : rangée, billets en haut, pièces dessous', () => {
		const scene = buildScene({ notes: [10, 5], coins: [2, 1] });
		expect(scene.items.map((i) => `${i.kind} ${i.value}`)).toEqual([
			'billet 10',
			'billet 5',
			'piece 2',
			'piece 1'
		]);
		expect(scene.items[2].y).toBeGreaterThan(scene.items[0].y);
	});

	it('la réserve dessinée : une coupure de chaque', () => {
		const scene = reserveScene([10, 5, 2]);
		expect(scene.items.map((i) => i.value)).toEqual([10, 5, 2]);
	});
});

describe('construire: — PDF (Q9)', () => {
	it('un cadre vide en pointillés et la réserve dessinée en petit, jamais la somme', () => {
		const out = generateMonnaieTypst(parse('construire: 35', 'réserve: 10 5 2'));
		expect(out).not.toContain(MONNAIE_UNAVAILABLE);
		expect(out).toMatch(/dash: "dashed"/);
		expect(out).toContain('"10 €"');
		expect(out).toContain('"5 €"');
		expect(out).toContain('"2 €"');
		expect(out).not.toMatch(/"35\b|35 €/);
	});

	it('réserve par défaut : ses six coupures', () => {
		const out = generateMonnaieTypst(parse('construire: 35'));
		for (const value of [1, 2, 5, 10, 20, 50]) expect(out).toContain(`"${value} €"`);
		expect(out).not.toContain('"100 €"');
	});
});
