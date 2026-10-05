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

// Functions

const pad = (n: number): string => String(n).padStart(2, '0');

/** Jour civil à Paris, `YYYY-MM-DD` : c'est lui qui décide si un article est paru */
export function todayIsoInParis(now: Date = new Date()): string {
	const c = civilDateIn(now, 'Europe/Paris');
	return `${c.year}-${pad(c.month)}-${pad(c.day)}`;
}

export function toSummary(article: ShtamArticle): ShtamSummary {
	const [year, month, day] = article.date.split('-').map(Number);
	return {
		slug: article.slug,
		title: article.title,
		lede: article.lede,
		byline: AUTHOR_LABELS[article.author],
		date: article.date,
		almanachDate: formatMedium(civilToPataphysical(year, month, day)),
		gregorianDate: formatGregorian({ year, month, day })
	};
}

export function toArticleView(article: ShtamArticle): ShtamArticleView {
	return { ...toSummary(article), body: article.body, truth: article.truth };
}
