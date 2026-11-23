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
 * Les `+server.ts` (API) n'atteignent jamais la page d'erreur : leur réponse
 * part en JSON. Mais la plupart des pages relancent ce message puis l'affichent
 * tel quel dans une notification (`formatUserError`, src/lib/utils/errors.ts).
 * Les dossiers d'API de `TRANSLATED_API_DIRS` sont donc vérifiés aussi, tous
 * statuts confondus (un 500 « Failed to… » s'affiche autant qu'un 400), sous
 * les trois formes `error(…, 'm')`, `{ error: 'm' }` et `{ message: 'm' }`.
 * La liste grandit par lots (relevé du 2026-10-12 : ~460 messages affichés).
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
	'error',
	'unexpected',
	'fetch',
	'endpoint',
	'belong',
	'card',
	'cards',
	'student',
	'students',
	'insufficient',
	'already',
	'this'
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

/** Message d'API sous l'une des trois formes, quel que soit le statut. */
const API_MESSAGE =
	/(?:\berror\(\s*\d{3}\s*,\s*(?:\{\s*message:\s*)?|(?<=[{,]\s*)(?:error|message):\s*)(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;

/**
 * Dossiers d'API dont les messages sont traduits.
 * Lot A : ce que voient les élèves ; lot B : les fiches et les exercices ;
 * lot C : les outils (constructions, Python, tableau blanc, Google) ;
 * lot D : l'administration.
 */
const TRANSLATED_API_DIRS = [
	'src/routes/api/vip-cards',
	'src/routes/api/srs',
	'src/routes/api/student/bonus-history',
	'src/routes/api/student/gidouilles-activity',
	'src/routes/api/worksheets',
	'src/routes/api/exercises',
	'src/routes/api/constructions',
	'src/routes/api/construction-demo-scripts',
	'src/routes/api/python-files',
	'src/routes/api/python-notebooks',
	'src/routes/api/python-notebook-templates',
	'src/routes/api/python-exercises',
	'src/routes/api/whiteboard',
	'src/routes/api/google',
	'src/routes/api/admin'
];

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
function badMessages(file: string, source: string, pattern = ERROR_4XX): string[] {
	return [...source.matchAll(pattern)]
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

describe('messages des API affichés aux élèves : en français correct', () => {
	it('aucun message anglais ni sans accent dans les dossiers d’API traduits', () => {
		const offenders = TRANSLATED_API_DIRS.flatMap((dir) =>
			walk(dir, (name) => name === '+server.ts')
		).flatMap((file) => badMessages(file, readFileSync(file, 'utf-8'), API_MESSAGE));
		expect(offenders).toEqual([]);
	});

	it('la règle reconnaît les trois formes, tous statuts confondus', () => {
		const check = (source: string) => badMessages('a.ts', source, API_MESSAGE);
		expect(check("error(500, 'Failed to fetch bonus history')")).toHaveLength(1);
		expect(check("json({ error: 'Card not found' }, { status: 404 })")).toHaveLength(1);
		expect(check("json({ success: false, message: 'Invalid card ID' })")).toHaveLength(1);
	});

	it('la règle laisse passer le français et les variables', () => {
		const check = (source: string) => badMessages('a.ts', source, API_MESSAGE);
		expect(check("json({ error: 'Carte introuvable' }, { status: 404 })")).toEqual([]);
		expect(check('json({ error: validation.error.issues[0].message })')).toEqual([]);
		expect(check("const { data, error: fetchError } = await supabase.from('x')")).toEqual([]);
		expect(check("console.error('[approve-card] RPC error:', rpcError)")).toEqual([]);
	});
});

/**
 * Messages de services serveur renvoyés tels quels au client (`result.errors` de
 * la synchronisation Google, schémas du tirage de cartes VIP, sauvegarde des
 * exercices). Toute phrase littérale compte, hors `console.*`.
 */
const TRANSLATED_SERVER_FILES = [
	'src/lib/server/google/sync.ts',
	'src/lib/server/validation/draw-vip-cards.ts',
	'src/lib/server/admin/exercise-backup.ts'
];

/** Une phrase littérale : commence par une majuscule et contient une espace. */
const SENTENCE = /(['"`])([A-Z][^'"`\n]*\s[^'"`\n]*)\1/g;

/**
 * Texte affiché par une page : notification, erreur relancée, texte de repli
 * (`|| 'Failed to load'`, `?? 'Unknown error'`). Un repli d'un seul mot est une
 * valeur (`role || 'student'`), pas un message : il doit contenir une espace.
 */
const CLIENT_MESSAGE =
	/(?:\bthrow new Error\(\s*|\btoaster\.\w+\(\s*|(?:\|\||\?\?)\s*(?=['"`][^'"`\n]*\s[^'"`\n]*['"`]))(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;

/** Les pages, composants et stores : là où un texte de repli finit à l'écran. */
function clientFiles(): string[] {
	const svelte = (name: string) => name.endsWith('.svelte') || name.endsWith('.svelte.ts');
	return [
		...walk('src/routes', svelte),
		...walk('src/lib/components', svelte),
		...walk('src/lib/stores', (name) => name.endsWith('.ts') && !name.endsWith('.test.ts'))
	];
}

/** Le source sans ses lignes `console.*` ni ses commentaires (numéros de ligne conservés). */
function withoutConsole(source: string): string {
	return source
		.split('\n')
		.map((line) => (/\bconsole\.\w+\(|^\s*(?:\/\/|\*|\/\*)/.test(line) ? '' : line))
		.join('\n');
}

describe('messages des services serveur et textes de repli des pages : en français', () => {
	it('aucune phrase anglaise dans les services serveur traduits', () => {
		const offenders = TRANSLATED_SERVER_FILES.flatMap((file) =>
			badMessages(file, withoutConsole(readFileSync(file, 'utf-8')), SENTENCE)
		);
		expect(offenders).toEqual([]);
	});

	it('aucun texte de repli anglais dans les pages, composants et stores', () => {
		const offenders = clientFiles().flatMap((file) =>
			badMessages(file, withoutConsole(readFileSync(file, 'utf-8')), CLIENT_MESSAGE)
		);
		expect(offenders).toEqual([]);
	});

	it('la règle des pages reconnaît notification, erreur relancée et repli', () => {
		const check = (source: string) => badMessages('a.svelte', source, CLIENT_MESSAGE);
		expect(check("toaster.error('Failed to remove card')")).toHaveLength(1);
		expect(check("throw new Error(body.message || 'Failed to fetch due cards')")).toHaveLength(1);
		expect(check("const message = err?.message ?? 'Unknown error'")).toHaveLength(1);
		expect(check("toaster.success('Carte retirée')")).toEqual([]);
		expect(check("const role = profile.role || 'student'")).toEqual([]);
		expect(check("console.error('Failed to load', err)")).toHaveLength(0);
	});
});
