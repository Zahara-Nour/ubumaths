/**
 * Contrôle de santé des pages publiques de production.
 *
 * Pourquoi ce script existe
 * -------------------------
 * `/automaths` a renvoyé 500 pendant dix mois sans que personne le voie. Vercel
 * loguait pourtant le message exact — mais il fallait être **déconnecté** pour
 * rencontrer la panne, et deux occurrences par semaine se noyaient parmi
 * quarante groupes de 404 de scanners.
 *
 * Le remède n'est pas de mieux lire les logs : c'est de **vérifier
 * activement**, tous les jours, que les pages publiques répondent. Ce script
 * fait exactement ce qu'un visiteur sans compte ferait.
 *
 * Il interroge la liste qui alimente déjà `sitemap.xml`, donc les deux ne
 * peuvent pas diverger : ajouter une page au plan, c'est la mettre sous
 * surveillance.
 *
 * Usage :
 *   npx tsx scripts/check-production-health.ts [origine]
 *
 * Sort en code 1 dès qu'une page ne répond pas 200, ce qui fait échouer le job
 * planifié et déclenche l'ouverture d'une issue.
 */

import { SITEMAP_PAGES } from '../src/lib/seo/sitemap-pages';

const DEFAULT_ORIGIN = 'https://www.chiph.re';
const TIMEOUT_MS = 20_000;

/**
 * Chemins publics hors sitemap qu'on veut néanmoins surveiller : ce sont ceux
 * que navigateurs et robots réclament d'eux-mêmes, et dont l'absence alimentait
 * le bruit du monitoring.
 */
const EXTRA_PATHS = ['/robots.txt', '/sitemap.xml', '/favicon.ico', '/apple-touch-icon.png'];

interface Result {
	path: string;
	status: number | null;
	error?: string;
}

async function check(origin: string, path: string): Promise<Result> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

	try {
		// `redirect: follow` : l'apex redirige vers www, ce n'est pas une panne.
		const response = await fetch(`${origin}${path}`, {
			redirect: 'follow',
			signal: controller.signal,
			headers: { 'User-Agent': 'chiphre-health-check' }
		});
		return { path, status: response.status };
	} catch (err) {
		return { path, status: null, error: err instanceof Error ? err.message : String(err) };
	} finally {
		clearTimeout(timer);
	}
}

async function main(): Promise<void> {
	const origin = process.argv[2] ?? DEFAULT_ORIGIN;
	const paths = [...SITEMAP_PAGES.map((p) => p.path), ...EXTRA_PATHS];

	console.log(`Contrôle de ${paths.length} chemins publics sur ${origin}\n`);

	// Séquentiel : on ne cherche pas la vitesse, et une rafale ressemblerait à
	// une attaque pour le pare-feu qu'on vient de poser.
	const results: Result[] = [];
	for (const path of paths) {
		const result = await check(origin, path);
		results.push(result);

		const label = result.status === 200 ? 'OK  ' : 'ÉCHEC';
		const detail = result.error ?? String(result.status);
		console.log(`  ${label}  ${path.padEnd(28)} ${detail}`);
	}

	const failures = results.filter((r) => r.status !== 200);

	console.log('');
	if (failures.length === 0) {
		console.log(`Tout répond (${results.length} chemins).`);
		return;
	}

	console.log(`${failures.length} chemin(s) en échec :\n`);
	for (const f of failures) {
		console.log(`  ${f.path} → ${f.error ?? f.status}`);
	}

	// Le job planifié transforme ce code de sortie en issue GitHub.
	process.exit(1);
}

main().catch((err) => {
	console.error('Le contrôle a lui-même échoué :', err);
	process.exit(1);
});
