/**
 * Corriger des modèles de questions DÉJÀ PUBLIÉS, par mise à jour directe
 * ======================================================================
 *
 * ⚠️ SIMULATION PAR DÉFAUT : rien n'est écrit sans `--publier`.
 *
 * `create-questions.ts` ne touche jamais un modèle publié. Ce script le fait, mais seulement
 * pour les ids listés EXPLICITEMENT dans `CIBLES` (décision de David du 2026-10-01 : modèles du
 * second degré relus, qui restent publiés).
 *
 * Chaque cible a son fichier JSON (modèle complet en camelCase, avec ses `testSpecs`). Pour
 * chaque cible :
 *  - le modèle est relu en base ; le fichier doit porter le même `id` ;
 *  - seuls `variations`, `options`, `test_specs`, `title`, `description`, `level` sont écrits ;
 *    tout autre champ du fichier (`shared`, thème, domaine, sous-domaine, classes…) doit être
 *    IDENTIQUE à la base, sinon arrêt ; `status` n'est jamais écrit ;
 *  - `checkTemplate` doit passer sur le modèle tel qu'il sera en base ;
 *  - la simulation affiche le diff ancien/nouveau par champ ;
 *  - après écriture, la ligne est relue et comparée champ par champ.
 * S'arrête à la première erreur.
 *
 * Changement de niveau : l'index `idx_question_templates_unique_category` interdit deux modèles
 * publiés au même (thème, domaine, sous-domaine, niveau). Un échange de niveaux passe donc par
 * un niveau temporaire (900 + niveau) avant l'écriture finale.
 *
 * Usage :
 *   pnpm tsx scripts/update-published-questions.ts            (simulation, diff)
 *   pnpm tsx scripts/update-published-questions.ts --publier  (écrit)
 *   … --seulement <id8>[,<id8>]   restreint aux cibles dont l'id commence ainsi
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { QuestionTemplate } from '$lib/questions/types';
import { checkTemplate } from '$lib/migration/review/check-template';
import { toQuestionTemplate } from '$lib/types/question-template';
import { toJson } from '$lib/types/database-helpers';
import type { TablesUpdate } from '$lib/types/database';
import { argValue, createScriptClient, hasFlag } from './relecture/common';

// ============================================================================
// CIBLES — ids explicites, rien d'autre n'est touché
// ============================================================================

const DOSSIER = 'scripts/questions/second-degre-existants';

const CIBLES: readonly string[] = [
	'1acb6d47-5d88-4ccf-830f-98dc57d0022c', // Apprivoiser 4 — nature de l'extremum
	'a0089728-f07a-46ba-8109-7550d2ac800d', // Racines 1 — vérifier une racine
	'2dd2b712-3687-4910-ab92-378c46125129', // Racines 2 → 3 — racine évidente
	'18e26873-dca0-4c73-bc23-f181e0164a66', // Racines 3 → 2 — racines, forme factorisée
	'1b1a6d7b-d776-491b-b2bc-b2bc9fe629fe', // Racines 4 — forme non complètement factorisée
	'9f00da01-a030-4697-8d69-20c380fa0b78', // Apprivoiser 6 — axe de symétrie
	'2871990c-21d1-4d96-a2df-897ee2a1cc5c', // Apprivoiser 1 — reconnaître un polynôme
	'87140df3-ed7a-4afc-98d9-dcd4d43e65bb', // Apprivoiser 9 — forme canonique lue
	'56b1803f-f707-49a9-a0b7-3e6b8220f2d7', // Apprivoiser 5 — sommet
	'f8ccc8b6-b5ec-4fce-9c74-8dd1520bb709', // Vrai ou Faux 1
	'b48d72dd-e93b-4f5c-ac81-117ff1c2c79c', // Apprivoiser 8 — signe
	'44b58fce-45ec-4979-819f-e4bdb8540944', // Apprivoiser 2 — reconnaître la forme
	'd1648508-035e-4a2f-abce-87592365038f' // Identités remarquables 9 (seconde)
];

/** Champs écrits ; tout le reste doit être identique entre le fichier et la base */
const CHAMPS_ECRITS = [
	'variations',
	'options',
	'testSpecs',
	'title',
	'description',
	'level'
] as const;
type ChampEcrit = (typeof CHAMPS_ECRITS)[number];

