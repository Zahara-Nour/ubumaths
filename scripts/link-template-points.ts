/**
 * Rattacher au référentiel des modèles SANS fichier dans le dépôt
 * ===============================================================
 *
 * ⚠️ SIMULATION PAR DÉFAUT : rien n'est écrit sans `--publier`.
 *
 * Pour les modèles écrits dans l'éditeur ou importés (TinyMath), qui n'ont pas de fichier JSON
 * à passer à `create-questions.ts`. Le mapping est un fichier JSON :
 *
 *   [{ "id": "<uuid du modèle>", "points": ["1SPE-050", "1SPE-051"] }, …]
 *
 * (≤ 500 entrées, 1 à 20 codes par entrée, sans doublon ni id répété ; Zod strict.)
 *
 * AJOUT SEULEMENT : aucun lien n'est jamais supprimé (un lien en base absent du mapping est
 * signalé, gardé), aucun contenu de modèle n'est jamais touché.
 *
 * Tout est vérifié AVANT la moindre écriture, s'arrête sinon :
 *  - chaque id existe (`question_templates`) ;
 *  - chaque code est un point actif, de niveau présent dans les `grades` LUS EN BASE du modèle ;
 *  - un modèle non brouillon (publié) n'est accepté qu'avec `--liens-publies` — même règle que
 *    `create-questions.ts` : une carte publiée rattachée entre dans le paquet de révision
 *    « Programme » des élèves. Simuler d'abord, montrer la simulation à David.
 * Chaque ajout est relu (la RLS échoue en silence).
 *
 * Usage :
 *   pnpm tsx scripts/link-template-points.ts --mapping <fichier.json>                  (simulation)
 *   pnpm tsx scripts/link-template-points.ts --mapping <fichier.json> --publier        (écrit)
 *   … --liens-publies   accepte aussi les modèles publiés (ajout de liens seulement)
 *
 * Logique pure : `scripts/lib/template-points.ts` ; accès base : `scripts/lib/template-points-db.ts`.
 */
import { readFileSync } from 'node:fs';
import { argValue, createScriptClient, hasFlag } from './relecture/common';
import {
	checkPointCodes,
	decideLinkAction,
	describeLinkPlan,
	parseMapping,
	planPointLinks,
	type LinkAction,
	type MappingEntry,
	type PointLinkPlan
} from './lib/template-points';
import { readLinks, resolvePoints, writeLinks } from './lib/template-points-db';

// Types

interface Modele {
	id: string;
	title: string;
	status: string;
	grades: string[];
}

interface Etape {
	entree: MappingEntry;
	modele: Modele;
	plan: PointLinkPlan;
	action: LinkAction;
}

// Constantes

/** Ids par requête `.in()` : garde l'URL PostgREST courte */
const TAILLE_LOT = 100;

// Fonctions

function lireMapping(chemin: string): unknown {
	try {
		return JSON.parse(readFileSync(chemin, 'utf8')) as unknown;
	} catch (e) {
		throw new Error(
			`mapping illisible (${chemin}) : ${e instanceof Error ? e.message : String(e)}`
		);
	}
}

async function main(): Promise<number> {
	const publier = hasFlag('--publier');
	const liensPublies = hasFlag('--liens-publies');
	const chemin = argValue('--mapping');
	if (!chemin) {
		console.error(
			'Usage : pnpm tsx scripts/link-template-points.ts --mapping <fichier.json> [--publier] [--liens-publies]'
		);
		return 2;
	}
	const mapping = parseMapping(lireMapping(chemin));
	if (!mapping.ok) {
		console.error(`⛔ ${mapping.error}`);
		return 1;
	}
	const entrees = mapping.entries;

	const { supabase, target } = createScriptClient(publier);
	console.log(`${publier ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — base ${target}\n`);

	// 1. Les modèles : tous doivent exister
	const modeles = new Map<string, Modele>();
	for (let i = 0; i < entrees.length; i += TAILLE_LOT) {
		const ids = entrees.slice(i, i + TAILLE_LOT).map((e) => e.id);
		const { data, error } = await supabase
			.from('question_templates')
			.select('id, title, status, grades')
			.in('id', ids);
		if (error) throw new Error(`lecture des modèles : ${error.message}`);
		for (const m of data ?? []) modeles.set(m.id, m);
	}
	const absents = entrees.filter((e) => !modeles.has(e.id)).map((e) => e.id);
	if (absents.length > 0) {
		for (const id of absents) console.error(`⛔ modèle ${id} introuvable`);
		return 1;
	}
	const libelle = (e: MappingEntry) => `${e.id} « ${modeles.get(e.id)?.title} »`;

	// 2. Les codes : actifs, niveau dans les grades EN BASE du modèle
	const resolus = await resolvePoints(supabase, [...new Set(entrees.flatMap((e) => e.codes))]);
	const erreurs = checkPointCodes(
		entrees.map((e) => ({
			file: libelle(e),
			codes: e.codes,
			grades: modeles.get(e.id)?.grades ?? []
		})),
		resolus
	);
	if (erreurs.length > 0) {
		for (const erreur of erreurs) console.error(`⛔ ${erreur}`);
		return 1;
	}

	// 3. Le plan de chaque modèle ; un seul refus arrête tout, avant écriture
	const etapes: Etape[] = [];
	for (const entree of entrees) {
		const modele = modeles.get(entree.id);
		if (!modele) throw new Error(`modèle ${entree.id} perdu`);
		const plan = planPointLinks(entree.codes, await readLinks(supabase, entree.id));
		etapes.push({
			entree,
			modele,
			plan,
			action: decideLinkAction(modele.status, liensPublies, plan)
		});
	}
	const refus = etapes.filter((e) => e.action === 'refused');
	if (refus.length > 0) {
		for (const { entree, modele, plan } of refus) {
			console.error(
				`⛔ ${libelle(entree)} : modèle ${modele.status} — --liens-publies requis\n      ${describeLinkPlan(plan, false)}`
			);
		}
		return 1;
	}

	// 4. Ajouter
	let ajoutes = 0;
	let rien = 0;
	for (const { entree, modele, plan, action } of etapes) {
		const note = `\n      ${describeLinkPlan(plan, false)}`;
		const statut = modele.status === 'draft' ? '' : ` [${modele.status}]`;
		if (action === 'nothing') {
			console.log(`  = ${libelle(entree)}${statut} : aucun lien à ajouter${note}`);
			rien++;
			continue;
		}
		if (!publier) {
			console.log(`  + ${libelle(entree)}${statut} : liens à ajouter${note}`);
			continue;
		}
		await writeLinks(supabase, libelle(entree), entree.id, entree.codes, plan, resolus, false);
		console.log(`  ✍️  ${libelle(entree)}${statut} : liens ajoutés et relus${note}`);
		ajoutes++;
	}
	console.log(
		`\n${entrees.length} modèles — ${publier ? `${ajoutes} rattachés` : 'simulation'}, ${rien} sans lien à ajouter.`
	);
	return 0;
}

main()
	.then((code) => process.exit(code))
	.catch((e) => {
		console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
		process.exit(1);
	});
