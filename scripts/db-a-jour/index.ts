/**
 * `pnpm db:a-jour` — mettre la base LOCALE de dev à jour, sans rien effacer.
 *
 * Joue les migrations du dossier `supabase/migrations` qui manquent à la base locale
 * (127.0.0.1:54322). Rien n'est effacé : classes, comptes et contenu restent en place.
 * Règles : ./regles.ts ; exécution : ./appliquer.ts ; pourquoi : docs/archive/wip/base-locale-progress.md.
 *
 *   pnpm db:a-jour                    toutes les migrations en attente, celles de la branche comprises
 *   pnpm db:a-jour --essai            dit ce qui serait joué, n'écrit rien
 *   pnpm db:a-jour --noter <version>  note une migration comme faite sans la jouer (secours)
 *   … --auto                          avant `pnpm dev` : seulement les migrations déjà sur
 *                                     origin/main, et jamais d'échec (un avertissement, sortie 0)
 *
 * Jamais la prod : la cible est refusée si elle n'est pas locale. La prod reçoit ses migrations
 * par `pnpm db:migrate`, après merge.
 */

import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import pg from 'pg';
import { mettreAJour, noterALaMain, type Bilan } from './appliquer';
import { verifierCibleLocale } from './regles';

// ============================================================================
// Constantes
// ============================================================================

const DOSSIER = resolve(process.cwd(), 'supabase/migrations');
const PG_URL =
	process.env.BASE_LOCALE_PG_URL ?? 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';

// ============================================================================
// Fonctions
// ============================================================================

/** Fichiers de migration présents sur `origin/main` ; `null` si git ne répond pas. */
function migrationsSurMain(): Set<string> | null {
	const r = spawnSync(
		'git',
		['ls-tree', '-r', '--name-only', 'origin/main', '--', 'supabase/migrations/'],
		{ encoding: 'utf8' }
	);
	if (r.status !== 0) return null;
	return new Set(
		r.stdout
			.split('\n')
			.filter(Boolean)
			.map((chemin) => chemin.slice(chemin.lastIndexOf('/') + 1))
	);
}

function direLeBilan(bilan: Bilan, auto: boolean): void {
	const n = bilan.jouees.length;
	const notees = bilan.notees.length;
	if (n + notees > 0) {
		console.log(
			`✅ Base locale à jour : ${n} migration(s) jouée(s)${notees ? `, ${notees} notée(s) comme faite(s) (contenu déjà venu de la prod)` : ''}.`
		);
	} else if (!bilan.arret && !auto) {
		console.log('✅ Base locale déjà à jour.');
	}
	if (bilan.ecartees.length > 0) {
		console.log(
			`ℹ️  ${bilan.ecartees.length} migration(s) de ta branche pas encore jouée(s) en local : \`pnpm db:a-jour\`.`
		);
	}
	if (bilan.arret) {
		const { migration, message, raison } = bilan.arret;
		console.error(`\n⛔ Mise à jour arrêtée sur ${migration.fichier}`);
		console.error(`   Erreur : ${message}`);
		console.error(`   Pas notée comme faite : ${raison}.`);
		console.error(
			`   Les migrations suivantes attendent. Si c'est bien une migration de contenu déjà faite : \`pnpm db:a-jour --noter ${migration.version}\`.`
		);
	}
}

async function main(): Promise<number> {
	const args = process.argv.slice(2);
	const auto = args.includes('--auto');
	const essai = args.includes('--essai');
	const iNoter = args.indexOf('--noter');
	const versionANoter = iNoter === -1 ? null : args[iNoter + 1];
	if (iNoter !== -1 && !/^\d{14}$/.test(versionANoter ?? '')) {
		console.error('⛔ Usage : pnpm db:a-jour --noter <version à 14 chiffres>');
		return 1;
	}

	verifierCibleLocale(PG_URL);
	const db = new pg.Client({ connectionString: PG_URL, connectionTimeoutMillis: 3000 });
	try {
		await db.connect();
	} catch (e) {
		// Pile arrêtée le plus souvent : rien à mettre à jour, et ce n'est pas à cette commande de la démarrer.
		console.log(
			`ℹ️  Base locale injoignable (${e instanceof Error ? e.message : String(e)}) : aucune migration jouée. Pile arrêtée ? \`pnpm db:start\`.`
		);
		return auto ? 0 : 1;
	}

	try {
		if (versionANoter) {
			const m = await noterALaMain(db, DOSSIER, versionANoter);
			console.log(`↷ ${m.fichier} : notée comme faite, sans être jouée.`);
			return 0;
		}
		let seulement: Set<string> | undefined;
		if (auto) {
			const surMain = migrationsSurMain();
			if (!surMain) {
				console.log('ℹ️  `origin/main` illisible : aucune migration jouée (`pnpm db:a-jour`).');
				return 0;
			}
			seulement = surMain;
		}
		const bilan = await mettreAJour(db, {
			dossier: DOSSIER,
			seulement,
			// Avant `pnpm dev`, on n'attend pas : une table tenue par un autre serveur reporte la mise à jour.
			attenteVerrou: auto ? '5s' : undefined,
			essai,
			dire: (ligne) => console.log(ligne)
		});
		if (essai) {
			console.log(
				bilan.prevues.length === 0
					? 'Rien à jouer.'
					: `Seraient jouées (${bilan.prevues.length}) :\n${bilan.prevues.map((m) => `  ${m.fichier}`).join('\n')}`
			);
			return 0;
		}
		direLeBilan(bilan, auto);
		return bilan.arret && !auto ? 1 : 0;
	} finally {
		await db.end();
	}
}

main()
	.then((code) => process.exit(code))
	.catch((e) => {
		console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
		process.exit(process.argv.includes('--auto') ? 0 : 1);
	});
