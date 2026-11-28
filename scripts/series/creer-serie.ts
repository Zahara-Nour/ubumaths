/**
 * Enregistrer une série validée avec David, décrite dans un fichier
 * ==================================================================
 *
 * Le fichier (`scripts/series/<nom>.json`) a la forme d'une série de l'appli (ADR 0035) :
 *   { "title": …, "grade": "6", "description": …,
 *     "items": [{ "modele": "<titre, pour relire>", "templateId": "<uuid>", "quantity": 2, "delay": 60 }] }
 *
 * - Simulation par défaut : le fichier est validé (mêmes bornes que l'appli), chaque modèle est
 *   cherché en base (existe, publié, du niveau de la série), la série est affichée avec sa durée.
 *   Rien n'est écrit.
 * - `--publier` : enregistre la série au nom du professeur (l'unique profil `teacher`, modèle
 *   mono-professeur), puis écrit l'id de la série en tête du fichier (à commiter).
 * - Un fichier qui porte déjà un id n'est jamais recréé : `--publier --mettre-a-jour` remplace
 *   titre, niveau, description et modèles de cette série. La base refuse de modifier une série
 *   verrouillée (un élève l'a commencée) : le script le dit et n'écrit rien.
 *
 *   pnpm tsx scripts/series/creer-serie.ts --fichier scripts/series/6-mediatrice.json             # simulation
 *   pnpm tsx scripts/series/creer-serie.ts --fichier scripts/series/6-mediatrice.json --publier   # écriture
 *
 * Base visée : `.env` (la PROD) ; `set -a; . ./.env.local; set +a` avant, pour la base locale.
 * En prod, l'écriture est lancée par David (`!`).
 */

import { createScriptClient, hasFlag } from '../relecture/common';
import { valeurArgument } from '../lib/lot-questions';
import {
	controlerModeles,
	dureeTotale,
	ecrireIdSerie,
	lireSerie,
	versLigneSerie
} from '../lib/serie-fichier';
import { SERIES_LOCKED_SQLSTATE } from '../../src/lib/server/series';
import { toJson } from '../../src/lib/types/database-helpers';

function minutes(secondes: number): string {
	const m = Math.floor(secondes / 60);
	const s = secondes % 60;
	return s === 0 ? `${m} min` : `${m} min ${s} s`;
}

