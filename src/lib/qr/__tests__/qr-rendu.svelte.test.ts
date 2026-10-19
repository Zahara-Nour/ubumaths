/**
 * QR stylé (gidouille, cases et yeux arrondis) : dessiné par le navigateur,
 * il se lit encore, des adresses courtes jusqu'à la version 15.
 */
import { describe, expect, it } from 'vitest';
import { encodeQr, qrSvg } from '../qr-code';
import { decodeSvg } from './decode-qr';

/** Une adresse par version, de la 3 (`https://www.chiph.re/` seule) à la 15 */
function addressesByVersion(): Map<number, string> {
	const found = new Map<number, string>();
	for (let length = 0; length <= 200; length++) {
		const url = `https://www.chiph.re/${'a'.repeat(length)}`;
		const version = encodeQr(url)?.version;
		if (version !== undefined && !found.has(version)) found.set(version, url);
	}
	return found;
}

const BY_VERSION = addressesByVersion();

describe('QR stylé rendu par le navigateur', () => {
	it('a une adresse pour chaque version de 3 à 15', () => {
		expect([...BY_VERSION.keys()].sort((a, b) => a - b)).toEqual([
			3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15
		]);
	});

	// Versions 7 à 15 : le logo recouvre un motif d'alignement, la correction H doit suffire
	it.each([...BY_VERSION])(
		'version %i : se lit et redonne l’adresse exacte',
		async (_version, url) => {
			const qr = encodeQr(url);
			if (!qr) throw new Error('QR attendu');

			expect(await decodeSvg(qrSvg(qr, `QR code vers ${url}`), qr.size)).toBe(url);
		}
	);

	it('se lit pour une adresse à jeton ordinaire', async () => {
		const url =
			'https://www.chiph.re/exercice/derivee-d-un-produit-de-fonctions?token=Ab12Cd34Ef56Gh78';
		const qr = encodeQr(url);
		if (!qr) throw new Error('QR attendu');
		expect(await decodeSvg(qrSvg(qr, `QR code vers ${url}`), qr.size)).toBe(url);
	});
});
