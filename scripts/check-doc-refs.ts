/**
 * Garde des renvois de la doc de référence vers le code
 * =====================================================
 *
 * La doc qui décrit le système (docs/systeme/, docs/pratiques/, CLAUDE.md,
 * CONTEXT.md, README.md) cite des fichiers du dépôt et des scripts pnpm. Quand
 * un fichier cité est renommé ou supprimé, la doc ment en silence : c'est ainsi
 * que database-schema.md a fini par citer des migrations disparues.
 *
 * Cette garde vérifie que chaque chemin cité (src/, scripts/, tests/,
 * supabase/, e2e/, .github/, docs/) existe, et que chaque `pnpm <script>` est
 * dans package.json. Les motifs glob et les gabarits (`<module>`, `*`) sont
 * ignorés.
 *
 * Usage : pnpm docs:check-refs            liste, exit 0 (avertissement)
 *         pnpm docs:check-refs --strict   exit 1 s'il reste un renvoi mort
 * Avertissement pendant la remise à jour de la doc (P2), bloquante ensuite.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ============================================================================
// TYPES
// ============================================================================

export interface DocRefs {
	paths: string[];
	scripts: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const SCANNED = ['docs/systeme/', 'docs/pratiques/'];
const ROOT_FILES = ['CLAUDE.md', 'CONTEXT.md', 'README.md'];

const REPO_PATH = /^(?:src|scripts|tests|supabase|e2e|\.github|docs)\/[^\s]*$/;
const TEMPLATE = /[*<>{}[\]|]|\.\.\./;
/** Commandes pnpm natives, qui ne sont pas des scripts de package.json. */
const PNPM_BUILTINS = new Set([
	'add',
	'dlx',
	'exec',
	'i',
	'install',
	'outdated',
	'remove',
	'run',
	'store',
	'update',
	'why'
]);

// ============================================================================
// FONCTIONS
// ============================================================================

/** Nettoie un chemin cité : retire `:ligne`, l'ancre et la ponctuation finale. */
function cleanPath(raw: string): string | null {
	const path = raw
		.replace(/[#§].*$/, '')
		.replace(/:\d+(?:-\d+)?$/, '')
		.replace(/[),.;]+$/, '');
	if (!REPO_PATH.test(path) || TEMPLATE.test(path)) return null;
	return path;
}

/** Chemins du dépôt et scripts pnpm cités dans un document, dans l'ordre. */
export function extractRefs(markdown: string): DocRefs {
	const paths: string[] = [];
	const scripts: string[] = [];
	for (const [, code] of markdown.matchAll(/`([^`\n]+)`/g)) {
		const pnpm = code.match(/^pnpm ([a-z][\w:-]*)(\*?)/);
		if (pnpm) {
			const [, name, joker] = pnpm;
			const wanted = !joker && !name.endsWith(':') && !PNPM_BUILTINS.has(name);
			if (wanted && !scripts.includes(name)) scripts.push(name);
			continue;
		}
		const path = cleanPath(code.trim());
		if (path && !paths.includes(path)) paths.push(path);
	}
	for (const [, target] of markdown.matchAll(/\]\(([^)\s]+)\)/g)) {
		const path = cleanPath(target);
		if (path && !paths.includes(path)) paths.push(path);
	}
	return { paths, scripts };
}

function main(): void {
	const root = resolve(import.meta.dirname, '..');
	const strict = process.argv.includes('--strict');
	const files = execFileSync('git', ['ls-files', '-z', '--', ...SCANNED, ...ROOT_FILES], {
		cwd: root,
		encoding: 'utf-8'
	})
		.split('\0')
		.filter((f) => f.endsWith('.md'));
	const known = new Set(
		Object.keys(JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf-8')).scripts)
	);
	const dead: string[] = [];
	for (const file of files) {
		if (!existsSync(resolve(root, file))) continue;
		const { paths, scripts } = extractRefs(readFileSync(resolve(root, file), 'utf-8'));
		for (const p of paths) if (!existsSync(resolve(root, p))) dead.push(`   ${file} → ${p}`);
		// `pnpm tsx` : un binaire installé se lance comme un script.
		for (const s of scripts)
			if (!known.has(s) && !existsSync(resolve(root, 'node_modules/.bin', s)))
				dead.push(`   ${file} → pnpm ${s}`);
	}
	console.log(
		`🔍 Renvois de la doc vers le code : ${files.length} fichiers, ${dead.length} renvoi(s) mort(s).`
	);
	if (dead.length > 0) {
		console.log(dead.join('\n'));
		if (strict) process.exit(1);
	}
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) main();
