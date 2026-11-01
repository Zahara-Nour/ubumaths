/**
 * Bloc ```monnaie → Typst
 * =======================
 *
 * Chaque ensemble est dessiné en Typst natif (`rect`, `circle`, `place`,
 * `text`) depuis la MÊME scène que l'écran (`buildMonnaieScene`) : mêmes
 * coupures, mêmes positions. Ni paquet, ni image.
 *
 * Échelle : `taille:` (8 cm par défaut) est la largeur d'un ensemble pleine
 * largeur ; un ensemble plus étroit garde la même échelle. Plusieurs ensembles
 * côte à côte, réduits ensemble s'ils dépassent la page.
 *
 * Noir sur blanc (photocopie) : billets gris très clair, pièces gris clair (la
 * pièce de 2 € a un anneau plus foncé), tout cerné de noir, valeurs écrites
 * en noir. Bloc à construire (`construire:`) : rien d'interactif sur papier
 * (Q9), un cadre vide en pointillés où l'enfant dessine, la réserve en petit
 * au-dessus ; la consigne (« Dessine… ») est dans l'énoncé. Légendes en chaînes Typst littérales : rien n'y est lu comme du
 * balisage. Un bloc en erreur devient le cadre neutre « Monnaie
 * indisponible » — jamais une erreur de compilation (une seule erreur Typst
 * fait échouer toute la fiche).
 *
 * @module ubumark/generators/monnaie-typst
 */

import { coinFamily, denominationLabel } from '../utils/monnaie-valeurs';
import {
	buildMonnaieScene,
	MONNAIE_LABEL,
	MONNAIE_VIEW,
	type MonnaieItem
} from '../utils/monnaie-scene';
import { reserveScene } from '../utils/monnaie-construire';
import {
	MONNAIE_DEFAULT_CAPTIONS,
	MONNAIE_SIZE_CM,
	MONNAIE_UNAVAILABLE,
	type MonnaieNode
} from '../types/monnaie';

// ============================================================================
// CONSTANTES
// ============================================================================

const UNAVAILABLE_TYPST = `#block(stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt)[${MONNAIE_UNAVAILABLE}]`;

/** Largeur que les ensembles d'un bloc ne dépassent pas, espaces compris (cm) */
const ROW_MAX_CM = 16;

/** Espace entre deux ensembles (cm) */
const GAP_CM = 0.6;

/** Colonne d'une légende au-dessus d'un petit dessin (un billet de 5 €) : au moins 3 cm */
const CAPTION_MIN_CM = 3;

const NOTE_FILL = 'luma(240)';
const COIN_FILL = 'luma(215)';
const RING_FILL = 'luma(165)';
/** Pièces de centimes : cuivre (1, 2, 5 c) plus foncé, doré (10, 20, 50 c) plus clair, en gris */
const COPPER_FILL = 'luma(190)';
const GOLD_FILL = 'luma(235)';

/** Bloc à construire : hauteur du cadre vide (part de sa largeur), échelle de la réserve */
const BUILD_FRAME_RATIO = 0.6;
const RESERVE_SCALE = 0.6;

