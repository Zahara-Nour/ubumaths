/**
 * QR codes vers les pages et les ressources du site
 * =================================================
 *
 * Fabriqués dans le navigateur par `uqr` (aucun service extérieur : l'adresse
 * ne quitte pas le site). Phase 0 : `docs/wip/qr-codes-phase0.md`.
 *
 * Style imposé (`docs/wip/qr-codes-style-phase0.md`, variante B) : cases et
 * yeux arrondis, gidouille au centre. Un seul dessin (`qrDrawing`) sert
 * l'écran, les téléchargements et les PDF.
 *
 * Module pur : la fenêtre (`QrCodeButton.svelte`), le bloc ```qr et les tests
 * l'importent.
 *
 * @module qr/qr-code
 */

import { encode } from 'uqr';

// ============================================================================
// TYPES
// ============================================================================

/** La matrice d'un QR code : `true` pour un module sombre, marge comprise. */
export interface QrMatrix {
	readonly version: number;
	readonly size: number;
	readonly data: readonly (readonly boolean[])[];
}

/** Les tracés du QR stylé, un module par unité (repère du `viewBox`) */
export interface QrDrawing {
	readonly size: number;
	/** Les cases, hors yeux et gidouille */
	readonly modules: string;
	/** Les anneaux des trois yeux, à remplir en `evenodd` */
	readonly eyeRings: string;
	/** Le centre des trois yeux */
	readonly eyePupils: string;
	/** Le carré blanc sous la gidouille */
	readonly logoBackdrop: string;
	/** La spirale de la gidouille, à tracer (pas à remplir) */
	readonly gidouille: string;
	readonly gidouilleWidth: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/**
 * Correction d'erreur H : 30 % du code peut être abîmé ou masqué. Il en faut
 * autant pour que la gidouille, posée sur les cases du centre, ne gêne pas la
 * lecture.
 */
export const QR_ECC = 'H';

/** La marge blanche réglementaire autour du code, en modules. */
export const QR_BORDER = 4;

/**
 * Version la plus grande acceptée (77 modules de côté, 220 octets en
 * correction H). Au-delà, un QR imprimé petit ou photographié de loin ne se
 * lit plus de façon fiable : on refuse plutôt que d'en donner un illisible.
 */
export const QR_MAX_VERSION = 15;

/**
 * Couleurs du QR (variante B), fixes quel que soit le thème : un QR inversé
 * se lit mal. Cases = texte du site, yeux = ambre de l'anneau de focus
 * (4,6:1 sur blanc), gidouille = orange primaire (décorative).
 */
export const QR_COLORS = {
	background: '#ffffff',
	modules: '#1a1a1a',
	eyes: '#b25f00',
	gidouille: '#fc8f1b'
} as const;

/** Côté du carré de la gidouille, en part du code (marge exclue) */
const LOGO_RATIO = 0.22;

/** Côté d'un œil (carré de repérage), en cases */
const EYE = 7;

/** Adresse au-delà de `QR_MAX_VERSION` (bloc ```qr) */
export const QR_TOO_LONG_MESSAGE = 'Ce lien est trop long pour un QR code lisible.';

// ============================================================================
// FONCTIONS
// ============================================================================

/** La matrice du QR code de `text`, ou `null` si le texte est trop long. */
export function encodeQr(text: string): QrMatrix | null {
	try {
		const { version, size, data } = encode(text, {
			ecc: QR_ECC,
			border: QR_BORDER,
			maxVersion: QR_MAX_VERSION
		});
		return { version, size, data };
	} catch {
		// `uqr` lève une erreur quand le texte ne tient dans aucune version permise
		return null;
	}
}

/**
 * Texte sûr dans un SVG : caractères spéciaux échappés, caractères de contrôle
 * retirés (interdits en XML : le SVG serait refusé, et le PDF de la fiche avec).
 */
function escapeXml(text: string): string {
	return (
		text
			// eslint-disable-next-line no-control-regex -- on retire justement ces caractères
			.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
	);
}

const num = (value: number) => Number(value.toFixed(3));

/** Un rectangle aux coins arrondis de rayon `r` */
function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
	return (
		`M${num(x + r)} ${num(y)}H${num(x + w - r)}a${r} ${r} 0 0 1 ${r} ${r}` +
		`V${num(y + h - r)}a${r} ${r} 0 0 1 ${-r} ${r}H${num(x + r)}a${r} ${r} 0 0 1 ${-r} ${-r}` +
		`V${num(y + r)}a${r} ${r} 0 0 1 ${r} ${-r}Z`
	);
}

/**
 * Une case : coin arrondi là où elle n'a de voisine sur aucun des deux côtés.
 * Une case isolée est un rond ; des cases voisines se soudent.
 */
