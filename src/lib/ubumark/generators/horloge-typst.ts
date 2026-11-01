/**
 * Bloc ```horloge → Typst
 * =======================
 *
 * Chaque cadran est dessiné en Typst natif (`circle`, `line`, `place`) depuis
 * la MÊME scène que l'écran (`buildHorlogeScene`) : mêmes angles, mêmes
 * chiffres. Ni paquet, ni image : les chiffres prennent la police du document.
 *
 * Noir sur blanc : la petite aiguille se distingue par sa forme (courte,
 * épaisse), la trotteuse aussi (fine, avec un contrepoids), pas par la couleur — une photocopie reste lisible.
 *
 * Légendes en chaînes Typst littérales : rien n'y est lu comme du balisage.
 * Un bloc en erreur devient le cadre neutre « Horloge indisponible » — jamais
 * une erreur de compilation (une seule erreur Typst fait échouer toute la fiche).
 *
 * @module ubumark/generators/horloge-typst
 */

import {
	HORLOGE_FONT,
	HORLOGE_STROKE,
	HORLOGE_VIEW,
	buildHorlogeScene
} from '../utils/horloge-scene';
import {
	HORLOGE_SIZE_CM,
	HORLOGE_UNAVAILABLE,
	type HorlogeNode,
	type HorlogeSpec,
	type HorlogeTime
} from '../types/horloge';

// ============================================================================
// CONSTANTES
// ============================================================================

const UNAVAILABLE_TYPST = `#block(stroke: 0.5pt + luma(160), inset: 6pt, radius: 3pt)[${HORLOGE_UNAVAILABLE}]`;

/** Largeur que les cadrans d'un bloc ne dépassent pas, espaces compris (cm) */
const ROW_MAX_CM = 16;

/** Espace entre deux cadrans (cm) */
const GAP_CM = 0.6;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Une chaîne Typst littérale : seuls `\` et `"` s'échappent */
function typstString(text: string): string {
	return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

const cm = (value: number) => `${Number(value.toFixed(4))}cm`;

/** Typst d'un cadran de `sizeCm` de côté */
function clockTypst(spec: HorlogeSpec, time: HorlogeTime | null, sizeCm: number): string {
	const scene = buildHorlogeScene(spec, time);
	const k = sizeCm / (2 * HORLOGE_VIEW.half);
	/** Scène (centre 0, 0) → coin haut gauche du cadran */
	const at = (v: number) => cm((v + HORLOGE_VIEW.half) * k);
	const stroke = (width: number, paint: string) =>
		`(paint: ${paint}, thickness: ${cm(width * k)}, cap: "round")`;
	const segment = (x1: number, y1: number, x2: number, y2: number, style: string) =>
		`  #place(top + left, line(start: (${at(x1)}, ${at(y1)}), end: (${at(x2)}, ${at(y2)}), stroke: ${style}))`;

	const parts: string[] = [];
	const rim = HORLOGE_VIEW.half - HORLOGE_VIEW.radius;
	parts.push(
		`  #place(top + left, dx: ${cm(rim * k)}, dy: ${cm(rim * k)}, circle(radius: ${cm(HORLOGE_VIEW.radius * k)}, stroke: ${cm(HORLOGE_VIEW.rim * k)} + black))`
	);
	for (const t of scene.ticks) {
		parts.push(
			segment(
				t.x1,
				t.y1,
				t.x2,
				t.y2,
				t.major
					? stroke(HORLOGE_STROKE.majorTick, 'black')
					: stroke(HORLOGE_STROKE.minorTick, 'luma(90)')
			)
		);
	}
	for (const n of scene.numbers) {
		const font = (n.inner ? HORLOGE_FONT.innerNumbers : HORLOGE_FONT.numbers) * k;
		const w = font * 2;
		const h = font * 1.4;
		parts.push(
			`  #place(top + left, dx: ${cm((n.x + HORLOGE_VIEW.half) * k - w / 2)}, dy: ${cm((n.y + HORLOGE_VIEW.half) * k - h / 2)}, box(width: ${cm(w)}, height: ${cm(h)}, align(center + horizon, text(size: ${cm(font)}, fill: ${n.inner ? 'luma(80)' : 'black'})[${n.text}])))`
		);
	}
	if (scene.minuteHand !== null) {
		parts.push(
			segment(
				0,
				0,
				scene.minuteHand.x,
				scene.minuteHand.y,
				stroke(HORLOGE_STROKE.minuteHand, 'black')
			)
		);
	}
	if (scene.hourHand !== null) {
		parts.push(
			segment(0, 0, scene.hourHand.x, scene.hourHand.y, stroke(HORLOGE_STROKE.hourHand, 'black'))
		);
	}
	// Trotteuse : fine, par-dessus, avec son contrepoids
	if (scene.secondHand !== null && scene.secondTail !== null) {
		parts.push(
			segment(
				scene.secondTail.x,
				scene.secondTail.y,
				scene.secondHand.x,
				scene.secondHand.y,
				stroke(HORLOGE_STROKE.secondHand, 'black')
			)
		);
	}
	const dot = HORLOGE_STROKE.center * k;
	parts.push(
		`  #place(top + left, dx: ${cm(HORLOGE_VIEW.half * k - dot)}, dy: ${cm(HORLOGE_VIEW.half * k - dot)}, circle(radius: ${cm(dot)}, fill: black))`
	);

	return [`#box(width: ${cm(sizeCm)}, height: ${cm(sizeCm)})[`, ...parts, ']'].join('\n');
}

/** Typst d'un bloc ```horloge */
export function generateHorlogeTypst(node: HorlogeNode): string {
	const spec = node.spec;
	if (node.errors.length > 0 || spec === null) return UNAVAILABLE_TYPST;

	// Horloge à placer : un cadran sans aiguilles, l'enfant les dessine
	const times: (HorlogeTime | null)[] = spec.placer ? [null] : spec.times;
	const count = times.length;
	const wanted = spec.sizeCm ?? (spec.placer ? HORLOGE_SIZE_CM.placer : HORLOGE_SIZE_CM.default);
	// Plusieurs cadrans : jamais plus larges que la page
	const sizeCm = Math.min(wanted, (ROW_MAX_CM - GAP_CM * (count - 1)) / count);

	const cells = times.map((time, i) => {
		const clock = clockTypst(spec, time, sizeCm);
		const caption = spec.captions?.[i];
		if (caption === undefined || caption === '') return `[${clock}]`;
		return `[#stack(dir: ttb, spacing: 4pt, [${clock}], align(center, text(size: 9pt, ${typstString(caption)})))]`;
	});

	return [
		'#align(center)[#block(breakable: false)[',
		`#stack(dir: ltr, spacing: ${cm(GAP_CM)}, ${cells.join(', ')})`,
		']]'
	].join('\n');
}
