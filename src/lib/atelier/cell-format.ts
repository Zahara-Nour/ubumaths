/**
 * Atelier — la mise en forme des cases de la grille (reprise de V4, 2026-10-18).
 *
 * Phase 0 `docs/wip/atelier-tableur-mise-en-forme-phase0.md` : gras, italique,
 * alignement, couleurs du thème, formats de nombre (décimales, pourcentage,
 * monnaie). Elle ne change que l'AFFICHAGE : une formule cite la valeur.
 *
 * Rangée PAR ZONE, dans l'ordre où elle a été posée (Q-MF-5) : la dernière zone
 * qui touche une case l'emporte, propriété par propriété ; mettre en forme une
 * colonne de 200 cases coûte une ligne dans le lien.
 *
 * @module atelier/cell-format
 */

import { z } from 'zod';
import type { CellValue } from './formula';
import { columnLetter, columnOfLetter, GRID_COLUMNS, GRID_ROWS } from './grid';

// =============================================================================
// Types
// =============================================================================

/** Les 6 couleurs du thème (Q-MF-3), lisibles en clair comme en sombre. */
export type ThemeColor = 'rouge' | 'orange' | 'jaune' | 'vert' | 'bleu' | 'violet';

export type Alignment = 'left' | 'center' | 'right';

/** Un format de nombre (Q-MF-1) : décimales, pourcentage, monnaie ; de 0 à 6 décimales. */
export interface NumberFormat {
	readonly kind: 'decimals' | 'percent' | 'currency';
	readonly decimals: number;
}

/** Le style RÉSOLU d'une case : seulement ce qui s'écarte du défaut. */
export interface CellStyle {
	readonly bold?: boolean;
	readonly italic?: boolean;
	readonly align?: Alignment;
	readonly color?: ThemeColor;
	readonly fill?: ThemeColor;
	readonly number?: NumberFormat;
}

/**
 * Ce qu'une zone pose : une propriété présente remplace celle d'avant ; `false`
 * ou `null` la ramène au défaut (« Effacer la mise en forme »).
 */
export interface StylePatch {
	readonly bold?: boolean;
	readonly italic?: boolean;
	readonly align?: Alignment | null;
	readonly color?: ThemeColor | null;
	readonly fill?: ThemeColor | null;
	readonly number?: NumberFormat | null;
}

/** Une zone de la grille, bornes comprises. */
export interface GridZone {
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly bottom: number;
}

/** Une mise en forme posée : sa zone et ce qu'elle change. */
export interface FormatZone {
	readonly zone: GridZone;
	readonly patch: StylePatch;
}

/** Ce qui est rangé (sauvegarde, lien) : la zone écrite `A1:B20`. */
export type StoredFormat = { readonly zone: string } & StylePatch;

// =============================================================================
// Constantes
// =============================================================================

export const THEME_COLORS: readonly ThemeColor[] = [
	'rouge',
	'orange',
	'jaune',
	'vert',
	'bleu',
	'violet'
];

export const MAX_FORMAT_DECIMALS = 6;

/** Au-delà, une nouvelle mise en forme est refusée : l'élève efface d'abord (règle 1, bornes). */
export const MAX_FORMAT_ZONES = 500;

/** Le patch qui ramène tout au défaut (« Effacer la mise en forme »). */
export const CLEAR_PATCH: StylePatch = {
	bold: false,
	italic: false,
	align: null,
	color: null,
	fill: null,
	number: null
};

const ZONE = /^([A-Z])([1-9]\d{0,2}):([A-Z])([1-9]\d{0,2})$/;

const numberFormatSchema = z.object({
	kind: z.enum(['decimals', 'percent', 'currency']),
	decimals: z.number().int().min(0).max(MAX_FORMAT_DECIMALS)
});

/** Une mise en forme rangée, validée (un lien peut être forgé) : zone dans la grille, valeurs connues. */
export const storedFormatSchema = z
	.object({
		zone: z.string().refine((text) => zoneOf(text) !== null),
		bold: z.boolean().optional(),
		italic: z.boolean().optional(),
		align: z.enum(['left', 'center', 'right']).nullable().optional(),
		color: z
			.enum(THEME_COLORS as [ThemeColor, ...ThemeColor[]])
			.nullable()
			.optional(),
		fill: z
			.enum(THEME_COLORS as [ThemeColor, ...ThemeColor[]])
			.nullable()
			.optional(),
		number: numberFormatSchema.nullable().optional()
	})
	.strict();

// =============================================================================
// Zones
// =============================================================================

