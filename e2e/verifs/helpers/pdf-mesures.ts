import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/**
 * Mesures de PDF au-delà de `fiches.ts` : positions des textes avec leur largeur, image d'une
 * page en pixels, composants connexes (flèches, cases, traits). Poppler seulement.
 */

/** Un morceau de texte d'une page, en points PDF (1/72 pouce) */
export interface PdfBox {
	page: number;
	text: string;
	left: number;
	top: number;
	width: number;
	height: number;
	/** Corps de la police en points */
	size: number;
}

export interface PdfPageSize {
	page: number;
	width: number;
	height: number;
}

/** `pdftohtml -xml` rend des pixels à 1,5 px par point */
const XML_PER_POINT = 1.5;

/** Les textes de toutes les pages (ordre du fichier) et la taille de chaque page, en points */
export function pdfBoxes(file: string): { boxes: PdfBox[]; pages: PdfPageSize[] } {
	const xml = execFileSync('pdftohtml', ['-xml', '-i', '-stdout', '-q', file], {
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024
	});
	const sizes = new Map<string, number>();
	for (const match of xml.matchAll(/<fontspec id="(\d+)" size="(\d+)"/g)) {
		sizes.set(match[1], Number(match[2]) / XML_PER_POINT);
	}
	const boxes: PdfBox[] = [];
	const pages: PdfPageSize[] = [];
	for (const pageMatch of xml.matchAll(
		/<page number="(\d+)"[^>]*height="(\d+)" width="(\d+)">([\s\S]*?)<\/page>/g
	)) {
		const page = Number(pageMatch[1]);
		pages.push({
			page,
			height: Number(pageMatch[2]) / XML_PER_POINT,
			width: Number(pageMatch[3]) / XML_PER_POINT
		});
		for (const m of pageMatch[4].matchAll(
			/<text top="(\d+)" left="(\d+)" width="(\d+)" height="(\d+)" font="(\d+)">(.*?)<\/text>/g
		)) {
			boxes.push({
				page,
				top: Number(m[1]) / XML_PER_POINT,
				left: Number(m[2]) / XML_PER_POINT,
				width: Number(m[3]) / XML_PER_POINT,
				height: Number(m[4]) / XML_PER_POINT,
				size: sizes.get(m[5]) ?? 0,
				text: m[6]
					.replace(/<[^>]*>/g, '')
					.replace(/&amp;/g, '&')
					.replace(/&lt;/g, '<')
					.replace(/&gt;/g, '>')
					.replace(/&quot;/g, '"')
					.replace(/&#39;/g, "'")
			});
		}
	}
	return { boxes, pages };
}

/** Le texte brut dans l'ordre de lecture du fichier (colonnes l'une après l'autre), une page par entrée */
export function pdfRawText(file: string): string[] {
	return execFileSync('pdftotext', [file, '-'], { encoding: 'utf8' }).split('\f');
}

export interface Raster {
	width: number;
	height: number;
	dpi: number;
	/** Pixels RVB, trois octets chacun */
	data: Buffer;
}

/** La page `page` (1 = première) en pixels RVB, à `dpi` points par pouce */
export function rasterPage(file: string, page: number, dpi = 100): Raster {
	const root = `${file}.r${page}-${dpi}`;
	mkdirSync(dirname(resolve(root)), { recursive: true });
	execFileSync('pdftoppm', [
		'-singlefile',
		'-r',
		String(dpi),
		'-f',
		String(page),
		'-l',
		String(page),
		file,
		root
	]);
	const ppmPath = `${root}.ppm`;
	const ppm = readFileSync(ppmPath);
	rmSync(ppmPath);
	// En-tête P6 : « P6\n<largeur> <hauteur>\n255\n » puis les pixels RVB
	let offset = 0;
	const fields: string[] = [];
	while (fields.length < 4) {
		let end = offset;
		while (ppm[end] !== 0x0a && ppm[end] !== 0x20) end++;
		fields.push(ppm.subarray(offset, end).toString('latin1'));
		offset = end + 1;
	}
	return { width: Number(fields[1]), height: Number(fields[2]), dpi, data: ppm.subarray(offset) };
}

/** Un rectangle en points PDF */
export interface Region {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

export type PixelTest = (r: number, g: number, b: number) => boolean;

/** Les pixels « encre » : tout ce qui n'est pas (presque) blanc */
export const isInk: PixelTest = (r, g, b) => r < 235 || g < 235 || b < 235;
/** Noir ou gris très foncé (traits des tableaux, flèches, texte), jamais une couleur */
export const isBlack: PixelTest = (r, g, b) => r < 110 && g < 110 && b < 110;
/** Bleu des figures (le trait des courbes) */
export const isBlue: PixelTest = (r, g, b) => b > 150 && b > r + 60 && b > g + 30;
/** Vert (la solution posée sur une droite) */
export const isGreen: PixelTest = (r, g, b) => g > r + 40 && g > b + 40;

/** Le rectangle englobant (en points) des pixels qui passent le test dans la région, ou null */
export function inkBox(
	raster: Raster,
	test: PixelTest,
	region?: Region
): { left: number; top: number; right: number; bottom: number } | null {
	const k = raster.dpi / 72;
	const x0 = Math.max(0, Math.floor((region?.left ?? 0) * k));
	const x1 = Math.min(raster.width, Math.ceil((region?.right ?? raster.width / k) * k));
	const y0 = Math.max(0, Math.floor((region?.top ?? 0) * k));
	const y1 = Math.min(raster.height, Math.ceil((region?.bottom ?? raster.height / k) * k));
	let box: { left: number; top: number; right: number; bottom: number } | null = null;
	for (let y = y0; y < y1; y++) {
		for (let x = x0; x < x1; x++) {
			const i = (y * raster.width + x) * 3;
			if (!test(raster.data[i], raster.data[i + 1], raster.data[i + 2])) continue;
			box ??= { left: x, top: y, right: x, bottom: y };
			box.left = Math.min(box.left, x);
			box.right = Math.max(box.right, x);
			box.top = Math.min(box.top, y);
			box.bottom = Math.max(box.bottom, y);
		}
	}
	return (
		box && {
			left: box.left / k,
			top: box.top / k,
			right: (box.right + 1) / k,
			bottom: (box.bottom + 1) / k
		}
	);
}

/** Part des pixels de la région qui passent le test */
export function share(raster: Raster, test: PixelTest, region?: Region): number {
	const k = raster.dpi / 72;
	const x0 = Math.max(0, Math.floor((region?.left ?? 0) * k));
	const x1 = Math.min(raster.width, Math.ceil((region?.right ?? raster.width / k) * k));
	const y0 = Math.max(0, Math.floor((region?.top ?? 0) * k));
	const y1 = Math.min(raster.height, Math.ceil((region?.bottom ?? raster.height / k) * k));
	let hits = 0;
	for (let y = y0; y < y1; y++) {
		for (let x = x0; x < x1; x++) {
			const i = (y * raster.width + x) * 3;
			if (test(raster.data[i], raster.data[i + 1], raster.data[i + 2])) hits++;
		}
	}
	return hits / Math.max(1, (x1 - x0) * (y1 - y0));
}

export interface Component {
	/** Rectangle englobant, en points */
	box: Region;
	/** Nombre de pixels */
	pixels: number;
	/** Centre de gravité de la moitié gauche et de la moitié droite du rectangle (hauteur en points) */
	leftY: number;
	rightY: number;
}

/** Composants connexes (8 voisins) des pixels qui passent le test, dans la région */
export function components(raster: Raster, test: PixelTest, region?: Region): Component[] {
	const k = raster.dpi / 72;
	const x0 = Math.max(0, Math.floor((region?.left ?? 0) * k));
	const x1 = Math.min(raster.width, Math.ceil((region?.right ?? raster.width / k) * k));
	const y0 = Math.max(0, Math.floor((region?.top ?? 0) * k));
	const y1 = Math.min(raster.height, Math.ceil((region?.bottom ?? raster.height / k) * k));
	const w = x1 - x0;
	const h = y1 - y0;
	const mask = new Uint8Array(w * h);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const i = ((y + y0) * raster.width + (x + x0)) * 3;
			if (test(raster.data[i], raster.data[i + 1], raster.data[i + 2])) mask[y * w + x] = 1;
		}
	}
	const result: Component[] = [];
	const stack: number[] = [];
	for (let start = 0; start < mask.length; start++) {
		if (mask[start] !== 1) continue;
		const cells: number[] = [];
		stack.push(start);
		mask[start] = 2;
		let minX = w;
		let maxX = 0;
		let minY = h;
		let maxY = 0;
		while (stack.length > 0) {
			const cell = stack.pop() as number;
			cells.push(cell);
			const cx = cell % w;
			const cy = (cell - cx) / w;
			minX = Math.min(minX, cx);
			maxX = Math.max(maxX, cx);
			minY = Math.min(minY, cy);
			maxY = Math.max(maxY, cy);
			for (let dy = -1; dy <= 1; dy++) {
				for (let dx = -1; dx <= 1; dx++) {
					const nx = cx + dx;
					const ny = cy + dy;
					if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
					const next = ny * w + nx;
					if (mask[next] === 1) {
						mask[next] = 2;
						stack.push(next);
					}
				}
			}
		}
		const midX = (minX + maxX) / 2;
		let leftSum = 0;
		let leftCount = 0;
		let rightSum = 0;
		let rightCount = 0;
		for (const cell of cells) {
			const cx = cell % w;
			const cy = (cell - cx) / w;
			if (cx <= midX) {
				leftSum += cy;
				leftCount++;
			} else {
				rightSum += cy;
				rightCount++;
			}
		}
		result.push({
			box: {
				left: (minX + x0) / k,
				top: (minY + y0) / k,
				right: (maxX + 1 + x0) / k,
				bottom: (maxY + 1 + y0) / k
			},
			pixels: cells.length,
			leftY: (leftSum / Math.max(1, leftCount) + y0) / k,
			rightY: (rightSum / Math.max(1, rightCount) + y0) / k
		});
	}
	return result;
}
