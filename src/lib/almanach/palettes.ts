/**
 * Ambiances des mois de l'Almanach : halo (3 teintes animées) et traits de Père Ubu,
 * en clair et en sombre.
 *
 * Valeurs validées par David (planche « Almanach de l'accueil », 2026-10-04),
 * reprises telles quelles. Le contraste traits / corps noir d'Ubu (#080808) est
 * vérifié ≥ 3:1 par test.
 *
 * @module almanach/palettes
 */

import type { MonthIndex, PataphysicalDate } from './calendar';

// =============================================================================
// Types
// =============================================================================

export interface ModePalette {
	/** Halo : trois teintes parcourues par l'animation */
	h1: string;
	h2: string;
	h3: string;
	/** Traits jaunes du dessin de Père Ubu */
	stroke: string;
}

export interface MonthPalette {
	/** Le phénomène sensible du mois, en une ligne */
	ambiance: string;
	light: ModePalette;
	dark: ModePalette;
}

// =============================================================================
// Constantes
// =============================================================================

/** Corps noir du dessin de Père Ubu (fill du chemin principal) */
export const UBU_BODY_COLOR = '#080808';

/** Index = MonthIndex (0 = Ambraire … 6 = Auguste) */
export const MONTH_PALETTES: readonly MonthPalette[] = [
	{
		ambiance: 'L’ambre de l’automne, les ors qui s’éteignent',
		light: {
			h1: 'rgba(252,143,27,.42)',
			h2: 'rgba(180,83,9,.40)',
			h3: 'rgba(252,211,77,.45)',
			stroke: '#ffcf33'
		},
		dark: {
			h1: 'rgba(245,158,11,.50)',
			h2: 'rgba(198,97,64,.50)',
			h3: 'rgba(255,196,0,.45)',
			stroke: '#ffcf33'
		}
	},
	{
		ambiance: 'Le givre des premiers froids',
		light: {
			h1: 'rgba(147,197,253,.50)',
			h2: 'rgba(199,210,254,.50)',
			h3: 'rgba(186,230,253,.55)',
			stroke: '#cfe8ff'
		},
		dark: {
			h1: 'rgba(96,165,250,.45)',
			h2: 'rgba(165,180,252,.45)',
			h3: 'rgba(224,242,254,.35)',
			stroke: '#cfe8ff'
		}
	},
	{
		ambiance: 'Le claquement de dents, le froid extrême',
		light: {
			h1: 'rgba(96,165,250,.45)',
			h2: 'rgba(129,140,248,.40)',
			h3: 'rgba(226,232,240,.70)',
			stroke: '#e6f2ff'
		},
		dark: {
			h1: 'rgba(59,130,246,.45)',
			h2: 'rgba(165,180,252,.40)',
			h3: 'rgba(248,250,252,.30)',
			stroke: '#e6f2ff'
		}
	},
	{
		ambiance: 'Le dégel, l’eau qui retrouve sa fluidité',
		light: {
			h1: 'rgba(94,234,212,.45)',
			h2: 'rgba(125,211,252,.45)',
			h3: 'rgba(167,243,208,.50)',
			stroke: '#a7f3e4'
		},
		dark: {
			h1: 'rgba(45,212,191,.40)',
			h2: 'rgba(56,189,248,.40)',
			h3: 'rgba(110,231,183,.40)',
			stroke: '#a7f3e4'
		}
	},
	{
		ambiance: 'L’aurore qui revient, les jours qui rallongent',
		light: {
			h1: 'rgba(253,164,175,.50)',
			h2: 'rgba(253,186,116,.50)',
			h3: 'rgba(196,181,253,.50)',
			stroke: '#ffd1dc'
		},
		dark: {
			h1: 'rgba(244,114,182,.40)',
			h2: 'rgba(251,146,60,.42)',
			h3: 'rgba(167,139,250,.40)',
			stroke: '#ffd1dc'
		}
	},
	{
		ambiance: 'La lumière en plénitude, l’éclat printanier',
		light: {
			h1: 'rgba(253,224,71,.50)',
			h2: 'rgba(254,240,138,.60)',
			h3: 'rgba(251,146,60,.40)',
			stroke: '#fff3a0'
		},
		dark: {
			h1: 'rgba(250,204,21,.45)',
			h2: 'rgba(254,240,138,.35)',
			h3: 'rgba(251,146,60,.45)',
			stroke: '#fff3a0'
		}
	},
	{
		ambiance: 'Le mois auguste, majestueux et solaire',
		light: {
			h1: 'rgba(251,146,60,.50)',
			h2: 'rgba(245,158,11,.50)',
			h3: 'rgba(239,68,68,.35)',
			stroke: '#ffd166'
		},
		dark: {
			h1: 'rgba(249,115,22,.50)',
			h2: 'rgba(255,196,0,.45)',
			h3: 'rgba(220,38,38,.40)',
			stroke: '#ffd166'
		}
	}
];

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Mois dont un jour prend l'ambiance.
 *
 * Choix (2026-10-04) : un jour hors-mois prend l'ambiance du mois qui le
 * PRÉCÈDE. La Cloche du Grand Reset clôt l'An qui s'achève (elle sonne « une
 * fois pour chaque mois écoulé ») : elle garde l'or d'Auguste, et la rentrée
 * du lendemain bascule en Ambraire. Le Surnuméraire n'est encore « ni de
 * l'hiver ni du printemps » : il garde le dégel de Déglaçose, et l'aurore
 * n'arrive qu'avec le 1 Auroral. Une seule règle pour les deux jours.
 */
export function ambianceMonthIndex(p: PataphysicalDate): MonthIndex {
	if (p.kind === 'month') return p.monthIndex;
	return p.extraDay === 'cloche' ? 6 : 3;
}

/**
 * Variables CSS d'un mois : chaque teinte est un `light-dark()`, résolu par le
 * `color-scheme` que pose mode-watcher (le choix de l'utilisateur, pas l'OS).
 *
 * À ne pas relire dans des `@keyframes` : Safari ne résout `light-dark()` qu'à
 * partir de 17.5. L'accueil, qui anime son halo, passe donc les teintes claires
 * et sombres séparément et choisit par la classe `.dark`.
 */
export function paletteCssVars(monthIndex: MonthIndex): {
	halo1: string;
	halo2: string;
	halo3: string;
	stroke: string;
} {
	const { light, dark } = MONTH_PALETTES[monthIndex];
	const ld = (a: string, b: string): string => (a === b ? a : `light-dark(${a}, ${b})`);
	return {
		halo1: ld(light.h1, dark.h1),
		halo2: ld(light.h2, dark.h2),
		halo3: ld(light.h3, dark.h3),
		stroke: ld(light.stroke, dark.stroke)
	};
}

// =============================================================================
// Hero de /almanach : lisibilité du texte posé sur le halo
// =============================================================================

/** Opacité du halo du mois derrière la date du jour (page /almanach) */
export const HERO_HALO_OPACITY = 0.9;

/**
 * Opacité du voile couleur carte (`--color-card`) posé entre le halo et le texte
 * du hero. Le test `hero-contrast.test.ts` vérifie ≥ 4,5:1 pour les 7 mois × 2 thèmes.
 */
export const HERO_VEIL_OPACITY = 0.7;
