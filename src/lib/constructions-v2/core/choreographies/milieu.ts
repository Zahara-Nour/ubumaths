/**
 * Chorégraphie du builtin `milieu(A, B)` (ou `milieu(s)`) sous `@mesure`.
 *
 * Voie `regle_graduee` (seule, par défaut) : la méthode de 6e.
 *   SS1 — la règle se pose le long de [AB], son 0 sur une extrémité ; on lit
 *         la longueur (arrondie au millimètre, comme l'élève la lit).
 *   SS2 — on divise la valeur lue par 2 ; le crayon va à cette graduation,
 *         la règle reste en place.
 *   SS3 — le milieu apparaît.
 *
 * Le 0 se pose sur l'extrémité la plus à gauche (la plus basse si [AB] est
 * vertical) : les chiffres de la règle se lisent à l'endroit. Le calcul de
 * la consigne part de la valeur lue ; le point, lui, est le milieu exact.
 *
 * Le codage AI = IB (deux marques égales) porte sur le segment [AB] : il
 * n'est posé que si le script trace ce segment (visible). Il est rangé avec
 * les marqueurs d'angle droit des voies `@equerre` : visible en `@complet`,
 * retiré par `-marqueurs`.
 */

import {
	ChoreographyError,
	type ChoreographyFn,
	type SubStep,
	type TraceTag,
	type Voie
} from './types';
import { capitalize, de, nom, role, type Role } from './names';
import type { Figure } from '$lib/geometry-core/graph/figure';
import { isSegment } from '$lib/geometry-core/types/elements';

/** Longueur de la règle (`Ruler.svelte`, `length = 15`), en unités = cm. */
const RULER_LENGTH = 15;

/** Tolérance des comparaisons (unités math). */
const EPS = 1e-9;

/** Nombre écrit à la française, sans zéro inutile : 6,4 · 3,15 · 6. */
function formatCm(value: number): string {
	return value
		.toFixed(2)
		.replace(/\.?0+$/, '')
		.replace('.', ',');
}

/** « AB » si les deux extrémités sont nommées, sinon null. */
function segmentName(a: Role, b: Role): string | null {
	return a.name && b.name ? `${a.name}${b.name}` : null;
}

/** Un segment visible de la figure joint-il A et B (dans un sens ou l'autre) ? */
export function hasVisibleSegment(figure: Figure, Aid: string, Bid: string): boolean {
	return figure
		.getAllElements()
		.some(
			(el) =>
				isSegment(el) &&
				el.visible !== false &&
				((el.startId === Aid && el.endId === Bid) || (el.startId === Bid && el.endId === Aid))
		);
}

/** Mesure de [AB] à la règle graduée : les deux premiers gestes du milieu. */
export interface MesureSegment {
	/** Pose de la règle (lecture), puis crayon à la graduation de la moitié. */
	readonly subSteps: readonly [SubStep, SubStep];
	/** Moitié de la valeur lue, écrite à la française (« 3,2 »). */
	readonly half: string;
	/** L'extrémité où se pose le 0 de la règle. */
	readonly nameO: Role;
	/** Le 0 se pose-t-il sur A (sinon sur B) ? */
	readonly startsAtA: boolean;
}

/**
 * Mesure [AB] comme l'élève : le 0 de la règle sur l'extrémité la plus à
 * gauche (la plus basse si [AB] est vertical), lecture au millimètre, moitié
 * calculée sur la valeur lue. Erreur si la règle lit 0 ou si [AB] dépasse
 * la règle. Partagée par `milieu` et `mediatrice` sous `@mesure`.
 */
