/**
 * L'URL porte l'atelier — lot 5.
 *
 * ⚠️ **La compression n'est pas une optimisation.** Mesuré le 2026-09-16 :
 * l'atelier au plafond D8 (8 listes × 200 valeurs) fait 16 752 caractères en
 * base64 brut, contre 788 compressé. Sans elle, la promesse de D8 — « tenir sous
 * les 2 000 caractères d'URL qui passent partout » — est fausse d'un facteur 8.
 *
 * Q1 : repli sur base64 brut quand `CompressionStream` manque (Safari < 16.4),
 * le format étant distingué par un préfixe d'un caractère.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { encodeAtelier, decodeAtelier, MAX_URL_PAYLOAD } from '../url';

function atelierOf(objects: Array<[string, string, 'function' | 'value' | 'list']>) {
	const atelier = new Atelier();
	for (const [name, definition, kind] of objects) {
		atelier.create({ kind, name, definition }, 'text');
	}
	return atelier;
}

describe('aller-retour', () => {
	it('retrouve les objets', async () => {
		const atelier = atelierOf([
			['f', 'x^2-3x+1', 'function'],
			['a', '3', 'value']
		]);

		const encoded = await encodeAtelier(atelier.serialize());
		const decoded = await decodeAtelier(encoded.payload);

		expect(decoded.ok).toBe(true);
		expect(decoded.ok && decoded.state.objects.map((o) => o.name)).toEqual(['f', 'a']);
	});

	it('retrouve les définitions à l’identique', async () => {
		const atelier = atelierOf([['f', 'sin(x)+cos(2x)', 'function']]);

		const encoded = await encodeAtelier(atelier.serialize());
		const decoded = await decodeAtelier(encoded.payload);

		expect(decoded.ok && decoded.state.objects[0].definition).toBe('sin(x)+cos(2x)');
	});

	it('retrouve une liste et ses valeurs', async () => {
		const atelier = atelierOf([['L', '12 ; 15 ; 9', 'list']]);

		const encoded = await encodeAtelier(atelier.serialize());
		const decoded = await decodeAtelier(encoded.payload);

		const restored = new Atelier();
		restored.restore(decoded.ok ? decoded.state : { version: 1, objects: [] });
		const list = restored.get('L');
		expect(list && 'values' in list && list.values).toEqual([12, 15, 9]);
	});

	it('produit une charge utilisable dans une URL', async () => {
		const atelier = atelierOf([['f', 'x^2', 'function']]);

		const { payload } = await encodeAtelier(atelier.serialize());

		// base64url : rien qui demande un échappement
		expect(payload).toMatch(/^[0-9A-Za-z_-]+$/);
	});
});

describe('la compression tient la promesse de D8', () => {
	it('fait tenir l’atelier le plus lourd sous la limite', async () => {
		const atelier = new Atelier();
		for (let i = 0; i < 8; i++) {
			atelier.create(
				{
					kind: 'list',
					definition: Array.from({ length: 200 }, (_, k) => (k * 1.5).toFixed(1)).join(' ; ')
				},
				'text'
			);
		}

		const { payload, compressed } = await encodeAtelier(atelier.serialize());

		expect(compressed).toBe(true);
		// Sans compression : 16 752 caractères, mesuré
		expect(payload.length).toBeLessThan(MAX_URL_PAYLOAD);
	});

	it('annonce la taille, pour pouvoir prévenir AVANT de copier (§6 L1)', async () => {
		const atelier = atelierOf([['f', 'x^2', 'function']]);

		const encoded = await encodeAtelier(atelier.serialize());

		expect(encoded.payload.length).toBeGreaterThan(0);
		expect(encoded.withinLimit).toBe(true);
	});
});

describe('ce qui arrive par une URL n’est jamais cru sur parole', () => {
	it('refuse une charge tronquée', async () => {
		const atelier = atelierOf([['f', 'x^2-3x+1', 'function']]);
		const { payload } = await encodeAtelier(atelier.serialize());

		const decoded = await decodeAtelier(payload.slice(0, Math.floor(payload.length / 2)));

		// §6 L2 : jamais d'ouverture à moitié
		expect(decoded.ok).toBe(false);
	});

	it('refuse du charabia', async () => {
		expect((await decodeAtelier('pas-du-tout-une-charge')).ok).toBe(false);
	});

	it('refuse une charge vide', async () => {
		expect((await decodeAtelier('')).ok).toBe(false);
	});

	it('refuse une charge trop longue sans la décoder', async () => {
		const decoded = await decodeAtelier('A'.repeat(MAX_URL_PAYLOAD + 1));

		expect(decoded.ok).toBe(false);
		expect(decoded.ok === false && decoded.reason).toBe('too-long');
	});

	// §6 L3 : une version plus récente n'est pas une corruption
	it('distingue une version plus récente d’une corruption', async () => {
		const future = { version: 99, objects: [] };
		const encoded = await encodeAtelier(future as never);

		const decoded = await decodeAtelier(encoded.payload);

		expect(decoded.ok).toBe(false);
		expect(decoded.ok === false && decoded.reason).toBe('too-recent');
	});

	/**
	 * ⚠️ L'enveloppe est volontairement permissive (`objects: z.array(z.unknown())`) :
	 * le tri se fait objet par objet dans `restore`, pour n'en perdre qu'UN à la
	 * fois plutôt que tout l'atelier. Décision du lot 1, après un test qui
	 * validait une perte silencieuse.
	 *
	 * Un objet hostile passe donc l'enveloppe — et se fait écarter ensuite, en
	 * étant SIGNALÉ.
	 */
	it('écarte un objet de forme inattendue sans perdre les autres', async () => {
		const hostile = {
			version: 1,
			objects: [
				{ name: 'f', kind: 'function', definition: 'x^2' },
				{ name: 'g', kind: 'malware', definition: 'x' }
			]
		};
		const encoded = await encodeAtelier(hostile as never);

		const decoded = await decodeAtelier(encoded.payload);

		expect(decoded.ok).toBe(true);
		expect(decoded.ok && decoded.dropped).toBe(1);
		expect(decoded.ok && decoded.state.objects.map((o) => o.name)).toEqual(['f']);
	});

	it('rend un message en français, jamais une exception', async () => {
		const decoded = await decodeAtelier('!!!');

		expect(decoded.ok).toBe(false);
		expect(decoded.ok === false && decoded.message).toMatch(/lien/i);
	});
});
