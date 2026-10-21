/**
 * Durée plancher d'une réponse
 * ============================
 *
 * Une réponse neutre (« si un compte existe… ») ne dit rien par son texte, mais son temps
 * peut parler : le chemin qui envoie un courriel est plus lent que celui qui ne trouve rien
 * (audit de la PR 3, F-a). Attendre jusqu'à une durée plancher, sur tous les chemins, rend
 * les temps indiscernables tant que le plus lent reste sous le plancher.
 */

/** Attend que `minimumMs` se soient écoulées depuis `startedAt` (ms, `Date.now()`). */
export async function waitForResponseFloor(
	startedAt: number,
	minimumMs: number,
	now: () => number = Date.now
): Promise<void> {
	const remaining = minimumMs - (now() - startedAt);
	if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
}
