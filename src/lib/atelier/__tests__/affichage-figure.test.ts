/**
 * Les réglages d'affichage d'un point et d'une courbe — lot 4b de la refonte de
 * l'atelier (`docs/archive/wip/atelier-refonte-interface-phase0.md`, lot 4).
 *
 * Un point a une couleur, une taille et une étiquette (`PointDisplay`) ; une
 * courbe, une couleur et un trait (`StrokeDisplay`, les trois champs de
 * `CurveDisplay` qu'elle peut porter). ABSENTS tant que l'élève n'a rien
 * réglé : un atelier sans réglage ne paie rien dans le lien, et la version de
 * l'état ne bouge pas (un ancien état se relit tel quel).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { loadAtelier, saveAtelier, ATELIER_STORAGE_KEY, type AtelierState } from '../persistence';
import { encodeAtelier, decodeAtelier } from '../url';
import { mergeInto } from '../merge';
import { atelierFileToJson, readAtelierFile } from '../atelier-file';
import type { AtelierObject } from '../types';

// =============================================================================
// Décor
// =============================================================================

function memoryStorage(): Storage {
	const data = new Map<string, string>();
	return {
		get length() {
			return data.size;
		},
		clear: () => data.clear(),
		getItem: (k) => data.get(k) ?? null,
		key: (i) => [...data.keys()][i] ?? null,
		removeItem: (k) => void data.delete(k),
		setItem: (k, v) => void data.set(k, v)
	};
}

/** A(1 ; 2) et d : y = 3x − 2. */
function figure(): Atelier {
	const atelier = new Atelier();
	atelier.create({ kind: 'point', name: 'A', definition: '(1 ; 2)' }, 'text');
	atelier.create({ kind: 'curve', name: 'd', definition: 'y = 3x - 2' }, 'text');
	return atelier;
}

function displayOf(atelier: Atelier, name: string): unknown {
	const object: AtelierObject | undefined = atelier.get(name);
	if (object === undefined) throw new Error(`pas de ${name}`);
	return 'display' in object ? object.display : undefined;
}

function storedOf(state: AtelierState, name: string) {
	const stored = state.objects.find((o) => o.name === name);
	if (!stored) throw new Error(`${name} n'est pas rangé`);
	return stored;
}

// =============================================================================
// Régler
// =============================================================================

describe('régler un point et une courbe', () => {
	it('sans réglage, ni le point ni la courbe n’ont d’affichage', () => {
		const atelier = figure();

		expect(displayOf(atelier, 'A')).toBeUndefined();
		expect(displayOf(atelier, 'd')).toBeUndefined();
	});

	it('un point reçoit sa couleur, et les défauts pour le reste', () => {
		const atelier = figure();

		expect(atelier.setFigureDisplay('A', { color: 'curve-3' })).toEqual({ ok: true });

		expect(displayOf(atelier, 'A')).toEqual({ color: 'curve-3', size: 'medium', showLabel: true });
	});

	it('une courbe reçoit sa couleur et son trait', () => {
		const atelier = figure();

		atelier.setFigureDisplay('d', { lineWidth: 4 });
		atelier.setFigureDisplay('d', { lineStyle: 'dashed' });

		// Pas de couleur : le premier réglage part de ce qui est dessiné (la couleur
		// de la figure), régler le trait ne repeint pas la courbe
		expect(displayOf(atelier, 'd')).toEqual({ lineStyle: 'dashed', lineWidth: 4 });
	});

	it('l’étiquette d’un point se masque', () => {
		const atelier = figure();

		atelier.setFigureDisplay('A', { showLabel: false });

		expect(displayOf(atelier, 'A')).toMatchObject({ showLabel: false });
	});

	it('un réglage qui n’est pas le sien est refusé, sans rien changer', () => {
		const atelier = figure();

		const forPoint = atelier.setFigureDisplay('A', { lineWidth: 4 });
		const forCurve = atelier.setFigureDisplay('d', { size: 'large' });
		// Une couleur hors palette, venue d'ailleurs que de la carte (un lien forgé)
		const badColor = atelier.setFigureDisplay('A', { color: 'rouge' } as never);

		expect(forPoint.ok).toBe(false);
		expect(forCurve.ok).toBe(false);
		expect(badColor.ok).toBe(false);
		expect(displayOf(atelier, 'A')).toBeUndefined();
		expect(displayOf(atelier, 'd')).toBeUndefined();
	});

	it('une fonction ne passe pas par cette porte', () => {
		const atelier = figure();
		atelier.create({ kind: 'function', name: 'f', definition: 'x' });

		expect(atelier.setFigureDisplay('f', { color: 'curve-2' }).ok).toBe(false);
	});

	it('modifier la définition garde le dessin', () => {
		const atelier = figure();
		atelier.setFigureDisplay('A', { color: 'curve-2' });
		atelier.setFigureDisplay('d', { lineWidth: 4 });

		atelier.update('A', '(3 ; 4)', 'text');
		atelier.update('d', 'y = x', 'text');

		expect(displayOf(atelier, 'A')).toMatchObject({ color: 'curve-2' });
		expect(displayOf(atelier, 'd')).toMatchObject({ lineWidth: 4 });
	});

	it('un réglage fait avancer la révision (sauvegarde, vue Géométrie)', () => {
		const atelier = figure();
		const before = atelier.revision;

		atelier.setFigureDisplay('A', { size: 'large' });

		expect(atelier.revision).toBeGreaterThan(before);
	});
});

