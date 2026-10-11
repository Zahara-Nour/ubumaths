/**
 * Les messages d'erreur 4xx des pages sont en français correct
 * ============================================================
 *
 * Depuis le 2026-10-11, le message précis d'une erreur 4xx devient le TITRE de
 * la page d'erreur (`describeError`, docs/systeme/page-erreur.md) :
 * `error(404, 'Combat not found')` affichait « Combat not found » en gros
 * devant un élève. Ce garde vérifie les messages qui peuvent y arriver : ceux
 * des chargements de page (`+page.ts`, `+layout.server.ts`…) et des fonctions
 * serveur communes qu'ils appellent (`src/lib/server`).
 *
 * Hors champ : les `+server.ts` (API), dont la réponse part en JSON et
 * n'atteint jamais la page d'erreur.
 *
 * Détection par listes de mots : un mot anglais courant d'un message d'erreur,
 * ou un mot français écrit sans son accent (« trouvee », « acces »). Les
 * expressions `${…}` ne comptent pas (`${roleNames[role]}` n'est pas un mot).
 * « Deck » n'est pas dans la liste : c'est un terme du domaine (CONTEXT.md).
 *
 * @vitest-environment node
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Mots anglais des messages d'erreur ; aucun n'est un mot français. */
const ENGLISH_WORDS = [
	'not',
	'found',
	'invalid',
	'access',
	'denied',
	'only',
	'you',
	'your',
	'must',
	'required',
	'missing',
	'cannot',
	'the',
	'failed',
	'unauthorized',
	'forbidden',
	'profile',
	'permission',
	'role',
	'token',
	'environment',
	'contains',
	'inappropriate',
	'teachers',
	'logged',
	'participant',
	'origin',
	'referer',
	'headers',
	'elevation',
	'path',
	'template',
	'exercise',
	'school',
	'game',
	'error'
];

/** Mots français écrits sans leur accent. */
const UNACCENTED_WORDS = [
	'trouvee',
	'trouve',
	'acces',
	'refuse',
	'eleve',
	'entree',
	'requetes',
	'reessayez',
	'deja',
	'creee',
	'supprimee',
	'modifiee',
	'reponse',
	'resultat',
	'desactive',
	'interdite'
];

const BAD_WORD = new RegExp(`\\b(?:${[...ENGLISH_WORDS, ...UNACCENTED_WORDS].join('|')})\\b`, 'i');

/** `error(4xx, 'message')` ou `error(4xx, { message: 'message' })`, guillemets au choix. */
const ERROR_4XX = /\berror\(\s*4\d\d\s*,\s*(?:\{\s*message:\s*)?(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;

// ============================================================================
// FONCTIONS
// ============================================================================

function walk(dir: string, keep: (name: string) => boolean): string[] {
	const files: string[] = [];
	for (const name of readdirSync(dir)) {
		if (name === '__tests__' || name.startsWith('.')) continue;
		const path = join(dir, name);
		if (statSync(path).isDirectory()) files.push(...walk(path, keep));
		else if (keep(name)) files.push(path);
	}
	return files;
}

/** Les fichiers dont une erreur 4xx peut finir en titre de la page d'erreur. */
function filesReachingErrorPage(): string[] {
	const loads = walk('src/routes', (name) => /^\+(page|layout)(\.server)?\.ts$/.test(name));
	const serverLib = walk(
		'src/lib/server',
		(name) => name.endsWith('.ts') && !name.endsWith('.test.ts')
	);
	return [...loads, ...serverLib];
}

/** Les messages fautifs d'un source, sous la forme `fichier:ligne « message »`. */
function badMessages(file: string, source: string): string[] {
	return [...source.matchAll(ERROR_4XX)]
		.filter((match) => BAD_WORD.test(match[2].replace(/\$\{[^}]*\}/g, '')))
		.map((match) => {
			const line = source.slice(0, match.index).split('\n').length;
			return `${relative(process.cwd(), file)}:${line} « ${match[2]} »`;
		});
}

describe('messages d’erreur 4xx des pages : en français correct', () => {
	it('aucun message anglais ni sans accent dans les chargements de page et src/lib/server', () => {
		const offenders = filesReachingErrorPage().flatMap((file) =>
			badMessages(file, readFileSync(file, 'utf-8'))
		);
		expect(offenders).toEqual([]);
	});

	it('la règle reconnaît un message fautif, sous ses deux formes', () => {
		expect(badMessages('a.ts', "error(404, 'Combat not found')")).toHaveLength(1);
		expect(badMessages('a.ts', 'error(403, { message: "Acces refuse" })')).toHaveLength(1);
		expect(badMessages('a.ts', 'error(\n\t400,\n\t`Format ${x} invalid`\n)')).toHaveLength(1);
	});

	it('la règle laisse passer un message français correct et les erreurs 5xx', () => {
		expect(badMessages('a.ts', "error(404, 'Combat introuvable')")).toEqual([]);
		expect(badMessages('a.ts', "error(403, 'Accès réservé aux professeurs')")).toEqual([]);
		expect(badMessages('a.ts', "error(500, 'Database error')")).toEqual([]);
		expect(badMessages('a.ts', 'error(403, `Interdit - ${roleNames[role]} uniquement`)')).toEqual(
			[]
		);
		expect(badMessages('a.ts', "error(404, 'Deck introuvable')")).toEqual([]);
	});
});
