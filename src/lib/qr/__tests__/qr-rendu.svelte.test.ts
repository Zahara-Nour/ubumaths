/**
 * QR stylé (gidouille, cases et yeux arrondis) : dessiné par le navigateur,
 * il se lit encore, des adresses courtes jusqu'à la version 15.
 */
import { describe, expect, it } from 'vitest';
import { encodeQr, qrSvg } from '../qr-code';
import { decodeSvg } from './decode-qr';

const ADDRESSES = [
	'https://www.chiph.re/glossaire',
	'https://www.chiph.re/exercice/derivee-d-un-produit-de-fonctions?token=Ab12Cd34Ef56Gh78',
	`https://www.chiph.re/automaths/test?categories=${'%2522x'.repeat(16)}`,
	`https://www.chiph.re/automaths/test?c=${'a'.repeat(172)}`
];

describe('QR stylé rendu par le navigateur', () => {
	it.each(ADDRESSES)('se lit et redonne l’adresse exacte : %s', async (url) => {
		const qr = encodeQr(url);
		if (!qr) throw new Error('QR attendu');

		expect(await decodeSvg(qrSvg(qr, `QR code vers ${url}`), qr.size)).toBe(url);
	});

	it('couvre des versions variées, jusqu’à la 15', () => {
		const versions = ADDRESSES.map((url) => encodeQr(url)?.version ?? 0);
		expect(Math.min(...versions)).toBeLessThanOrEqual(4);
		expect(Math.max(...versions)).toBeGreaterThanOrEqual(13);
	});
});