// =============================================================================
// Ranger, relire, partager, fusionner
// =============================================================================

describe('réglages d’un point et d’une courbe — rangés avec l’objet', () => {
	it('absents quand rien n’est réglé : l’état n’en paie rien', () => {
		const state = figure().serialize();

		expect(storedOf(state, 'A')).not.toHaveProperty('figureDisplay');
		expect(storedOf(state, 'd')).not.toHaveProperty('figureDisplay');
	});

	it('rangés et relus à l’identique', () => {
		const atelier = figure();
		atelier.setFigureDisplay('A', { color: 'curve-4', size: 'small', showLabel: false });
		atelier.setFigureDisplay('d', { color: 'curve-2', lineStyle: 'dotted', lineWidth: 3 });
		const storage = memoryStorage();

		saveAtelier(storage, atelier.serialize());
		const loaded = loadAtelier(storage);

		expect(loaded.kind).toBe('loaded');
		if (loaded.kind !== 'loaded') return;
		const fresh = new Atelier();
		fresh.restore(loaded.state);
		expect(displayOf(fresh, 'A')).toEqual(displayOf(atelier, 'A'));
		expect(displayOf(fresh, 'd')).toEqual(displayOf(atelier, 'd'));
	});

	it('un réglage abîmé est oublié, l’objet gardé', () => {
		const storage = memoryStorage();
		storage.setItem(
			ATELIER_STORAGE_KEY,
			JSON.stringify({
				version: 4,
				objects: [
					{
						name: 'A',
						kind: 'point',
						definition: '(1 ; 2)',
						figureDisplay: { color: 'curve-1', size: 'énorme', showLabel: true }
					},
					{
						name: 'd',
						kind: 'curve',
						definition: 'y = x',
						// Le réglage d'un point sur une courbe : pas le sien
						figureDisplay: { color: 'curve-1', size: 'small', showLabel: true }
					}
				]
			})
		);

		const loaded = loadAtelier(storage);

		expect(loaded.kind).toBe('loaded');
		if (loaded.kind !== 'loaded') return;
		const fresh = new Atelier();
		fresh.restore(loaded.state);
		expect(fresh.get('A')?.status).toBe('ok');
		expect(fresh.get('d')?.status).toBe('ok');
		expect(displayOf(fresh, 'A')).toBeUndefined();
		expect(displayOf(fresh, 'd')).toBeUndefined();
	});

	it('un état d’avant ce lot (sans réglage) se relit tel quel', () => {
		const storage = memoryStorage();
		storage.setItem(
			ATELIER_STORAGE_KEY,
			JSON.stringify({
				version: 4,
				objects: [{ name: 'A', kind: 'point', definition: '(1 ; 2)' }]
			})
		);

		const loaded = loadAtelier(storage);

		expect(loaded.kind).toBe('loaded');
		if (loaded.kind !== 'loaded') return;
		const fresh = new Atelier();
		fresh.restore(loaded.state);
		expect(fresh.get('A')?.status).toBe('ok');
		expect(displayOf(fresh, 'A')).toBeUndefined();
	});

	it('voyagent dans le lien de partage', async () => {
		const atelier = figure();
		atelier.setFigureDisplay('A', { color: 'curve-4' });
		atelier.setFigureDisplay('d', { lineWidth: 4 });

		const encoded = await encodeAtelier(atelier.serialize());
		const decoded = await decodeAtelier(encoded.payload);

		expect(decoded.ok).toBe(true);
		if (!decoded.ok) return;
		const fresh = new Atelier();
		fresh.restore(decoded.state);
		expect(displayOf(fresh, 'A')).toEqual(displayOf(atelier, 'A'));
		expect(displayOf(fresh, 'd')).toEqual(displayOf(atelier, 'd'));
	});

	it('voyagent dans le fichier .atelier.json (lot 1)', () => {
		const atelier = figure();
		atelier.setFigureDisplay('A', { size: 'large' });

		const read = readAtelierFile(atelierFileToJson(atelier.serialize(), [], [], new Date()));

		expect(read.kind).toBe('atelier');
		if (read.kind !== 'atelier') return;
		const fresh = new Atelier();
		fresh.restore(read.state);
		expect(displayOf(fresh, 'A')).toEqual(displayOf(atelier, 'A'));
	});

	it('suivent l’objet quand un lien est fusionné dans un atelier', () => {
		const source = figure();
		source.setFigureDisplay('A', { color: 'curve-4' });
		const target = new Atelier();
		target.create({ kind: 'point', name: 'A', definition: '(0 ; 0)' }, 'text');

		const report = mergeInto(target, source.serialize());

		// `A` est pris : l'arrivant est renommé, son réglage le suit
		const arrived = report.renamed.find((r) => r.from === 'A')?.to;
		expect(arrived).toBeDefined();
		expect(displayOf(target, arrived!)).toMatchObject({ color: 'curve-4' });
	});
});
