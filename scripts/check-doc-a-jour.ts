/**
 * Garde « code modifié ⇒ doc modifiée »
 * =====================================
 *
 * Chaque doc de docs/systeme/ (et les pratiques qui décrivent un code précis)
 * déclare dans son en-tête YAML le code qu'elle décrit :
 *
 *   ---
 *   couvre:
 *     - src/lib/atelier/**
 *   ---
 *
 * Deux contrôles :
 * - `--depuis <ref>` (sur une PR) : une doc qui couvre un fichier modifié depuis
 *   <ref> doit être modifiée aussi, sauf si un commit de la PR porte une ligne
 *   `Doc-inchangée: <raison>` (refactor sans changement de comportement…).
 * - `--couverture` : chaque fichier de code est couvert par une doc, exclu, ou
 *   listé comme trou connu (scripts/doc-a-jour.config.ts).
 *
 * La garde dit qu'une doc a été revue au moment du changement ; qu'elle dise
 * vrai relève du skill doc-a-jour et de la relecture.
 *
 * Usage : pnpm docs:check-a-jour --depuis origin/main
 *         pnpm docs:check-a-jour --couverture
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { matchesGlob, resolve } from 'node:path';
import { COVERAGE_CONFIG } from './doc-a-jour.config';

// ============================================================================
// TYPES
// ============================================================================

export interface DocCoverage {
	doc: string;
	/** Le code que la doc DÉCRIT : une PR qui le modifie modifie la doc. */
	couvre: string[];
	/** Le code que la doc RECENSE seulement (un index) : compte pour la couverture. */
	indexe?: string[];
}

export interface CoverageConfig {
	/** Le code soumis à la garde. */
	scope: string[];
	/** Jamais soumis : tests, fichiers générés, non-code. */
	excluded: string[];
	/** Zones de code sans doc, connues et nommées : à documenter. */
	trous: Array<{ glob: string; note: string }>;
}

