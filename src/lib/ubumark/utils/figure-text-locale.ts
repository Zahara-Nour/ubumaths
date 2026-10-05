/**
 * Nombres d'un texte de figure selon la langue du document
 * ========================================================
 *
 * Convention de #448 appliquée aux textes d'un bloc ```figure (`texte(x, y, "0.3")`,
 * valeur calculée `{d:.2f}`) : virgule en français, point en anglais. L'auteur
 * écrit le point ; seuls les NOMBRES décimaux changent, jamais le reste du texte.
 * Une virgule écrite en dur reste telle quelle dans les deux langues : elle peut
 * séparer deux nombres (`(1,2)`).
 *
 * @module ubumark/utils/figure-text-locale
 */

import type { ContentLocale } from '$lib/types/locale';

/**
 * Décimal à point : chiffres, point, chiffres, sans chiffre ni `d.` autour
 * (`1.2.3` reste tel quel, un point final de phrase aussi).
 */
const DECIMAL_POINT_REGEX = /(?<!\d|\d\.)(\d+)\.(\d+)(?!\d|\.\d)/g;

/** Texte de figure affiché dans la langue du document (français par défaut) */
export function localizeFigureText(text: string, locale: ContentLocale | undefined): string {
	if (locale === 'en') return text;
	return text.replace(DECIMAL_POINT_REGEX, '$1,$2');
}