/** Champs comparés sans être écrits (un écart = arrêt) */
const CHAMPS_FIGES = [
	'shared',
	'theme',
	'domain',
	'subdomain',
	'grades',
	'delay',
	'status',
	'exerciseInstruction',
	'defaultDisplayOptions',
	'multipleAnswers'
] as const;

const NIVEAU_TEMPORAIRE = 900;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Sérialisation à clés triées (`jsonb` réordonne les clés) ; `null` ≡ absent ≡ `''` */
function canonique(valeur: unknown): string {
	if (valeur === undefined || valeur === null || valeur === '') return 'null';
	return JSON.stringify(
		valeur,
		(_cle, v: unknown) =>
			v && typeof v === 'object' && !Array.isArray(v)
				? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
				: v,
		2
	);
}

function colonne(champ: ChampEcrit): keyof TablesUpdate<'question_templates'> {
	return champ === 'testSpecs' ? 'test_specs' : champ;
}

function valeurColonne(modele: QuestionTemplate, champ: ChampEcrit): unknown {
	const valeur = modele[champ];
	if (champ === 'description') return valeur || null;
	if (champ === 'title' || champ === 'level') return valeur;
	return toJson(valeur ?? null);
}

function diff(ancien: string, nouveau: string): string {
	const dossier = mkdtempSync(join(tmpdir(), 'maj-modele-'));
	writeFileSync(join(dossier, 'base'), `${ancien}\n`);
	writeFileSync(join(dossier, 'fichier'), `${nouveau}\n`);
	try {
		execFileSync('diff', ['-u', join(dossier, 'base'), join(dossier, 'fichier')]);
		return '';
	} catch (error) {
		// `diff` sort en 1 quand les fichiers diffèrent : c'est le cas attendu
		const sortie = (error as { stdout?: Buffer }).stdout?.toString() ?? '';
		return sortie.split('\n').slice(2).join('\n');
	}
}

interface Preparation {
	id: string;
	fichier: string;
	base: QuestionTemplate;
	cible: QuestionTemplate;
	changes: ChampEcrit[];
}

