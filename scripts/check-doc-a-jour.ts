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
 *   « Doc d'abord » : une PR qui touche une zone sans doc (un trou) écrit la doc
 *   de la zone, sauf si un commit porte `Doc-reportée: <raison>` (zone trop
 *   grosse au regard du changement : David tranche, skill doc-a-jour §5).
 * - `--couverture` : chaque fichier de code est couvert par une doc, exclu, ou
 *   listé comme trou connu (scripts/doc-a-jour.config.ts) ; et un trou dont la
 *   zone est déjà décrite par une doc (ou qui ne désigne plus rien) sort de la
 *   liste.
 *
 * Seul `couvre:` compte : une doc qui cite un fichier dans un index sans le
 * décrire ne le couvre pas. Jusqu'au 2026-10-12, une clé `indexe:` comptait
 * pour la couverture : un glob d'index (`src/lib/server/*.ts`) avalait en silence
 * chaque module neuf, que « doc d'abord » ne voyait jamais.
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

export interface TouchedHole {
	/** La zone, telle que `trous` la nomme. */
	note: string;
	files: string[];
}

type Hole = CoverageConfig['trous'][number];

// ============================================================================
// CONSTANTES
// ============================================================================

const DOC_ROOTS = ['docs/systeme/', 'docs/pratiques/'];
const EXEMPTION = /^Doc-inchangée:[ \t]*\S/m;
const DEFERRAL = /^Doc-reportée:[ \t]*\S/m;

// ============================================================================
// FONCTIONS
// ============================================================================

const matchesAny = (file: string, globs: string[]): boolean =>
	globs.some((glob) => matchesGlob(file, glob));

/** Le code qu'une doc décrit : liste `couvre:` de son en-tête YAML (forme bloc ou en ligne). */
export function parseCouvre(markdown: string): string[] {
	const key = 'couvre';
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

/** Ce que l'en-tête d'une doc déclare, tel que la garde le lit. */
export const readDoc = (doc: string, markdown: string): DocCoverage => ({
	doc,
	couvre: parseCouvre(markdown)
});

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

/** Un commit porte-t-il une ligne `Doc-reportée: <raison>` ? */
export function hasDocDeferral(commitMessages: string[]): boolean {
	return commitMessages.some((m) => DEFERRAL.test(m));
}

/** Fichier gardé qu'aucune doc ne décrit. */
const isUndescribed = (file: string, docs: DocCoverage[], config: CoverageConfig): boolean =>
	isGuarded(file, config) && !docs.some((d) => matchesAny(file, d.couvre));

/** Doc d'abord : les zones sans doc qu'une PR touche, fichiers groupés par zone. */
export function holesTouched(
	changed: string[],
	docs: DocCoverage[],
	config: CoverageConfig
): TouchedHole[] {
	const byNote = new Map<string, string[]>();
	for (const file of changed) {
		if (!isUndescribed(file, docs, config)) continue;
		const hole = config.trous.find((t) => matchesGlob(file, t.glob));
		if (!hole) continue;
		const files = byNote.get(hole.note) ?? [];
		files.push(file);
		byNote.set(hole.note, files);
	}
	return [...byNote].map(([note, files]) => ({ note, files }));
}

/** Trous périmés : leur glob ne désigne plus aucun fichier gardé que nulle doc ne décrit. */
export function staleHoles(files: string[], docs: DocCoverage[], config: CoverageConfig): Hole[] {
	const undescribed = files.filter((f) => isUndescribed(f, docs, config));
	return config.trous.filter((t) => !undescribed.some((f) => matchesGlob(f, t.glob)));
}

/** Fichiers de code qu'aucune doc ne décrit, hors exclus et trous connus. */
export function uncoveredFiles(
	files: string[],
	docs: DocCoverage[],
	config: CoverageConfig
): string[] {
	const trous = config.trous.map((t) => t.glob);
	return files.filter((f) => isUndescribed(f, docs, config) && !matchesAny(f, trous));
}

function git(root: string, args: string[]): string {
	return execFileSync('git', args, { cwd: root, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
}

function loadDocs(root: string): DocCoverage[] {
	return git(root, ['ls-files', '-z', '--', ...DOC_ROOTS])
		.split('\0')
		.filter((f) => f.endsWith('.md') && existsSync(resolve(root, f)))
		.map((doc) => readDoc(doc, readFileSync(resolve(root, doc), 'utf-8')))
		.filter((d) => d.couvre.length > 0);
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
		const stale = staleHoles(files, docs, COVERAGE_CONFIG);
		if (stale.length > 0) {
			console.log(
				`⛔ Trous périmés : ${stale.length} entrée(s) de \`trous\` sans code à documenter :`
			);
			console.log(stale.map((t) => `   ${t.glob}  (${t.note})`).join('\n'));
			console.log(
				'   → une doc décrit déjà toute la zone, ou le glob ne désigne plus rien :\n' +
					'     retirer l’entrée de `trous` dans scripts/doc-a-jour.config.ts.'
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

		// Supprimer du code d'une zone sans doc ne demande pas d'écrire sa doc
		const kept = git(root, ['diff', '--name-only', '--diff-filter=d', `${base}...HEAD`])
			.split('\n')
			.filter(Boolean);
		const holes = holesTouched(kept, docs, COVERAGE_CONFIG);
		if (holes.length === 0) {
			console.log('🔍 Doc d’abord : aucune zone sans doc touchée.');
		} else if (hasDocDeferral(messages)) {
			console.log(
				`🔍 Doc d’abord : ${holes.length} zone(s) sans doc touchée(s), report « Doc-reportée » présent.`
			);
		} else {
			console.log(`⛔ Doc d’abord : ${holes.length} zone(s) sans doc touchée(s) par cette PR :`);
			for (const h of holes) {
				console.log(
					`   ${h.note}  ←  ${h.files.slice(0, 5).join(', ')}${h.files.length > 5 ? ', …' : ''}`
				);
			}
			console.log(
				'   → écrire d’abord la doc de la zone et la retirer de `trous` (skill doc-a-jour §5) ;\n' +
					'     zone trop grosse au regard du changement : demander à David, et s’il reporte,\n' +
					'     ajouter à un commit une ligne `Doc-reportée: <raison>`.'
			);
			failed = true;
		}
	}

	if (failed && !args.includes('--avertir')) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) main();
