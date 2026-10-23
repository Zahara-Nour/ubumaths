/**
 * Noms des arguments du script dans les consignes de sous-étape.
 *
 * Une consigne désigne les objets passés par le script (« Compas en A »,
 * « coupe (AB) ») par le nom que l'élève lit sur la figure : l'étiquette de
 * l'élément. Un argument caché, sans étiquette ou au nom masqué
 * (`etiquette="aucune"`) n'a pas de nom lisible : la consigne prend une
 * tournure neutre (« sur le point choisi », « la droite »).
 *
 * Les points auxiliaires (Q, R, A′, C*…) et la droite `e` reçoivent leur
 * lettre comme étiquette provisoire (`ctx.auxLabel`, `createAuxLabeler`) :
 * la consigne écrit la lettre que l'élève lit sur la figure.
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

const PRIMES = ['', '′', '″', '‴'];

/** « Q », « Q′ », « Q″ », « Q‴ », puis « Q′′′′ »… */
function withPrimes(stem: string, count: number): string {
	return stem + (PRIMES[count] ?? '′'.repeat(count));
}

/** Sépare « A″ » en { stem: « A », count: 2 }. */
function splitPrimes(base: string): { stem: string; count: number } {
	let stem = base;
	let count = 0;
	for (;;) {
		const last = stem.at(-1);
		const n = last ? PRIMES.indexOf(last) : -1;
		if (n <= 0) return { stem, count };
		count += n;
		stem = stem.slice(0, -1);
	}
}

/**
 * Fabrique `ctx.auxLabel` pour une instruction. Nom rendu pour l'élément
 * `id`, dans l'ordre :
 * 1. son étiquette s'il en a déjà une définitive ;
 * 2. le nom que le script lui donne plus loin (`scriptNamed`, relevé par
 *    une première pré-passe : `O = centre(c)`) ;
 * 3. `base`, ou `base` suivi d'un prime de plus tant que le nom est pris :
 *    étiquette de la figure, nom du script (`reserved`) ou nom déjà rendu
 *    par ce générateur.
 * Le nom est posé comme étiquette provisoire et noté dans `given`.
 */
export function createAuxLabeler(
	figure: Figure,
	reserved: ReadonlySet<string>,
	scriptNamed: ReadonlyMap<string, string>,
	given: Map<string, string>
): (id: string, base: string) => string {
	const rendered = new Set<string>();
	return (id, base) => {
		const label = figure.getElementById(id)?.label;
		if (label && !figure.hasProvisionalLabel(id)) return label;
		let name = scriptNamed.get(id);
		if (!name) {
			const taken = new Set([...reserved, ...rendered]);
			for (const el of figure.getAllElements()) if (el.label) taken.add(el.label);
			const { stem, count } = splitPrimes(base);
			let k = count;
			while (taken.has(withPrimes(stem, k))) k++;
			name = withPrimes(stem, k);
		}
		rendered.add(name);
		given.set(id, name);
		figure.setProvisionalLabel(id, name);
		return name;
	};
}

/**
 * Fabrique `ctx.nameTaken` : `name` est une étiquette de la figure ou un
 * nom déclaré par le script (même plus loin).
 */
export function createNameTaken(
	figure: Figure,
	reserved: ReadonlySet<string>
): (name: string) => boolean {
	return (name) => reserved.has(name) || figure.getAllElements().some((el) => el.label === name);
}

/**
 * Nomme l'élément auxiliaire `id` et pose ce nom sur la figure
 * (`ctx.auxLabel`) : la consigne et l'étiquette disent la même lettre.
 */
export function labelAux(ctx: ChoreographyCtx, id: string, base: string): string {
	return ctx.auxLabel(id, base);
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
