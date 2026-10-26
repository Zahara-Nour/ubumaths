/**
 * Bloc ```collection à construire — analyse, calcul, PDF
 * (phase 0 : `docs/wip/construire-progress.md` § 3, 4 bis, 5)
 */

import { describe, expect, it } from 'vitest';
import { parseCollectionContent } from '$lib/ubumark/parser/collection-parser';
import { generateCollectionTypst } from '$lib/ubumark/generators/collection-typst';
import {
	addToBuild,
	BUILD_LIMITS,
	buildAnswer,
	buildFromAnswer,
	buildScene,
	buildValue,
	EMPTY_BUILD,
	removeFromBuild,
	solutionBuild
} from '$lib/ubumark/utils/collection-construire';
import { COLLECTION_UNAVAILABLE, type CollectionNode } from '$lib/ubumark/types/collection';

const parse = (...lines: string[]) => parseCollectionContent(lines.join('\n'));
const messages = (node: CollectionNode) => node.errors.map((e) => e.message);

describe('construire: — analyse', () => {
	it('la valeur à construire, barres par défaut, aucun ensemble dessiné', () => {
		const node = parse('construire: 34');
		expect(node.errors).toEqual([]);
		expect(node.spec).toMatchObject({ build: 34, drawing: 'barres', sets: [] });
	});

	it('paquets et taille gardés', () => {
		const node = parse('construire: 7', 'dessin: paquets', 'taille: 6cm');
		expect(node.errors).toEqual([]);
		expect(node.spec).toMatchObject({ build: 7, drawing: 'paquets', sizeCm: 6 });
	});

	it('valeur de 1 à 100, entière', () => {
		expect(parse('construire: 100').errors).toEqual([]);
		expect(messages(parse('construire: 0'))).toEqual([
			'Ligne 1 : construire « 0 » : écris un nombre entier de 1 à 100'
		]);
		expect(messages(parse('construire: 101'))).toEqual([
			'Ligne 1 : construire « 101 » : écris un nombre entier de 1 à 100'
		]);
		expect(messages(parse('construire: 3,5'))).toEqual([
			'Ligne 1 : construire « 3,5 » : écris un nombre entier de 1 à 100'
		]);
	});

	it('pas d’ensemble de départ : dizaines, unités, unités en, légendes refusées', () => {
		expect(messages(parse('construire: 34', 'unités: 3'))).toEqual([
			'Ligne 2 : unités : sans objet avec construire: (l’élève part d’un plan vide)'
		]);
		expect(messages(parse('construire: 34', 'dizaines: 1'))).toEqual([
			'Ligne 2 : dizaines : sans objet avec construire: (l’élève part d’un plan vide)'
		]);
		expect(messages(parse('construire: 34', 'unités en: vrac'))).toEqual([
			'Ligne 2 : unités en : sans objet avec construire: (les objets se rangent d’office)'
		]);
		expect(messages(parse('construire: 34', 'légendes: Léa'))).toEqual([
			'Ligne 2 : légendes : sans objet avec construire:'
		]);
	});

	it('case: lue (posée par le générateur), refusée sans construire:', () => {
		const node = parse('case: 2', 'construire: 34');
		expect(node.errors).toEqual([]);
		expect(node.caseIndex).toBe(2);
		expect(messages(parse('case: 0', 'unités: 3'))).toEqual([
			'Ligne 1 : case: sans objet sans construire:'
		]);
	});

	it('une collection à dessiner reste sans construire', () => {
		const node = parse('unités: 3');
		expect(node.spec?.build).toBeUndefined();
		expect(node.caseIndex).toBeUndefined();
	});
});

