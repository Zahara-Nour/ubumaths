/**
 * Règle commitlint `nom-interdit` : un message qui nomme la plateforme d'idées est refusé.
 *
 * Le nom n'est pas écrit en clair ici non plus (dépôt public) : il est reconstruit à partir
 * de ses codes de caractères.
 */

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { contientNomInterdit, regleNomInterdit } = require('../commitlint-nom-interdit.cjs') as {
	contientNomInterdit: (message: string) => boolean;
	regleNomInterdit: (parsed: { raw?: string }) => [boolean, string];
};

const NOM = String.fromCharCode(77, 97, 116, 104, 65, 76, 201, 65); // forme avec accent
const FORGE = String.fromCharCode(99, 111, 111, 112, 109, 97, 116, 104, 115);

describe('contientNomInterdit', () => {
	it('refuse le nom tel quel, en minuscules, sans accent ou coupé par un tiret', () => {
		expect(contientNomInterdit(`docs(wip): idées reprises de ${NOM}`)).toBe(true);
		expect(contientNomInterdit(`feat: ${NOM.toLowerCase()}`)).toBe(true);
		expect(contientNomInterdit(`feat: ${NOM.normalize('NFD').replace(/\p{M}/gu, '')}`)).toBe(true);
		expect(contientNomInterdit(`feat: ${NOM.slice(0, 4)}-${NOM.slice(4)}`)).toBe(true);
	});

	it('refuse le nom de la forge, même dans le corps du message', () => {
		expect(contientNomInterdit(`chore: lot\n\nsource : ${FORGE}/exercices`)).toBe(true);
	});

	it('accepte un message ordinaire', () => {
		expect(contientNomInterdit('feat(questions): lot 2de, idées reprises d’ailleurs')).toBe(false);
		expect(contientNomInterdit('fix(maths): mathématiques et calculs')).toBe(false);
	});
});

describe('regleNomInterdit', () => {
	it('rend [false, raison] sur un message fautif et [true, …] sinon', () => {
		const [valide, raison] = regleNomInterdit({ raw: `docs: ${NOM}` });
		expect(valide).toBe(false);
		expect(raison).toContain('ailleurs');
		expect(regleNomInterdit({ raw: 'docs: rien' })[0]).toBe(true);
		expect(regleNomInterdit({})[0]).toBe(true);
	});
});
