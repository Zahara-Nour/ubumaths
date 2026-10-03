/**
 * Statistiques — lire une valeur numérique écrite à la française
 *
 * Partagé par l'atelier (listes) et les blocs ubumark (`données:`, v2 lot 4) :
 * une même entrée est un nombre aux deux endroits, ou un mot aux deux (Q92 :
 * une entrée qui se lit comme un nombre n'est jamais un mot).
 *
 * ⚠️ Pas d'import `$lib` dans ce module (cf. v1) : chemins relatifs.
 *
 * @module statistics/read-value
 */

/**
 * Lire un nombre écrit à la française.
 *
 * La virgule est décimale — c'est ainsi que l'élève l'écrit. Le séparateur de
 * liste est le point-virgule, jamais la virgule : distinguer `1,2` de `1, 2`
 * par une espace, comme le fait le tokenizer, est intenable en classe.
 */
export function readNumber(raw: string): number | null {
	const trimmed = raw.trim();
	if (trimmed === '') return null;
	const n = Number(trimmed.replace(',', '.'));
	return Number.isFinite(n) ? n : null;
}

/** `1/6`, `-3/4`, `+12/5` : une fraction d'entiers */
const INTEGER_FRACTION = /^\s*([-+]?\d+)\s*\/\s*(\d+)\s*$/;

/**
 * Lire une valeur de liste : un nombre écrit à la française, ou une fraction
 * d'entiers (Q45, 2026-10-02 : sans elle, un dé ne pouvait pas être saisi en
 * sixièmes). La valeur gardée est le décimal ; le texte de l'élève reste tel
 * quel dans le champ.
 *
 * Le vrai signe moins (−, copié d'un document ou tapé sur une tablette) vaut
 * `-` (Q50) — ici seulement : `readNumber` sert aussi ailleurs.
 *
 * ⚠️ Fractions d'ENTIERS seulement : `1,5/2` ou `1/2/3` restent écartés, et
 * aucune expression générale (`2^3`, `sqrt(2)`) n'est lue ici.
 */
export function readListValue(raw: string): number | null {
	const text = raw.replaceAll('−', '-');
	const fraction = INTEGER_FRACTION.exec(text);
	if (fraction) {
		const denominator = Number(fraction[2]);
		return denominator === 0 ? null : Number(fraction[1]) / denominator;
	}
	return readNumber(text);
}
