/**
 * Noms interdits (`scripts/noms-interdits.cjs`) : chargement hors du dépôt, mise en forme,
 * règle commitlint. Le dépôt ne contient pas les vrais noms : les tests utilisent des mots
 * inventés (« zorglub », « blorx »).
 */

import { describe, it, expect, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

type Env = Record<string, string | undefined>;

const require = createRequire(import.meta.url);
const { chargerRacines, normaliser, regleNomInterdit, trouverNomInterdit } =
	require('../noms-interdits.cjs') as {
		chargerRacines: (options?: { env?: Env; lireFichier?: (chemin: string) => string }) => string[];
		normaliser: (texte: string) => string;
		regleNomInterdit: (parsed: { raw?: string }) => [boolean, string];
		trouverNomInterdit: (texte: string, racines: string[]) => number;
	};

const RACINES = ['zorglub', 'blorx'];
const sansFichier = () => {
	throw new Error('absent');
};

describe('normaliser', () => {
	it('décode %XX, retire accents, capitales, chiffres et séparateurs', () => {
		expect(normaliser('Zôr-GLÜB 2d')).toBe('zorglubd');
		expect(normaliser('ZORGL%C3%9CB')).toBe('zorglub');
		expect(normaliser('Zorglüb')).toBe('zorglub'); // accent décomposé
		expect(normaliser('100%vrai %ZZ')).toBe('vraizz'); // pourcent isolé : laissé
	});
});

describe('trouverNomInterdit', () => {
	it('trouve chaque racine sous toutes ses écritures, rend son numéro', () => {
		expect(trouverNomInterdit('docs: idées de ZorGlub', RACINES)).toBe(1);
		expect(trouverNomInterdit('https://ex.test/Zorgl%C3%BCb/wiki', RACINES)).toBe(1);
		expect(trouverNomInterdit('feat: zorg lub', RACINES)).toBe(1);
		expect(trouverNomInterdit('source : blorxs.fr', RACINES)).toBe(2);
		expect(trouverNomInterdit('chemin/Blorx-truc.tex', RACINES)).toBe(2);
	});

	it('accepte un texte ordinaire', () => {
		expect(trouverNomInterdit('feat(questions): idées reprises d’ailleurs', RACINES)).toBe(0);
		expect(trouverNomInterdit('zorgl et blo', RACINES)).toBe(0);
	});
});

describe('chargerRacines', () => {
	let dossier: string | undefined;
	afterEach(() => {
		if (dossier) rmSync(dossier, { recursive: true, force: true });
		dossier = undefined;
	});

	it('lit la variable NOMS_INTERDITS (virgules ou retours à la ligne), normalisée', () => {
		expect(
			chargerRacines({ env: { NOMS_INTERDITS: 'Zorglub, BLÖRX\n' }, lireFichier: sansFichier })
		).toEqual(['zorglub', 'blorx']);
	});

	it('sinon lit le fichier désigné, sans les commentaires ni les lignes vides', () => {
		dossier = mkdtempSync(join(tmpdir(), 'noms-'));
		const fichier = join(dossier, 'noms');
		writeFileSync(fichier, '# commentaire, avec virgule\nzorglub\n\nblorx # fin, aussi\n');
		expect(chargerRacines({ env: { NOMS_INTERDITS_FICHIER: fichier } })).toEqual(RACINES);
	});

	it('échoue sans variable ni fichier, ou avec un fichier vide', () => {
		expect(() => chargerRacines({ env: {}, lireFichier: sansFichier })).toThrow(/introuvables/);
		expect(() => chargerRacines({ env: {}, lireFichier: () => '# rien\n' })).toThrow(
			/aucune racine/
		);
		expect(() =>
			chargerRacines({ env: { NOMS_INTERDITS: ' , ' }, lireFichier: sansFichier })
		).toThrow();
	});
});

describe('regleNomInterdit (commitlint)', () => {
	const ancien = { ...process.env };
	afterEach(() => {
		process.env = { ...ancien };
	});

	it('refuse un message qui contient une racine, sans la recopier', () => {
		process.env.NOMS_INTERDITS = 'zorglub';
		const [valide, raison] = regleNomInterdit({ raw: 'docs: idées de Zorglub' });
		expect(valide).toBe(false);
		expect(raison).toContain('n° 1');
		expect(raison.toLowerCase()).not.toContain('zorglub');
		expect(regleNomInterdit({ raw: 'docs: rien' })[0]).toBe(true);
	});

	it('refuse tout message quand les noms sont introuvables', () => {
		delete process.env.NOMS_INTERDITS;
		process.env.NOMS_INTERDITS_FICHIER = join(tmpdir(), 'noms-absent-' + Date.now());
		const [valide, raison] = regleNomInterdit({ raw: 'docs: rien' });
		expect(valide).toBe(false);
		expect(raison).toContain('introuvables');
	});
});
