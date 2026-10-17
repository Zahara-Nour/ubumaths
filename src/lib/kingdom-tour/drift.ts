/**
 * La dérive de la roue des publics autour de Père Ubu, sur l'accueil : comme un objet qui
 * flotte sur l'eau. Lente, fluide, irrégulière : des sinus de périodes sans commune mesure
 * (le mouvement ne se répète jamais exactement), plus un léger tangage.
 *
 * Fonctions pures : la géométrie se calcule depuis les mesures de la page, la position
 * depuis le temps. Le composant fait tourner l'horloge (`AudienceWheel.svelte`).
 *
 * @module kingdom-tour/drift
 */

// Types

/** Mesures en pixels : la boîte de Père Ubu et la place libre autour */
export interface DriftMeasures {
	boxWidth: number;
	boxHeight: number;
	/** Largeur du dessin rapportée à celle de la boîte (Père Ubu est plus haut que large) */
	bodyRatio: number;
	/** Place libre entre la boîte et le bord (ou le voisin) de chaque côté */
	roomLeft: number;
	roomRight: number;
	roomAbove: number;
	roomBelow: number;
	/** Diamètre du bouton */
	button: number;
}

export interface DriftGeometry {
	/** Demi-axes de l'ellipse parcourue, depuis le centre de la boîte */
	rx: number;
	ry: number;
	/** Assez de place au-dessus et au-dessous : le bouton fait le tour complet. Sinon il
	 *  dérive sur le flanc droit, sans passer sur la tête de Père Ubu. */
	fullTurn: boolean;
}

export interface DriftPosition {
	/** Décalage depuis le centre de la boîte (y vers le bas) */
	x: number;
	y: number;
	/** Tangage, en degrés */
	tilt: number;
}

// Constantes

/** Respiration du rayon : la position s'écarte d'au plus 8 % de l'ellipse */
const WOBBLE = 0.08;
/** Clapotis vertical maximal, en pixels */
const BOB = 6;
/** Écart minimal entre le bouton et le dessin, ou le bord */
const GAP = 12;

// Functions

const wave = (t: number, period: number, phase = 0) => Math.sin((2 * Math.PI * t) / period + phase);

export function driftGeometry(m: DriftMeasures): DriftGeometry {
	const half = m.button / 2;
	const side = Math.min(m.roomLeft, m.roomRight);
	const below = Math.min(m.roomAbove, m.roomBelow);
	const rxWanted = (m.boxWidth * m.bodyRatio) / 2 + half + GAP;
	const rxMax = (m.boxWidth / 2 + side - half - GAP) / (1 + WOBBLE);
	const ryWanted = m.boxHeight / 2 + half + GAP;
	const ryMax = (m.boxHeight / 2 + below - half - GAP - BOB) / (1 + WOBBLE);
	const fullTurn = ryMax >= ryWanted;
	return {
		// Sur le flanc seulement, le bouton ne doit pas mordre sur le dessin en respirant
		rx: Math.max(0, Math.min(fullTurn ? rxWanted * 1.15 : rxWanted * (1 + WOBBLE), rxMax)),
		ry: fullTurn ? ryWanted : Math.max(0, Math.min(m.boxHeight * 0.35, ryMax)),
		fullTurn
	};
}

/** Position à l'instant `t` (secondes). À t = 0, le bouton est sur le flanc droit. */
export function driftAt(t: number, g: DriftGeometry): DriftPosition {
	const breath = 1 + (WOBBLE / 2) * (wave(t, 13) + wave(t, 29, 2));
	const bob = (BOB / 1.5) * (wave(t, 3.1) + 0.5 * wave(t, 4.9, 1));
	const tilt = 5 * wave(t, 3.7) + 2 * wave(t, 6.1);
	if (!g.fullTurn) {
		// Sans place au-dessus : il monte et descend le long du flanc droit, sans s'en écarter
		const rise = 0.7 * wave(t, 37) + 0.3 * wave(t, 17);
		return { x: g.rx * breath, y: g.ry * rise + bob, tilt };
	}
	// Un tour en 70 s environ, qui ralentit et repart
	const angle = (2 * Math.PI * t) / 70 + 0.25 * wave(t, 23) + 0.2 * wave(t, 41);
	return {
		x: g.rx * breath * Math.cos(angle),
		y: g.ry * breath * Math.sin(angle) + bob,
		tilt
	};
}
