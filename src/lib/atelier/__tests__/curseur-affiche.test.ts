/**
 * Le curseur affiché à la main sur une valeur qui n'est pas un paramètre
 * (Affichage → Curseur, lot 4a de la refonte) est RETENU avec l'atelier, comme
 * la couleur d'une courbe — décision de David du 2026-10-18. Il survit au
 * rechargement, au renommage, au fichier `.atelier.json` et au lien.
 *
 * Rangé seulement quand il est affiché : la version de l'état ne bouge pas.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { loadAtelier, saveAtelier } from '../persistence';
import { atelierFileToJson, readAtelierFile } from '../atelier-file';
import { encodeAtelier, decodeAtelier } from '../url';
import { isValue } from '../types';

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

/** `a = 2`, son curseur affiché depuis le menu. */
function withShownSlider(): Atelier {
	const atelier = new Atelier();
	atelier.create({ kind: 'value', name: 'a', definition: '2' }, 'text');
	atelier.setSliderShown('a', true);
	return atelier;
}

function shown(atelier: Atelier, name: string): boolean {
	const object = atelier.get(name);
	return object !== undefined && isValue(object) && object.sliderShown === true;
}

describe('le curseur affiché depuis le menu', () => {
	it('est retenu sur la valeur, et se masque', () => {
		const atelier = withShownSlider();
		expect(shown(atelier, 'a')).toBe(true);

		atelier.setSliderShown('a', false);

		expect(shown(atelier, 'a')).toBe(false);
	});

	it('n’est rangé que lorsqu’il est affiché', () => {
		const atelier = withShownSlider();
		expect(atelier.serialize().objects[0]).toMatchObject({ sliderShown: true });

		atelier.setSliderShown('a', false);

		expect(atelier.serialize().objects[0]).not.toHaveProperty('sliderShown');
	});

	it('survit au rechargement', () => {
		const storage = memoryStorage();
		saveAtelier(storage, withShownSlider().serialize());

		const loaded = loadAtelier(storage);

		expect(loaded.kind).toBe('loaded');
		if (loaded.kind !== 'loaded') return;
		const fresh = new Atelier();
		fresh.restore(loaded.state);
		expect(shown(fresh, 'a')).toBe(true);
	});

	it('survit au renommage', () => {
		const atelier = withShownSlider();

		expect(atelier.rename('a', 'k').ok).toBe(true);

		expect(shown(atelier, 'k')).toBe(true);
	});

	it('voyage dans le fichier .atelier.json', () => {
		const read = readAtelierFile(
			atelierFileToJson(withShownSlider().serialize(), [], [], new Date())
		);

		expect(read.kind).toBe('atelier');
		if (read.kind !== 'atelier') return;
		const fresh = new Atelier();
		fresh.restore(read.state);
		expect(shown(fresh, 'a')).toBe(true);
	});

	it('voyage dans le lien de partage', async () => {
		const encoded = await encodeAtelier(withShownSlider().serialize());
		const decoded = await decodeAtelier(encoded.payload);

		expect(decoded.ok).toBe(true);
		if (!decoded.ok) return;
		const fresh = new Atelier();
		fresh.restore(decoded.state);
		expect(shown(fresh, 'a')).toBe(true);
	});

	it('une valeur sans curseur (grandeur) ne le retient pas', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'v', definition: '12[km]' }, 'url');

		expect(atelier.setSliderShown('v', true).ok).toBe(false);
		expect(shown(atelier, 'v')).toBe(false);
	});
});
