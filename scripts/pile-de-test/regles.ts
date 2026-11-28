/**
 * Pile Supabase de TEST : les règles (pures, testées dans scripts/__tests__/pile-de-test.test.ts)
 * ==============================================================================================
 *
 * Les tests d'intégration tournaient sur la base de dev : ils supprimaient le prof de dev et les
 * classes du seed-riche, et les données de dev les faisaient échouer (docs/archive/wip/base-locale-progress.md
 * § 3.3). Ils ont maintenant leur pile, construite comme celle de la CI : migrations de la
 * branche + seed simple, jamais de contenu de la prod.
 *
 * Cette pile est partagée par tous les worktrees. Avant chaque lancement on la compare à la
 * branche : elle doit porter exactement ses migrations, telles qu'elles sont écrites aujourd'hui.
 * Sinon on la reconstruit de zéro : un test ne doit jamais passer ou échouer à cause de la
 * migration d'une autre branche.
 */

import { createHash } from 'node:crypto';

// ============================================================================
// Types
// ============================================================================

export interface FichierDeMigration {
	version: string;
	fichier: string;
	/** Empreinte du contenu du fichier, aujourd'hui. */
	empreinte: string;
}

export interface EtatDeLaPile {
	/** Migrations de la branche. */
	fichiers: readonly FichierDeMigration[];
	/** Versions inscrites à l'historique de la pile. */
	appliquees: readonly string[];
	/** Empreinte de chaque migration au moment où elle a été jouée ; `null` : table absente. */
	empreintes: ReadonlyMap<string, string> | null;
	/** Empreinte du décor (seeds, configuration, version de la CLI) aujourd'hui, et en base. */
	decor: string;
	decorEnBase: string | null;
}

export type Preparation =
	| { action: 'rien'; raison: string }
	| { action: 'appliquer'; raison: string }
	| { action: 'reconstruire'; raison: string };

// ============================================================================
// Constantes
// ============================================================================

/** Nom du projet : celui des conteneurs (`supabase_db_ubumaths-test`) et des volumes. */
export const PROJET = 'ubumaths-test';
export const PORT_API = 55321;
export const PORT_DB = 55322;
/** Verrou des commandes de la pile de test, distinct de celui de la base de dev (`supabase`). */
export const VERROU = 'supabase-test';
/** Où la pile note l'empreinte de ce qu'elle a joué. Schéma hors API, absent de la prod. */
export const TABLE_EMPREINTES = 'supabase_migrations.pile_de_test';
/** Clé de la ligne du décor dans `TABLE_EMPREINTES`. */
export const CLE_DECOR = 'decor';

/** Les ports de la pile de dev sont `5432x` ; ceux de la pile de test, `5532x`. */
const PORT_DE_DEV = /^(\s*[a-z_]*port\s*=\s*)5432(\d)\s*$/gm;
const PORT_DE_DEV_RESTANT = /^[^#\n]*\b(5432\d)\b/m;
const PROJET_DE_DEV = /^project_id\s*=\s*"[^"]+"\s*$/m;

// ============================================================================
// Fonctions
// ============================================================================

export function empreinte(contenu: string): string {
	return createHash('sha256').update(contenu).digest('hex');
}

/**
 * `supabase/config.toml` de la pile de test, tiré de celui du dépôt : autre nom de projet, autres
 * ports, tout le reste identique (les tests voient les mêmes réglages qu'en CI).
 */
export function configDeTest(configDuDepot: string): string {
	if (!PROJET_DE_DEV.test(configDuDepot)) {
		throw new Error('supabase/config.toml : ligne `project_id` introuvable.');
	}
	const sortie = configDuDepot
		.replace(PROJET_DE_DEV, `project_id = "${PROJET}"`)
		.replace(PORT_DE_DEV, '$15532$2');
	const reste = PORT_DE_DEV_RESTANT.exec(sortie);
	if (reste) {
		throw new Error(
			`supabase/config.toml : le port ${reste[1]} resterait celui de la pile de dev (forme non reconnue).`
		);
	}
	return sortie;
}

/**
 * La pile est-elle celle de la branche ? Reconstruire dès qu'elle porte autre chose que les
 * migrations de la branche dans leur écriture d'aujourd'hui ; sinon appliquer ce qui manque.
 */
