/**
 * Reprise des verdicts des pages à cocher dans la table `question_template_reviews`
 * ==================================================================================
 *
 * Les verdicts « OK / À revoir » + commentaire donnés dans les artefacts (collection `verdicts`,
 * un document par modèle) passent dans la table que lit `/dev/modeles` (chantier revue-modeles).
 * Le fichier d'entrée est la collecte de ces artefacts, rassemblée en un seul JSON :
 *   [{ "templateId": "<uuid>", "etat": "ok" | "revoir", "commentaire": "…", "le": "<ISO>", "source": "<titre>" }]
 *
 * - Un modèle jugé dans plusieurs pages : le verdict le plus récent gagne.
 * - Un modèle absent de la base (supprimé depuis) est écarté, et signalé. Un id abrégé (8 caractères,
 *   anciennes pages CP) est résolu par son préfixe ; ambigu, il est écarté et signalé.
 * - Un verdict déjà en base et plus récent que celui de l'artefact est gardé (`/dev/modeles` fait
 *   foi dès qu'on y a jugé) ; relancer le script ne change donc rien.
 * - Simulation par défaut ; `--ecrire` écrit (service_role : la date d'origine est gardée).
 *
 *   pnpm tsx scripts/questions/reprise-verdicts.ts --fichier data/revue-modeles/verdicts-artefacts.json
 *   pnpm tsx scripts/questions/reprise-verdicts.ts --fichier … --ecrire
 *
 * Base visée : `.env` (la PROD) ; `set -a; . ./.env.local; set +a` avant, pour la base locale.
 * En prod, l'écriture est lancée par David (`!`).
 */

import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { createScriptClient, hasFlag } from '../relecture/common';
import { valeurArgument } from '../lib/lot-questions';

// Constantes

const ENTREE = z.array(
	z.object({
		// Id complet, ou ses 8 premiers caractères (anciennes pages CP)
		templateId: z.string().regex(/^[0-9a-f]{8}(-[0-9a-f]{4}){0,3}(-[0-9a-f]{12})?$/),
		etat: z.enum(['ok', 'revoir']),
		commentaire: z.string().max(4000),
		le: z.string().datetime({ offset: true }),
		source: z.string().max(200)
	})
);
const VERDICT = { ok: 'valide', revoir: 'a_revoir' } as const;
const PAQUET = 200;

// Functions

async function main(): Promise<number> {
	const fichier = valeurArgument(process.argv, '--fichier');
	const ecrire = hasFlag('--ecrire');
	if (!fichier) {
		console.error(
			'Usage : pnpm tsx scripts/questions/reprise-verdicts.ts --fichier <json> [--ecrire]'
		);
		return 2;
	}
	const lu = ENTREE.safeParse(JSON.parse(readFileSync(fichier, 'utf8')));
	if (!lu.success) {
		console.error(
			`⛔ fichier invalide — ${lu.error.issues[0]?.path.join('.')} : ${lu.error.issues[0]?.message}`
		);
		return 1;
	}
	const { supabase, target } = createScriptClient(ecrire);
	console.log(`${ecrire ? '✍️  ÉCRITURE' : '🔍 SIMULATION'} — base ${target}\n`);

	// Tous les ids en base : un id abrégé se résout par son préfixe (unique, sinon écarté)
	const tous: string[] = [];
	for (let de = 0; ; de += 1000) {
		const { data, error } = await supabase
			.from('question_templates')
			.select('id')
			.order('id')
			.range(de, de + 999);
		if (error) throw new Error(`lecture des modèles impossible — ${error.message}`);
		tous.push(...(data ?? []).map((m) => m.id));
		if (!data || data.length < 1000) break;
	}
	// Ensembles : un même id présent dans plusieurs pages n'est signalé qu'une fois
	const absents = new Set<string>();
	const ambigus = new Set<string>();
	// Le plus récent par modèle (id résolu)
	const parModele = new Map<string, (typeof lu.data)[number]>();
	for (const v of lu.data) {
		const trouves = tous.filter((id) => id.startsWith(v.templateId));
		if (trouves.length === 0) {
			absents.add(`${v.templateId} (${v.source})`);
			continue;
		}
		if (trouves.length > 1) {
			ambigus.add(`${v.templateId} (${v.source}) : ${trouves.length} modèles`);
			continue;
		}
		const id = trouves[0];
		const avant = parModele.get(id);
		if (!avant || new Date(v.le) > new Date(avant.le)) parModele.set(id, v);
	}
	const ids = [...parModele.keys()];

	const enBase = new Map<string, string>();
	for (let i = 0; i < ids.length; i += PAQUET) {
		const { data: verdicts, error } = await supabase
			.from('question_template_reviews')
			.select('template_id, reviewed_at')
			.in('template_id', ids.slice(i, i + PAQUET));
		if (error) throw new Error(`lecture des verdicts impossible — ${error.message}`);
		for (const v of verdicts ?? []) enBase.set(v.template_id, v.reviewed_at);
	}

	const gardes = ids.filter((id) => {
		const date = enBase.get(id);
		return date !== undefined && new Date(date) >= new Date(parModele.get(id)!.le);
	});
	const aEcrire = ids
		.filter((id) => !gardes.includes(id))
		.map((id) => {
			const v = parModele.get(id)!;
			return {
				template_id: id,
				verdict: VERDICT[v.etat],
				comment: v.commentaire,
				reviewed_at: v.le
			};
		});

	const aRevoir = aEcrire.filter((v) => v.verdict === 'a_revoir').length;
	console.log(`${lu.data.length} verdicts lus, ${ids.length} modèles retrouvés en base`);
	console.log(
		`  ${aEcrire.length} à écrire (${aEcrire.length - aRevoir} validés, ${aRevoir} à revoir)`
	);
	console.log(`  ${gardes.length} déjà en base, plus récents : gardés`);
	console.log(`  ${absents.size} verdicts sur un modèle absent de la base : écartés`);
	for (const a of absents) console.log(`    ⚠ ${a}`);
	console.log(`  ${ambigus.size} ids abrégés ambigus : écartés`);
	for (const a of ambigus) console.log(`    ⚠ ${a}`);

	if (!ecrire) {
		console.log('\nSimulation : rien n’est écrit. Relancer avec --ecrire.');
		return 0;
	}
	for (let i = 0; i < aEcrire.length; i += PAQUET) {
		const { data, error } = await supabase
			.from('question_template_reviews')
			.upsert(aEcrire.slice(i, i + PAQUET))
			.select('template_id');
		if (error) throw new Error(`écriture impossible — ${error.message}`);
		if ((data ?? []).length !== aEcrire.slice(i, i + PAQUET).length) {
			throw new Error('écriture partielle : relancer le script (il reprend où il s’est arrêté)');
		}
	}
	const { count, error } = await supabase
		.from('question_template_reviews')
		.select('template_id', { count: 'exact', head: true });
	if (error) throw new Error(`relecture impossible — ${error.message}`);
	console.log(`\n✅ ${aEcrire.length} verdicts écrits ; ${count} verdicts en base au total.`);
	return 0;
}

main()
	.then((code) => process.exit(code))
	.catch((e) => {
		console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
		process.exit(1);
	});
