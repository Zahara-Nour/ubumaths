/**
 * « Tu cherchais peut-être… » : les pages publiques proches d'une adresse
 * introuvable.
 *
 * Trois cas couverts :
 * - une adresse trop longue (`/chiffrement/cesar/xyz`) → la page parente ;
 * - un dossier sans page propre (`/legal`) → ses pages filles ;
 * - une faute de frappe (`/chifrement`, `/pyhton`, `/cesar` sans son dossier)
 *   → la page à une ou deux lettres près, sur le chemin complet ou son dernier
 *   segment.
 *
 * Les candidates viennent de `SITEMAP_PAGES` : les pages publiques et pérennes,
 * déjà tenues à jour pour le plan du site (un test vérifie qu'elles existent).
 *
 * @module lib/error-page/suggestions
 */
import { SITEMAP_PAGES, type SitemapPage } from '$lib/seo/sitemap-pages';

export interface PageSuggestion {
	path: string;
	title: string;
}

const MAX_SUGGESTIONS = 3;

/** Les pages proches de `pathname`, de la plus proche à la moins proche. */
export function suggestPages(
	pathname: string,
	pages: readonly SitemapPage[] = SITEMAP_PAGES
): PageSuggestion[] {
	const requested = normalize(pathname);
	if (requested === '/') return [];
	const requestedLast = lastSegment(requested);

	const scored: { page: SitemapPage; score: number }[] = [];
	for (const page of pages) {
		if (page.path === '/') continue; // l'accueil a déjà son bouton
		const candidate = normalize(page.path);

		if (requested.startsWith(`${candidate}/`)) {
			// Page parente : la meilleure piste, et la plus profonde d'abord
			scored.push({ page, score: -candidate.length });
			continue;
		}
		if (candidate.startsWith(`${requested}/`)) {
			// Dossier sans page propre (`/legal`) : ses pages filles
			scored.push({ page, score: 0 });
			continue;
		}
		const distance = Math.min(
			typoDistance(requested, candidate),
			typoDistance(requestedLast, lastSegment(candidate))
		);
		if (distance <= tolerance(candidate)) scored.push({ page, score: distance });
	}

	return scored
		.sort((a, b) => a.score - b.score || b.page.priority - a.page.priority)
		.slice(0, MAX_SUGGESTIONS)
		.map(({ page }) => ({ path: page.path, title: page.title }));
}

/** Minuscules, sans accents, sans `/` final ; une adresse mal encodée reste lisible. */
function normalize(path: string): string {
	let decoded = path;
	try {
		decoded = decodeURIComponent(path);
	} catch {
		// `%E9` seul, par exemple : on compare la forme brute
	}
	const clean = decoded
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/\/+$/, '');
	return clean === '' ? '/' : clean;
}

function lastSegment(path: string): string {
	return path.slice(path.lastIndexOf('/') + 1);
}

/** Fautes tolérées : une pour 4 lettres, aucune sur un mot de moins de 4 lettres. */
function tolerance(candidate: string): number {
	return Math.floor(lastSegment(candidate).length / 4);
}

/**
 * Distance d'édition où une inversion de deux lettres voisines (`pyhton`) ne
 * compte que pour une faute (Damerau-Levenshtein restreinte).
 */
function typoDistance(a: string, b: string): number {
	const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
		Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
	);
	for (let i = 1; i <= a.length; i++) {
		for (let j = 1; j <= b.length; j++) {
			const cost = a[i - 1] === b[j - 1] ? 0 : 1;
			d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
			if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
				d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
			}
		}
	}
	return d[a.length][b.length];
}
