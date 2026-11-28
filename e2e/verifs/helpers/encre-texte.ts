/**
 * Boîte de l'ENCRE d'un texte SVG, à l'écran
 * ==========================================
 *
 * `getBoundingClientRect()` d'un `<text>` ne vaut rien sous le Firefox de Playwright quand
 * la police est petite dans le viewBox puis agrandie (ou grande puis réduite) : la boîte y
 * est gonflée (« I » de 10,7 × 21 px au lieu de 3,7 × 16 sous Chrome ; vérifié aux pixels le
 * 2026-11-27, #3231). Deux noms qui ne se touchent pas y paraissent se chevaucher.
 *
 * Mesure gardée, dans le repère du texte :
 * - largeur : de la première à la dernière case de caractère (`getExtentOfChar`) ;
 * - hauteur : encre du texte mesurée par un canvas (`measureText`), posée sur la ligne de
 *   base (`getStartPositionOfChar(0)`), ou sur le milieu avec `dominant-baseline: central`.
 * Les quatre coins passent ensuite à l'écran par `getScreenCTM()` : un nom tourné garde la
 * boîte englobante de son encre tournée.
 *
 * Suppose un texte d'un seul tenant (sans `tspan` décalé).
 *
 * La fonction se passe telle quelle à `evaluateAll` : elle ne doit rien utiliser d'autre
 * que le DOM.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TextInkBox {
	text: string;
	x: number;
	y: number;
	width: number;
	height: number;
}

// ============================================================================
// FUNCTIONS
// ============================================================================

export function textInkBoxes(nodes: Element[]): TextInkBox[] {
	const ctx = document.createElement('canvas').getContext('2d');
	return nodes.map((node) => {
		const text = node.textContent ?? '';
		const rect = node.getBoundingClientRect();
		const fallback = { text, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
		if (!(node instanceof SVGTextElement) || !ctx) return fallback;
		const m = node.getScreenCTM();
		const n = node.getNumberOfChars();
		if (!m || n === 0) return fallback;

		let left = Infinity;
		let right = -Infinity;
		for (let i = 0; i < n; i++) {
			const c = node.getExtentOfChar(i);
			left = Math.min(left, c.x);
			right = Math.max(right, c.x + c.width);
		}
		const style = getComputedStyle(node);
		// Police dans le repère du texte : la taille calculée, sans l'échelle du viewBox
		ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
		ctx.textBaseline = style.dominantBaseline === 'central' ? 'middle' : 'alphabetic';
		const ink = ctx.measureText(text);
		const baseline = node.getStartPositionOfChar(0).y;
		const top = baseline - ink.actualBoundingBoxAscent;
		const bottom = baseline + ink.actualBoundingBoxDescent;

		const corners = [
			[left, top],
			[right, top],
			[left, bottom],
			[right, bottom]
		].map(([x, y]) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f }));
		const xs = corners.map((p) => p.x);
		const ys = corners.map((p) => p.y);
		const x = Math.min(...xs);
		const y = Math.min(...ys);
		return { text, x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
	});
}
