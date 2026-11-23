/**
 * Sonde des blocs ```horloge et ```line d'un lot de modèles
 * ==========================================================
 *
 * Tire chaque modèle du dossier N fois (graines 1 à N), passe l'énoncé et le corrigé résolus au
 * parseur de chaque bloc (`parseHorlogeContent`, `parseNumberLineContent`, comme l'appli) et signale
 * toute erreur (heure refusée, graduation hors droite, option inconnue…), une fois par modèle
 * avec sa graine. Les choix d'une case choix (horloges imbriquées) sont parcourus aussi.
 * À lancer avant la page à cocher d'un lot qui dessine des horloges ou des droites : 0 problème.
 * Démarche : docs/pratiques/couvrir-un-niveau.md § 5 (calquée sur sonde-figures.ts).
 *
 *   pnpm tsx scripts/questions/sonde-horloges.ts --dir scripts/questions/ce2-7b [--tirages 300]
 *
 * Ne lit ni n'écrit aucune base : seulement les fichiers.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { generateInstance } from '../../src/lib/questions/generator/instance-generator';
import { parseHorlogeContent } from '../../src/lib/ubumark/parser/horloge-parser';
import { parseNumberLineContent } from '../../src/lib/ubumark/parser/number-line-parser';
import type { QuestionTemplate } from '../../src/lib/questions/types';
import { readTemplateFile } from '../lib/template-file';
import { valeurArgument } from '../lib/lot-questions';

function lireModele(chemin: string): QuestionTemplate {
	const nom = basename(chemin);
	const lu = readTemplateFile(JSON.parse(readFileSync(chemin, 'utf8')) as unknown, nom);
	if (!lu.ok) throw new Error(`${nom} : ${lu.error}`);
	return { ...(lu.template as object), id: 'sonde' } as unknown as QuestionTemplate;
}

/** Blocs ```horloge et ```line d'un texte, retrait ôté (ceux d'un choix sont en retrait). */
function blocsDe(texte: string): { genre: string; corps: string }[] {
	const trouves: { genre: string; corps: string }[] = [];
	const re = /^[ \t]*(?:- )?```(horloge|line)[ \t]*\n([\s\S]*?)^[ \t]*```[ \t]*$/gm;
	for (const m of texte.matchAll(re)) {
		const lignes = m[2].split('\n');
		const retraits = lignes
			.filter((l) => l.trim() !== '')
			.map((l) => l.length - l.trimStart().length);
		const retrait = retraits.length ? Math.min(...retraits) : 0;
		trouves.push({ genre: m[1], corps: lignes.map((l) => l.slice(retrait)).join('\n') });
	}
	return trouves;
}

/** Messages d'erreur du parseur de ce bloc (heure refusée, graduation hors droite…). */
function problemesDuBloc(genre: string, corps: string): string[] {
	const erreurs =
		genre === 'horloge'
			? parseHorlogeContent(corps).errors
			: parseNumberLineContent(corps.split('\n')).errors;
	return erreurs.map((e) => e.message);
}

function sonder(dossier: string, tirages: number): number {
	let problemes = 0;
	for (const f of readdirSync(dossier)
		.filter((x) => x.endsWith('.json'))
		.sort()) {
		const modele = lireModele(join(dossier, f));
		const vus = new Set<string>();
		let blocs = 0;
		for (let graine = 1; graine <= tirages; graine++) {
			const r = generateInstance(modele, graine);
			if (!r.success || !r.instance) {
				console.log(`⛔ ${f} graine ${graine} : ${JSON.stringify(r.errors).slice(0, 300)}`);
				problemes++;
				continue;
			}
			const textes = [
				String(r.instance.statement),
				...(r.instance.correction?.steps ?? []).map(String)
			];
			for (const texte of textes) {
				for (const { genre, corps } of blocsDe(texte)) {
					blocs++;
					for (const message of problemesDuBloc(genre, corps)) {
						const cle = `${f} : ${message}`;
						if (vus.has(cle)) continue;
						vus.add(cle);
						console.log(`⚠️  ${cle} (graine ${graine})`);
						problemes++;
					}
				}
			}
		}
		console.log(`✓ ${f} : ${tirages} tirages, ${blocs} blocs`);
	}
	console.log(problemes === 0 ? '0 problème' : `${problemes} problème(s)`);
	return problemes === 0 ? 0 : 1;
}

function main(): number {
	const dossier = valeurArgument(process.argv, '--dir');
	if (!dossier) {
		console.error(
			'Usage : pnpm tsx scripts/questions/sonde-horloges.ts --dir <dossier> [--tirages N]'
		);
		return 2;
	}
	return sonder(dossier, Number(valeurArgument(process.argv, '--tirages') ?? 300));
}

process.exit(main());
