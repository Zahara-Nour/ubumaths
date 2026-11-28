/**
 * Fabriquer la migration « nœud et tag » d'un lot de modèles
 * ==========================================================
 *
 * `create-questions --publier` crée les modèles en brouillon, sans nœud ni tag. Ce script fabrique
 * la migration qui les range et les tague, à partir du champ `rangement` de chaque fichier :
 *
 *   "rangement": { "noeud": "Nombres et calculs > Décimaux : calculs > multiplication", "point": "6-115" }
 *   "rangement": { "noeud": "…", "point": ["1SPE-355", "1TECHNO-095"] }   (un point par programme)
 *   "rangement": { "niveauxAjoutes": ["6"] }      (modèle déjà rangé qui gagne un niveau)
 *   "rangement": { "pointsAjoutes": ["1TECHNO-095"] }   (modèle déjà rangé qui gagne un tag ;
 *                                                  peut aller avec « niveauxAjoutes »)
 *
 *  - relève en PROD (lecture seule) chaque modèle des dossiers, apparié par l'id de son fichier
 *    (titre et niveau doivent concorder), l'arbre des notions et les points visés ;
 *  - modèle neuf sans nœud ni tag → rangé ; déjà exactement rangé et tagué ainsi → ignoré ;
 *    fichier sans `rangement` d'un modèle déjà rangé → ignoré ;
 *  - refus de tout le lot (rien n'est écrit) : fichier sans id, id absent, titre ou niveau
 *    différents, `rangement` illisible, chemin ou point introuvable, point ni sur le nœud ni sur
 *    sa notion, deux points d'un même programme, point d'un niveau que le modèle n'a pas, modèle
 *    déjà rangé ou tagué autrement, modèle sans nœud dont le fichier n'a pas de `rangement` ;
 *  - écrit `supabase/migrations/<horodatage>_questions_<lot>_rangement_tags.sql` et sa fixture
 *    `tests/integration/fixtures/rangement-tags/<même nom>.json`, rejouée par
 *    `tests/integration/migrations-rangement-tags.test.ts`.
 * Règles et SQL : `scripts/lib/migration-rangement.ts`. N'écrit jamais en base.
 *
 *   pnpm tsx scripts/questions/migration-rangement.ts --dir scripts/questions/<lot> [--dir <autre>] [--nom <lot>]
 *
 * Plusieurs `--dir` = une seule migration (modèles neufs et modèles publiés d'un même chantier) ;
 * le nom du lot est celui du premier dossier, ou `--nom`.
 * Base lue : `.env` (la PROD) — exigée : les gardes de la migration sont l'état de la prod.
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createScriptClient } from '../relecture/common';
import {
	apparierLot,
	idsDuLot,
	lireLot,
	valeurArgument,
	type ModeleDuLot
} from '../lib/lot-questions';
import {
	examinerModele,
	genererMigration,
	lireRangement,
	nomMigration,
	type Arbre,
	type FixtureRangement,
	type Lot,
	type ModeleProd,
	type NoeudArbre,
	type PointProgramme,
	type Rangement
} from '../lib/migration-rangement';

// Types

interface LigneProd {
	id: string;
	title: string;
	level: number;
	status: string;
	grades: string[];
	classification_node_id: string | null;
}

// Constantes

const FIXTURES = 'tests/integration/fixtures/rangement-tags';
const PAGE = 1000;

// Fonctions

/** Toutes les valeurs d'une option répétée (`--dir a --dir b`) */
function valeursArgument(argv: readonly string[], option: string): string[] {
	return argv.flatMap((a, i) => {
		const valeur = a === option ? valeurArgument(argv.slice(i), option) : undefined;
		return valeur === undefined ? [] : [valeur];
	});
}

function nomDuDossier(dossier: string): string {
	return dossier.replace(/\/+$/, '').split('/').at(-1) ?? dossier;
}

