import {
	civilDateIn,
	civilToPataphysical,
	formatGregorian,
	formatMedium
} from '$lib/almanach/calendar';
import { AUTHOR_LABELS, type ShtamArticle } from './articles';

// Types

/** Ce que la une montre d'un article : pas de corps, pas de vrai du faux */
export interface ShtamSummary {
	slug: string;
	title: string;
	lede: string;
	byline: string;
	/** Jour civil de parution, `YYYY-MM-DD` (données structurées) */
	date: string;
	/** Date de l'Almanach : « 14 Auroral, An 130 E.R. » */
	almanachDate: string;
	/** Date grégorienne : « 5 octobre 2026 » */
	gregorianDate: string;
}

export interface ShtamArticleView extends ShtamSummary {
	body: string;
	truth: string;
}

/** L'article de la une : le début du corps, et son image s'il en a une */
export interface ShtamFrontArticle extends ShtamSummary {
	/** Ligne d'image ubumark (`![…](…){…}`), reprise du corps ou du vrai du faux */
	image: string | null;
	/** Premiers paragraphes du corps (ubumark) */
	excerpt: string;
}

/** En-tête du numéro : « N° 12 », date du jour */
export interface ShtamEdition {
	/** Nombre d'articles parus */
	number: number;
	almanachDate: string;
	gregorianDate: string;
}

// Constantes

/** Articles en entier par page intérieure (la page 1 est la une) */
export const ARTICLES_PER_PAGE = 2;

/** Titres annoncés sous l'article de la une */
export const UNE_TEASERS = 3;

/** Longueur visée de l'extrait de la une, en caractères */
const EXCERPT_LENGTH = 500;

const IMAGE_LINE = /^!\[[^\]]*\]\([^)]+\)(\{[^}]*\})?$/;

/** Début d'un bloc qui ne se coupe pas : liste, tableau, intertitre, citation, code, formule */
const BLOCK_START = /^(```|#|\||>|[-*+] |\d+[.)] |\$\$|~~)/;

// Functions

const pad = (n: number): string => String(n).padStart(2, '0');

/** Jour civil à Paris, `YYYY-MM-DD` : c'est lui qui décide si un article est paru */
export function todayIsoInParis(now: Date = new Date()): string {
	const c = civilDateIn(now, 'Europe/Paris');
	return `${c.year}-${pad(c.month)}-${pad(c.day)}`;
}

function formatDates(iso: string): { almanachDate: string; gregorianDate: string } {
	const [year, month, day] = iso.split('-').map(Number);
	return {
		almanachDate: formatMedium(civilToPataphysical(year, month, day)),
		gregorianDate: formatGregorian({ year, month, day })
	};
}

export function toSummary(article: ShtamArticle): ShtamSummary {
	return {
		slug: article.slug,
		title: article.title,
		lede: article.lede,
		byline: AUTHOR_LABELS[article.author],
		date: article.date,
		...formatDates(article.date)
	};
}

export function toArticleView(article: ShtamArticle): ShtamArticleView {
	return { ...toSummary(article), body: article.body, truth: article.truth };
}

const toBlocks = (text: string): string[] => text.split(/\n[ \t]*\n/).map((b) => b.trim());

/**
 * Image et extrait de la une : la première image du corps, sinon celle du vrai du faux (les
 * figures des articles y sont toutes) ; les premiers paragraphes, jusqu'au premier bloc qui ne se
 * coupe pas.
 */
export function frontPageParts(
	body: string,
	truth = ''
): { image: string | null; excerpt: string } {
	const blocks = toBlocks(body);
	const image = [...blocks, ...toBlocks(truth)].find((b) => IMAGE_LINE.test(b)) ?? null;
	const excerpt: string[] = [];
	let length = 0;
	for (const block of blocks) {
		if (IMAGE_LINE.test(block)) continue;
		if (BLOCK_START.test(block)) break;
		excerpt.push(block);
		length += block.length;
		if (length >= EXCERPT_LENGTH) break;
	}
	return { image, excerpt: excerpt.join('\n\n') };
}

export function toFrontArticle(article: ShtamArticle): ShtamFrontArticle {
	return { ...toSummary(article), ...frontPageParts(article.body, article.truth) };
}

export function toEdition(todayIso: string, publishedCount: number): ShtamEdition {
	return { number: publishedCount, ...formatDates(todayIso) };
}

/** Page du journal où paraît en entier l'article de rang `index` (0 = le plus récent) */
export function pageOfArticle(index: number): number {
	return 2 + Math.floor(index / ARTICLES_PER_PAGE);
}

/** Nombre de pages du journal : la une, puis les pages intérieures */
export function pageCountFor(publishedCount: number): number {
	return 1 + Math.ceil(publishedCount / ARTICLES_PER_PAGE);
}
