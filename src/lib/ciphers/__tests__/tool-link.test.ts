import { describe, expect, it } from 'vitest';
import { MAX_URL_MESSAGE, decryptQuery, readDecryptParam } from '../tool-link';

describe('lien vers les outils', () => {
	it('aller-retour : espaces, accents et chiffres survivent à l’URL', () => {
		const message = 'OH FCDU, 45 12 & é ?';
		const params = new URL(`https://chiph.re/chiffrement/cesar${decryptQuery(message)}`)
			.searchParams;
		expect(readDecryptParam(params)).toBe(message);
	});

	it('absent ou vide → null', () => {
		expect(readDecryptParam(new URLSearchParams())).toBeNull();
		expect(readDecryptParam(new URLSearchParams('decrypter='))).toBeNull();
	});

	it('trop long → ignoré', () => {
		const params = new URLSearchParams({ decrypter: 'A'.repeat(MAX_URL_MESSAGE + 1) });
		expect(readDecryptParam(params)).toBeNull();
	});
});