/** `A1:B20` → la zone, rangée ; `null` hors de la grille. */
export function zoneOf(text: string): GridZone | null {
	const match = ZONE.exec(text);
	if (match === null) return null;
	const [c1, c2] = [columnOfLetter(match[1]), columnOfLetter(match[3])];
	const [r1, r2] = [Number(match[2]), Number(match[4])];
	if (c1 === null || c2 === null || r1 > GRID_ROWS || r2 > GRID_ROWS) return null;
	return {
		left: Math.min(c1, c2),
		right: Math.max(c1, c2),
		top: Math.min(r1, r2),
		bottom: Math.max(r1, r2)
	};
}

export function zoneText(zone: GridZone): string {
	return `${columnLetter(zone.left)}${zone.top}:${columnLetter(zone.right)}${zone.bottom}`;
}

export function zoneInGrid(zone: GridZone): boolean {
	return (
		Number.isInteger(zone.left) &&
		Number.isInteger(zone.right) &&
		Number.isInteger(zone.top) &&
		Number.isInteger(zone.bottom) &&
		zone.left >= 0 &&
		zone.right < GRID_COLUMNS &&
		zone.left <= zone.right &&
		zone.top >= 1 &&
		zone.bottom <= GRID_ROWS &&
		zone.top <= zone.bottom
	);
}

function contains(zone: GridZone, column: number, row: number): boolean {
	return column >= zone.left && column <= zone.right && row >= zone.top && row <= zone.bottom;
}

// =============================================================================
// Résoudre
// =============================================================================

/** Le style d'une case : les zones qui la touchent, dans l'ordre, la dernière l'emporte. */
export function styleAt(formats: readonly FormatZone[], column: number, row: number): CellStyle {
	let style: CellStyle = {};
	for (const { zone, patch } of formats) {
		if (contains(zone, column, row)) style = applyPatch(style, patch);
	}
	return style as CellStyle;
}

/** Un style auquel on applique un patch ; `false`/`null` retirent la propriété (défaut). */
export function applyPatch(style: CellStyle, patch: StylePatch): CellStyle {
	const next: Record<string, unknown> = { ...style };
	for (const [key, value] of Object.entries(patch)) {
		if (value === undefined) continue;
		if (value === false || value === null) delete next[key];
		else next[key] = value;
	}
	return next as CellStyle;
}

/** Le patch qui redonne EXACTEMENT ce style (recopie, copier-coller) : le reste au défaut. */
export function patchOf(style: CellStyle): StylePatch {
	return { ...CLEAR_PATCH, ...style };
}

/** Pourquoi ce patch ne peut pas être posé, ou `null`. */
export function patchRefusal(patch: StylePatch): string | null {
	const decimals = patch.number?.decimals;
	if (
		decimals !== undefined &&
		(!Number.isInteger(decimals) || decimals < 0 || decimals > MAX_FORMAT_DECIMALS)
	) {
		return `Le nombre de décimales va de 0 à ${MAX_FORMAT_DECIMALS}.`;
	}
	return null;
}

// =============================================================================
// Afficher
// =============================================================================

/**
 * Une valeur écrite selon son format de nombre (Q-MF-1), arrondie à la moitié
 * loin de zéro comme ARRONDI : `0,33`, `12,5 %`, `12,50 €`. `null` : pas de
 * format, ou ce n'est pas un nombre — la case garde son écriture.
 */
export function formatShown(value: CellValue, style: CellStyle): string | null {
	if (value.kind !== 'number' || style.number === undefined) return null;
	const { kind, decimals } = style.number;
	const options: Intl.NumberFormatOptions = {
		minimumFractionDigits: decimals,
		maximumFractionDigits: decimals,
		roundingMode: 'halfExpand'
	};
	if (kind === 'percent') {
		return new Intl.NumberFormat('fr-FR', { ...options, style: 'percent' }).format(value.value);
	}
	if (kind === 'currency') {
		return new Intl.NumberFormat('fr-FR', {
			...options,
			style: 'currency',
			currency: 'EUR'
		}).format(value.value);
	}
	return new Intl.NumberFormat('fr-FR', options).format(value.value);
}

// =============================================================================
// Ranger
// =============================================================================

export function storedOf(format: FormatZone): StoredFormat {
	return { zone: zoneText(format.zone), ...format.patch };
}

export function formatOf(stored: StoredFormat): FormatZone | null {
	const zone = zoneOf(stored.zone);
	if (zone === null) return null;
	const { zone: _zone, ...patch } = stored;
	return { zone, patch };
}
