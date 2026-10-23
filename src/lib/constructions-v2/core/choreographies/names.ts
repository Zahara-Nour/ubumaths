/**
 * Noms des arguments du script dans les consignes de sous-étape.
 *
 * Une consigne désigne les objets passés par le script (« Compas en A »,
 * « coupe (AB) ») par le nom que l'élève lit sur la figure : l'étiquette de
 * l'élément. Un argument caché, sans étiquette ou au nom masqué
 * (`etiquette="aucune"`) n'a pas de nom lisible : la consigne prend une
 * tournure neutre (« sur le point choisi », « la droite »).
 *
 * Les points auxiliaires créés par la chorégraphie (Q, R, A′, C*…) gardent
 * leurs lettres écrites en dur dans les gabarits.
 */

import type { Figure } from '$lib/geometry-core/graph/figure';
import { isAngle } from '$lib/geometry-core/types/elements';
import type { ChoreographyCtx } from './types';

/** Un argument de la consigne : son nom affiché, ou sa tournure neutre. */
export interface Role {
	/** Étiquette lisible sur la figure ; null = tournure neutre. */
	readonly name: string | null;
	/** Groupe nominal employé sans nom, avec article (« le point choisi »). */
	readonly neutral: string;
}

/**
 * Étiquette affichée d'un élément, ou null s'il est caché, sans nom ou au
 * nom masqué. Un angle n'affiche son nom qu'en `showLabel` « nom » ou
 * « mesure+nom ».
 */
export function shownName(figure: Figure, id: string | undefined): string | null {
	if (!id) return null;
	const el = figure.getElementById(id);
	if (!el || el.visible === false || el.labelHidden || !el.label) return null;
	if (isAngle(el) && el.showLabel !== 'nom' && el.showLabel !== 'mesure+nom') return null;
	return el.label;
}

/** Rôle d'un argument : nom affiché de `id`, sinon `neutral`. */
export function role(figure: Figure, id: string | undefined, neutral: string): Role {
	return { name: shownName(figure, id), neutral };
}

/** Rôle d'un point auxiliaire de la chorégraphie : toujours sa lettre. */
export function fixed(name: string): Role {
	return { name, neutral: name };
}

/** « A » ou « le point choisi ». */
export function nom(r: Role): string {
	return r.name ?? r.neutral;
}

/** « en A » ou « sur le point choisi ». */
export function en(r: Role): string {
	return r.name ? `en ${r.name}` : `sur ${r.neutral}`;
}

/** « de A » ou « du point choisi » (contraction de l'article). */
export function de(r: Role): string {
	if (r.name) return `de ${r.name}`;
	if (r.neutral.startsWith('le ')) return `du ${r.neutral.slice(3)}`;
	if (r.neutral.startsWith('les ')) return `des ${r.neutral.slice(4)}`;
	return `de ${r.neutral}`;
}

/** « à A » ou « au point choisi » (contraction de l'article). */
export function prepA(r: Role): string {
	if (r.name) return `à ${r.name}`;
	if (r.neutral.startsWith('le ')) return `au ${r.neutral.slice(3)}`;
	if (r.neutral.startsWith('les ')) return `aux ${r.neutral.slice(4)}`;
	return `à ${r.neutral}`;
}

/**
 * Ce que prend le compas posé sur `from` : « la mesure |AB| », ou, sans les
 * deux noms, « l'écart jusqu'au point choisi ».
 */
export function mesure(from: Role, to: Role): string {
	if (from.name && to.name) return `la mesure |${from.name}${to.name}|`;
	return `l'écart jusqu'${prepA(to)}`;
}

/** Première lettre en majuscule (tournure neutre en tête de phrase). */
export function capitalize(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Droite d'appui notée par deux points : le nom de d (forme `(P, d)`), sinon
 * « (AB) » si les deux points sont nommés, sinon `neutral`.
 */
export function droite(a: Role, b: Role, lineName?: string, neutral = 'la droite'): Role {
	if (lineName) return { name: lineName, neutral };
	if (a.name && b.name) return { name: `(${a.name}${b.name})`, neutral };
	return { name: null, neutral };
}

/**
 * Points porteurs A, B de la droite d'appui (`parallele` / `perpendiculaire`).
 * Un point sans nom a été révélé par « On choisit un point de la droite »
 * (`reveal-points.ts`) : c'est « le point choisi » ; quand la voie utilise
 * les deux et qu'aucun n'est nommé, « le premier » / « le second point
 * choisi ».
 */
export function carriers(
	figure: Figure,
	idA: string,
	idB: string,
	bothUsed: boolean
): { A: Role; B: Role } {
	const a = shownName(figure, idA);
	const b = shownName(figure, idB);
	const two = bothUsed && !a && !b;
	return {
		A: { name: a, neutral: two ? 'le premier point choisi' : 'le point choisi' },
		B: { name: b, neutral: two ? 'le second point choisi' : 'le point choisi' }
	};
}

/**
 * Rôles de `parallele` / `perpendiculaire` `(P, A, B)` : le point de passage
 * P, les points porteurs A, B et la droite d'appui d (nom de d en forme
 * `(P, d)`, sinon « (AB) », sinon « la droite »).
 */
export function lineFormRoles(
	ctx: ChoreographyCtx,
	bothUsed: boolean
): { P: Role; A: Role; B: Role; d: Role } {
	const [Pid, Aid, Bid] = ctx.args.ids;
	const { A, B } = carriers(ctx.figure, Aid, Bid, bothUsed);
	return {
		P: role(ctx.figure, Pid, 'le point de passage'),
		A,
		B,
		d: droite(A, B, ctx.args.lineName)
	};
}