function modulePath(x: number, y: number, visible: (x: number, y: number) => boolean): string {
	const r = 0.5;
	const up = visible(x, y - 1);
	const down = visible(x, y + 1);
	const left = visible(x - 1, y);
	const right = visible(x + 1, y);
	const tl = !up && !left ? r : 0;
	const tr = !up && !right ? r : 0;
	const br = !down && !right ? r : 0;
	const bl = !down && !left ? r : 0;
	return (
		`M${x + tl} ${y}H${x + 1 - tr}` +
		(tr ? `a${r} ${r} 0 0 1 ${r} ${r}` : '') +
		`V${y + 1 - br}` +
		(br ? `a${r} ${r} 0 0 1 ${-r} ${r}` : '') +
		`H${x + bl}` +
		(bl ? `a${r} ${r} 0 0 1 ${-r} ${-r}` : '') +
		`V${y + tl}` +
		(tl ? `a${r} ${r} 0 0 1 ${r} ${-r}` : '') +
		'Z'
	);
}

/** Spirale d'Archimède centrée en (`c`, `c`), ouverte vers la droite comme la gidouille du site */
function spiral(c: number, radius: number): { path: string; width: number } {
	const turns = 2.6;
	const steps = 240;
	const thetaMax = turns * 2 * Math.PI;
	const b = radius / thetaMax;
	const points: string[] = [];
	for (let i = 0; i <= steps; i++) {
		const t = (i / steps) * thetaMax;
		points.push(`${num(c + b * t * Math.cos(t))} ${num(c - b * t * Math.sin(t))}`);
	}
	// Trait de la moitié de l'écart entre deux spires
	return { path: `M${points.join('L')}`, width: num(b * Math.PI) };
}

/** Les tracés du QR stylé : cases, yeux arrondis, gidouille au centre */
export function qrDrawing(qr: QrMatrix): QrDrawing {
	const n = qr.size;
	const inner = n - 2 * QR_BORDER;

	// Le carré de la gidouille : impair, centré, sur une case de marge
	let logo = Math.round(inner * LOGO_RATIO);
	if (logo % 2 === 0) logo += 1;
	const logoStart = QR_BORDER + (inner - logo) / 2;

	const corners: [number, number][] = [
		[QR_BORDER, QR_BORDER],
		[QR_BORDER + inner - EYE, QR_BORDER],
		[QR_BORDER, QR_BORDER + inner - EYE]
	];
	const inEye = (x: number, y: number) =>
		corners.some(([ex, ey]) => x >= ex && x < ex + EYE && y >= ey && y < ey + EYE);
	const underLogo = (x: number, y: number) =>
		x >= logoStart - 1 &&
		x < logoStart + logo + 1 &&
		y >= logoStart - 1 &&
		y < logoStart + logo + 1;
	const visible = (x: number, y: number) =>
		x >= 0 && y >= 0 && x < n && y < n && qr.data[y][x] && !inEye(x, y) && !underLogo(x, y);

	let modules = '';
	for (let y = 0; y < n; y++) {
		for (let x = 0; x < n; x++) if (visible(x, y)) modules += modulePath(x, y, visible);
	}

	const eyeRings = corners
		.map(([x, y]) => roundedRect(x, y, EYE, EYE, 2.2) + roundedRect(x + 1, y + 1, 5, 5, 1.4))
		.join('');
	const eyePupils = corners.map(([x, y]) => roundedRect(x + 2, y + 2, 3, 3, 1)).join('');

	const pad = 0.6;
	const logoBackdrop = roundedRect(
		logoStart - pad,
		logoStart - pad,
		logo + 2 * pad,
		logo + 2 * pad,
		1.6
	);
	const { path: gidouille, width: gidouilleWidth } = spiral(n / 2, logo * 0.42);

	return { size: n, modules, eyeRings, eyePupils, logoBackdrop, gidouille, gidouilleWidth };
}

/**
 * Le QR code stylé en SVG autonome, un module par unité. Même dessin que le
 * bloc ```qr à l'écran et dans les PDF. `pixels` donne au SVG une taille
 * intrinsèque (le PNG : Safari et Firefox dessinent mal un SVG sans taille).
 */
export function qrSvg(qr: QrMatrix, title: string, pixels?: number): string {
	const d = qrDrawing(qr);
	const size = pixels === undefined ? '' : ` width="${pixels}" height="${pixels}"`;
	return (
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${d.size} ${d.size}"${size}>` +
		`<title>${escapeXml(title)}</title>` +
		`<rect width="${d.size}" height="${d.size}" fill="${QR_COLORS.background}"/>` +
		`<path d="${d.modules}" fill="${QR_COLORS.modules}"/>` +
		`<path d="${d.eyeRings}" fill="${QR_COLORS.eyes}" fill-rule="evenodd"/>` +
		`<path d="${d.eyePupils}" fill="${QR_COLORS.eyes}"/>` +
		`<path d="${d.logoBackdrop}" fill="${QR_COLORS.background}"/>` +
		`<path d="${d.gidouille}" fill="none" stroke="${QR_COLORS.gidouille}" stroke-width="${d.gidouilleWidth}" stroke-linecap="round" stroke-linejoin="round"/>` +
		`</svg>`
	);
}

/** Un nom de fichier parlant : `qr-aire-du-disque.png`. */
export function qrFileName(resource: string, extension: 'png' | 'svg'): string {
	const slug = resource
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
	return `qr-${slug || 'chiphre'}.${extension}`;
}
