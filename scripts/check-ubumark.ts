/**
 * Vérificateur de rendu du contenu ubumark, à lancer AVANT d'écrire des énoncés ou
 * des corrigés en base : pour chaque fichier .md d'un dossier, passe chaque formule
 * `~…~` et `$…$` au rendu écran et signale : erreur rouge, lettres découpées (un
 * nom de fonction non déclaré, `CM` lu comme `C·M`), nom grec sans antislash,
 * `\unit` résiduel.
 *
 * Les lettres de fonctions sont celles de `generic_functions` de l'exercice ; sans
 * elles, `C'(x)` s'affiche comme un produit.
 *
 * Usage : pnpm check:ubumark <dossier> [lettres de fonctions, ex. C,P]
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { extractMath } from '$lib/ubumark/parser/math-extractor';
import { expressionToLatex } from '$lib/components/markdown/utils/math-utils';
import { findBareGreekNames } from '$lib/exercises/bare-greek-warnings';

const dir = process.argv[2];
if (!dir) {
	console.error('Usage : pnpm check:ubumark <dossier> [lettres de fonctions, ex. C,P]');
	process.exit(2);
}
const names = process.argv[3]?.split(',').filter(Boolean);
const cfg = names ? { names, allowDerivatives: true, allowInverse: true } : undefined;

function files(d: string): string[] {
	return readdirSync(d).flatMap((f) => {
		const p = join(d, f);
		return statSync(p).isDirectory() ? files(p) : p.endsWith('.md') ? [p] : [];
	});
}

let problems = 0;
let formulas = 0;
for (const f of files(dir)) {
	const md = readFileSync(f, 'utf8');
	for (const p of extractMath(md).placeholders) {
		formulas++;
		const latex = expressionToLatex(p.expression, p.syntax, cfg);
		const issues: string[] = [];
		if (latex.includes('textcolor{red}')) issues.push(`ERREUR ${latex.slice(0, 90)}`);
		if (/(?:^|[^\\a-zA-Z])([a-z] ){3,}[a-z](?![a-zA-Z])/.test(latex))
			issues.push(`LETTRES ${latex.slice(0, 70)}`);
		if (/\\unit\{/.test(latex)) issues.push('UNIT');
		if (issues.length) {
			problems++;
			console.log(
				`${f.replace(dir, '')}  ${JSON.stringify(p.expression).slice(0, 60)}  → ${issues.join(' | ')}`
			);
		}
	}
	const greek = findBareGreekNames(md);
	if (greek.length) {
		problems++;
		console.log(`${f.replace(dir, '')}  GREC SANS ANTISLASH : ${greek.join(', ')}`);
	}
}
console.log(`\n${formulas} formules vérifiées, ${problems} problème(s).`);
if (problems > 0) process.exitCode = 1;