export interface MissingDoc {
	doc: string;
	files: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DOC_ROOTS = ['docs/systeme/', 'docs/pratiques/'];
const EXEMPTION = /^Doc-inchangée:[ \t]*\S/m;

// ============================================================================
// FONCTIONS
// ============================================================================

const matchesAny = (file: string, globs: string[]): boolean =>
	globs.some((glob) => matchesGlob(file, glob));

/** Liste `<clé>:` de l'en-tête YAML d'une doc (forme bloc ou en ligne). */
function parseList(markdown: string, key: string): string[] {
	const header = markdown.match(/^---\n([\s\S]*?)\n---/);
	if (!header) return [];
	const lines = header[1].split('\n');
	const start = lines.findIndex((l) => l.startsWith(`${key}:`));
	if (start === -1) return [];
	const unquote = (s: string) => s.trim().replace(/^["']|["']$/g, '');
	const inline = lines[start].slice(key.length + 1).match(/^\s*\[(.*)\]\s*$/);
	if (inline) return inline[1].split(',').map(unquote).filter(Boolean);
	const globs: string[] = [];
	for (const line of lines.slice(start + 1)) {
		const item = line.match(/^\s+-\s+(.+)$/);
		if (!item) break;
		globs.push(unquote(item[1]));
	}
	return globs;
}

/** Le code qu'une doc décrit (`couvre:`). */
export const parseCouvre = (markdown: string): string[] => parseList(markdown, 'couvre');

/** Le code qu'une doc recense sans le décrire (`indexe:`). */
export const parseIndexe = (markdown: string): string[] => parseList(markdown, 'indexe');

const isGuarded = (file: string, config: CoverageConfig): boolean =>
	matchesAny(file, config.scope) && !matchesAny(file, config.excluded);

/** Docs qui couvrent un fichier modifié sans avoir été modifiées elles-mêmes. */
export function docsToUpdate(
	changed: string[],
	docs: DocCoverage[],
	config: CoverageConfig
): MissingDoc[] {
	const changedSet = new Set(changed);
	const code = changed.filter((f) => isGuarded(f, config));
	return docs
		.filter((d) => !changedSet.has(d.doc))
		.map((d) => ({ doc: d.doc, files: code.filter((f) => matchesAny(f, d.couvre)) }))
		.filter((m) => m.files.length > 0);
}

/** Un commit porte-t-il une ligne `Doc-inchangée: <raison>` ? */
export function hasDocExemption(commitMessages: string[]): boolean {
	return commitMessages.some((m) => EXEMPTION.test(m));
}

/** Fichiers de code couverts par aucune doc, hors exclus et trous connus. */
export function uncoveredFiles(
	files: string[],
	docs: DocCoverage[],
	config: CoverageConfig
): string[] {
	const trous = config.trous.map((t) => t.glob);
	return files.filter(
		(f) =>
			isGuarded(f, config) &&
			!matchesAny(f, trous) &&
			!docs.some((d) => matchesAny(f, [...d.couvre, ...(d.indexe ?? [])]))
	);
}

function git(root: string, args: string[]): string {
	return execFileSync('git', args, { cwd: root, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
}

function loadDocs(root: string): DocCoverage[] {
	return git(root, ['ls-files', '-z', '--', ...DOC_ROOTS])
		.split('\0')
		.filter((f) => f.endsWith('.md') && existsSync(resolve(root, f)))
		.map((doc) => {
			const markdown = readFileSync(resolve(root, doc), 'utf-8');
			return { doc, couvre: parseCouvre(markdown), indexe: parseIndexe(markdown) };
		})
		.filter((d) => d.couvre.length > 0 || d.indexe.length > 0);
}

function main(): void {
	const root = resolve(import.meta.dirname, '..');
	const docs = loadDocs(root);
	const args = process.argv.slice(2);
	let failed = false;

	if (args.includes('--couverture')) {
		const files = git(root, ['ls-files', '-z']).split('\0').filter(Boolean);
		const orphans = uncoveredFiles(files, docs, COVERAGE_CONFIG);
		console.log(
			`🔍 Couverture du code par la doc : ${docs.length} docs, ${orphans.length} fichier(s) sans doc.`
		);
		if (orphans.length > 0) {
			console.log(orphans.map((f) => `   ${f}`).join('\n'));
			console.log(
				'   → ajouter le fichier au `couvre:` de la doc qui le décrit (docs/README.md),\n' +
					'     ou, s’il n’en a pas encore, à `trous` dans scripts/doc-a-jour.config.ts.'
			);
			failed = true;
		}
	}

	const i = args.indexOf('--depuis');
	if (i !== -1) {
		const base = args[i + 1];
		const changed = git(root, ['diff', '--name-only', `${base}...HEAD`])
			.split('\n')
			.filter(Boolean);
		const messages = git(root, ['log', '--format=%B%x00', `${base}..HEAD`]).split('\0');
		const missing = docsToUpdate(changed, docs, COVERAGE_CONFIG);
		if (missing.length === 0) {
			console.log('🔍 Doc à jour : chaque doc qui couvre un fichier modifié est modifiée aussi.');
		} else if (hasDocExemption(messages)) {
			console.log(
				`🔍 Doc à jour : ${missing.length} doc(s) non modifiée(s), exemption « Doc-inchangée » présente.`
			);
		} else {
			console.log(`⛔ Doc à jour : ${missing.length} doc(s) à mettre à jour dans cette PR :`);
			for (const m of missing) {
				console.log(
					`   ${m.doc}  ←  ${m.files.slice(0, 5).join(', ')}${m.files.length > 5 ? ', …' : ''}`
				);
			}
			console.log(
				'   → mettre la doc à jour (skill doc-a-jour), ou, si le comportement décrit ne change pas,\n' +
					'     ajouter à un commit une ligne `Doc-inchangée: <raison>`.'
			);
			failed = true;
		}
	}

	if (failed && !args.includes('--avertir')) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) main();
