import { describe, expect, it } from 'vitest';
import { encode } from 'uqr';
import { QR_BORDER, QR_COLORS, QR_MAX_VERSION, encodeQr, qrFileName, qrSvg } from '../qr-code';

describe('encodeQr', () => {
	it('encode exactement l’adresse reçue, en correction H avec une marge de 4 modules', () => {
		const url = 'https://www.chiph.re/exercice/aire-du-disque?token=Ab12Cd34Ef56Gh78';
		const qr = encodeQr(url);

		expect(qr).not.toBeNull();
		// La même adresse encodée par la bibliothèque, avec les mêmes réglages : la même matrice
		const reference = encode(url, { ecc: 'H', border: QR_BORDER });
		expect(qr?.data).toEqual(reference.data);
		// La marge : 4 modules blancs tout autour
		const size = qr?.size ?? 0;
		for (let i = 0; i < QR_BORDER; i++) {
			expect(qr?.data[i].every((dark) => !dark)).toBe(true);
			expect(qr?.data[size - 1 - i].every((dark) => !dark)).toBe(true);
		}
	});

	it('une autre adresse donne une autre matrice', () => {
		const a = encodeQr('https://www.chiph.re/glossaire');
		const b = encodeQr('https://www.chiph.re/shtam');
		expect(a?.data).not.toEqual(b?.data);
	});

	it('refuse une adresse trop longue pour un QR code lisible', () => {
		expect(
			encodeQr(`https://www.chiph.re/automaths/test?categories=${'%2522x'.repeat(200)}`)
		).toBeNull();
	});

	it('accepte une adresse de 210 caractères (version 15 au plus en correction H)', () => {
		const qr = encodeQr(`https://www.chiph.re/automaths/test?c=${'a'.repeat(172)}`);
		expect(qr).not.toBeNull();
		expect(qr?.version).toBeLessThanOrEqual(QR_MAX_VERSION);
	});

	it('refuse une adresse de 240 caractères (au-delà de la version 15 en correction H)', () => {
		expect(encodeQr(`https://www.chiph.re/automaths/test?c=${'a'.repeat(202)}`)).toBeNull();
	});

	it('accepte une adresse de partage d’exercice ordinaire', () => {
		const qr = encodeQr(
			'https://www.chiph.re/exercice/derivee-d-un-produit-de-fonctions?token=Ab12Cd34Ef56Gh78'
		);
		expect(qr).not.toBeNull();
		expect(qr?.version).toBeLessThanOrEqual(QR_MAX_VERSION);
	});
});

describe('qrSvg', () => {
	it('dessine le QR stylé : fond blanc, cases, yeux et gidouille aux couleurs du thème, avec un titre', () => {
		const qr = encodeQr('https://www.chiph.re/glossaire');
		if (!qr) throw new Error('QR attendu');
		const svg = qrSvg(qr, 'QR code vers https://www.chiph.re/glossaire');

		expect(svg.startsWith('<svg')).toBe(true);
		expect(svg).toContain(`viewBox="0 0 ${qr.size} ${qr.size}"`);
		expect(svg).toContain('<title>QR code vers https://www.chiph.re/glossaire</title>');
		expect(svg).toContain(`fill="${QR_COLORS.background}"`);
		expect(svg).toContain(`fill="${QR_COLORS.modules}"`);
		expect(svg).toContain(`fill="${QR_COLORS.eyes}"`);
		expect(svg).toContain(`stroke="${QR_COLORS.gidouille}"`);
		// Des formes arrondies : pas de rendu en escalier
		expect(svg).not.toContain('crispEdges');
	});

	it('variante B : cases #1a1a1a, yeux #b25f00, gidouille #fc8f1b', () => {
		expect(QR_COLORS).toEqual({
			background: '#ffffff',
			modules: '#1a1a1a',
			eyes: '#b25f00',
			gidouille: '#fc8f1b'
		});
	});

	it('échappe le titre', () => {
		const qr = encodeQr('https://www.chiph.re/a?b=1&c=2');
		if (!qr) throw new Error('QR attendu');
		expect(qrSvg(qr, 'QR code vers https://www.chiph.re/a?b=1&c=2<x>')).toContain(
			'b=1&amp;c=2&lt;x&gt;'
		);
	});
});

describe('qrFileName', () => {
	it('donne un nom de fichier parlant, sans accent ni espace', () => {
		expect(qrFileName('Aire du disque', 'png')).toBe('qr-aire-du-disque.png');
		expect(qrFileName('Glossaire mathématique', 'svg')).toBe('qr-glossaire-mathematique.svg');
		expect(qrFileName('   ', 'png')).toBe('qr-chiphre.png');
	});
});
