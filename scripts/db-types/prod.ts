/**
 * `pnpm db:types:prod` — la base de la prod est-elle celle que le dépôt décrit ?
 * ==============================================================================
 *
 *   pnpm db:types:prod                  compare la prod à src/lib/types/database.ts (fichier du dossier)
 *   pnpm db:types:prod --commit <sha>   compare la prod au database.ts de ce commit (deploy:prod)
 *
 * Lecture seule : les types de la prod sont demandés à l'API de Supabase (`supabase gen types
 * --linked`), rien n'est écrit, ni en prod ni dans le dépôt. À lancer depuis le dépôt principal
 * (le projet lié y est déclaré), sur le Mac mini : GitHub n'a aucun accès à la prod.
 *
 * Sortie 0 : même schéma `public`. Sortie 1 : écart, ou types de la prod illisibles (le
 * générateur de la prod a peut-être changé de forme). Règles : ./prod-depot.ts.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { comparer, decrire, identiques, lireLeSchema } from './prod-depot';

// ============================================================================
// Constantes
// ============================================================================

const RACINE = process.cwd();
const FICHIER = 'src/lib/types/database.ts';
/** Remplaçable par les tests : une commande qui écrit les types de la prod sur sa sortie. */
const REMPLACEE = process.env.DB_TYPES_PROD_COMMANDE;
const COMMANDE = REMPLACEE ?? 'pnpm exec supabase gen types typescript --linked --schema public';
const TAMPON = 64 * 1024 * 1024;

// ============================================================================
// Fonctions
// ============================================================================

class Echec extends Error {}

function typesDuDepot(commit: string | null): { texte: string; nom: string } {
	if (commit === null) {
		return { texte: readFileSync(resolve(RACINE, FICHIER), 'utf8'), nom: FICHIER };
	}
	const r = spawnSync('git', ['show', `${commit}:${FICHIER}`], {
		encoding: 'utf8',
		maxBuffer: TAMPON
	});
	if (r.status !== 0) {
		throw new Echec(`${FICHIER} illisible dans le commit ${commit} : ${r.stderr.trim()}`);
	}
	return { texte: r.stdout, nom: `${FICHIER} du commit ${commit.slice(0, 10)}` };
}

function typesDeLaProd(): string {
	const r = spawnSync(COMMANDE, { shell: true, encoding: 'utf8', maxBuffer: TAMPON });
	if (r.error) throw new Echec(`Types de la prod non lus : ${r.error.message}`);
	if (r.status !== 0) {
		const fin = `${r.stdout}\n${r.stderr}`.trim().split('\n').slice(-5).join('\n');
		throw new Echec(
			`Types de la prod non lus (code ${r.status}).\n${fin}\n` +
				'À lancer depuis le dépôt principal, connecté à Supabase (pnpm exec supabase login).'
		);
	}
	return r.stdout;
}

function main(): number {
	const args = process.argv.slice(2);
	let commit: string | null = null;
	if (args.length > 0) {
		if (args.length !== 2 || args[0] !== '--commit' || !/^[0-9a-f]{7,40}$/.test(args[1])) {
			throw new Echec('Usage : pnpm db:types:prod [--commit <sha>]');
		}
		commit = args[1];
	}
	const depot = typesDuDepot(commit);
	const lus = { depot: lireLeSchema(depot.texte), prod: lireLeSchema(typesDeLaProd()) };
	if (!lus.depot.ok) throw new Echec(`${depot.nom} : forme non reconnue (${lus.depot.raison}).`);
	if (!lus.prod.ok) {
		throw new Echec(
			`Types de la prod : forme non reconnue (${lus.prod.raison}).\n` +
				'Le générateur de Supabase a peut-être changé : le contrôle « prod = dépôt » ne peut ' +
				'rien dire, ni écart ni accord (scripts/db-types/prod-depot.ts).'
		);
	}
	const comparaison = comparer(lus.depot.schema, lus.prod.schema);
	if (identiques(comparaison)) {
		console.log(
			`✅ prod = dépôt : le schéma public de la prod est celui de ${depot.nom} ` +
				`(${lus.prod.schema.size} éléments comparés).` +
				// Une variable oubliée dans le shell ne doit pas donner un accord sans le dire.
				(REMPLACEE ? ' ⚠️ PAS la prod : types lus par DB_TYPES_PROD_COMMANDE.' : '')
		);
		return 0;
	}
	console.error(`⛔ Le schéma public de la prod n'est pas celui de ${depot.nom}.`);
	console.error(decrire(comparaison).join('\n'));
	console.error(
		'\nMigration pas encore jouée (pnpm db:migrate), base retouchée hors migration, ou migration ' +
			'modifiée après avoir été jouée ? Chercher la cause avant de livrer.'
	);
	return 1;
}

try {
	process.exit(main());
} catch (e) {
	console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
}
