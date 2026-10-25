/**
 * Bloc ```collection → Typst
 * ==========================
 *
 * Chaque collection est dessinée en Typst natif (`rect`, `circle`, `line`,
 * `place`) depuis la MÊME scène que l'écran (`buildCollectionScene`) : mêmes
 * objets, mêmes positions. Ni paquet, ni image.
 *
 * Échelle : `taille:` (6 cm par défaut) est la largeur d'une collection pleine
 * largeur ; une collection plus étroite garde la même échelle. Plusieurs
 * collections côte à côte, réduites ensemble si elles dépassent la page.
 *
 * Noir sur blanc (photocopie) : objets gris clair cernés de noir.
 * Légendes en chaînes Typst littérales : rien n'y est lu comme du balisage.
 * Un bloc en erreur devient le cadre neutre « Collection indisponible » —
 * jamais une erreur de compilation (une seule erreur Typst fait échouer toute
 * la fiche).
 *
 * @module ubumark/generators/collection-typst
 */

import {
	buildCollectionScene,
	COLLECTION_VIEW,
	type CollectionItem
} from '../utils/collection-scene';
import {
	COLLECTION_DEFAULT_CAPTIONS,
	COLLECTION_SIZE_CM,
	COLLECTION_UNAVAILABLE,
	type CollectionNode
} from '../types/collection';

// ============================================================================
// CONSTANTES
// ============================================================================

const UNAVAILABLE_TYPST = `#block(stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt)[${COLLECTION_UNAVAILABLE}]`;

/** Largeur que les collections d'un bloc ne dépassent pas, espaces compris (cm) */
const ROW_MAX_CM = 16;

/** Espace entre deux collections (cm) */
const GAP_CM = 0.6;

const OBJECT_FILL = 'luma(215)';

// ============================================================================
// FONCTIONS
// ============================================================================

/** Une chaîne Typst littérale : seuls `\` et `"` s'échappent */
function typstString(text: string): string {
	return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

const cm = (value: number) => `${Number(value.toFixed(4))}cm`;

/** Typst des objets d'une collection, `k` cm par unité de scène */
function itemsTypst(items: CollectionItem[], k: number): string[] {
	const stroke = `${cm(0.8 * k)} + black`;
	const place = (x: number, y: number, body: string) =>
		`  #place(top + left, dx: ${cm(x * k)}, dy: ${cm(y * k)}, ${body})`;
	const disc = (cx: number, cy: number) => {
		const r = COLLECTION_VIEW.object / 2;
		return place(
			cx - r,
			cy - r,
			`circle(radius: ${cm(r * k)}, fill: ${OBJECT_FILL}, stroke: ${stroke})`
		);
	};

	const parts: string[] = [];
	for (const item of items) {
		switch (item.kind) {
			case 'jeton':
				parts.push(disc(item.cx, item.cy));
				break;
			case 'cube':
				parts.push(
					place(
						item.x,
						item.y,
						`rect(width: ${cm(item.width * k)}, height: ${cm(item.height * k)}, fill: ${OBJECT_FILL}, stroke: ${stroke})`
					)
				);
				break;
			case 'barre': {
				parts.push(
					place(
						item.x,
						item.y,
						`rect(width: ${cm(item.width * k)}, height: ${cm(item.height * k)}, fill: ${OBJECT_FILL}, stroke: ${stroke})`
					)
				);
				// Les 9 séparations : on voit les 10 cubes de la barre
				const cubeHeight = item.height / 10;
				for (let i = 1; i < 10; i++) {
					const y = item.y + i * cubeHeight;
					parts.push(
						`  #place(top + left, line(start: (${cm(item.x * k)}, ${cm(y * k)}), end: (${cm((item.x + item.width) * k)}, ${cm(y * k)}), stroke: ${cm(0.5 * k)} + black))`
					);
				}
				break;
			}
			case 'paquet':
				parts.push(
					place(
						item.x,
						item.y,
						`rect(width: ${cm(item.width * k)}, height: ${cm(item.height * k)}, radius: ${cm(6 * k)}, stroke: ${stroke})`
					)
				);
				for (const j of item.jetons ?? []) parts.push(disc(j.cx, j.cy));
				break;
		}
	}
	return parts;
}

/** Typst d'un bloc ```collection */
export function generateCollectionTypst(node: CollectionNode): string {
	const spec = node.spec;
	if (node.errors.length > 0 || spec === null) return UNAVAILABLE_TYPST;

	const scenes = spec.sets.map((_, i) => buildCollectionScene(spec, i));
	const wanted = (spec.sizeCm ?? COLLECTION_SIZE_CM.default) / COLLECTION_VIEW.fullWidth;
	// Plusieurs collections : réduites ensemble (même échelle), jamais plus larges que la page
	const totalUnits = scenes.reduce((sum, s) => sum + s.width, 0);
	const available = ROW_MAX_CM - GAP_CM * (scenes.length - 1);
	const k = Math.min(wanted, available / totalUnits);

	const captions =
		spec.captions ?? (spec.sets.length > 1 ? COLLECTION_DEFAULT_CAPTIONS.slice() : null);

	const cells = scenes.map((scene, i) => {
		const frame = [
			`#box(width: ${cm(scene.width * k)}, height: ${cm(scene.height * k)}, stroke: 0.5pt + luma(120), radius: 3pt)[`,
			...itemsTypst(scene.items, k),
			']'
		].join('\n');
		const caption = captions?.[i];
		if (caption === undefined || caption === '') return `[${frame}]`;
		return `[#stack(dir: ttb, spacing: 4pt, align(center, text(size: 9pt, weight: "bold", ${typstString(caption)})), [${frame}])]`;
	});

	return [
		'#align(center)[#block(breakable: false)[',
		`#stack(dir: ltr, spacing: ${cm(GAP_CM)}, ${cells.join(', ')})`,
		']]'
	].join('\n');
}