/** 1 cm = 28,35 pt : tailles de texte données en unités de scène */
const PT_PER_CM = 72 / 2.54;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Une chaîne Typst littérale : seuls `\` et `"` s'échappent */
function typstString(text: string): string {
	return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

const cm = (value: number) => `${Number(value.toFixed(4))}cm`;
const pt = (value: number) => `${Number(value.toFixed(2))}pt`;

/** Typst des coupures d'un ensemble, `k` cm par unité de scène */
function itemsTypst(items: MonnaieItem[], k: number): string[] {
	const stroke = `${cm(0.8 * k)} + black`;
	const place = (x: number, y: number, body: string) =>
		`  #place(top + left, dx: ${cm(x * k)}, dy: ${cm(y * k)}, ${body})`;
	/** Un texte centré dans la boîte (x, y, w, h), de `size` unités de scène */
	const label = (x: number, y: number, w: number, h: number, text: string, size: number) =>
		place(
			x,
			y,
			`box(width: ${cm(w * k)}, height: ${cm(h * k)}, align(center + horizon, text(size: ${pt(size * k * PT_PER_CM)}, weight: "bold", ${typstString(text)})))`
		);

	const parts: string[] = [];
	for (const it of items) {
		if (it.kind === 'billet') {
			const l = MONNAIE_LABEL.note;
			parts.push(
				place(
					it.x,
					it.y,
					`rect(width: ${cm(it.width * k)}, height: ${cm(it.height * k)}, radius: ${cm(l.radius * k)}, fill: ${NOTE_FILL}, stroke: ${stroke})`
				),
				label(it.x, it.y, it.width, it.height, denominationLabel(it.value), l.size),
				// La valeur répétée en petit, coin haut gauche et coin bas droit
				label(
					it.x + l.cornerInset,
					it.y + 1,
					l.cornerBox,
					l.cornerBox,
					String(it.value),
					l.cornerSize
				),
				label(
					it.x + it.width - l.cornerInset - l.cornerBox,
					it.y + it.height - 1 - l.cornerBox,
					l.cornerBox,
					l.cornerBox,
					String(it.value),
					l.cornerSize
				)
			);
		} else {
			const r = it.width / 2;
			const ring = it.value === 2;
			const family = coinFamily(it.value);
			const fill = ring
				? RING_FILL
				: family === 'cuivre'
					? COPPER_FILL
					: family === 'dore'
						? GOLD_FILL
						: COIN_FILL;
			parts.push(
				place(it.x, it.y, `circle(radius: ${cm(r * k)}, fill: ${fill}, stroke: ${stroke})`)
			);
			if (ring) {
				const inner = r * MONNAIE_LABEL.coin.innerRatio;
				parts.push(
					place(
						it.cx - inner,
						it.cy - inner,
						`circle(radius: ${cm(inner * k)}, fill: ${COIN_FILL}, stroke: ${cm(0.5 * k)} + black)`
					)
				);
			}
			parts.push(
				label(it.x, it.y, it.width, it.height, denominationLabel(it.value), MONNAIE_LABEL.coin.size)
			);
		}
	}
	return parts;
}

/** Bloc à construire : la réserve en petit, puis le cadre vide en pointillés */
function buildTypst(reserve: number[], widthCm: number): string {
	const scene = reserveScene(reserve);
	const k = (widthCm / MONNAIE_VIEW.fullWidth) * RESERVE_SCALE;
	return [
		'#align(center)[#block(breakable: false)[',
		`#box(width: ${cm(scene.width * k)}, height: ${cm(scene.height * k)})[`,
		...itemsTypst(scene.items, k),
		']',
		'#v(4pt)',
		`#box(width: ${cm(widthCm)}, height: ${cm(widthCm * BUILD_FRAME_RATIO)}, stroke: (paint: luma(120), thickness: 0.5pt, dash: "dashed"), radius: 3pt)`,
		']]'
	].join('\n');
}

/** Typst d'un bloc ```monnaie */
export function generateMonnaieTypst(node: MonnaieNode): string {
	const spec = node.spec;
	if (node.errors.length > 0 || spec === null) return UNAVAILABLE_TYPST;
	if (spec.build !== undefined && spec.reserve !== undefined) {
		return buildTypst(spec.reserve, spec.sizeCm ?? MONNAIE_SIZE_CM.default);
	}

	const scenes = spec.sets.map((_, i) => buildMonnaieScene(spec, i));
	const wanted = (spec.sizeCm ?? MONNAIE_SIZE_CM.default) / MONNAIE_VIEW.fullWidth;
	// Plusieurs ensembles : réduits ensemble (même échelle), jamais plus larges que la page
	const totalUnits = scenes.reduce((sum, s) => sum + s.width, 0);
	const available = ROW_MAX_CM - GAP_CM * (scenes.length - 1);
	const k = Math.min(wanted, available / totalUnits);

	const captions =
		spec.captions ?? (spec.sets.length > 1 ? MONNAIE_DEFAULT_CAPTIONS.slice() : null);

	// Largeur minimale d'une colonne légendée, si la rangée la tient encore
	const widened = scenes.reduce((sum, s) => sum + Math.max(s.width * k, CAPTION_MIN_CM), 0);
	const captionMin = captions !== null && widened <= available ? CAPTION_MIN_CM : 0;

	const cells = scenes.map((scene, i) => {
		const frame = [
			`#box(width: ${cm(scene.width * k)}, height: ${cm(scene.height * k)}, stroke: 0.5pt + luma(120), radius: 3pt)[`,
			...itemsTypst(scene.items, k),
			']'
		].join('\n');
		const caption = captions?.[i];
		if (caption === undefined || caption === '') return `[${frame}]`;
		// Colonne de la largeur du dessin, au moins `captionMin` : une longue légende passe à la
		// ligne au lieu de sortir de la page (la réduction `k` ne compte que les dessins), sans
		// la justification du document qui l'étirait mot à mot
		const column = Math.max(scene.width * k, captionMin);
		return `[#stack(dir: ttb, spacing: 4pt, box(width: ${cm(column)}, { set par(justify: false); align(center, text(size: 9pt, weight: "bold", ${typstString(caption)})) }), align(center, [${frame}]))]`;
	});

	return [
		'#align(center)[#block(breakable: false)[',
		`#stack(dir: ltr, spacing: ${cm(GAP_CM)}, ${cells.join(', ')})`,
		']]'
	].join('\n');
}
