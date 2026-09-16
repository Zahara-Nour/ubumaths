/**
 * « Garder dans mon atelier » — décision Q2.
 *
 * L'élève ouvre un lien en mode éphémère, puis décide d'en garder le contenu.
 * ⚠️ **Jamais d'écrasement silencieux** : c'est la règle du §2.2, et elle vaut
 * ici comme partout. L'arrivant est renommé, et on dit ce qui a été fait.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { mergeInto } from '../merge';

function atelierOf(objects: Array<[string, string]>) {
	const atelier = new Atelier();
	for (const [name, definition] of objects) {
		atelier.create({ kind: 'function', name, definition }, 'text');
	}
	return atelier;
}

describe('fusionner un atelier reçu', () => {
	it('ajoute ce qui ne gêne personne', () => {
		const mien = atelierOf([['f', 'x^2']]);
		const recu = atelierOf([['g', 'x^3']]);

		const report = mergeInto(mien, recu.serialize());

		expect(mien.names).toEqual(['f', 'g']);
		expect(report.added).toBe(1);
		expect(report.renamed).toEqual([]);
	});

	// ⚠️ LE point de Q2 : rien n'est perdu, jamais
	it('renomme l’arrivant plutôt que d’écraser', () => {
		const mien = atelierOf([['f', 'x^2']]);
		const recu = atelierOf([['f', 'x^3']]);

		const report = mergeInto(mien, recu.serialize());

		expect(mien.get('f')?.definition).toBe('x^2');
		expect(mien.names.length).toBe(2);
		expect(report.renamed.length).toBe(1);
	});

	it('dit sous quel nom l’arrivant a été gardé', () => {
		const mien = atelierOf([['f', 'x^2']]);
		const recu = atelierOf([['f', 'x^3']]);

		const report = mergeInto(mien, recu.serialize());

		expect(report.renamed[0].from).toBe('f');
		expect(report.renamed[0].to).not.toBe('f');
		expect(mien.get(report.renamed[0].to)?.definition).toBe('x^3');
	});

	it('règle plusieurs collisions d’un coup', () => {
		const mien = atelierOf([
			['f', 'x^2'],
			['g', 'x^3']
		]);
		const recu = atelierOf([
			['f', 'x^4'],
			['g', 'x^5']
		]);

		const report = mergeInto(mien, recu.serialize());

		expect(report.renamed.length).toBe(2);
		expect(mien.names.length).toBe(4);
	});

	it('ne renomme pas deux arrivants vers le même nom', () => {
		const mien = atelierOf([['f', 'x^2']]);
		const recu = atelierOf([
			['f', 'x^3'],
			['g', 'x^4']
		]);

		mergeInto(mien, recu.serialize());

		expect(new Set(mien.names).size).toBe(mien.names.length);
	});

	it('garde les listes et leurs valeurs', () => {
		const mien = new Atelier();
		const recu = new Atelier();
		recu.create({ kind: 'list', name: 'L', definition: '12 ; 15' }, 'text');

		mergeInto(mien, recu.serialize());

		const list = mien.get('L');
		expect(list && 'values' in list && list.values).toEqual([12, 15]);
	});

	it('reporte ce qui était tracé', () => {
		const mien = new Atelier();
		const recu = atelierOf([['f', 'x^2']]);
		recu.setPlotted('f', true);

		mergeInto(mien, recu.serialize());

		expect(mien.get('f')?.plotted).toBe(true);
	});
});

describe('les cas limites de la fusion', () => {
	it('fusionner un atelier vide ne fait rien', () => {
		const mien = atelierOf([['f', 'x^2']]);

		const report = mergeInto(mien, new Atelier().serialize());

		expect(mien.names).toEqual(['f']);
		expect(report.added).toBe(0);
	});

	it('fusionner dans un atelier vide garde les noms d’origine', () => {
		const mien = new Atelier();
		const recu = atelierOf([['f', 'x^2']]);

		mergeInto(mien, recu.serialize());

		expect(mien.names).toEqual(['f']);
	});

	// Le plafond D8 vaut aussi à la fusion
	it('compte ce qu’il n’a pas pu ajouter', () => {
		const mien = new Atelier();
		for (let i = 0; i < 8; i++) mien.create({ kind: 'list', definition: '1' }, 'text');
		const recu = new Atelier();
		recu.create({ kind: 'list', name: 'Z', definition: '2' }, 'text');

		const report = mergeInto(mien, recu.serialize());

		expect(report.refused.length).toBe(1);
	});

	it('ne laisse jamais l’atelier dans un état intermédiaire', () => {
		const mien = atelierOf([['f', 'x^2']]);
		const avant = mien.get('f')?.definition;

		mergeInto(mien, { version: 1, objects: [] });

		expect(mien.get('f')?.definition).toBe(avant);
	});
});