export function deciderPreparation(etat: EtatDeLaPile): Preparation {
	if (etat.empreintes === null || etat.decorEnBase === null) {
		return { action: 'reconstruire', raison: 'elle n’a pas été construite par cette commande' };
	}
	if (etat.decorEnBase !== etat.decor) {
		return {
			action: 'reconstruire',
			raison: 'le seed, la configuration ou la version de la CLI Supabase ont changé'
		};
	}
	const parVersion = new Map(etat.fichiers.map((f) => [f.version, f]));
	for (const version of [...etat.appliquees].sort()) {
		const f = parVersion.get(version);
		if (!f) {
			return {
				action: 'reconstruire',
				raison: `elle porte la migration ${version}, absente de cette branche`
			};
		}
		if (etat.empreintes.get(version) !== f.empreinte) {
			return {
				action: 'reconstruire',
				raison: `${f.fichier} a changé depuis son passage`
			};
		}
	}
	const faites = new Set(etat.appliquees);
	const manquantes = etat.fichiers.filter((f) => !faites.has(f.version)).length;
	return manquantes > 0
		? { action: 'appliquer', raison: `${manquantes} migration(s) de la branche en attente` }
		: { action: 'rien', raison: 'à jour' };
}

/**
 * Variables posées pour la commande de test, lues par les aides de test. Les clés d'API locales
 * sont les mêmes pour toutes les piles (secret par défaut de la CLI) : rien à changer.
 *
 * `PUBLIC_SUPABASE_URL` n'y est PAS : SvelteKit écrit les variables d'environnement qu'il voit
 * dans `.svelte-kit/generated`, et un serveur de dev du même worktree se mettrait à parler à la
 * pile de test. Le code serveur importé par les tests reçoit l'adresse par
 * `adresseDeTestPourLeCodeServeur` et `forcerLAdressePublique` (vitest.integration.config.ts).
 */
export function environnementDeTest(): Record<string, string> {
	return {
		SUPABASE_TEST_URL: `http://127.0.0.1:${PORT_API}`,
		SUPABASE_DB_HOST: '127.0.0.1',
		SUPABASE_DB_PORT: String(PORT_DB),
		SUPABASE_DB_NAME: 'postgres',
		SUPABASE_DB_USER: 'postgres',
		SUPABASE_DB_PASSWORD: 'postgres'
	};
}

/**
 * Variables du processus de test (`test.env` de vitest) : le code serveur qui lit
 * `process.env.PUBLIC_SUPABASE_URL` (client de service) doit viser la même pile que les tests.
 * Sans `SUPABASE_TEST_URL` (suite lancée hors lanceur), rien : le global-setup refusera.
 */
export function adresseDeTestPourLeCodeServeur(
	env: Readonly<Record<string, string | undefined>>
): Record<string, string> {
	const url = env.SUPABASE_TEST_URL;
	return url ? { PUBLIC_SUPABASE_URL: url, SUPABASE_URL: url } : {};
}

/**
 * Remplace, dans un module d'environnement généré par SvelteKit (`$app/env`, `$app/env/public`),
 * la valeur de `PUBLIC_SUPABASE_URL` par l'adresse de la pile de test.
 *
 * Ces modules sont des FICHIERS (`.svelte-kit/generated/…/env/`), réécrits par tout démarrage de
 * vite dans le worktree : un `pnpm test:server` lancé pendant la suite y remettait l'adresse de
 * la base de dev, et le code serveur importé par les tests suivants lui parlait (3 tests rouges
 * sur une suite complète, 2026-11-21). La suite n'en dépend plus : elle impose l'adresse au
 * chargement du module.
 */
export function forcerLAdressePublique(code: string, url: string): string {
	return code.replace(
		/(\bPUBLIC_SUPABASE_URL\s*[:=]\s*)"(?:[^"\\]|\\.)*"/g,
		(_tout, debut: string) => `${debut}${JSON.stringify(url)}`
	);
}

/** Le fichier est-il un module d'environnement généré par SvelteKit ? */
export function estUnModuleDEnvironnementGenere(id: string): boolean {
	return /\/generated\/[^/]+\/env\/.+\.js(\?.*)?$/.test(id);
}
