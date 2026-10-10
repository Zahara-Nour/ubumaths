/**
 * Garde des liens de la documentation
 * ===================================
 *
 * Chaque lien markdown interne de docs/ (et de CLAUDE.md, CONTEXT.md, README.md)
 * doit mener à un fichier ou un dossier qui existe.
 *
 * - Fichiers SUIVIS seulement (`git ls-files`), comme `format:check` : un
 *   brouillon non commité d'une autre session ne bloque personne.
 * - docs/corrections/ et docs/relecture/ sont des données de travail, pas de la
 *   doc : leurs liens d'images ne sont pas vérifiés.
 * - Le code inline et les blocs de code ne contiennent pas de liens : une regex
 *   `[A-Za-z](?:_\d+)` n'est pas un lien cassé.
 *
 * Usage : pnpm docs:check-links   (exit 1 s'il reste un lien cassé)
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// ============================================================================
// TYPES
// ============================================================================

export interface DocLink {
	line: number;
	text: string;
	target: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const ROOT_FILES = ['CLAUDE.md', 'CONTEXT.md', 'README.md'];
const DATA_DIRS = ['docs/corrections/', 'docs/relecture/'];

/** `[texte](<cible>)` ou `[texte](cible "titre")` ; le texte peut contenir du code. */
const LINK = /\[((?:[^\]`]|`[^`]*`)*)\]\((?:<([^>]+)>|([^)\s]+))(?:\s+"[^"]*")?\)/g;
const INLINE_CODE = /(`+)[^`]+?\1/g;
const NOT_INTERNAL = /^(?:[a-z][a-z0-9+.-]*:|#|\{\{)/i;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Plages [début, fin[ du code inline d'une ligne. */
function inlineCodeRanges(line: string): Array<[number, number]> {
	return [...line.matchAll(INLINE_CODE)].map((m) => [m.index, m.index + m[0].length]);
}

/**
 * Liens internes d'un document markdown, ancre retirée. Ignore les liens
 * externes, les ancres seules, les gabarits `{{…}}`, et tout ce qui commence
 * dans du code inline ou un bloc de code.
 */
export function extractLinks(markdown: string): DocLink[] {
	const links: DocLink[] = [];
	let fence: string | null = null;
	markdown.split('\n').forEach((line, index) => {
		const fenceMatch = line.match(/^\s*(```|~~~)/);
		if (fenceMatch) {
			if (fence === null) fence = fenceMatch[1];
			else if (fenceMatch[1] === fence) fence = null;
			return;
		}
		if (fence !== null) return;
		const code = inlineCodeRanges(line);
		for (const m of line.matchAll(LINK)) {
			if (code.some(([start, end]) => m.index >= start && m.index < end)) continue;
			const raw = m[2] ?? m[3];
			if (NOT_INTERNAL.test(raw)) continue;
			const target = raw.split('#')[0];
			if (target) links.push({ line: index + 1, text: m[1], target });
		}
	});
	return links;
}

function trackedMarkdown(root: string): string[] {
	const out = execFileSync('git', ['ls-files', '-z', '--', 'docs/*.md', ...ROOT_FILES], {
		cwd: root,
		encoding: 'utf-8'
	});
	return out.split('\0').filter((f) => f && !DATA_DIRS.some((d) => f.startsWith(d)));
}

function main(): void {
	const root = resolve(import.meta.dirname, '..');
	const files = trackedMarkdown(root);
	let total = 0;
	const broken: string[] = [];
	for (const file of files) {
		const abs = resolve(root, file);
		if (!existsSync(abs)) continue;
		for (const link of extractLinks(readFileSync(abs, 'utf-8'))) {
			total++;
			const target = link.target.startsWith('/')
				? resolve(root, link.target.slice(1))
				: resolve(dirname(abs), decodeURI(link.target));
			if (!existsSync(target))
				broken.push(`   ${file}:${link.line}  [${link.text}](${link.target})`);
		}
	}
	console.log(
		`🔍 Liens de la doc : ${files.length} fichiers, ${total} liens, ${broken.length} cassé(s).`
	);
	if (broken.length > 0) {
		console.log(broken.join('\n'));
		process.exit(1);
	}
}

if (process.argv[1] && resolve(process.argv[1]) === import.meta.filename) main();
