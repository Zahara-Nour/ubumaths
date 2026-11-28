/**
 * La boîte d'une étiquette du grapheur (`GraphLabel.svelte`) : sa largeur, sa
 * hauteur et son étendue en abscisse, bascule à gauche près du bord droit
 * comprise.
 *
 * Partagée avec le placement des étiquettes d'asymptotes : E6 (2026-11-23),
 * l'anti-chevauchement supposait la boîte à droite de son point, alors que
 * `GraphLabel` la retournait à gauche près du bord — `x = 5π/2` se posait sur
 * `x = 3π/2`.
 *
 * @module grapheur/label-box
 */

/** Distance entre le point et son étiquette, en pixels. */
export const LABEL_BOX_MARGIN = 12;

/** Hauteur d'une étiquette sur une ligne. */
const LINE_HEIGHT = 20;

/** Hauteur d'une étiquette à deux étages (une fraction). */
const STACKED_HEIGHT = 36;

/** Largeur de la boîte, estimée sur le texte affiché. */
export function labelBoxWidth(text: string): number {
	return Math.max(105, text.length * 7);
}

/** Hauteur de la boîte : une fraction prend deux étages. */
export function labelBoxHeight(latex: string | null | undefined): number {
	return latex && /\\[dt]?frac/.test(latex) ? STACKED_HEIGHT : LINE_HEIGHT;
}

/**
 * Étendue en abscisse de la boîte posée au point `x` : à droite du point, ou
 * retournée à gauche quand elle sortirait du cadre.
 */
export function labelBoxSpan(
	x: number,
	text: string,
	canvasWidth: number
): { left: number; right: number; anchor: 'start' | 'end' } {
	const width = labelBoxWidth(text);
	if (x + width + LABEL_BOX_MARGIN > canvasWidth) {
		const right = x - LABEL_BOX_MARGIN;
		return { left: right - width, right, anchor: 'end' };
	}
	const left = x + LABEL_BOX_MARGIN;
	return { left, right: left + width, anchor: 'start' };
}

/**
 * Ordonnée du MILIEU de la boîte pour le point d'ordonnée `y` : au-dessus du
 * point, ou dessous quand elle sortirait par le haut, sans sortir par le bas.
 */
export function labelBoxCenterY(y: number, height: number, canvasHeight: number): number {
	const above = y - LABEL_BOX_MARGIN - 8;
	if (above >= LABEL_BOX_MARGIN + height) return above;
	const below = y + LABEL_BOX_MARGIN + height;
	return below + height > canvasHeight - LABEL_BOX_MARGIN
		? canvasHeight - height - LABEL_BOX_MARGIN
		: below;
}

/**
 * Ordonnée du MILIEU de la boîte posée SOUS le point d'ordonnée `y` ; au-dessus
 * quand elle sortirait par le bas (E28 : valeur de x sous l'axe des abscisses).
 */
export function labelBoxCenterYBelow(y: number, height: number, canvasHeight: number): number {
	const below = y + LABEL_BOX_MARGIN + height;
	if (below + height / 2 <= canvasHeight - LABEL_BOX_MARGIN) return below;
	return labelBoxCenterY(y, height, canvasHeight);
}

/** Le rectangle d'une étiquette posée au point (`x`, `y`), au-dessus ou dessous. */
export interface LabelRect {
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly bottom: number;
}

export function labelBoxRect(
	x: number,
	y: number,
	content: { text: string; latex: string | null },
	canvas: { width: number; height: number },
	below = false
): LabelRect {
	const span = labelBoxSpan(x, content.text, canvas.width);
	const height = labelBoxHeight(content.latex);
	const center = below
		? labelBoxCenterYBelow(y, height, canvas.height)
		: labelBoxCenterY(y, height, canvas.height);
	return {
		left: span.left,
		right: span.right,
		top: center - height / 2,
		bottom: center + height / 2
	};
}

/** Deux étiquettes se touchent-elles ? */
export function labelRectsOverlap(a: LabelRect, b: LabelRect): boolean {
	return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}
