/**
 * `pi` nu dans les calculs des modèles JSON du dépôt : inventaire, et réécriture `\pi`
 * =====================================================================================
 *
 * Usage : pnpm tsx scripts/inventaire-pi-nu.ts [--ecrire] <dossier>…
 *
 * La réécriture est TEXTUELLE (chaque chaîne JSON concernée est remplacée sur place,
 * la mise en forme du fichier ne change pas) ; le fichier relu doit valoir exactement
 * la réécriture attendue, sinon rien n'est écrit.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { join } from 'node:path';
import { rewriteBarePi } from '$lib/ubumark/parameterization/validator/bare-pi';

function jsonFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return jsonFiles(path);
		return name.endsWith('.json') ? [path] : [];
	});
}

/** Chaque chaîne réécrite, remplacée dans le texte du fichier */
function rewriteText(before: unknown, after: unknown, out: Map<string, string>) {
	if (typeof before === 'string' && typeof after === 'string') {
		if (before !== after) out.set(JSON.stringify(before), JSON.stringify(after));
	} else if (
		before !== null &&
		typeof before === 'object' &&
		after !== null &&
		typeof after === 'object'
	) {
		for (const key of Object.keys(before)) {
			rewriteText(
				(before as Record<string, unknown>)[key],
				(after as Record<string, unknown>)[key],
				out
			);
		}
	}
}

const write = process.argv.includes('--ecrire');
const dirs = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
let total = 0;
let files = 0;
for (const file of dirs.flatMap(jsonFiles)) {
	const source = readFileSync(file, 'utf8');
	const original: unknown = JSON.parse(source);
	const { value, occurrences } = rewriteBarePi(original);
	if (occurrences.length === 0) continue;
	const count = occurrences.reduce((sum, o) => sum + o.count, 0);
	total += count;
	files++;
	console.log(`${count}\t${file}`);
	if (!write) continue;
	const replacements = new Map<string, string>();
	rewriteText(original, value, replacements);
	let text = source;
	for (const [from, to] of replacements) {
		if (!text.includes(from))
			throw new Error(`${file} : chaîne introuvable telle quelle ${from.slice(0, 60)}`);
		text = text.split(from).join(to);
	}
	if (!isDeepStrictEqual(JSON.parse(text), value))
		throw new Error(`${file} : relecture différente de la réécriture`);
	writeFileSync(file, text);
}
console.log(`TOTAL ${total} pi nus dans ${files} fichiers${write ? ' (réécrits)' : ''}`);
