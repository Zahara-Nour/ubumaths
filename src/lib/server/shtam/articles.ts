/**
 * Le Shtam — la gazette parodique du Royaume (Compendium §IX).
 *
 * Chaque article est un fichier `articles/<slug>.md` : un en-tête YAML, le corps en ubumark,
 * puis une section `## Le vrai du faux` obligatoire (voix de l'Académie : le fait réel).
 * Côté serveur seulement : un brouillon ou un article daté dans le futur n'atteint jamais le
 * navigateur.
 */
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';

// Types

export type ShtamAuthor = z.infer<typeof authorSchema>;

export interface ShtamArticle {
	slug: string;
	title: string;
	/** Jour civil de parution, `YYYY-MM-DD` (Europe/Paris) */
	date: string;
	author: ShtamAuthor;
	/** Chapeau : une ou deux phrases sous le titre, reprises sur la une */
	lede: string;
	draft: boolean;
	/** Corps de l'article (ubumark), sans la section « Le vrai du faux » */
	body: string;
	/** Contenu de l'encadré « Le vrai du faux » (ubumark) */
	truth: string;
}

// Constantes

const authorSchema = z.enum(['cotice', 'giron', 'pile', 'merdanpot']);

/** Signature affichée sous le titre (la Rédaction : proposition 🟡 du Compendium) */
export const AUTHOR_LABELS: Record<ShtamAuthor, string> = {
	cotice: 'Cotice, rédacteur en chef',
	giron: 'Giron, reporter',
	pile: 'Pile, reporter',
	merdanpot: 'Merdanpot, reporter'
};

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const TRUTH_HEADING = /^## Le vrai du faux[ \t]*$/m;
const FRONT_MATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

const frontMatterSchema = z.object({
	title: z.string().trim().min(1).max(160),
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, 'date attendue au format AAAA-MM-JJ')
		.refine(isRealDate, 'date impossible'),
	author: authorSchema,
	lede: z.string().trim().min(1).max(400),
	draft: z.boolean().default(false)
});

/** Sources brutes des articles, embarquées au build */
export const ARTICLE_SOURCES: Record<string, string> = import.meta.glob('./articles/*.md', {
	query: '?raw',
	import: 'default',
	eager: true
});

// Functions

function isRealDate(iso: string): boolean {
	const [y, m, d] = iso.split('-').map(Number);
	const date = new Date(Date.UTC(y, m - 1, d));
	return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function parseArticle(slug: string, raw: string): ShtamArticle {
	if (!SLUG_PATTERN.test(slug)) throw new Error(`slug invalide : « ${slug} » (kebab-case attendu)`);

	const match = FRONT_MATTER.exec(raw);
	if (!match) throw new Error('en-tête YAML absent (le fichier doit commencer par ---)');

	const front = frontMatterSchema.safeParse(parseYaml(match[1]));
	if (!front.success) {
		const issue = front.error.issues[0];
		throw new Error(`en-tête invalide (${issue.path.join('.')}) : ${issue.message}`);
	}

	const parts = match[2].split(TRUTH_HEADING);
	if (parts.length !== 2) {
		throw new Error('il faut exactement une section « ## Le vrai du faux »');
	}
	const body = parts[0].trim();
	const truth = parts[1].trim();
	if (!body) throw new Error('corps de l’article vide');
	if (!truth) throw new Error('section « Le vrai du faux » vide');

	return { slug, ...front.data, body, truth };
}

/** Lit un lot de sources `{ chemin: contenu }` ; le slug est le nom du fichier */
export function parseArticles(sources: Record<string, string>): ShtamArticle[] {
	const articles: ShtamArticle[] = [];
	for (const [path, raw] of Object.entries(sources)) {
		const slug = (path.split('/').pop() ?? path).replace(/\.md$/, '');
		try {
			articles.push(parseArticle(slug, raw));
		} catch (cause) {
			const message = cause instanceof Error ? cause.message : String(cause);
			throw new Error(`Shtam, ${path} : ${message}`, { cause });
		}
	}
	return articles;
}

/** Articles visibles au jour `todayIso` : ni brouillon, ni daté dans le futur ; récents d'abord */
export function publishedArticles(articles: ShtamArticle[], todayIso: string): ShtamArticle[] {
	return articles
		.filter((a) => !a.draft && a.date <= todayIso)
		.sort((a, b) =>
			a.date === b.date ? a.slug.localeCompare(b.slug) : b.date.localeCompare(a.date)
		);
}

export function findPublishedArticle(
	articles: ShtamArticle[],
	slug: string,
	todayIso: string
): ShtamArticle | null {
	return publishedArticles(articles, todayIso).find((a) => a.slug === slug) ?? null;
}

export function pickRandomArticle(
	articles: ShtamArticle[],
	random: () => number = Math.random
): ShtamArticle | null {
	if (articles.length === 0) return null;
	return articles[Math.min(Math.floor(random() * articles.length), articles.length - 1)];
}

let cache: ShtamArticle[] | null = null;

/** Tous les articles du dépôt, lus une fois */
export function allArticles(): ShtamArticle[] {
	cache ??= parseArticles(ARTICLE_SOURCES);
	return cache;
}
