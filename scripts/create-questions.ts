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
 * Rattachement au référentiel : champ facultatif `"points": ["1SPE-135", …]` (codes de
 * `curriculum_points`, ≤ 20, sans doublon), écrit dans `question_template_points`. Tous les
 * fichiers sont vérifiés AVANT toute écriture (modèle, codes résolus en une requête, niveau de
 * chaque point présent dans `grades`). Sans champ `points`, aucun lien n'est lu ni touché.
 * Un lien en base absent du fichier n'est JAMAIS supprimé, sauf `--remplacer-points`.
 *
 * Usage :
 *   pnpm tsx scripts/create-questions.ts --dir <dossier>            (simulation)
 *   pnpm tsx scripts/create-questions.ts --dir <dossier> --publier  (écrit)
 *   … --publier --mettre-a-jour   remplace aussi le contenu des modèles DÉJÀ en base, s'ils
 *                                 sont encore en brouillon (un modèle publié n'est jamais touché),
 *                                 et ajoute leurs liens manquants vers les points du fichier.
 *                                 Contenu = variations, shared, options, test_specs ET grades
 *                                 (comparés comme un ensemble). Les grades sont écrits AVANT les
 *                                 liens ; un lien d'un ancien niveau reste en base, signalé
 *                                 « en base absents du fichier » (retiré seulement avec
 *                                 --remplacer-points)
 *   … --mettre-a-jour --remplacer-points   supprime en plus les liens en base absents du fichier
 *   … --mettre-a-jour --liens-publies      sur un modèle PUBLIÉ : AJOUTE seulement ses liens
 *                                 manquants (son contenu n'est jamais touché, aucun lien n'est
 *                                 retiré ; ses grades ne changent pas, et les points sont
 *                                 contrôlés contre les grades LUS EN BASE). Une carte publiée rattachée entre dans le paquet de
 *                                 révision « Programme » des élèves : simuler d'abord.
 *
 * Modèle sans fichier dans le dépôt : `scripts/link-template-points.ts --mapping`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { QuestionTemplate } from '$lib/questions/types';
import { checkTemplate } from '$lib/migration/review/check-template';
import { toTemplateInsertRow } from '$lib/migration/review/template-insert-row';
import { argValue, createScriptClient, findReviewerId, hasFlag } from './relecture/common';
import {
	checkPointCodes,
	describeLinkPlan,
	extractTemplatePoints,
	planPointLinks,
	sameGrades
} from './lib/template-points';
import { readLinks, resolvePoints, writeLinks } from './lib/template-points-db';

interface Entree {
	fichier: string;
	modele: Omit<QuestionTemplate, 'id'>;
	/** `null` : pas de champ `points` dans le fichier */
	codes: string[] | null;
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
	const remplacerPoints = hasFlag('--remplacer-points');
	const liensPublies = hasFlag('--liens-publies');
	const dossier = argValue('--dir');
	if (!dossier) {
		console.error(
			'Usage : pnpm tsx scripts/create-questions.ts --dir <dossier> [--publier [--mettre-a-jour [--remplacer-points | --liens-publies]]]'
		);
		return 2;
	}
	if ((remplacerPoints || liensPublies) && !mettreAJour) {
		console.error('⛔ --remplacer-points et --liens-publies ne valent qu’avec --mettre-a-jour');
		return 2;
	}
	// Un modèle publié ne perd jamais un lien : les deux drapeaux ne vont pas ensemble
	if (remplacerPoints && liensPublies) {
		console.error('⛔ --remplacer-points et --liens-publies sont incompatibles');
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
		const extrait = extractTemplatePoints(
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
		entrees.push({ fichier, modele, codes: extrait.codes });
	}
	const tousLesCodes = [...new Set(entrees.flatMap((e) => e.codes ?? []))];
	const resolus = await resolvePoints(supabase, tousLesCodes);
	const erreursPoints = checkPointCodes(
		entrees.map((e) => ({ file: e.fichier, codes: e.codes, grades: e.modele.grades ?? [] })),
		resolus
	);
	if (erreursPoints.length > 0) {
		for (const erreur of erreursPoints) console.error(`⛔ ${erreur}`);
		return 1;
	}

	// 2. Créer / mettre à jour
	let crees = 0;
	let deja = 0;
	let misAJour = 0;
	for (const { fichier, modele, codes } of entrees) {
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
			// `points` n'est pas du contenu du modèle : comparé à part, sur les liens.
			// `grades` : comparé comme un ensemble (l'ordre ne compte pas)
			const memesGrades = sameGrades(existant.grades, ligne.grades);
			const identique =
				memesGrades &&
				canonique(existant.variations) === canonique(ligne.variations) &&
				canonique(existant.shared) === canonique(ligne.shared) &&
				canonique(existant.options) === canonique(ligne.options) &&
				canonique(existant.test_specs) === canonique(ligne.test_specs);
			const plan = codes ? planPointLinks(codes, await readLinks(supabase, existant.id)) : null;
			const liensAEcrire =
				!!plan && (plan.toAdd.length > 0 || (remplacerPoints && plan.extra.length > 0));
			const noteGrades = memesGrades
				? ''
				: `\n      grades : [${existant.grades.join(', ')}] → [${ligne.grades.join(', ')}]`;
			const noteLiens = `${noteGrades}${plan ? `\n      ${describeLinkPlan(plan, remplacerPoints)}` : ''}`;
			if ((identique && !liensAEcrire) || !mettreAJour) {
				const aFaire = [
					identique ? '' : 'CONTENU DIFFÉRENT',
					plan?.toAdd.length ? 'LIENS À AJOUTER' : ''
				].filter(Boolean);
				console.log(
					`  = ${fichier} : déjà en base (${existant.id})${aFaire.length ? ` — ${aFaire.join(', ')} (--mettre-a-jour)` : ''}${noteLiens}`
				);
				deja++;
				continue;
			}
			if (existant.status !== 'draft') {
				// Publié : avec --liens-publies, seulement l'AJOUT de liens ; le contenu reste tel quel
				if (!liensPublies || !codes || !plan) {
					console.error(`⛔ ${fichier} : modèle ${existant.status}, jamais modifié par ce script`);
					return 1;
				}
				// Les grades du fichier ne s'appliquent pas à un modèle publié : ses points doivent
				// correspondre aux grades LUS EN BASE
				const erreursPublie = checkPointCodes(
					[{ file: fichier, codes, grades: existant.grades }],
					resolus
				);
				if (erreursPublie.length > 0) {
					for (const erreur of erreursPublie) console.error(`⛔ ${erreur} (grades en base)`);
					return 1;
				}
				const noteContenu = identique ? '' : ' — contenu différent du fichier, NON touché';
				if (plan.toAdd.length === 0) {
					console.log(
						`  = ${fichier} : ${existant.status}, aucun lien à ajouter${noteContenu}${noteLiens}`
					);
					deja++;
					continue;
				}
				if (!publier) {
					console.log(
						`  ↻ ${fichier} : ${existant.status}, liens à ajouter (${existant.id})${noteContenu}${noteLiens}`
					);
					continue;
				}
				await writeLinks(supabase, fichier, existant.id, codes, plan, resolus, false);
				console.log(
					`  ↻ ${fichier} : ${existant.status}, liens ajoutés (${existant.id})${noteContenu}${noteLiens}`
				);
				misAJour++;
				continue;
			}
			const quoi = identique ? 'liens à mettre à jour' : 'contenu à mettre à jour';
			if (!publier) {
				console.log(`  ↻ ${fichier} : ${quoi} (${existant.id})${noteLiens}`);
				continue;
			}
			if (!identique) {
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
			}
			if (codes && plan) {
				await writeLinks(supabase, fichier, existant.id, codes, plan, resolus, remplacerPoints);
			}
			console.log(
				`  ↻ ${fichier} : ${identique ? 'liens' : 'contenu'} mis à jour (${existant.id})${noteLiens}`
			);
			misAJour++;
			continue;
		}

		const specs = modele.testSpecs?.length ?? 0;
		const planNeuf = codes ? planPointLinks(codes, []) : null;
		const noteNeuf = planNeuf ? `\n      ${describeLinkPlan(planNeuf, false)}` : '';
		if (!publier) {
			console.log(`  ✓ ${fichier} : « ${modele.title} » (${specs} specs) — à créer${noteNeuf}`);
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
		if (codes && planNeuf) {
			await writeLinks(supabase, fichier, cree.id, codes, planNeuf, resolus, false);
		}
		console.log(`  ✍️  ${fichier} : « ${cree.title} » créé en brouillon (${cree.id})${noteNeuf}`);
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
