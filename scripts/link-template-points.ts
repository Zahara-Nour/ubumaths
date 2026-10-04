/**
 * Rattacher au référentiel des modèles SANS fichier dans le dépôt
 * ===============================================================
 *
 * ⚠️ SIMULATION PAR DÉFAUT : rien n'est écrit sans `--publier`.
 *
 * Pour les modèles écrits dans l'éditeur ou importés (TinyMath), qui n'ont pas de fichier JSON
 * à passer à `create-questions.ts`. Le mapping est un fichier JSON :
 *
 *   [{ "id": "<uuid du modèle>", "points": ["1SPE-050", "1SPE-051"] },
 *    { "id": "<uuid>", "points": ["2-010"], "grades": ["2"] }, …]
 *
 * (≤ 500 entrées, 1 à 20 codes par entrée, sans doublon ni id répété ; `grades` facultatif,
 * 1 à 4 codes de `GRADE_CODES` sans doublon ; Zod strict.)
 *
 * AJOUT SEULEMENT pour les liens : aucun lien n'est jamais supprimé (un lien en base absent du
 * mapping est signalé, gardé). Seuls les `grades` du modèle peuvent changer (voir `--niveaux`) ;
 * aucun autre champ n'est jamais touché.
 *
 * CHANGER LE NIVEAU (`grades` du mapping différents de ceux en base) : appliqué SEULEMENT avec
 * `--niveaux` ; sans lui, l'entrée est une erreur, rien d'écrit. Sur un modèle publié il faut en
 * plus `--liens-publies`. Les grades sont écrits AVANT les liens, puis relus.
 *
 * Tout est vérifié AVANT la moindre écriture, s'arrête sinon :
 *  - chaque id existe (`question_templates`) ;
 *  - chaque code est un point actif, de niveau présent dans les grades CIBLES du modèle (ceux du
 *    mapping s'ils sont fournis, sinon ceux LUS EN BASE) ;
 *  - un modèle non brouillon (publié) n'est accepté qu'avec `--liens-publies` — même règle que
 *    `create-questions.ts` : une carte publiée rattachée entre dans le paquet de révision
 *    « Programme » des élèves. Simuler d'abord, montrer la simulation à David.
 * Chaque écriture est relue (la RLS échoue en silence).
 *
 * Usage :
 *   pnpm tsx scripts/link-template-points.ts --mapping <fichier.json>                  (simulation)
 *   pnpm tsx scripts/link-template-points.ts --mapping <fichier.json> --publier        (écrit)
 *   … --liens-publies   accepte aussi les modèles publiés
 *   … --niveaux         applique les `grades` du mapping (sinon : erreur s'ils diffèrent)
 *
 * Logique pure : `scripts/lib/template-points.ts` ; accès base : `scripts/lib/template-points-db.ts`.
 */
import { readFileSync } from 'node:fs';
import { argValue, createScriptClient, hasFlag } from './relecture/common';
import {
	checkPointCodes,
	decideLinkAction,
	describeGradeChange,
	describeLinkPlan,
	parseMapping,
	planGradeChange,
	planPointLinks,
	type GradeChange,
	type LinkAction,
	type MappingEntry,
	type PointLinkPlan
} from './lib/template-points';
import { readLinks, resolvePoints, writeGrades, writeLinks } from './lib/template-points-db';

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
	niveau: Exclude<GradeChange, { kind: 'refused' }>;
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
	const niveaux = hasFlag('--niveaux');
	const chemin = argValue('--mapping');
	if (!chemin) {
		console.error(
			'Usage : pnpm tsx scripts/link-template-points.ts --mapping <fichier.json> [--publier] [--liens-publies] [--niveaux]'
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

	// 2. Les niveaux : grades du mapping différents de la base → --niveaux (+ --liens-publies)
	const niveauxCibles = new Map<string, Exclude<GradeChange, { kind: 'refused' }>>();
	const refusNiveau: string[] = [];
	for (const entree of entrees) {
		const modele = modeles.get(entree.id);
		if (!modele) throw new Error(`modèle ${entree.id} perdu`);
		const niveau = planGradeChange({
			status: modele.status,
			dbGrades: modele.grades,
			wanted: entree.grades,
			niveaux,
			liensPublies
		});
		if (niveau.kind === 'refused') refusNiveau.push(`${libelle(entree)} : ${niveau.reason}`);
		else niveauxCibles.set(entree.id, niveau);
	}
	if (refusNiveau.length > 0) {
		for (const erreur of refusNiveau) console.error(`⛔ ${erreur}`);
		return 1;
	}
	const cibleDe = (id: string) => niveauxCibles.get(id)?.target ?? [];

	// 3. Les codes : actifs, niveau dans les grades CIBLES du modèle
	const resolus = await resolvePoints(supabase, [...new Set(entrees.flatMap((e) => e.codes))]);
	const erreurs = checkPointCodes(
		entrees.map((e) => ({ file: libelle(e), codes: e.codes, grades: cibleDe(e.id) })),
		resolus
	);
	if (erreurs.length > 0) {
		for (const erreur of erreurs) console.error(`⛔ ${erreur}`);
		return 1;
	}

	// 4. Le plan de chaque modèle ; un seul refus arrête tout, avant écriture
	const etapes: Etape[] = [];
	for (const entree of entrees) {
		const modele = modeles.get(entree.id);
		const niveau = niveauxCibles.get(entree.id);
		if (!modele || !niveau) throw new Error(`modèle ${entree.id} perdu`);
		const plan = planPointLinks(entree.codes, await readLinks(supabase, entree.id));
		etapes.push({
			entree,
			modele,
			plan,
			niveau,
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

	// 5. Écrire : grades d'abord, puis liens
	let ecrits = 0;
	let rien = 0;
	let niveauxChanges = 0;
	for (const { entree, modele, plan, action, niveau } of etapes) {
		const lignes: string[] = [];
		if (niveau.kind === 'change') lignes.push(describeGradeChange(niveau.from, niveau.target));
		lignes.push(describeLinkPlan(plan, false));
		const note = lignes.map((l) => `\n      ${l}`).join('');
		const statut = modele.status === 'draft' ? '' : ` [${modele.status}]`;
		if (niveau.kind === 'change') niveauxChanges++;
		if (action === 'nothing' && niveau.kind === 'same') {
			console.log(`  = ${libelle(entree)}${statut} : rien à changer${note}`);
			rien++;
			continue;
		}
		if (!publier) {
			console.log(`  + ${libelle(entree)}${statut} : à écrire${note}`);
			continue;
		}
		if (niveau.kind === 'change') {
			await writeGrades(supabase, libelle(entree), entree.id, niveau.target);
		}
		if (action === 'add') {
			await writeLinks(supabase, libelle(entree), entree.id, entree.codes, plan, resolus, false);
		}
		console.log(`  ✍️  ${libelle(entree)}${statut} : écrit et relu${note}`);
		ecrits++;
	}
	console.log(
		`\n${entrees.length} modèles — ${publier ? `${ecrits} écrits` : 'simulation'}, ${niveauxChanges} changements de grades, ${rien} sans rien à changer.`
	);
	return 0;
}

main()
	.then((code) => process.exit(code))
	.catch((e) => {
		console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
		process.exit(1);
	});
