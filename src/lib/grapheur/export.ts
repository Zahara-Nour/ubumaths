/**
 * Graph Export Utilities
 *
 * Provides SVG and PNG export functionality for the grapheur.
 * Uses browser-native APIs without external dependencies.
 *
 * @module grapheur/export
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Export format options
 */
export type ExportFormat = 'svg' | 'png';

/**
 * PNG export scale options
 */
export type ExportScale = 1 | 2 | 3;

/**
 * Options for graph export
 */
export interface ExportOptions {
	/** Export format */
	readonly format: ExportFormat;
	/** Scale factor for PNG (1x, 2x Retina, 3x HD) */
	readonly scale?: ExportScale;
	/** Include background color */
	readonly includeBackground?: boolean;
}

// =============================================================================
// SVG Preparation
// =============================================================================

/**
 * Propriétés recopiées depuis le style CALCULÉ de chaque élément.
 *
 * Un SVG exporté ne voit plus app.css : les couleurs du thème (`var(--color-…)`,
 * `light-dark()`) et les styles des composants n'existent plus pour lui. On fige
 * donc ce que le navigateur a réellement calculé.
 */
const EXPORTED_PROPERTIES = [
	'fill',
	'fill-opacity',
	'stroke',
	'stroke-width',
	'stroke-opacity',
	'stroke-dasharray',
	'stroke-linecap',
	'stroke-linejoin',
	'opacity',
	'color',
	'font-family',
	'font-size',
	'font-style',
	'font-weight'
] as const;

/**
 * Prépare le SVG à exporter — **toujours en clair** (décision 1b), quel que soit
 * le mode de l'élève : un graphique exporté finit dans un document ou sur papier.
 *
 * La copie est rendue hors écran sous `color-scheme: light` : `light-dark()`
 * y choisit les valeurs claires, et chaque élément reçoit ses couleurs calculées.
 * Une seule source de vérité, app.css : plus de table de couleurs recopiée ici.
 *
 * @param svg - Le SVG affiché (laissé intact)
 * @param width - Largeur en pixels
 * @param height - Hauteur en pixels
 * @returns Le SVG sérialisé, sans aucune variable CSS
 */
export function prepareSvgForExport(svg: SVGSVGElement, width: number, height: number): string {
	const clone = svg.cloneNode(true) as SVGSVGElement;
	removeInteractiveElements(clone);

	// Rendu hors écran, en clair : `visibility: hidden` garde le calcul des styles
	const host = document.createElement('div');
	host.style.cssText =
		'position: fixed; left: -100000px; top: 0; visibility: hidden; pointer-events: none; color-scheme: light;';
	host.appendChild(clone);
	document.body.appendChild(host);

	let background: string;
	try {
		background = resolveGraphBackground(host);
		freezeComputedStyles(clone);
	} finally {
		host.remove();
	}

	clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	clone.setAttribute('width', String(width));
	clone.setAttribute('height', String(height));
	clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
	removeSvelteAttributes(clone);
	addBackground(clone, width, height, background);

	return new XMLSerializer().serializeToString(clone);
}

/** Le fond clair du grapheur, lu dans le thème (`--color-graph-bg`) */
function resolveGraphBackground(host: HTMLElement): string {
	const probe = document.createElement('div');
	probe.style.backgroundColor = 'var(--color-graph-bg)';
	host.appendChild(probe);
	const color = getComputedStyle(probe).backgroundColor;
	probe.remove();
	return color;
}

/**
 * Fige, dans le style en ligne de chaque élément, les valeurs calculées.
 *
 * On FUSIONNE avec le style en ligne existant, sans le remplacer : le balisage
 * MathLive des étiquettes (dans un `foreignObject`) porte sa mise en page en
 * ligne — hauteurs, `vertical-align` des exposants et des fractions.
 * Une `var(…)` en ligne est écrasée par sa valeur calculée.
 *
 * ⚠️ Toutes les valeurs sont lues AVANT d'en écrire une seule : écrire le style
 * d'un parent changerait ce dont ses enfants héritent pendant la lecture.
 */
function freezeComputedStyles(root: Element): void {
	const elements = [root, ...root.querySelectorAll('*')].filter(
		(el): el is SVGElement | HTMLElement => el instanceof SVGElement || el instanceof HTMLElement
	);
	const frozen = elements.map((el) => {
		const computed = getComputedStyle(el);
		return EXPORTED_PROPERTIES.map((prop) => [prop, computed.getPropertyValue(prop)] as const);
	});
	elements.forEach((el, i) => {
		for (const [prop, value] of frozen[i]) el.style.setProperty(prop, value);
	});
}

/**
 * Remove interactive overlay elements (hover, tooltips)
 */
function removeInteractiveElements(svg: SVGSVGElement): void {
	// Remove curve hover elements
	const curveHover = svg.querySelector('.curve-hover');
	if (curveHover) {
		curveHover.remove();
	}

	// Remove any tooltip elements
	const tooltips = svg.querySelectorAll('.tooltip');
	tooltips.forEach((tooltip) => tooltip.remove());

	// Remove hit areas (invisible click targets)
	const hitAreas = svg.querySelectorAll('.hit-area');
	hitAreas.forEach((hitArea) => hitArea.remove());
}