async function main(): Promise<number> {
	const dossiers = valeursArgument(process.argv, '--dir');
	if (dossiers.length === 0) {
		console.error(
			'Usage : pnpm tsx scripts/questions/migration-rangement.ts --dir <dossier> [--dir <autre>] [--nom <lot>]'
		);
		return 2;
	}
	// Deux dossiers de même nom (`6e/lot1`, `5e/lot1`) : le chemin entier, sinon deux fichiers
	// porteraient le même nom et l'un prendrait le rangement de l'autre
	const nomsDistincts = new Set(dossiers.map(nomDuDossier)).size === dossiers.length;
	const lot: ModeleDuLot[] = dossiers.flatMap((d) =>
		lireLot(d).map((m) => ({
			...m,
			fichier:
				dossiers.length > 1 ? `${nomsDistincts ? nomDuDossier(d) : d}/${m.fichier}` : m.fichier
		}))
	);
	const erreurs: string[] = [];
	const vus = new Set<string>();
	for (const { fichier } of lot) {
		if (vus.has(fichier)) erreurs.push(`${fichier} : deux fichiers du lot portent ce nom`);
		vus.add(fichier);
	}
	const rangements = new Map<string, Rangement | null>();
	for (const { fichier, rangement } of lot) {
		const lu = lireRangement(rangement, fichier);
		if (lu.ok) rangements.set(fichier, lu.rangement);
		else erreurs.push(lu.erreur);
	}
	if (erreurs.length > 0) {
		for (const e of erreurs) console.error(`⛔ ${e}`);
		console.error(`\n⛔ lot refusé, rien n'est écrit`);
		return 1;
	}

	const { supabase, target } = createScriptClient(false);
	if (!target.startsWith('PRODUCTION')) {
		console.error(`⛔ base ${target} : l'état à garder se relève en PROD (.env, sans .env.local)`);
		return 1;
	}
	console.log(`🔍 relevé — base ${target}\n`);

	const ids = idsDuLot(lot);
	const modeles = await supabase
		.from('question_templates')
		.select('id, title, level, status, grades, classification_node_id')
		.in('id', ids);
	if (modeles.error) throw new Error(`lecture des modèles impossible — ${modeles.error.message}`);
	const appariement = apparierLot(lot, (modeles.data ?? []) as LigneProd[]);
	if (!appariement.ok) {
		for (const e of appariement.erreurs) console.error(`⛔ ${e}`);
		console.error(`\n⛔ lot refusé, rien n'est écrit`);
		return 1;
	}
	const tags = await supabase
		.from('question_template_points')
		.select('template_id, point_id')
		.in('template_id', ids);
	if (tags.error) throw new Error(`lecture des tags impossible — ${tags.error.message}`);

	const noeuds: NoeudArbre[] = [];
	for (let debut = 0; ; debut += PAGE) {
		const page = await supabase
			.from('classification_nodes')
			.select('id, parent_id, name, kind, archived_at')
			.order('id')
			.range(debut, debut + PAGE - 1);
		if (page.error) throw new Error(`lecture de l'arbre impossible — ${page.error.message}`);
		noeuds.push(...page.data);
		if (page.data.length < PAGE) break;
	}
	const codes = [...new Set([...rangements.values()].flatMap((r) => r?.points ?? []))];
	const pointsDesTags = [...new Set((tags.data ?? []).map((t) => t.point_id))];
	const points: PointProgramme[] = [];
	for (const [colonne, valeurs] of [
		['code', codes],
		['id', pointsDesTags]
	] as const) {
		if (valeurs.length === 0) continue;
		const lus = await supabase
			.from('curriculum_points')
			.select('id, code, grade, node_id, archived_at')
			.in(colonne, valeurs);
		if (lus.error) throw new Error(`lecture des points impossible — ${lus.error.message}`);
		points.push(...lus.data.filter((p) => !points.some((x) => x.id === p.id)));
	}
	const arbre: Arbre = { noeuds, points };

	const resultat: Lot = { ranges: [], niveaux: [], tags: [] };
	for (const { fichier, ligne } of appariement.paires) {
		const prod: ModeleProd = {
			id: ligne.id,
			title: ligne.title,
			grades: ligne.grades,
			classification_node_id: ligne.classification_node_id,
			points: (tags.data ?? []).filter((t) => t.template_id === ligne.id).map((t) => t.point_id)
		};
		const examen = examinerModele(fichier, rangements.get(fichier) ?? null, prod, arbre);
		const id8 = ligne.id.slice(0, 8);
		if (examen.sorte === 'refuse') {
			erreurs.push(examen.erreur);
		} else if (examen.sorte === 'ignore') {
			console.log(`  ${id8} ignoré   ${fichier} — ${examen.raison}`);
		} else if (examen.sorte === 'ajouts') {
			const { niveaux, tags } = examen;
			if (niveaux) {
				console.log(
					`  ${id8} niveaux  ${fichier} — {${niveaux.avant.join(', ')}} → {${niveaux.apres.join(', ')}}`
				);
				resultat.niveaux.push(niveaux);
			}
			if (tags) {
				console.log(
					`  ${id8} tags     ${fichier} — {${tags.avant.join(', ')}} + ${tags.ajoutes.join(' + ')}`
				);
				resultat.tags.push(tags);
			}
		} else {
			const m = examen.modele;
			console.log(
				`  ${id8} rangé    ${fichier} — ${m.points.join(' + ') || 'sans tag'}, ${[m.branche, m.notion, ...(m.sousNotion === null ? [] : [m.sousNotion])].join(' > ')}`
			);
			resultat.ranges.push(m);
		}
	}
	if (erreurs.length > 0) {
		for (const e of erreurs) console.error(`⛔ ${e}`);
		console.error(`\n⛔ lot refusé, rien n'est écrit`);
		return 1;
	}
	if (resultat.ranges.length === 0 && resultat.niveaux.length === 0 && resultat.tags.length === 0) {
		console.log(`\nAucun modèle à ranger, ni niveau ni tag à ajouter : pas de migration.`);
		return 0;
	}

	const horodatage = execFileSync(
		'bash',
		['scripts/garde-migrations-horodatage.sh', '--prochain'],
		{
			encoding: 'utf8'
		}
	).trim();
	if (!/^\d{14}$/.test(horodatage)) throw new Error(`horodatage illisible : « ${horodatage} »`);
	const lotNom = valeurArgument(process.argv, '--nom') ?? nomDuDossier(dossiers[0] ?? 'lot');
	const nom = nomMigration(horodatage, lotNom);
	const migration = `supabase/migrations/${nom}.sql`;
	const date = new Date().toISOString().slice(0, 10);
	const sql = genererMigration({ lot: lotNom, source: dossiers.join(', '), date }, resultat);
	const fixture: FixtureRangement = { migration, ...resultat };
	// Fixture d'abord : une migration sans sa fixture ne serait jamais rejouée par le test
	mkdirSync(FIXTURES, { recursive: true });
	writeFileSync(join(FIXTURES, `${nom}.json`), `${JSON.stringify(fixture, null, '\t')}\n`);
	writeFileSync(migration, sql);
	console.log(`\n✓ ${migration}\n✓ ${join(FIXTURES, `${nom}.json`)}`);
	console.log(`  test : pnpm test:integration tests/integration/migrations-rangement-tags.test.ts`);
	return 0;
}

main().then(
	(code) => process.exit(code),
	(e: unknown) => {
		console.error(e);
		process.exit(1);
	}
);
