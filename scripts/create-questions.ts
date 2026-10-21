/**
 * Créer des modèles de questions NEUFS (en brouillon) depuis des fichiers JSON
 * ============================================================================
 *
 * ⚠️ SIMULATION PAR DÉFAUT : rien n'est écrit sans `--publier`.
 *
 * Pour des questions écrites hors de l'éditeur (ex. automatismes de 1re) ; les
 * questions TinyMath passent, elles, par `pnpm relecture:import`.
 *
 * Chaque fichier `*.json` du dossier est un modèle brut (camelCase, sans `id`), avec
 * ses `testSpecs`. Il n'est créé que si :
 *  - `checkTemplate` passe (structure, TOUTES les specs vertes, tirages sans échec) ;
 *  - aucun modèle de même titre n'existe au même endroit (thème, domaine,
 *    sous-domaine, niveau) — rejouable sans doublon.
 * Statut forcé à `draft` (David publie lui-même) ; `test_specs` écrit ; chaque ligne
 * est relue après écriture. S'arrête à la première erreur.
 *
 * Le champ `points` (codes des anciens points) est abandonné : un fichier qui le porte est
 * refusé. Les points d'un modèle se rattachent dans sa page admin.
 *
 * Usage :
 *   pnpm tsx scripts/create-questions.ts --dir <dossier>            (simulation)
 *   pnpm tsx scripts/create-questions.ts --dir <dossier> --publier  (écrit)
 *   … --publier --mettre-a-jour   remplace aussi le contenu des modèles DÉJÀ en base, s'ils
 *                                 sont encore en brouillon (un modèle publié n'est jamais touché).
 *                                 Contenu = variations, shared, options, test_specs ET grades
 *                                 (comparés comme un ensemble).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { QuestionTemplate } from '$lib/questions/types';
import { checkTemplate } from '$lib/migration/review/check-template';
import { toTemplateInsertRow } from '$lib/migration/review/template-insert-row';
import { argValue, createScriptClient, findReviewerId, hasFlag } from './relecture/common';
import { readTemplateFile, sameGrades } from './lib/template-file';

interface Entree {
	fichier: string;
	modele: Omit<QuestionTemplate, 'id'>;
}

/** Sérialisation à clés triées : `jsonb` réordonne les clés, `JSON.stringify` seul verrait
 *  toujours une différence entre le fichier et la base */
function canonique(valeur: unknown): string {
	return JSON.stringify(valeur, (_cle, v: unknown) =>
		v && typeof v === 'object' && !Array.isArray(v)
			? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
			: v
	);
}

