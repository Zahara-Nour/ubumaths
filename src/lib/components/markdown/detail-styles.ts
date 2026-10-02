/**
 * Apparence des détails d'une correction (ADR 0017, D8)
 * =====================================================
 *
 * - méthode : encadré, placé avant le calcul par l'auteur ;
 * - rappel : en marge sur grand écran (≥ md, cf. `MarkdownRenderer`), encadré
 *   juste dessous sur téléphone ;
 * - attention : encadré aux couleurs d'alerte ;
 * - en ligne : mise en valeur discrète (calcul), ou teinte du type.
 *
 * Couleurs : tokens `--color-*` via les utilitaires Tailwind (docs/ref/css-color-tokens.md).
 *
 * @module components/markdown/detail-styles
 */

import type { CalloutKind, DetailKind } from '$lib/ubumark';

/** Classes de l'encadré typé (bord, fond). */
export const CALLOUT_CLASSES: Record<CalloutKind, string> = {
	method: 'border-info bg-info/10',
	reminder: 'border-primary bg-primary/10 text-sm',
	warning: 'border-warning bg-warning/15'
};

/** Classes du libellé de l'encadré. */
export const CALLOUT_LABEL_CLASSES: Record<CalloutKind, string> = {
	method: 'text-info',
	reminder: 'text-foreground',
	warning: 'text-warning'
};

/** Classes d'un détail en ligne `[texte]{.type}`. */
export const INLINE_DETAIL_CLASSES: Record<DetailKind, string> = {
	calculation: 'text-muted-foreground',
	reminder: 'rounded-sm bg-primary/10 px-0.5',
	method: 'rounded-sm bg-info/10 px-0.5',
	warning: 'rounded-sm bg-warning/15 px-0.5'
};

/** Classes d'un nœud en ligne, chaîne vide hors détail. */
export function inlineDetailClass(kind: DetailKind | undefined): string {
	return kind ? `detail-inline ${INLINE_DETAIL_CLASSES[kind]}` : '';
}