export function measureSegment(
	coords: readonly [{ x: number; y: number }, { x: number; y: number }],
	nameA: Role,
	nameB: Role
): MesureSegment {
	const [A, B] = coords;
	const ab = segmentName(nameA, nameB);
	const length = Math.hypot(B.x - A.x, B.y - A.y);
	// Lecture au millimètre ; le calcul de la consigne part de cette valeur.
	// EPS : 6,35 se lit 6,4 malgré l'écriture binaire (63,4999…).
	const read = Math.round(length * 10 + EPS) / 10;

	// Moins d'un demi-millimètre : la règle lit 0, rien à mesurer.
	if (read === 0) {
		const both = nameA.name && nameB.name;
		throw new ChoreographyError(
			`${capitalize(nom(nameA))} et ${nom(nameB)} sont ${both ? 'confondus' : 'confondues'} : il n'y a pas de longueur à mesurer.`
		);
	}
	if (read > RULER_LENGTH) {
		throw new ChoreographyError(
			`${ab ?? 'Le segment'} = ${formatCm(read)} cm : trop long pour la règle de ${RULER_LENGTH} cm, rapprochez les points.`
		);
	}
	const half = read / 2;

	// Origine de la règle : l'extrémité la plus à gauche, la plus basse si
	// le segment est vertical.
	const startsAtA = Math.abs(A.x - B.x) > EPS ? A.x < B.x : A.y < B.y;
	const [O, T] = startsAtA ? [A, B] : [B, A];
	const nameO = startsAtA ? nameA : nameB;
	const rotation = (Math.atan2(T.y - O.y, T.x - O.x) * 180) / Math.PI;
	const ux = (T.x - O.x) / length;
	const uy = (T.y - O.y) / length;
	const mid = { x: O.x + ux * (length / 2), y: O.y + uy * (length / 2) };

	const reading = ab ? `${ab} = ${formatCm(read)} cm` : `la longueur : ${formatCm(read)} cm`;
	return {
		subSteps: [
			{
				kind: 'compass-measure',
				instrument: 'ruler',
				instrumentTarget: { x: O.x, y: O.y, rotation },
				compassRadius: 0,
				geometricDistance: 0,
				animateDrawableIds: [],
				animatePointIds: [],
				animateLineIds: [],
				instruction: `On place le 0 de la règle sur ${nom(nameO)} et on lit ${reading}`
			},
			{
				kind: 'compass-measure',
				instrument: 'pencil',
				secondaryInstrument: 'ruler',
				instrumentTarget: { x: mid.x, y: mid.y, rotation: 0 },
				compassRadius: 0,
				geometricDistance: 0,
				animateDrawableIds: [],
				animatePointIds: [],
				animateLineIds: [],
				instruction: `${formatCm(read)} ÷ 2 = ${formatCm(half)} : on repère la graduation ${formatCm(half)}`
			}
		],
		half: formatCm(half),
		nameO,
		startsAtA
	};
}

const regleGradueeChoreography: ChoreographyFn = (ctx) => {
	const { figure, args, principalId } = ctx;
	const [Aid, Bid] = args.ids;
	const nameA = role(figure, Aid, 'la première extrémité');
	const nameB = role(figure, Bid, 'la seconde extrémité');
	const nameI = role(figure, principalId, 'le milieu');
	const mesure = measureSegment([args.coords[0], args.coords[1]], nameA, nameB);

	// Le builtin crée le milieu visible : il n'apparaît qu'en SS3.
	figure.hideElement(principalId);

	// Codage AI = IB, seulement sur un segment [AB] tracé ; créé caché, la
	// visibilité finale le range en marqueur.
	const marks: string[] = [];
	if (hasVisibleSegment(figure, Aid, Bid)) {
		for (const [from, to] of [
			[Aid, principalId],
			[principalId, Bid]
		]) {
			const mark = figure.createSegmentMark(from, to, { markCount: 2 });
			figure.hideElement(mark);
			marks.push(mark);
		}
	}

	const subSteps: SubStep[] = [
		...mesure.subSteps,
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [principalId],
			animateLineIds: [],
			instruction: `On marque ${nom(nameI)} à ${mesure.half} cm ${de(mesure.nameO)}`
		}
	];

	return {
		subSteps,
		produced: {
			principal: principalId,
			charnieres: [],
			traces: marks,
			traceTags: new Map<string, TraceTag>(marks.map((id) => [id, 'marker']))
		}
	};
};

export const VOIES_MILIEU_MESURE: readonly Voie[] = [
	{
		id: 'regle_graduee',
		nom_humain: 'À la règle graduée',
		source: 'Construction de 6e',
		description:
			'On pose le 0 de la règle sur une extrémité de `[AB]`, on lit la longueur au millimètre, on la divise par 2 et on marque le milieu à cette graduation. Le codage `AI = IB` apparaît en `@complet` si le segment `[AB]` est tracé.',
		defaut: true,
		choreography: regleGradueeChoreography
	}
];
