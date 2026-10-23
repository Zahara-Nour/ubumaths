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
 * Le codage AI = IB (deux marques égales) est rangé avec les marqueurs
 * d'angle droit des voies `@equerre` : visible en `@complet`, retiré par
 * `-marqueurs`.
 */

import {
	ChoreographyError,
	type ChoreographyFn,
	type SubStep,
	type TraceTag,
	type Voie
} from './types';
import { capitalize, de, nom, role, type Role } from './names';

/** Longueur de la règle (`Ruler.svelte`, `length = 15`), en unités = cm. */
const RULER_LENGTH = 15;

/** Tolérance des comparaisons de longueur (unités math). */
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

const regleGradueeChoreography: ChoreographyFn = (ctx) => {
	const { figure, args, principalId } = ctx;
	const [Aid, Bid] = args.ids;
	const [A, B] = args.coords;
	const nameA = role(figure, Aid, 'la première extrémité');
	const nameB = role(figure, Bid, 'la seconde extrémité');
	const nameI = role(figure, principalId, 'le milieu');
	const ab = segmentName(nameA, nameB);
	const length = Math.hypot(B.x - A.x, B.y - A.y);

	if (length < EPS) {
		throw new ChoreographyError(
			`${capitalize(nom(nameA))} et ${nom(nameB)} sont confondus : il n'y a pas de longueur à mesurer.`
		);
	}
	// Lecture au millimètre ; le calcul de la consigne part de cette valeur.
	const read = Math.round(length * 10) / 10;
	if (length > RULER_LENGTH + EPS) {
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

	// Le builtin crée le milieu visible : il n'apparaît qu'en SS3.
	figure.hideElement(principalId);

	// Codage AI = IB, créé caché ; la visibilité finale le range en marqueur.
	const markAI = figure.createSegmentMark(Aid, principalId, { markCount: 2 });
	figure.hideElement(markAI);
	const markIB = figure.createSegmentMark(principalId, Bid, { markCount: 2 });
	figure.hideElement(markIB);

	const reading = ab ? `${ab} = ${formatCm(read)} cm` : `la longueur : ${formatCm(read)} cm`;
	const subSteps: SubStep[] = [
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
		},
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [principalId],
			animateLineIds: [],
			instruction: `On marque ${nom(nameI)} à ${formatCm(half)} cm ${de(nameO)}`
		}
	];

	return {
		subSteps,
		produced: {
			principal: principalId,
			charnieres: [],
			traces: [markAI, markIB],
			traceTags: new Map<string, TraceTag>([
				[markAI, 'marker'],
				[markIB, 'marker']
			])
		}
	};
};

export const VOIES_MILIEU_MESURE: readonly Voie[] = [
	{
		id: 'regle_graduee',
		nom_humain: 'À la règle graduée',
		source: 'Construction de 6e',
		description:
			'On pose le 0 de la règle sur une extrémité de `[AB]`, on lit la longueur au millimètre, on la divise par 2 et on marque le milieu à cette graduation. Le codage `AI = IB` apparaît en `@complet`.',
		defaut: true,
		choreography: regleGradueeChoreography
	}
];