async function main(): Promise<number> {
	const chemin = valeurArgument(process.argv, '--fichier');
	const publier = hasFlag('--publier');
	const mettreAJour = hasFlag('--mettre-a-jour');
	if (!chemin) {
		console.error(
			'Usage : pnpm tsx scripts/series/creer-serie.ts --fichier <fichier.json> [--publier [--mettre-a-jour]]'
		);
		return 2;
	}
	const serie = lireSerie(chemin);
	if (mettreAJour && !serie.id) {
		console.error(
			`⛔ --mettre-a-jour : le fichier ne porte pas d'id de série, rien à mettre à jour (un --publier seul en créerait une)`
		);
		return 2;
	}
	const { supabase, target } = createScriptClient(publier);
	console.log(`${publier ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — base ${target}\n`);

	// Les modèles de la série
	const ids = serie.items.map((i) => i.templateId);
	const { data: modeles, error } = await supabase
		.from('question_templates')
		.select('id, title, status, grades, delay')
		.in('id', ids);
	if (error) throw new Error(`lecture des modèles impossible — ${error.message}`);
	const parId = new Map((modeles ?? []).map((m) => [m.id, m]));

	console.log(`« ${serie.title} » — niveau ${serie.grade}`);
	for (const item of serie.items) {
		const m = parId.get(item.templateId);
		const duree = item.delay > 0 ? `${item.delay} s` : `${m?.delay ?? '?'} s (défaut)`;
		console.log(
			`  ${item.quantity} × ${duree.padEnd(14)} ${m ? `« ${m.title} »` : `${item.templateId} (introuvable)`}`
		);
	}
	const delais = new Map((modeles ?? []).map((m) => [m.id, m.delay ?? 0]));
	const total = serie.items.reduce((n, i) => n + i.quantity, 0);
	console.log(`  → ${total} questions, ${minutes(dureeTotale(serie, delais))}\n`);

	const refus = controlerModeles(serie, modeles ?? []);
	if (refus.length > 0) {
		for (const r of refus) console.error(`⛔ ${r}`);
		console.error(`\n⛔ série refusée, rien n'est écrit`);
		return 1;
	}

	// Le professeur (modèle mono-professeur : un seul)
	const { data: profs, error: profsError } = await supabase
		.from('profiles')
		.select('id')
		.eq('role', 'teacher');
	if (profsError) throw new Error(`lecture des professeurs impossible — ${profsError.message}`);
	if (!profs || profs.length !== 1) {
		console.error(`⛔ il faut exactement 1 profil professeur, trouvé ${profs?.length ?? 0}`);
		return 1;
	}
	const profId = profs[0].id;

	// Série déjà enregistrée : elle doit exister et appartenir au professeur
	if (serie.id) {
		const { data: existante, error: lectureError } = await supabase
			.from('series')
			.select('id, title, created_by')
			.eq('id', serie.id)
			.maybeSingle();
		if (lectureError) throw new Error(`lecture de la série impossible — ${lectureError.message}`);
		if (!existante) {
			console.error(`⛔ le fichier porte l'id ${serie.id}, introuvable en base`);
			return 1;
		}
		if (existante.created_by !== profId) {
			console.error(`⛔ la série ${serie.id} n'appartient pas au professeur`);
			return 1;
		}
		if (!mettreAJour) {
			console.log(
				`ℹ️  déjà enregistrée (${serie.id}, « ${existante.title} ») : --mettre-a-jour pour la remplacer`
			);
			return publier ? 1 : 0;
		}
	}

	if (!publier) {
		console.log(`✅ simulation : la série peut être ${serie.id ? 'mise à jour' : 'enregistrée'}`);
		return 0;
	}

	const champs = {
		title: serie.title,
		grade: serie.grade,
		description: serie.description ?? null,
		items: toJson(serie.items.map(versLigneSerie))
	};

	if (serie.id) {
		// `.select()` : un refus rend zéro ligne, sans erreur
		const { data, error: majError } = await supabase
			.from('series')
			.update(champs)
			.eq('id', serie.id)
			.eq('created_by', profId)
			.select('id');
		if (majError) {
			if (majError.code === SERIES_LOCKED_SQLSTATE) {
				console.error(`⛔ série verrouillée : un élève l'a commencée, rien n'est modifié`);
				return 1;
			}
			throw new Error(`mise à jour impossible — ${majError.message}`);
		}
		if (!data || data.length !== 1) {
			console.error(`⛔ mise à jour sans effet (${data?.length ?? 0} ligne)`);
			return 1;
		}
		console.log(`✅ série mise à jour : ${serie.id}`);
		return 0;
	}

	const { data: creee, error: creationError } = await supabase
		.from('series')
		.insert({ ...champs, created_by: profId })
		.select('id')
		.single();
	if (creationError || !creee) {
		throw new Error(`enregistrement impossible — ${creationError?.message ?? 'aucune ligne'}`);
	}
	try {
		ecrireIdSerie(chemin, creee.id);
	} catch (e) {
		// La série existe déjà en base : sans son id dans le fichier, une relance créerait un doublon
		console.error(
			`⛔ série enregistrée (${creee.id}), mais l'id n'a pas pu être écrit dans ${chemin} : ` +
				`ajoute "id": "${creee.id}" en tête du fichier avant toute relance — ` +
				(e instanceof Error ? e.message : String(e))
		);
		return 1;
	}
	console.log(`✅ série enregistrée : ${creee.id} (id écrit dans ${chemin}, à commiter)`);
	return 0;
}

main().then(
	(code) => process.exit(code),
	(e: unknown) => {
		console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
		process.exit(1);
	}
);
