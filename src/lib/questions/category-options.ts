/**
 * Options des listes Thème / Domaine / Sous-domaine de l'éditeur de modèle.
 *
 * Les catégories existantes arrivent sous forme de triplets distincts
 * (GET /api/questions/categories → `entries`) : on filtre Domaine par le thème
 * choisi et Sous-domaine par thème + domaine. La valeur courante du modèle est
 * toujours ajoutée, même absente des données, pour ne jamais « disparaître ».
 */

export interface CategoryEntry {
	theme: string;
	domain: string;
	subdomain: string | null;
}

interface CategoryRow {
	theme: string | null;
	domain: string | null;
	subdomain: string | null;
}

const collator = new Intl.Collator('fr');

function sortedUnique(values: Iterable<string>, current: string): string[] {
	const set = new Set(values);
	if (current) set.add(current);
	return [...set].sort(collator.compare);
}

/** Triplets distincts et triés ; lignes sans thème ou domaine ignorées, sous-domaine vide → null */
export function distinctCategoryEntries(rows: readonly CategoryRow[]): CategoryEntry[] {
	const byKey = new Map<string, CategoryEntry>();
	for (const row of rows) {
		if (!row.theme || !row.domain) continue;
		const entry: CategoryEntry = {
			theme: row.theme,
			domain: row.domain,
			subdomain: row.subdomain || null
		};
		byKey.set(JSON.stringify([entry.theme, entry.domain, entry.subdomain]), entry);
	}
	return [...byKey.values()].sort(
		(a, b) =>
			collator.compare(a.theme, b.theme) ||
			collator.compare(a.domain, b.domain) ||
			collator.compare(a.subdomain ?? '', b.subdomain ?? '')
	);
}

/** Tous les thèmes connus, plus ceux ajoutés dans la session et la valeur courante */
export function themeOptionsFor(
	entries: readonly CategoryEntry[],
	extraThemes: readonly string[],
	current: string
): string[] {
	return sortedUnique([...entries.map((e) => e.theme), ...extraThemes], current);
}

/** Domaines du thème choisi (tous si aucun thème), plus la valeur courante */
export function domainOptionsFor(
	entries: readonly CategoryEntry[],
	theme: string,
	current: string
): string[] {
	const matching = theme ? entries.filter((e) => e.theme === theme) : entries;
	return sortedUnique(
		matching.map((e) => e.domain),
		current
	);
}

/** Sous-domaines du thème + domaine choisis (filtre partiel si l'un manque), plus la valeur courante */
export function subdomainOptionsFor(
	entries: readonly CategoryEntry[],
	theme: string,
	domain: string,
	current: string
): string[] {
	const values: string[] = [];
	for (const e of entries) {
		if (theme && e.theme !== theme) continue;
		if (domain && e.domain !== domain) continue;
		if (e.subdomain) values.push(e.subdomain);
	}
	return sortedUnique(values, current);
}

/** Le domaine est-il déjà utilisé dans ce thème ? */
export function isKnownDomain(
	entries: readonly CategoryEntry[],
	theme: string,
	domain: string
): boolean {
	return entries.some((e) => e.theme === theme && e.domain === domain);
}

/** Le sous-domaine est-il déjà utilisé dans ce thème + domaine ? */
export function isKnownSubdomain(
	entries: readonly CategoryEntry[],
	theme: string,
	domain: string,
	subdomain: string
): boolean {
	return entries.some((e) => e.theme === theme && e.domain === domain && e.subdomain === subdomain);
}