/**
 * Remove Svelte-specific class attributes
 */
function removeSvelteAttributes(element: Element): void {
	// Remove svelte-* class suffixes
	const className = element.getAttribute('class');
	if (className) {
		// Keep class names but remove Svelte hash suffixes
		const cleanedClass = className
			.split(' ')
			.filter((cls) => !cls.startsWith('svelte-'))
			.join(' ');
		if (cleanedClass) {
			element.setAttribute('class', cleanedClass);
		} else {
			element.removeAttribute('class');
		}
	}

	// Remove data-svelte-* attributes
	const attributes = Array.from(element.attributes);
	for (const attr of attributes) {
		if (attr.name.startsWith('data-svelte')) {
			element.removeAttribute(attr.name);
		}
	}

	// Recurse to children
	for (const child of element.children) {
		removeSvelteAttributes(child);
	}
}

/**
 * Add background rectangle to SVG
 */
function addBackground(svg: SVGSVGElement, width: number, height: number, color: string): void {
	const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
	bg.setAttribute('width', String(width));
	bg.setAttribute('height', String(height));
	bg.setAttribute('fill', color);

	// Insert as first child
	svg.insertBefore(bg, svg.firstChild);
}

// =============================================================================
// PNG Export
// =============================================================================

/**
 * Convert SVG string to PNG blob
 *
 * @param svgString - Prepared SVG string
 * @param width - Original width
 * @param height - Original height
 * @param scale - Scale factor (1, 2, or 3)
 * @returns Promise resolving to PNG blob
 */
export async function exportAsPng(
	svgString: string,
	width: number,
	height: number,
	scale: ExportScale = 2
): Promise<Blob> {
	return new Promise((resolve, reject) => {
		// Create canvas with scaled dimensions
		const canvas = document.createElement('canvas');
		canvas.width = width * scale;
		canvas.height = height * scale;

		const ctx = canvas.getContext('2d');
		if (!ctx) {
			reject(new Error('Failed to get canvas context'));
			return;
		}

		// Scale the context for high-DPI rendering
		ctx.scale(scale, scale);

		// Create image from SVG blob
		const img = new Image();
		const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
		const url = URL.createObjectURL(svgBlob);

		img.onload = () => {
			// Draw image to canvas
			ctx.drawImage(img, 0, 0);

			// Cleanup blob URL
			URL.revokeObjectURL(url);

			// Convert canvas to PNG blob
			canvas.toBlob(
				(blob) => {
					if (blob) {
						resolve(blob);
					} else {
						reject(new Error('Failed to create PNG blob'));
					}
				},
				'image/png',
				1.0 // Quality (1.0 = maximum)
			);
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error('Failed to load SVG image'));
		};

		img.src = url;
	});
}

// =============================================================================
// Download Utilities
// =============================================================================

/**
 * Generate export filename with timestamp
 *
 * @param format - Export format (svg or png)
 * @returns Filename string
 */
export function generateFilename(format: ExportFormat): string {
	const now = new Date();
	const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
	return `graphe-${timestamp}.${format}`;
}

/**
 * Trigger file download
 *
 * @param data - File data (Blob or string)
 * @param filename - Filename to save as
 * @param mimeType - MIME type for string data
 */
export function downloadFile(data: Blob | string, filename: string, mimeType?: string): void {
	let blob: Blob;

	if (typeof data === 'string') {
		blob = new Blob([data], { type: mimeType || 'text/plain' });
	} else {
		blob = data;
	}

	const url = URL.createObjectURL(blob);

	const link = document.createElement('a');
	link.href = url;
	link.download = filename;

	// Trigger download
	document.body.appendChild(link);
	link.click();

	// Cleanup
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

// =============================================================================
// High-Level Export Functions
// =============================================================================

/**
 * Export graph as SVG file
 *
 * @param svg - SVG element to export
 * @param width - Width in pixels
 * @param height - Height in pixels
 */
export function exportSvg(svg: SVGSVGElement, width: number, height: number): void {
	const svgString = prepareSvgForExport(svg, width, height);
	const filename = generateFilename('svg');
	downloadFile(svgString, filename, 'image/svg+xml');
}

/**
 * Export graph as PNG file
 *
 * @param svg - SVG element to export
 * @param width - Width in pixels
 * @param height - Height in pixels
 * @param scale - Scale factor (1, 2, or 3)
 */
export async function exportPng(
	svg: SVGSVGElement,
	width: number,
	height: number,
	scale: ExportScale = 2
): Promise<void> {
	const svgString = prepareSvgForExport(svg, width, height);
	const pngBlob = await exportAsPng(svgString, width, height, scale);
	const filename = generateFilename('png');
	downloadFile(pngBlob, filename);
}
