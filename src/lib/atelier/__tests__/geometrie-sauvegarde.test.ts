/**
 * La géométrie dans l'atelier, lot 1, PR 1 : sauvegarde, lien, fusion et
 * migration des ateliers rangés (phase 0 `docs/archive/wip/atelier-geometrie-phase0.md`,
 * M1, M4 et décision Q2 (a) : un objet nommé `y` est renommé à la première
 * lettre libre, et on le dit).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import {
	ATELIER_STATE_VERSION,
	ATELIER_STORAGE_KEY,
	loadAtelier,
	saveAtelier,
	type AtelierState
} from '../persistence';
import { openSession, type SessionNotice } from '../session';
import { encodeAtelier, decodeAtelier } from '../url';
import { openLink } from '../grapheur-link';
import { mergeInto } from '../merge';

// =============================================================================
// Outils
// =============================================================================

function fakeStorage(): Storage {
	const map = new Map<string, string>();
	return {
		get length() {
			return map.size;
		},
		key: (i: number) => [...map.keys()][i] ?? null,
		getItem: (k: string) => map.get(k) ?? null,
		removeItem: (k: string) => void map.delete(k),
		clear: () => map.clear(),
		setItem: (k: string, v: string) => void map.set(k, v)
	} as Storage;
}

/** Un atelier de géométrie : une valeur, un point qui la cite, une courbe. */
function geometry(): Atelier {
	const atelier = new Atelier();
	atelier.create({ kind: 'value', name: 'a', definition: '2' }, 'text');
	atelier.create({ kind: 'point', name: 'M', definition: '(a ; 2a)' }, 'text');
	atelier.create({ kind: 'curve', name: 'C', definition: 'x^2 + y^2 = a^2' }, 'text');
	return atelier;
}

/** Un atelier rangé en version 2, avec une valeur `y` citée par une fonction. */
const withY: AtelierState = {
	version: 2,
	objects: [
		{ name: 'y', kind: 'value', definition: '2' },
		{ name: 'f', kind: 'function', definition: 'y*x + 1' }
	]
};

const MIGRATED = (to: string) =>
	`« y » est désormais réservé aux équations : ton objet s’appelle maintenant ${to}.`;

// =============================================================================
// M1 — sauvegarde, lien, fusion
// =============================================================================

describe('M1 : points et courbes se rangent et se relisent', () => {
	it(`la version rangée est la ${ATELIER_STATE_VERSION}`, () => {
		// Version 3 pour les points et les courbes, 4 depuis `inFigure` (PR 3)
		expect(ATELIER_STATE_VERSION).toBe(4);
		expect(geometry().serialize().version).toBe(4);
	});

	it('stockage : aller-retour à l’identique', () => {
		const storage = fakeStorage();
		expect(saveAtelier(storage, geometry().serialize()).kind).toBe('saved');

		const loaded = loadAtelier(storage);
		expect(loaded.kind === 'loaded' && loaded.dropped).toBe(0);
		const back = new Atelier();
		if (loaded.kind === 'loaded') back.restore(loaded.state);

		expect(back.objects.map((o) => [o.name, o.kind, o.definition, o.status])).toEqual([
			['a', 'value', '2', 'ok'],
			['M', 'point', '(a ; 2a)', 'ok'],
			['C', 'curve', 'x^2 + y^2 = a^2', 'ok']
		]);
	});

	it('lien ?a= : aller-retour à l’identique', async () => {
		const encoded = await encodeAtelier(geometry().serialize());

		const decoded = await decodeAtelier(encoded.payload);

		expect(decoded.ok).toBe(true);
		const back = new Atelier();
		if (decoded.ok) back.restore(decoded.state);
		expect(back.objects.map((o) => [o.name, o.kind, o.definition])).toEqual([
			['a', 'value', '2'],
			['M', 'point', '(a ; 2a)'],
			['C', 'curve', 'x^2 + y^2 = a^2']
		]);
	});

	it('fusion : un point reçu sur un nom pris arrive renommé', () => {
		const mine = new Atelier();
		mine.create({ kind: 'value', name: 'M', definition: '5' }, 'text');

		const report = mergeInto(mine, geometry().serialize());

		expect(report.renamed).toEqual([{ from: 'M', to: 'A' }]);
		expect(mine.get('A')?.kind).toBe('point');
		expect(mine.get('M')?.kind).toBe('value');
	});
});

