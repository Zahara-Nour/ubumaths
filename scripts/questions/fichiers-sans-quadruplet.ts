/**
 * Fichiers de lot sans quadruplet (chantier `automaths-arbre`, lot 3b) — script PONCTUEL
 * ======================================================================================
 *
 * Les fichiers de `scripts/questions/**` retrouvaient leur modèle en base par titre, thème,
 * domaine, sous-domaine et niveau. Ces colonnes partent (lot 4, ADR 0035) : chaque fichier
 * reçoit l'`id` de SON modèle (décision Q14 du journal docs/wip/automaths-arbre-progress.md),
 * tant que le quadruplet permet encore de le retrouver, puis perd `theme`, `domain`, `subdomain`
 * (Q15). Un fichier « Graphes et matrices » sans déclaration reçoit `shared.capitalPairs =
 * 'product'` : le sens de `AB` ne se lit plus dans le thème (Q13).
 *
 * Appariement d'un fichier sans `id` : titre + quadruplet + niveau, exactement une ligne ; à
 * défaut titre + quadruplet seul (niveau renuméroté en base depuis), exactement une ligne ; à
 * défaut le titre seul, s'il ne désigne qu'une ligne (modèle re-rangé en base depuis), signalé.
 * Un fichier qui porte déjà un `id` le garde (la ligne doit exister, sinon le fichier n'est pas
 * modifié). Un fichier sans modèle en base (lot pas encore créé, ou modèle renommé / scindé en
 * base depuis) perd ses anciens champs SANS recevoir d'`id` : `create-questions` le verra « à
 * créer » ; il est listé. Un fichier déjà sans anciens champs n'est pas touché : le script se
 * rejoue après un rebase (lot en cours dans un autre worktree).
 *
 * Lecture seule de la base (`.env` = la prod). Simulation par défaut ; `--ecrire` réécrit les
 * fichiers (JSON à tabulations, à repasser à prettier : la liste est écrite dans `--liste`).
 *
 *   pnpm tsx scripts/questions/fichiers-sans-quadruplet.ts
 *   pnpm tsx scripts/questions/fichiers-sans-quadruplet.ts --ecrire --liste <fichier>
 *
 * À supprimer au lot 4 (plus de quadruplet pour apparier).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { argValue, createScriptClient, hasFlag } from '../relecture/common';

// Types

interface Ligne {
	id: string;
	title: string;
	theme: string | null;
	domain: string | null;
	subdomain: string | null;
	level: number;
}

// Constantes

const RACINE = 'scripts/questions';
const PAGE = 1000;
const ANCIENS_CHAMPS = ['theme', 'domain', 'subdomain'] as const;
const THEME_PRODUIT = 'Graphes et matrices';

// Fonctions

function fichiersJson(dossier: string): string[] {
	return readdirSync(dossier, { withFileTypes: true })
		.flatMap((e) =>
			e.isDirectory()
				? fichiersJson(join(dossier, e.name))
				: e.name.endsWith('.json')
					? [join(dossier, e.name)]
					: []
		)
		.sort();
}

function texte(v: unknown): string | null {
	return typeof v === 'string' && v.length > 0 ? v : null;
}

async function lireLignes(): Promise<Ligne[]> {
	const { supabase, target } = createScriptClient(false);
	console.log(`🔍 LECTURE — base ${target}\n`);
	const lignes: Ligne[] = [];
	for (let debut = 0; ; debut += PAGE) {
		const { data, error } = await supabase
			.from('question_templates')
			.select('id, title, theme, domain, subdomain, level')
			.order('id')
			.range(debut, debut + PAGE - 1);
		if (error) throw error;
		lignes.push(...data);
		if (data.length < PAGE) return lignes;
	}
}

async function main(): Promise<number> {
	const ecrire = hasFlag('--ecrire');
	const liste = argValue('--liste');
	if (ecrire && !liste) {
		console.error('--ecrire exige --liste <fichier> (fichiers réécrits, pour prettier)');
		return 2;
	}
	const lignes = await lireLignes();
	const parId = new Map(lignes.map((l) => [l.id, l]));

	const reecrits: string[] = [];
	const nonApparies: string[] = [];
	const sansModele: string[] = [];
	let parQuadruplet = 0;
	let niveauRenumerote = 0;
	let reRanges = 0;
	let dejaId = 0;
	let produit = 0;
	for (const chemin of fichiersJson(RACINE)) {
		const brut = JSON.parse(readFileSync(chemin, 'utf8')) as Record<string, unknown>;
		if (!ANCIENS_CHAMPS.some((c) => c in brut)) continue;
		let id = texte(brut.id);
		if (id) {
			if (!parId.has(id)) {
				nonApparies.push(`${chemin} : id ${id.slice(0, 8)} absent de la base`);
				continue;
			}
			dejaId++;
		} else {
			const theme = texte(brut.theme);
			const domain = texte(brut.domain);
			const subdomain = texte(brut.subdomain);
			const memeCle = lignes.filter(
				(l) =>
					l.title === brut.title &&
					l.theme === theme &&
					l.domain === domain &&
					(l.subdomain ?? null) === subdomain
			);
			const memeNiveau = memeCle.filter((l) => l.level === brut.level);
			const memeTitre = lignes.filter((l) => l.title === brut.title);
			const choisie =
				memeNiveau.length === 1
					? memeNiveau[0]
					: memeCle.length === 1
						? memeCle[0]
						: memeCle.length === 0 && memeTitre.length === 1
							? memeTitre[0]
							: null;
			if (!choisie) {
				sansModele.push(
					`${chemin} : « ${String(brut.title)} » — ${memeNiveau.length} au niveau, ${memeCle.length} tous niveaux, ${memeTitre.length} de même titre`
				);
			} else if (memeCle.length === 0) {
				reRanges++;
				console.log(
					`  ⇄ ${chemin} : re-rangé en base (${choisie.theme} › ${choisie.domain} › ${choisie.subdomain ?? '—'}, niveau ${choisie.level}, ${choisie.id.slice(0, 8)})`
				);
			} else if (memeNiveau.length !== 1) {
				niveauRenumerote++;
				console.log(
					`  ↕ ${chemin} : niveau ${String(brut.level)} dans le fichier, ${choisie.level} en base (${choisie.id.slice(0, 8)})`
				);
			}
			if (choisie) {
				id = choisie.id;
				parQuadruplet++;
			}
		}

		// Sens de AB : la déclaration remplace le contexte du thème
		const shared =
			brut.shared && typeof brut.shared === 'object' && !Array.isArray(brut.shared)
				? (brut.shared as Record<string, unknown>)
				: null;
		let nouveauShared: unknown = brut.shared;
		if (brut.theme === THEME_PRODUIT && shared?.capitalPairs === undefined) {
			nouveauShared = { ...shared, capitalPairs: 'product' };
			produit++;
		}

		const sortie: Record<string, unknown> = id ? { id } : {};
		for (const [cle, valeur] of Object.entries(brut)) {
			if (cle === 'id' || (ANCIENS_CHAMPS as readonly string[]).includes(cle)) continue;
			sortie[cle] = cle === 'shared' ? nouveauShared : valeur;
		}
		if (!('shared' in brut) && nouveauShared !== undefined) sortie.shared = nouveauShared;
		if (ecrire) writeFileSync(chemin, `${JSON.stringify(sortie, null, '\t')}\n`);
		reecrits.push(chemin);
	}

	if (ecrire && liste) writeFileSync(liste, `${reecrits.join('\n')}\n`);
	console.log(
		`\n${reecrits.length} fichiers ${ecrire ? 'réécrits' : 'à réécrire'} : ${dejaId} portaient déjà leur id, ${parQuadruplet} appariés par le quadruplet (dont ${niveauRenumerote} au niveau renuméroté, ${reRanges} re-rangés en base, par le titre seul), ${produit} reçoivent capitalPairs = 'product'.`
	);
	if (sansModele.length > 0) {
		console.log(
			`\n⚠️  ${sansModele.length} fichiers sans modèle en base (anciens champs retirés, sans id : « à créer ») :`
		);
		for (const n of sansModele) console.log(`  - ${n}`);
	}
	if (nonApparies.length > 0) {
		console.log(`\n⛔ ${nonApparies.length} fichiers NON modifiés (id absent de la base) :`);
		for (const n of nonApparies) console.log(`  - ${n}`);
	}
	return 0;
}

main()
	.then((code) => process.exit(code))
	.catch((e) => {
		console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
		process.exit(1);
	});
