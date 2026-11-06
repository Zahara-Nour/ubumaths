/**
 * Sonde des blocs ```collection d'un lot de modèles
 * ================================================
 *
 * Tire chaque modèle du dossier N fois (graines 1 à N) et passe chaque bloc ```collection de
 * l'instance (énoncé, options d'un choix, corrigé) au parseur de l'appli
 * (`parseCollectionContent`) : les specs ne voient pas un bloc d'affichage en erreur (plafond
 * dépassé, valeur au-delà de 9 999, ligne refusée). À lancer avant la page à cocher d'un lot de
 * matériel multibase : 0 problème exigé. Démarche : docs/pratiques/couvrir-un-niveau.md § 5
 * (calquée sur sonde-cubes.ts).
 *
 *   pnpm tsx scripts/questions/sonde-collections.ts --dir scripts/questions/ce2-11 [--tirages 300]
 *
 * Ne lit ni n'écrit aucune base : seulement les fichiers.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { generateInstance } from '../../src/lib/questions/generator/instance-generator';
import { parseCollectionContent } from '../../src/lib/ubumark/parser/collection-parser';
import type { QuestionTemplate } from '../../src/lib/questions/types';
import { readTemplateFile } from '../lib/template-file';
import { valeurArgument } from '../lib/lot-questions';

// Bloc ```collection dans une chaîne de l'instance ; `case: N` est posé par le générateur
const BLOC_COLLECTION = /```collection\n([\s\S]*?)```/g;

function lireModele(chemin: string): QuestionTemplate {
	const nom = basename(chemin);
	const lu = readTemplateFile(JSON.parse(readFileSync(chemin, 'utf8')) as unknown, nom);
	if (!lu.ok) throw new Error(`${nom} : ${lu.error}`);
	return { ...(lu.template as object), id: 'sonde' } as unknown as QuestionTemplate;
}

/** Toutes les chaînes d'une valeur (objet, tableau), pour y chercher les blocs. */
function chaines(valeur: unknown): string[] {
	if (typeof valeur === 'string') return [valeur];
	if (Array.isArray(valeur)) return valeur.flatMap(chaines);
	if (valeur && typeof valeur === 'object') return Object.values(valeur).flatMap(chaines);
	return [];
}

function corpsDuBloc(brut: string): string {
	// Un bloc en option d'un choix est en retrait : on retire le retrait de chaque ligne
	return brut
		.split('\n')
		.map((ligne) => ligne.trim())
		.filter((ligne) => ligne !== '' && !/^case: \d+$/.test(ligne))
		.join('\n');
}

function sonder(dossier: string, tirages: number): number {
	let blocs = 0;
	let problemes = 0;
	const fichiers = readdirSync(dossier)
		.filter((n) => n.endsWith('.json'))
		.sort();
	for (const nom of fichiers) {
		const modele = lireModele(join(dossier, nom));
		const vus = new Set<string>();
		for (let graine = 1; graine <= tirages; graine++) {
			const r = generateInstance(modele, graine);
			if (!r.success || !r.instance) {
				problemes++;
				console.log(`⛔ ${nom}, graine ${graine} : ${JSON.stringify(r.errors)}`);
				continue;
			}
			for (const texte of chaines(r.instance)) {
				for (const m of texte.matchAll(BLOC_COLLECTION)) {
					blocs++;
					const corps = corpsDuBloc(m[1]);
					const erreurs = parseCollectionContent(corps).errors.map((e) => e.message);
					const cle = erreurs.join(' | ');
					if (erreurs.length > 0 && !vus.has(cle)) {
						vus.add(cle);
						problemes++;
						console.log(`⛔ ${nom}, graine ${graine} : ${cle}\n${corps}`);
					}
				}
			}
		}
	}
	console.log(
		`${fichiers.length} modèle(s), ${blocs} bloc(s) collection lus, ${problemes} problème(s)`
	);
	return problemes;
}

const dossier = valeurArgument(process.argv, '--dir');
if (!dossier) {
	console.error(
		'Usage : pnpm tsx scripts/questions/sonde-collections.ts --dir <dossier> [--tirages N]'
	);
	process.exit(1);
}
const tirages = Number(valeurArgument(process.argv, '--tirages') ?? 300);
process.exit(sonder(dossier, tirages) === 0 ? 0 : 1);
