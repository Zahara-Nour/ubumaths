/**
 * Règle commitlint `nom-interdit` : un message qui contient une forme interdite est refusé.
 *
 * Le dépôt ne garde aucune trace du nom visé, pas même ici : les tests passent leurs propres
 * empreintes, celles d'un mot inventé (« zorglub »). L'essai sur le vrai nom se fait à la main.
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

type EmpreintesParLongueur = Record<number, string[]>;

const require = createRequire(import.meta.url);
const { EMPREINTES_INTERDITES, contientNomInterdit, empreinte, regleNomInterdit } =
	require('../commitlint-nom-interdit.cjs') as {
		EMPREINTES_INTERDITES: EmpreintesParLongueur;
		contientNomInterdit: (message: string, empreintes?: EmpreintesParLongueur) => boolean;
		empreinte: (texte: string) => string;
		regleNomInterdit: (parsed: { raw?: string }) => [boolean, string];
	};

const ESSAI: EmpreintesParLongueur = { 7: [empreinte('zorglub')] };

describe('contientNomInterdit', () => {
	it('refuse le mot tel quel, en capitales, accentué ou coupé par un tiret', () => {
		expect(contientNomInterdit('docs(wip): idées reprises de zorglub', ESSAI)).toBe(true);
		expect(contientNomInterdit('feat: ZorGLUB', ESSAI)).toBe(true);
		expect(contientNomInterdit('feat: zôrglüb', ESSAI)).toBe(true);
		expect(contientNomInterdit('feat: zorg-lub', ESSAI)).toBe(true);
		expect(contientNomInterdit('fix: zorg lu b', ESSAI)).toBe(true); // séparateurs ignorés
	});

	it('refuse le mot dans le corps du message ou collé à un autre', () => {
		expect(contientNomInterdit('chore: lot\n\nsource : lezorglubien/exercices', ESSAI)).toBe(true);
	});

	it('accepte un message ordinaire', () => {
		expect(contientNomInterdit('feat(questions): lot 2de, idées reprises d’ailleurs', ESSAI)).toBe(
			false
		);
		expect(contientNomInterdit('fix: zorglu', ESSAI)).toBe(false);
	});

	it('garde par défaut des empreintes SHA-256, sans le nom en clair', () => {
		const empreintes = Object.values(EMPREINTES_INTERDITES).flat();
		expect(empreintes.length).toBeGreaterThan(0);
		for (const e of empreintes) expect(e).toMatch(/^[0-9a-f]{64}$/);
		expect(contientNomInterdit('feat(questions): lot 2de, idées reprises d’ailleurs')).toBe(false);
	});
});

describe('regleNomInterdit', () => {
	it('accepte un message ordinaire ou vide, avec la raison à afficher', () => {
		const [valide, raison] = regleNomInterdit({ raw: 'docs: rien' });
		expect(valide).toBe(true);
		expect(raison).toContain('ailleurs');
		expect(regleNomInterdit({})[0]).toBe(true);
	});
});
