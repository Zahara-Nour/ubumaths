/**
 * Avertissements d'écriture des `{{eval:…}}` (2026-11-26)
 * =======================================================
 *
 * Une écriture douteuse mais pas fausse (`3.755[€]` : des euros au-delà du centime ;
 * `;d2` sur une valeur à 3 décimales) ne bloque pas le tirage : elle est signalée à
 * l'auteur par `pnpm question:specs` (`checkTemplate`), qui collecte ce que les
 * `{{eval}}` disent pendant ses tirages.
 *
 * Canal : `collectEvalWarnings(run)` ouvre un collecteur le temps de `run` (synchrone) ;
 * `warnEval` y dépose un message. Sans collecteur ouvert (l'appli), rien n'est gardé.
 *
 * @module mathAST/eval/eval-warnings
 */

/** Collecteurs ouverts, le plus récent en dernier (des appels imbriqués restent séparés) */
const collectors: string[][] = [];

/** Dépose un avertissement dans le collecteur ouvert ; sans collecteur, ne fait rien */
export function warnEval(message: string): void {
	collectors.at(-1)?.push(message);
}

/** Exécute `run` en collectant les avertissements des `{{eval}}` qu'il évalue */
export function collectEvalWarnings<T>(run: () => T): { result: T; warnings: string[] } {
	const warnings: string[] = [];
	collectors.push(warnings);
	try {
		return { result: run(), warnings };
	} finally {
		collectors.pop();
	}
}