async function main(): Promise<number> {
	const publier = hasFlag('--publier');
	const mettreAJour = hasFlag('--mettre-a-jour');
	const dossier = argValue('--dir');
	if (!dossier) {
		console.error(
			'Usage : pnpm tsx scripts/create-questions.ts --dir <dossier> [--publier [--mettre-a-jour]]'
		);
		return 2;
	}
	const { supabase, target } = createScriptClient(publier);
	console.log(`${publier ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — base ${target}\n`);
	const auteur = await findReviewerId(supabase);

	const fichiers = readdirSync(dossier)
		.filter((f) => f.endsWith('.json'))
		.sort();
	if (fichiers.length === 0) {
		console.error(`⛔ aucun fichier .json dans ${dossier}`);
		return 2;
	}

	// 1. Tout vérifier avant la moindre écriture
	const entrees: Entree[] = [];
	for (const fichier of fichiers) {
		const extrait = readTemplateFile(
			JSON.parse(readFileSync(join(dossier, fichier), 'utf8')) as unknown,
			fichier
		);
		if (!extrait.ok) {
			console.error(`⛔ ${extrait.error}`);
			return 1;
		}
		const modele = extrait.template as unknown as Omit<QuestionTemplate, 'id'>;
		const rapport = checkTemplate(modele);
		if (!rapport.passed) {
			console.error(`⛔ ${fichier} refusé : ${rapport.reasons.join(' ; ')}`);
			return 1;
		}
		entrees.push({ fichier, modele });
	}

	// 2. Créer / mettre à jour
	let crees = 0;
	let deja = 0;
	let misAJour = 0;
	for (const { fichier, modele } of entrees) {
		let requete = supabase
			.from('question_templates')
			.select('id, status, grades, variations, shared, options, test_specs')
			.eq('title', modele.title)
			.eq('theme', modele.theme)
			.eq('domain', modele.domain)
			.eq('level', modele.level);
		requete = modele.subdomain
			? requete.eq('subdomain', modele.subdomain)
			: requete.is('subdomain', null);
		const { data: existants, error: e1 } = await requete;
		if (e1) throw new Error(`${fichier} : lecture impossible — ${e1.message}`);
		if (existants && existants.length > 0) {
			if (existants.length > 1) {
				console.error(
					`⛔ ${fichier} : ${existants.length} modèles identiques déjà en base — à régler à la main`
				);
				return 1;
			}
			const existant = existants[0];
			const ligne = toTemplateInsertRow(modele, auteur);
			// `grades` : comparé comme un ensemble (l'ordre ne compte pas)
			const memesGrades = sameGrades(existant.grades, ligne.grades);
			const identique =
				memesGrades &&
				canonique(existant.variations) === canonique(ligne.variations) &&
				canonique(existant.shared) === canonique(ligne.shared) &&
				canonique(existant.options) === canonique(ligne.options) &&
				canonique(existant.test_specs) === canonique(ligne.test_specs);
			const noteGrades = memesGrades
				? ''
				: `\n      grades : [${existant.grades.join(', ')}] → [${ligne.grades.join(', ')}]`;
			if (identique || !mettreAJour) {
				console.log(
					`  = ${fichier} : déjà en base (${existant.id})${identique ? '' : ' — CONTENU DIFFÉRENT (--mettre-a-jour)'}${noteGrades}`
				);
				deja++;
				continue;
			}
			if (existant.status !== 'draft') {
				console.error(`⛔ ${fichier} : modèle ${existant.status}, jamais modifié par ce script`);
				return 1;
			}
			if (!publier) {
				console.log(`  ↻ ${fichier} : contenu à mettre à jour (${existant.id})${noteGrades}`);
				continue;
			}
			const { data: maj, error: e3 } = await supabase
				.from('question_templates')
				.update({
					grades: ligne.grades,
					variations: ligne.variations,
					shared: ligne.shared,
					options: ligne.options,
					test_specs: ligne.test_specs
				})
				.eq('id', existant.id)
				.eq('status', 'draft')
				.select('id, grades');
			if (e3 || maj?.length !== 1 || !sameGrades(maj[0].grades, ligne.grades))
				throw new Error(
					`${fichier} : mise à jour non confirmée — ${e3?.message ?? 'aucune ligne'}`
				);
			console.log(`  ↻ ${fichier} : contenu mis à jour (${existant.id})${noteGrades}`);
			misAJour++;
			continue;
		}

		const specs = modele.testSpecs?.length ?? 0;
		if (!publier) {
			console.log(`  ✓ ${fichier} : « ${modele.title} » (${specs} specs) — à créer`);
			continue;
		}
		const { data: cree, error: e2 } = await supabase
			.from('question_templates')
			.insert(toTemplateInsertRow(modele, auteur))
			.select('id, status, title')
			.single();
		// La RLS échoue en silence : exiger la ligne relue, en brouillon
		if (e2 || !cree || cree.status !== 'draft' || cree.title !== modele.title) {
			throw new Error(
				`${fichier} : création non confirmée — ${e2?.message ?? JSON.stringify(cree)}`
			);
		}
		console.log(`  ✍️  ${fichier} : « ${cree.title} » créé en brouillon (${cree.id})`);
		crees++;
	}
	console.log(
		`\n${fichiers.length} fichiers — ${publier ? `${crees} créés, ${misAJour} mis à jour` : 'simulation'}, ${deja} déjà en base.`
	);
	return 0;
}

main()
	.then((code) => process.exit(code))
	.catch((e) => {
		console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
		process.exit(1);
	});
