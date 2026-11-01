/**
 * La grande carte du Royaume, pour la section « Six Provinces » de `/royaume`.
 *
 * Coordonnées en pixels du fond `carte-villes-hd.webp` (4356 × 3904) du chantier
 * `illustrations` (`docs/Chiphres/illustrations/carte/`). Les noms reprennent la
 * surcouche validée `carte-royaume.svg`.
 *
 * Surfaces des Provinces (pour teinter la Province lue) : chaque surface est un secteur
 * issu de Sandomir, borné par les deux frontières relevées sur le fond (`carte-royaume.py`)
 * et prolongé au-delà du Royaume ; `KINGDOM_OUTLINE` (le contour du plan schématique,
 * `plan-schematique.py`, mis à l'échelle du fond) le découpe au bord du Royaume.
 */
import type { CitySlug } from './cities';
import type { ProvinceId } from './tour';

// Types

export interface KingdomLabel {
	text: string;
	x: number;
	y: number;
	/** Classe de style : Province, capitale, Sandomir, eau, pays voisin, cartouche */
	kind: 'province' | 'capital' | 'royal' | 'water' | 'neighbour' | 'title';
	anchor?: 'start' | 'end';
	rotate?: number;
}

// Constantes

export const KINGDOM_MAP = {
	width: 4356,
	height: 3904,
	/** Fond sans texte, en deux tailles (téléphone, grand écran) */
	images: [
		{ src: '/images/royaume/carte-royaume-1200.webp', width: 1200 },
		{ src: '/images/royaume/carte-royaume-2400.webp', width: 2400 }
	]
} as const;

export const KINGDOM_OUTLINE =
	'M346,924 L473,881 L809,783 L1077,646 L1228,559 L1462,467 L1724,429 L1798,554 L1814,652 L1948,690 L2150,636 L2451,674 L2786,701 L3222,685 L3457,881 L3591,1017 L3591,1344 L3474,1643 L3356,1807 L3507,1943 L3507,2188 L3658,2515 L3625,2733 L3490,2842 L3289,2951 L3155,3305 L3239,3577 L3138,3561 L2954,3495 L2619,3386 L2317,3495 L2116,3278 L1898,3332 L1814,3114 L1580,3060 L1345,2869 L1228,2951 L1144,3005 L1077,2842 L1010,2706 L775,2624 L550,2586 L591,2297 L507,2215 L524,1943 L457,1643 L323,1507 L406,1262 L356,1044 Z';

/** Secteur de chaque Province, à découper par `KINGDOM_OUTLINE` */
export const PROVINCE_AREAS: Record<ProvinceId, string> = {
	yoyolande:
		'M2390,1724 L2192,1625 L2065,1526 L1945,1477 L1725,1400 L1584,1375 L1528,1371 L1350,1310 L1273,1245 L1132,1117 L990,1047 L792,962 L594,856 L-728,148 L-1858,-438 L-1540,-968 L-1159,-1455 L-720,-1891 L-232,-2269 L300,-2585 L866,-2832 L1459,-3008 L2069,-3109 L2308,-781 L2602,690 L2645,905 L2687,1075 L2655,1260 L2590,1420 L2602,1650 A237,237 0 0 0 2390,1724 Z',
	bedonstan:
		'M2602,1650 L2590,1420 L2655,1260 L2687,1075 L2645,905 L2602,690 L2308,-781 L2069,-3109 L2976,-3119 L3871,-2966 L4722,-2653 L5504,-2191 L6189,-1596 L6755,-887 L7183,-87 L7460,778 L4945,1338 L3470,1612 L3400,1625 L3200,1700 L3000,1735 L2860,1770 A216,216 0 0 0 2602,1650 Z',
	glitchistan:
		'M2860,1770 L3000,1735 L3200,1700 L3400,1625 L3470,1612 L4945,1338 L7460,778 L7575,1645 L7537,2520 L7347,3374 L7011,4182 L6539,4919 L5945,5563 L5249,6093 L4471,6494 L3807,4869 L3136,3527 L3107,3469 L3040,3356 L2975,3250 L2950,3120 L2900,3000 L2850,2886 L2795,2740 L2793,2573 L2779,2375 L2730,2205 L2694,2085 A296,296 0 0 0 2860,1770 Z',
	patatovie:
		'M2694,2085 L2730,2205 L2779,2375 L2793,2573 L2795,2740 L2850,2886 L2900,3000 L2950,3120 L2975,3250 L3040,3356 L3107,3469 L3136,3527 L3807,4869 L4471,6494 L3951,6673 L3415,6795 L2869,6857 L2320,6858 L1773,6799 L1236,6681 L716,6505 L218,6272 L1179,4479 L1770,3100 L1800,3030 L1867,2889 L1990,2780 L2100,2690 L2230,2560 L2263,2432 L2319,2290 L2454,2050 A248,248 0 0 0 2694,2085 Z',
	nombrilie:
		'M2454,2050 L2319,2290 L2263,2432 L2230,2560 L2100,2690 L1990,2780 L1867,2889 L1800,3030 L1770,3100 L1179,4479 L218,6272 L-202,6020 L-595,5727 L-958,5398 L-1287,5034 L-1579,4641 L-1831,4220 L-2040,3777 L-2205,3316 L-910,2923 L552,2587 L778,2535 L990,2455 L1301,2389 L1480,2300 L1655,2177 L1810,2106 L1966,2092 L2135,2035 L2192,1937 L2362,1901 A224,224 0 0 0 2454,2050 Z',
	pifometrie:
		'M2362,1901 L2192,1937 L2135,2035 L1966,2092 L1810,2106 L1655,2177 L1480,2300 L1301,2389 L990,2455 L778,2535 L552,2587 L-910,2923 L-2205,3316 L-2323,2847 L-2394,2369 L-2420,1887 L-2399,1405 L-2331,926 L-2218,457 L-2059,1 L-1858,-438 L-728,148 L594,856 L792,962 L990,1047 L1132,1117 L1273,1245 L1350,1310 L1528,1371 L1584,1375 L1725,1400 L1945,1477 L2065,1526 L2192,1625 L2390,1724 A221,221 0 0 0 2362,1901 Z'
};