// =============================================================================
// M4 / Q2 — un ancien atelier qui contient un objet nommé y
// =============================================================================

describe('Q2 : un objet nommé y est renommé à la migration, et on le dit', () => {
	it('stockage : la valeur y devient a, la fonction qui la cite suit, le message est dit', () => {
		const storage = fakeStorage();
		storage.setItem(ATELIER_STORAGE_KEY, JSON.stringify(withY));
		const notices: SessionNotice[] = [];
		const atelier = new Atelier();

		const session = openSession(atelier, { storage, onNotice: (n) => notices.push(n) });
		session.close();

		expect(atelier.names).toEqual(['a', 'f']);
		expect(atelier.get('a')?.definition).toBe('2');
		expect(atelier.get('f')?.definition).toBe('a*x + 1');
		expect(atelier.get('f')?.status).toBe('ok');
		expect(notices.map((n) => n.message)).toContain(MIGRATED('a'));
	});

	it('la première lettre LIBRE : a, b, c pris → k', () => {
		const atelier = new Atelier();

		const report = atelier.restore({
			version: 2,
			objects: [
				{ name: 'a', kind: 'value', definition: '1' },
				{ name: 'b', kind: 'value', definition: '1' },
				{ name: 'c', kind: 'value', definition: '1' },
				{ name: 'y', kind: 'value', definition: '4' }
			]
		});

		expect(atelier.names).toEqual(['a', 'b', 'c', 'k']);
		expect(report.renamed).toEqual([{ from: 'y', to: 'k' }]);
	});

	it('une fonction y emmène sa dérivée y′', () => {
		const atelier = new Atelier();

		atelier.restore({
			version: 2,
			objects: [
				{ name: 'y', kind: 'function', definition: 'x^2', plotted: true },
				{ name: "y'", kind: 'function', definition: "y'(x)" }
			]
		});

		expect(atelier.names).toEqual(['f', "f'"]);
		expect(atelier.get("f'")?.status).toBe('ok');
		expect(atelier.get('f')?.plotted).toBe(true);
	});

	it('le premier terme d’une suite qui cite y suit le renommage', () => {
		const atelier = new Atelier();

		atelier.restore({
			version: 2,
			objects: [
				{ name: 'y', kind: 'value', definition: '3' },
				{ name: 'u', kind: 'sequence', definition: '2u(n)', mode: 'recurrence', firstTerm: 'y' }
			]
		});

		const u = atelier.get('u');
		expect(u?.kind === 'sequence' && u.firstTerm).toBe('a');
		expect(u?.status).toBe('ok');
	});

	it('lien reçu : le message est dit à l’ouverture', async () => {
		const encoded = await encodeAtelier(withY);
		const params = new URLSearchParams({ a: encoded.payload });

		const opened = await openLink(params);

		expect(opened.kind).toBe('received');
		if (opened.kind !== 'received') return;
		expect(opened.atelier.names).toEqual(['a', 'f']);
		expect(opened.notice).toContain(MIGRATED('a'));
	});

	it('fusion : y reçu arrive renommé, et le rapport le dit', () => {
		const mine = new Atelier();
		mine.create({ kind: 'value', name: 'a', definition: '7' }, 'text');

		const report = mergeInto(mine, withY);

		// a est pris chez l'élève : y devient b, et f le cite sous ce nom
		expect(report.renamed).toEqual([{ from: 'y', to: 'b' }]);
		expect(mine.get('b')?.definition).toBe('2');
		expect(mine.get('a')?.definition).toBe('7');
		expect(mine.get('f')?.definition).toBe('b*x + 1');
	});

	it('jamais de perte silencieuse : rien n’est écarté', () => {
		const atelier = new Atelier();

		const report = atelier.restore(withY);

		expect(report.skipped).toEqual([]);
		expect(atelier.objects).toHaveLength(2);
	});
});
