import { describe, expect, it } from 'vitest';
import { DISPATCHES, dispatchCiphertext } from '../dispatches';
import { MAX_URL_MESSAGE, decryptQuery, readDecryptParam } from '../tool-link';

describe('lien vers les outils', () => {
	it('aller-retour : espaces, accents et chiffres survivent à l’URL', () => {
		const message = 'OH FCDU, 45 12 : é ?';
		const params = new URL(`https://chiph.re/chiffrement/cesar${decryptQuery(message)}`)
			.searchParams;
		expect(readDecryptParam(params)).toBe(message);
	});

	it('absent ou vide → null', () => {
		expect(readDecryptParam(new URLSearchParams())).toBeNull();
		expect(readDecryptParam(new URLSearchParams('decrypter='))).toBeNull();
	});

	it('les neuf dépêches passent le filtre', () => {
		for (const dispatch of DISPATCHES) {
			const params = new URLSearchParams(decryptQuery(dispatchCiphertext(dispatch)));
			expect(readDecryptParam(params)).toBe(dispatchCiphertext(dispatch));
		}
	});

	// Revue du 2026-10-07 : un lien fabriqué ne doit pas afficher n'importe quoi sur chiph.re
	it.each(['Rendez-vous sur https://exemple.com', 'écrivez à x@y.fr', '<b>gras</b>', 'a=b&c'])(
		'texte hors alphabet des dépêches (%s) → ignoré',
		(message) => {
			expect(readDecryptParam(new URLSearchParams({ decrypter: message }))).toBeNull();
		}
	);

	it('trop long → ignoré', () => {
		const params = new URLSearchParams({ decrypter: 'A'.repeat(MAX_URL_MESSAGE + 1) });
		expect(readDecryptParam(params)).toBeNull();
	});
});
