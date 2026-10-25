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
 * en noir. Légendes en chaînes Typst littérales : rien n'y est lu comme du
 * balisage. Un bloc en erreur devient le cadre neutre « Monnaie
 * indisponible » — jamais une erreur de compilation (une seule erreur Typst
 * fait échouer toute la fiche).
 *
 * @module ubumark/generators/monnaie-typst
 */

import {
	buildMonnaieScene,
	MONNAIE_LABEL,
	MONNAIE_VIEW,
	type MonnaieItem
} from '../utils/monnaie-scene';
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

const NOTE_FILL = 'luma(240)';
const COIN_FILL = 'luma(215)';
const RING_FILL = 'luma(165)';

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
				label(it.x, it.y, it.width, it.height, `${it.value} €`, l.size),
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
			parts.push(
				place(
					it.x,
					it.y,
					`circle(radius: ${cm(r * k)}, fill: ${ring ? RING_FILL : COIN_FILL}, stroke: ${stroke})`
				)
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
			parts.push(label(it.x, it.y, it.width, it.height, `${it.value} €`, MONNAIE_LABEL.coin.size));
		}
	}
	return parts;
}

/** Typst d'un bloc ```monnaie */
export function generateMonnaieTypst(node: MonnaieNode): string {
	const spec = node.spec;
	if (node.errors.length > 0 || spec === null) return UNAVAILABLE_TYPST;

	const scenes = spec.sets.map((_, i) => buildMonnaieScene(spec, i));
	const wanted = (spec.sizeCm ?? MONNAIE_SIZE_CM.default) / MONNAIE_VIEW.fullWidth;
	// Plusieurs ensembles : réduits ensemble (même échelle), jamais plus larges que la page
	const totalUnits = scenes.reduce((sum, s) => sum + s.width, 0);
	const available = ROW_MAX_CM - GAP_CM * (scenes.length - 1);
	const k = Math.min(wanted, available / totalUnits);

	const captions =
		spec.captions ?? (spec.sets.length > 1 ? MONNAIE_DEFAULT_CAPTIONS.slice() : null);

	const cells = scenes.map((scene, i) => {
		const frame = [
			`#box(width: ${cm(scene.width * k)}, height: ${cm(scene.height * k)}, stroke: 0.5pt + luma(120), radius: 3pt)[`,
			...itemsTypst(scene.items, k),
			']'
		].join('\n');
		const caption = captions?.[i];
		if (caption === undefined || caption === '') return `[${frame}]`;
		// Légende pas plus large que son dessin : une longue légende passe à la ligne au lieu de
		// sortir de la page (la réduction `k` ne compte que les dessins)
		return `[#stack(dir: ttb, spacing: 4pt, box(width: ${cm(scene.width * k)}, align(center, text(size: 9pt, weight: "bold", ${typstString(caption)}))), [${frame}])]`;
	});

	return [
		'#align(center)[#block(breakable: false)[',
		`#stack(dir: ltr, spacing: ${cm(GAP_CM)}, ${cells.join(', ')})`,
		']]'
	].join('\n');
}