describe('construire: — la construction de l’élève', () => {
	it('plan vide : réponse vide (Q6)', () => {
		expect(buildValue(EMPTY_BUILD)).toBe(0);
		expect(buildAnswer(EMPTY_BUILD)).toBe('');
	});

	it('la valeur posée, groupement partiel compris', () => {
		expect(buildAnswer({ tens: 3, units: 4 })).toBe('34');
		expect(buildAnswer({ tens: 0, units: 34 })).toBe('34');
		expect(buildAnswer({ tens: 2, units: 14 })).toBe('34');
	});

	it('ajouter, enlever ; jamais sous 0 ni au-dessus des plafonds', () => {
		expect(addToBuild(EMPTY_BUILD, 'tens')).toEqual({ tens: 1, units: 0 });
		expect(addToBuild({ tens: 1, units: 0 }, 'units')).toEqual({ tens: 1, units: 1 });
		expect(removeFromBuild({ tens: 1, units: 1 }, 'tens')).toEqual({ tens: 0, units: 1 });
		expect(removeFromBuild(EMPTY_BUILD, 'units')).toEqual(EMPTY_BUILD);
		const full = { tens: BUILD_LIMITS.tens, units: BUILD_LIMITS.units };
		expect(addToBuild(full, 'tens')).toEqual(full);
		expect(addToBuild(full, 'units')).toEqual(full);
	});

	it('remontée avec une seule valeur : redessinée en dizaines et unités', () => {
		expect(buildFromAnswer('34')).toEqual({ tens: 3, units: 4 });
		expect(buildFromAnswer('')).toEqual(EMPTY_BUILD);
		expect(buildFromAnswer('abc')).toEqual(EMPTY_BUILD);
	});

	it('une construction juste : le moins d’objets (Q8)', () => {
		expect(solutionBuild(34)).toEqual({ tens: 3, units: 4 });
		expect(solutionBuild(100)).toEqual({ tens: 10, units: 0 });
	});

	it('la scène : un objet par barre et par cube, cubes en rangées', () => {
		const scene = buildScene('barres', { tens: 2, units: 14 });
		expect(scene.items.filter((i) => i.kind === 'barre')).toHaveLength(2);
		expect(scene.items.filter((i) => i.kind === 'cube')).toHaveLength(14);
		// Rangées de 10 : le 11e cube commence la deuxième rangée, sous le 1er
		const cubes = scene.items.filter((i) => i.kind === 'cube');
		expect(cubes[10].x).toBe(cubes[0].x);
		expect(cubes[10].y).toBeGreaterThan(cubes[0].y);
	});

	it('la scène suit le matériel : paquets et jetons', () => {
		const scene = buildScene('paquets', { tens: 1, units: 2 });
		expect(scene.items.map((i) => i.kind)).toEqual(['paquet', 'jeton', 'jeton']);
	});
});

describe('construire: — PDF (Q9)', () => {
	it('un cadre vide en pointillés et la réserve dessinée en petit, jamais la réponse', () => {
		const out = generateCollectionTypst(parse('construire: 34'));
		expect(out).not.toContain(COLLECTION_UNAVAILABLE);
		expect(out).toMatch(/dash: "dashed"/);
		// Réserve : une barre (9 séparations) et un cube
		expect((out.match(/line\(/g) ?? []).length).toBe(9);
		// Aucun texte : la valeur à construire est dans l'énoncé, pas dans le dessin
		expect(out).not.toMatch(/text\(/);
	});

	it('paquets : la réserve montre un paquet et un jeton', () => {
		const out = generateCollectionTypst(parse('construire: 34', 'dessin: paquets'));
		expect((out.match(/circle\(/g) ?? []).length).toBe(11);
	});
});

// Revue de la PR 2 (monnaie) : les collections à lire ne changent pas
describe('```collection à lire : inchangé', () => {
	it('bloc non fermé : un paragraphe « Construire… » reste du texte', async () => {
		const { parseMarkdown } = await import('$lib/ubumark');
		const doc = parseMarkdown(
			['```collection', 'unités: 3', '', 'Construire une tour.', '', '```js', 'x', '```'].join('\n')
		);
		expect(doc.children.map((c) => c.type)).toEqual(['collection', 'paragraph', 'code-block']);
	});

	it('clé inconnue : la liste des clés possibles ne propose pas case:', () => {
		const [message] = messages(parse('unité: 3'));
		expect(message).toContain('construire)');
		expect(message).not.toMatch(/\bcase\b/);
	});
});