/** Le nom de chaque Province, posé au milieu de sa surface */
export const PROVINCE_LABELS: Record<ProvinceId, KingdomLabel> = {
	yoyolande: { text: 'YOYOLANDE', x: 2100, y: 1300, kind: 'province' },
	bedonstan: { text: 'BEDONSTAN', x: 3050, y: 1480, kind: 'province' },
	glitchistan: { text: 'GLITCHISTAN', x: 3150, y: 2560, kind: 'province' },
	patatovie: { text: 'PATATOVIE', x: 2560, y: 3200, kind: 'province' },
	nombrilie: { text: 'NOMBRILIE', x: 1980, y: 2330, kind: 'province' },
	pifometrie: { text: 'PIFOMÉTRIE', x: 980, y: 2130, kind: 'province' }
};

/** Le nom de chaque ville, Sandomir comprise */
export const CITY_LABELS: Record<CitySlug, KingdomLabel> = {
	sandomir: { text: 'Sandomir', x: 2613, y: 1615, kind: 'royal' },
	sinusborg: { text: 'Sinusborg', x: 1900, y: 890, kind: 'capital' },
	lobatchevsk: { text: 'Lobatchevsk', x: 2810, y: 1335, kind: 'capital' },
	turingrad: { text: 'Turingrad', x: 3150, y: 2230, kind: 'capital' },
	cracovenn: { text: 'Cracovenn', x: 2110, y: 3010, kind: 'capital', anchor: 'end' },
	'empoche-les-bains': { text: 'Empoche-les-Bains', x: 1520, y: 2700, kind: 'capital' },
	'bonneteau-sur-vistule': { text: 'Bonneteau-sur-Vistule', x: 1180, y: 1910, kind: 'capital' }
};

/** Les autres noms, qui ne mènent nulle part */
export const OTHER_LABELS: KingdomLabel[] = [
	{ text: 'Mer Baltique', x: 1000, y: 470, kind: 'water' },
	{ text: 'Vistule', x: 2660, y: 2830, kind: 'water', rotate: -10 },
	{ text: 'Pythagoriades', x: 3080, y: 1010, kind: 'neighbour' },
	{ text: 'Lithuanie', x: 3950, y: 520, kind: 'neighbour' },
	{ text: 'Empire du Czar', x: 3960, y: 2000, kind: 'neighbour' },
	{ text: 'Isle de la Réunion', x: 3781, y: 3010, kind: 'capital' },
	{ text: 'Pataphysique', x: 3781, y: 3090, kind: 'capital' },
	{ text: 'ROYAUME DE POLOGNE', x: 817, y: 3395, kind: 'title' }
];
