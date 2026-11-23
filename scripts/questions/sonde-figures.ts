/**
 * Sonde des blocs ```figure d'un lot de modèles
 * =============================================
 *
 * Tire chaque modèle du dossier N fois (graines 1 à N) et passe chaque bloc ```figure de l'énoncé
 * et du corrigé au moteur de figures (`parseFigure` puis `buildFigureScene`, comme l'appli) : un
 * tirage qui échoue, une erreur ou un avertissement de la scène (objet inconnu, construction
 * impossible, texte refusé…) est signalé une fois par modèle, avec sa graine.
 * À lancer avant la page à cocher d'un lot qui dessine des figures : 0 problème exigé.
 * `--montre` affiche une variation (énoncé, réponses attendues, corrigé) pour comprendre un défaut.
 * Démarche : docs/pratiques/couvrir-un-niveau.md § 5 (calquée sur sonde-courbes.ts).
 *
 *   pnpm tsx scripts/questions/sonde-figures.ts --dir scripts/questions/4-lot-6 [--tirages 300]
 *   pnpm tsx scripts/questions/sonde-figures.ts --montre scripts/questions/4-lot-6/01-….json 17
 *
 * Ne lit ni n'écrit aucune base : seulement les fichiers.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { generateInstance } from '../../src/lib/questions/generator/instance-generator';
import { findFigureBlocks, parseFigure } from '../../src/lib/ubumark/parser/figure-parser';
import { buildFigureScene } from '../../src/lib/ubumark/utils/figure-scene';
import type { QuestionTemplate } from '../../src/lib/questions/types';
import { readTemplateFile } from '../lib/template-file';
import { valeurArgument } from '../lib/lot-questions';

function lireModele(chemin: string): QuestionTemplate {
	const nom = basename(chemin);
	const lu = readTemplateFile(JSON.parse(readFileSync(chemin, 'utf8')) as unknown, nom);
	if (!lu.ok) throw new Error(`${nom} : ${lu.error}`);
	return { ...(lu.template as object), id: 'sonde' } as unknown as QuestionTemplate;
}

function montrer(chemin: string, graine: number): number {
	const r = generateInstance(lireModele(chemin), graine);
	if (!r.success || !r.instance) {
		console.error(`⛔ graine ${graine} : ${JSON.stringify(r.errors)}`);
		return 1;
	}
	console.log(String(r.instance.statement));
	console.log('ATTENDU :', JSON.stringify(r.instance.blanks?.map((b) => b.expectedAnswer)));
	console.log('--- corrigé');
	for (const etape of r.instance.correction?.steps ?? []) console.log(String(etape), '\n');
	return 0;
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
				const lignes = texte.split('\n');
				for (const b of findFigureBlocks(lignes)) {
					blocs++;
					const bloc = buildFigureScene(parseFigure(lignes, b.startIndex, b.endIndex));
					for (const e of [...bloc.errors, ...bloc.warnings]) {
						const cle = `${f} : ${e.message}${e.line ? ` (ligne ${e.line})` : ''}`;
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
	const fichier = valeurArgument(process.argv, '--montre');
	if (fichier)
		return montrer(fichier, Number(process.argv[process.argv.indexOf(fichier) + 1] ?? 1));
	if (!dossier) {
		console.error(
			'Usage : pnpm tsx scripts/questions/sonde-figures.ts --dir <dossier> [--tirages N]\n' +
				'        pnpm tsx scripts/questions/sonde-figures.ts --montre <fichier.json> [graine]'
		);
		return 2;
	}
	return sonder(dossier, Number(valeurArgument(process.argv, '--tirages') ?? 300));
}

process.exit(main());