async function main(): Promise<number> {
	const publier = hasFlag('--publier');
	const seulement = argValue('--seulement')?.split(',');
	const ids = CIBLES.filter((id) => !seulement || seulement.some((p) => id.startsWith(p)));
	const { supabase, target } = createScriptClient(publier);
	console.log(`${publier ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — base ${target}\n`);

	// 1. Tout préparer et vérifier AVANT la moindre écriture
	const preparations: Preparation[] = [];
	for (const id of ids) {
		const fichier = join(DOSSIER, `${id.slice(0, 8)}.json`);
		const brut = JSON.parse(readFileSync(fichier, 'utf8')) as QuestionTemplate;
		if (brut.id !== id) throw new Error(`${fichier} : id ${brut.id} ≠ cible ${id}`);
		const { data, error } = await supabase
			.from('question_templates')
			.select('*')
			.eq('id', id)
			.single();
		if (error || !data) throw new Error(`${id} : lecture impossible — ${error?.message}`);
		const base = toQuestionTemplate(data);
		for (const champ of CHAMPS_FIGES) {
			if (canonique(brut[champ]) !== canonique(base[champ])) {
				throw new Error(
					`${fichier} : « ${champ} » diffère de la base — ce script ne l'écrit pas\n${diff(canonique(base[champ]), canonique(brut[champ]))}`
				);
			}
		}
		const cible: QuestionTemplate = { ...base };
		for (const champ of CHAMPS_ECRITS) Object.assign(cible, { [champ]: brut[champ] });
		// Champs d'audit hors du schéma strict de l'éditeur (erreur `created_at` de `question:specs`)
		const { created_at: _c, updated_at: _u, created_by: _b, ...verifiable } = cible;
		const rapport = checkTemplate(verifiable, { instances: 100 });
		if (!rapport.passed) {
			throw new Error(`${fichier} : checkTemplate refuse — ${rapport.reasons.join(' ; ')}`);
		}
		const changes = CHAMPS_ECRITS.filter(
			(champ) => canonique(valeurColonne(base, champ)) !== canonique(valeurColonne(cible, champ))
		);
		const specs = `${rapport.specs.length} specs vertes, ${rapport.generation.attempts} tirages`;
		console.log(
			`■ ${id.slice(0, 8)} « ${base.title} » (${base.status}) — ${specs} — ${changes.length ? `à modifier : ${changes.join(', ')}` : 'identique'}`
		);
		if (!publier) {
			for (const champ of changes) {
				console.log(`  ── ${champ}`);
				console.log(
					diff(canonique(valeurColonne(base, champ)), canonique(valeurColonne(cible, champ)))
				);
			}
		}
		preparations.push({ id, fichier, base, cible, changes });
	}

	// Niveaux finaux : jamais deux modèles publiés de la même catégorie
	const aDeplacer = preparations.filter((p) => p.changes.includes('level'));
	for (const p of aDeplacer) {
		const { data, error } = await supabase
			.from('question_templates')
			.select('id')
			.eq('status', 'published')
			.eq('theme', p.base.theme)
			.eq('domain', p.base.domain)
			.eq('subdomain', p.base.subdomain ?? '')
			.in('level', [p.cible.level, NIVEAU_TEMPORAIRE + p.base.level]);
		if (error) throw new Error(`${p.id} : lecture des niveaux — ${error.message}`);
		const occupants = (data ?? []).filter((row) => !aDeplacer.some((autre) => autre.id === row.id));
		if (occupants.length > 0) {
			throw new Error(
				`${p.id} : niveau ${p.cible.level} déjà pris par ${occupants.map((o) => o.id).join(', ')}`
			);
		}
		console.log(`  ↕ ${p.id.slice(0, 8)} : niveau ${p.base.level} → ${p.cible.level}`);
	}

	if (!publier) {
		console.log(`\n${preparations.length} cible(s) — simulation, rien d'écrit.`);
		return 0;
	}

	// 2. Niveaux temporaires (échange sans violer l'index unique)
	for (const p of aDeplacer) {
		const temporaire = NIVEAU_TEMPORAIRE + p.base.level;
		const { data, error } = await supabase
			.from('question_templates')
			.update({ level: temporaire })
			.eq('id', p.id)
			.eq('level', p.base.level)
			.select('id, level');
		if (error || data?.length !== 1 || data[0].level !== temporaire) {
			throw new Error(
				`${p.id} : niveau temporaire non confirmé — ${error?.message ?? 'aucune ligne'}`
			);
		}
	}

	// 3. Écriture des champs, puis relecture
	let ecrits = 0;
	for (const p of preparations) {
		if (p.changes.length === 0) continue;
		const maj: TablesUpdate<'question_templates'> = {};
		for (const champ of p.changes)
			Object.assign(maj, { [colonne(champ)]: valeurColonne(p.cible, champ) });
		const { data, error } = await supabase
			.from('question_templates')
			.update(maj)
			.eq('id', p.id)
			.eq('status', p.base.status)
			.select('*');
		// La RLS échoue en silence : exiger la ligne rendue
		if (error || data?.length !== 1) {
			throw new Error(`${p.id} : mise à jour non confirmée — ${error?.message ?? 'aucune ligne'}`);
		}
		const relu = toQuestionTemplate(data[0]);
		for (const champ of [...CHAMPS_ECRITS, ...CHAMPS_FIGES]) {
			const attendu = (CHAMPS_ECRITS as readonly string[]).includes(champ) ? p.cible : p.base;
			if (canonique(relu[champ]) !== canonique(attendu[champ])) {
				throw new Error(`${p.id} : « ${champ} » relu différent de l'attendu`);
			}
		}
		console.log(
			`  ✍️  ${p.id.slice(0, 8)} : ${p.changes.join(', ')} — relu conforme (${relu.status})`
		);
		ecrits++;
	}
	console.log(`\n${preparations.length} cible(s), ${ecrits} modifiée(s).`);
	return 0;
}

main()
	.then((code) => process.exit(code))
	.catch((e) => {
		console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
		process.exit(1);
	});
