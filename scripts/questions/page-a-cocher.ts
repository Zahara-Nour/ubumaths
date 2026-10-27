/**
 * Page à cocher d'un lot de modèles de questions
 * ===============================================
 *
 * Une fiche par modèle du dossier : un exemple par variation tiré par le vrai générateur, blocs
 * dessinés par les scènes de l'appli, le point, ses bornes, les plages et les specs ; « OK / À
 * revoir » + commentaire, enregistrés dans la collection `verdicts` de l'artefact (capacité `db`).
 * L'id, le nœud et le point de chaque modèle sont LUS en base (lecture seule) : la page montre ce
 * qui est en base, et signale un modèle sans point ou sans nœud.
 * Démarche : docs/pratiques/couvrir-un-niveau.md § 8.
 *
 *   pnpm tsx scripts/questions/page-a-cocher.ts --dir scripts/questions/cp-c \
 *     --titre "Relecture CP — lot C" --intro "<p>…</p>" --sortie <fichier.html>
 *
 * `--intro` : HTML (une phrase, ce que le lot apporte) ; `--intro-fichier <f>` pour un texte
 * long. Base lue : `.env` (la PROD) ; `set -a; . ./.env.local; set +a` avant, pour la locale.
 * La page s'écrit dans le scratchpad, puis se publie en artefact avec la capacité `db`.
 */

import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createScriptClient } from '../relecture/common';
import { apparierLot, lireLot, titresDuLot, valeurArgument } from '../lib/lot-questions';
import {
	assemblerPage,
	cheminDuNoeud,
	ficheDuModele,
	type PointBornes
} from '../lib/page-a-cocher';

const GABARIT = 'scripts/questions/page-a-cocher.html';
const BORNES = 'docs/systeme/programmes/bornes';

/** Tous les points relevés (cycles 2 à 4, lycée), par code : les codes portent leur niveau */
function lireBornes(): Record<string, PointBornes> {
	const fichiers = [
		...readdirSync(BORNES).map((f) => join(BORNES, f)),
		...readdirSync(join(BORNES, 'lycee')).map((f) => join(BORNES, 'lycee', f))
	].filter((f) => f.endsWith('.json') && !f.split('/').pop()?.startsWith('questions'));
	const points: Record<string, PointBornes> = {};
	for (const f of fichiers) {
		const contenu = JSON.parse(readFileSync(f, 'utf8')) as Record<string, unknown>;
		for (const niveau of Object.values(contenu)) {
			if (niveau && typeof niveau === 'object' && 'points' in niveau) {
				Object.assign(points, (niveau as { points: Record<string, PointBornes> }).points);
			}
		}
	}
	return points;
}

async function main(): Promise<number> {
	const dossier = valeurArgument(process.argv, '--dir');
	const titre = valeurArgument(process.argv, '--titre');
	const sortie = valeurArgument(process.argv, '--sortie');
	const introFichier = valeurArgument(process.argv, '--intro-fichier');
	const intro = introFichier
		? readFileSync(introFichier, 'utf8')
		: (valeurArgument(process.argv, '--intro') ?? '');
	if (!dossier || !titre || !sortie) {
		console.error(
			'Usage : pnpm tsx scripts/questions/page-a-cocher.ts --dir <dossier> --titre <titre> --sortie <fichier.html> [--intro <html> | --intro-fichier <f>]'
		);
		return 2;
	}
	const lot = lireLot(dossier);
	const { supabase, target } = createScriptClient(false);
	console.log(`🔍 LECTURE — base ${target}\n`);

	const { data, error } = await supabase
		.from('question_templates')
		.select('id, title, theme, domain, subdomain, level, status, classification_node_id')
		.in('title', titresDuLot(lot));
	if (error) throw new Error(`lecture des modèles impossible — ${error.message}`);
	const appariement = apparierLot(lot, data ?? [], { niveau: false });
	if (!appariement.ok) {
		for (const e of appariement.erreurs) console.error(`⛔ ${e}`);
		return 1;
	}
	const ids = appariement.paires.map((p) => p.ligne.id);

	const { data: tags, error: e2 } = await supabase
		.from('question_template_points')
		.select('template_id, point_id')
		.in('template_id', ids);
	if (e2) throw new Error(`lecture des tags impossible — ${e2.message}`);
	const pointIds = [...new Set((tags ?? []).map((t) => t.point_id))];
	const { data: points, error: e3 } = pointIds.length
		? await supabase.from('curriculum_points').select('id, code').in('id', pointIds)
		: { data: [], error: null };
	if (e3) throw new Error(`lecture des points impossible — ${e3.message}`);
	const codeDuPoint = new Map((points ?? []).map((p) => [p.id, p.code]));
	// Les nœuds des modèles et leurs ancêtres seulement (PostgREST plafonne une lecture à 1000 lignes)
	const arbre = new Map<string, { name: string; parent_id: string | null }>();
	let manquants = [
		...new Set(appariement.paires.flatMap((p) => p.ligne.classification_node_id ?? []))
	];
	for (let etage = 0; manquants.length > 0 && etage < 10; etage++) {
		const { data: noeuds, error: e4 } = await supabase
			.from('classification_nodes')
			.select('id, name, parent_id')
			.in('id', manquants);
		if (e4) throw new Error(`lecture de l'arbre impossible — ${e4.message}`);
		for (const n of noeuds ?? []) arbre.set(n.id, n);
		manquants = [
			...new Set(
				(noeuds ?? []).flatMap((n) => (n.parent_id && !arbre.has(n.parent_id) ? [n.parent_id] : []))
			)
		];
	}

	const bornes = lireBornes();
	const fiches = appariement.paires.map(({ modele, ligne, ecartes }) => {
		const fiche = ficheDuModele(
			modele,
			{
				id: ligne.id,
				statut: ligne.status,
				niveau: ligne.level,
				rangement: ligne.classification_node_id
					? cheminDuNoeud(ligne.classification_node_id, arbre)
					: null,
				codes: (tags ?? [])
					.filter((t) => t.template_id === ligne.id)
					.map((t) => codeDuPoint.get(t.point_id) ?? '?')
					.sort()
			},
			bornes
		);
		// Départage par le niveau : l'homonyme écarté pourrait être le vrai modèle (lot renuméroté)
		for (const autre of ecartes ?? [])
			fiche.alertes.push(
				`homonyme ${autre.id.slice(0, 8)} (niveau ${autre.level}) écarté : vérifier que c'est le bon modèle`
			);
		return fiche;
	});
	writeFileSync(sortie, assemblerPage(readFileSync(GABARIT, 'utf8'), { titre, intro, fiches }));

	for (const f of fiches) {
		const alerte = f.alertes.length ? `  ⚠ ${f.alertes.join(' · ')}` : '';
		console.log(
			`  ${f.id.slice(0, 8)} ${f.code.padEnd(7)} ${f.statut.padEnd(9)} ${f.titre} (${f.exemples.length} ex.)${alerte}`
		);
	}
	const alertes = fiches.filter((f) => f.alertes.length > 0).length;
	console.log(
		`\n${fiches.length} fiches → ${sortie}${alertes ? ` — ⚠ ${alertes} avec alerte` : ''}`
	);
	return 0;
}

main()
	.then((code) => process.exit(code))
	.catch((e) => {
		console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
		process.exit(1);
	});
