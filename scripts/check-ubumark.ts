/**
 * Vérificateur de rendu du contenu ubumark, à lancer AVANT d'écrire des énoncés ou
 * des corrigés en base : pour chaque fichier .md d'un dossier, passe chaque formule
 * `~…~` et `$…$` au rendu écran et signale : erreur rouge, lettres découpées (un
 * nom de fonction non déclaré, `CM` lu comme `C·M`), nom grec sans antislash,
 * `\unit` résiduel. Signale aussi les blocs ```courbe et ```figure en erreur ou hors fenêtre,
 * et les blocs ```horloge, ```operation, ```collection, ```monnaie et ```partage en erreur.
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
import { parseMarkdown } from '$lib/ubumark';
import type { CourbeNode } from '$lib/ubumark/types/courbe';
import { buildCourbeScene } from '$lib/ubumark/utils/courbe-scene';
import type { FigureNode } from '$lib/ubumark/types/figure';
import { buildFigureScene } from '$lib/ubumark/utils/figure-scene';
import type { HorlogeNode } from '$lib/ubumark/types/horloge';
import type { OperationNode } from '$lib/ubumark/types/operation';
import type { CollectionNode } from '$lib/ubumark/types/collection';
import type { MonnaieNode } from '$lib/ubumark/types/monnaie';
import type { PartageNode } from '$lib/ubumark/types/partage';

type BlocNode =
	| CourbeNode
	| FigureNode
	| HorlogeNode
	| OperationNode
	| CollectionNode
	| MonnaieNode
	| PartageNode;

/** Blocs ```courbe, ```figure, ```horloge, ```operation, ```collection, ```monnaie et ```partage d'un arbre ubumark, listes comprises. */
function blocs(node: unknown, found: BlocNode[] = []): BlocNode[] {
	if (Array.isArray(node)) {
		for (const child of node) blocs(child, found);
	} else if (node !== null && typeof node === 'object') {
		const record = node as Record<string, unknown>;
		if (record.type === 'courbe') found.push(node as CourbeNode);
		else if (record.type === 'figure') found.push(node as FigureNode);
		else if (record.type === 'horloge') found.push(node as HorlogeNode);
		else if (record.type === 'operation') found.push(node as OperationNode);
		else if (record.type === 'collection') found.push(node as CollectionNode);
		else if (record.type === 'monnaie') found.push(node as MonnaieNode);
		else if (record.type === 'partage') found.push(node as PartageNode);
		else {
			blocs(record.children, found);
			blocs(record.items, found);
		}
	}
	return found;
}

/** Messages d'auteur d'un bloc : erreurs et avertissements (scène comprise). */
function blocMessages(bloc: BlocNode): string[] {
	if (bloc.type === 'figure') {
		const { errors, warnings } = buildFigureScene(bloc);
		return [...errors, ...warnings].map((m) => m.message);
	}
	// Les phrases du bloc ```partage sont déjà des textes
	if (bloc.type === 'partage') return bloc.errors;
	if (
		bloc.type === 'horloge' ||
		bloc.type === 'operation' ||
		bloc.type === 'collection' ||
		bloc.type === 'monnaie'
	) {
		return bloc.errors.map((m) => m.message);
	}
	return [
		...bloc.errors,
		...bloc.warnings,
		...(bloc.spec ? buildCourbeScene(bloc.spec).warnings : [])
	].map((m) => m.message);
}

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
	for (const bloc of blocs(parseMarkdown(md).children)) {
		const messages = blocMessages(bloc);
		if (messages.length) {
			problems++;
			console.log(`${f.replace(dir, '')}  ${bloc.type.toUpperCase()} : ${messages.join(' | ')}`);
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
