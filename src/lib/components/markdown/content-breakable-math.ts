/**
 * Formules qui peuvent passer à la ligne — contexte des composants markdown
 *
 * Posé par un lieu étroit qui ne doit rien couper (étapes d'une démonstration à
 * ranger, E52 de `docs/wip/ecarts-verifs-progress.md`) : `MathInline` y pose la
 * formule en morceaux (`splitLatexAtBreaks`), la ligne se coupe après un `=` ou un
 * `+`. Ailleurs, une formule reste d'un seul tenant. Sans fournisseur : `false`.
 *
 * @module components/markdown/content-breakable-math
 */
import { getContext, hasContext, setContext } from 'svelte';

const BREAKABLE_MATH_KEY = Symbol('markdown-breakable-math');

/** Poser le réglage pour les composants descendants. À appeler pendant l'initialisation. */
export function provideBreakableMath(get: () => boolean): void {
	setContext<() => boolean>(BREAKABLE_MATH_KEY, get);
}

/** Les formules d'ici peuvent-elles passer à la ligne ? */
export function readBreakableMath(): () => boolean {
	return hasContext(BREAKABLE_MATH_KEY)
		? getContext<() => boolean>(BREAKABLE_MATH_KEY)
		: () => false;
}
