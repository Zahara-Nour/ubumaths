/**
 * `#` dans une chaîne n'ouvre pas un commentaire (relecture 2026-10-01) :
 * sans cela, une couleur hexadécimale `couleur="#2563eb"` — la seule forme
 * sûre pour l'export PDF — était impossible à écrire (« Chaîne non fermée »).
 */
import { describe, it, expect } from 'vitest';
import { runDsl } from '../..';
import { resolveStyle } from '../../rendering/svg-primitives';

describe('tokenizer — # dans une chaîne', () => {
	it('couleur hexadécimale écrite dans le script', () => {
		const { figure } = runDsl('A = point(0, 0, couleur="#2563eb")');
		const A = figure.getAllElements().find((e) => e.label === 'A')!;
		expect(resolveStyle(A, figure.defaults).color).toBe('#2563eb');
	});

	it('un vrai commentaire après une chaîne reste un commentaire', () => {
		const { figure } = runDsl('texte(1, 1, "a#b") # commentaire "x');
		const t = figure.getAllElements().find((e) => e.type === 'text')!;
		expect(figure.resolveTemplate(t.id)).toBe('a#b');
	});

	it('ligne de commentaire seule : ignorée', () => {
		expect(() => runDsl('# rien "\nA = point(0, 0)')).not.toThrow();
	});
});
