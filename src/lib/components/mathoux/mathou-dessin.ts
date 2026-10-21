/**
 * Dessin d'un Mathou, direction « AB3 » : le chat-poire bonhomme-digne, gidouille sur la panse,
 * trait souple et aplats, sur une affiche jaune avec auréole (viewBox 200 × 200).
 *
 * Fonctions pures : elles rendent des chemins SVG et des couleurs ; MathouAvatar.svelte assemble.
 * Le gabarit dépend du stade (la panse gonfle, la tête rapetisse) ; la race ne change que les
 * couleurs et le motif. Référence : l'exploration graphique v3 (gen.mjs, `pearCat`, `face`, `eye3`).
 */

import { CHAT_NOIR, type MathouRace, type MathouStage } from './mathou-races';

// Types
export interface Ellipse {
	cx: number;
	cy: number;
	rx: number;
	ry: number;
	rotate: number;
}

/** Calque de motif, découpé par le corps */
export interface Layer {
	d: string;
	fill: string;
	opacity?: number;
	stroke?: string;
	width?: number;
}

export interface StageTemplate {
	top: number;
	bot: number;
	/** Demi-largeur de la tête */
	hw: number;
	/** Demi-largeur de la panse */
	bw: number;
	/** Rayon et nombre de tours de la gidouille */
	gid: [number, number];
	eye: number;
	foot: number;
	/** 1 = chaton (pieds en dedans et dépareillés, grands yeux), 0 = adulte ; entre les deux pendant
	 * qu'il grandit */
	youth: number;
}

export interface PearGeometry {
	stage: StageTemplate;
	body: string;
	/** Hauteur des épaules, de la panse au plus large */
	shoulderY: number;
	waistY: number;
	/** Centre de la tête */
	hx: number;
	hy: number;
	ears: string;
	earsInner: [string, string];
	earsOuter: [string, string];
	tail: string;
	feet: Ellipse[];
	gidouille: string;
	shade: string;
}

export interface EyeDrawing {
	shape: string;
	pupil: { cx: number; cy: number; rx: number; ry: number };
	glint: { cx: number; cy: number; r: number } | null;
	lid: { x: number; y: number; width: number; height: number; line: string } | null;
	/** Fourrure autour de l'œil (couleur de la paupière) */
	fur: string;
	outline: boolean;
}

export type FaceMode = 'open' | 'proud' | 'closed';

export interface FaceDrawing {
	eyes: EyeDrawing[];
	closedEyes: { d: string; color: string }[];
	brows: { d: string; color: string }[];
	browWidth: number;
	nose: string;
	noseFill: string;
	mouth: string;
	mouthColor: string;
	whiskers: string;
	innerWhiskers: string | null;
}

export interface Dressing {
	layers: Layer[];
	/** Dégradé du fumé (couleur du sous-poil clair), sinon null */
	smoke: string | null;
	ears: [string, string];
	earsInner: [string, string];
	tail: string;
	tailRings: string | null;
	tailTip: string | null;
	feet: [string, string];
	/** Fourrure autour de chaque œil, et du museau */
	eyeFur: [string, string];
	muzzle: string;
	gidouille: { color: string; width: number };
	shadeFill: string;
	shadeOpacity: number;
}

// Constantes
export const INK = CHAT_NOIR.noir;
export const CREAM = CHAT_NOIR.creme;
export const YELLOW = CHAT_NOIR.jaune;
export const RED = CHAT_NOIR.rouge;
/** Silhouette « à découvrir » : un sable éteint, aucune couleur de race */
export const SILHOUETTE_FILL = 'hsl(40, 28%, 58%)';
export const SILHOUETTE_LINE = 'hsl(40, 25%, 46%)';

const STAGES: Record<MathouStage, StageTemplate> = {
	chaton: { top: 58, bot: 174, hw: 38, bw: 48, gid: [19, 2], eye: 6, foot: 10.5, youth: 1 },
	matou: { top: 38, bot: 178, hw: 26, bw: 64, gid: [32, 3], eye: 4.4, foot: 13, youth: 0 },
	grand_matou: {
		top: 50,
		bot: 180,
		hw: 20,
		bw: 82,
		gid: [44, 3.6],
		eye: 3.6,
		foot: 15,
		youth: 0
	}
};

// Functions
const r1 = (n: number): number => Math.round(n * 10) / 10;
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Les mesures d'un stade */
export function stageTemplate(stage: MathouStage): StageTemplate {
	return STAGES[stage];
}

/** Mesures intermédiaires entre deux stades (t = 0 : `from`, t = 1 : `to`) : le Mathou qui grandit */
export function blendStages(from: StageTemplate, to: StageTemplate, t: number): StageTemplate {
	return {
		top: lerp(from.top, to.top, t),
		bot: lerp(from.bot, to.bot, t),
		hw: lerp(from.hw, to.hw, t),
		bw: lerp(from.bw, to.bw, t),
		gid: [lerp(from.gid[0], to.gid[0], t), lerp(from.gid[1], to.gid[1], t)],
		eye: lerp(from.eye, to.eye, t),
		foot: lerp(from.foot, to.foot, t),
		youth: lerp(from.youth, to.youth, t)
	};
}

/** Luminosité (0..100) d'une couleur `hsl(h, s%, l%)` ; 50 si illisible */
export function lightness(color: string): number {
	const match = /([\d.]+)%\s*\)\s*$/.exec(color);
	return match ? Number(match[1]) : 50;
}

const isDark = (color: string): boolean => lightness(color) < 36;
/** Trait lisible posé sur une fourrure : jaune sur sombre (comme le Chat Noir), encre sinon */
const lineOn = (fur: string): string => (isDark(fur) ? YELLOW : INK);

/** Ellipse en chemin (pour être découpée et mêlée aux autres calques) */
export function ellipsePath(cx: number, cy: number, rx: number, ry: number, rotate = 0): string {
	const a = (rotate * Math.PI) / 180;
	const dx = r1(rx * Math.cos(a));
	const dy = r1(rx * Math.sin(a));
	return `M${r1(cx - dx)} ${r1(cy - dy)}A${rx} ${ry} ${rotate} 1 0 ${r1(cx + dx)} ${r1(cy + dy)}A${rx} ${ry} ${rotate} 1 0 ${r1(cx - dx)} ${r1(cy - dy)}Z`;
}

/** Spirale d'Archimède : la gidouille */
export function spiral(cx: number, cy: number, rMax: number, turns: number, steps = 80): string {
	const pts: string[] = [];
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		const a = t * turns * Math.PI * 2;
		pts.push(`${r1(cx + rMax * t * Math.cos(a))} ${r1(cy + rMax * t * Math.sin(a))}`);
	}
	return 'M' + pts.join(' L');
}

/** Bandes tigrées en croissants effilés, partant des deux flancs */
function tabby(x0: number, x1: number, y0: number, y1: number, step: number, len: number): string {
	const slope = 5;
	let d = '';
	for (let y = y0; y < y1; y += step) {
		d += `M${x0} ${r1(y)}Q${r1(x0 + len * 0.6)} ${r1(y + slope - 3)} ${r1(x0 + len)} ${r1(y + slope)}Q${r1(x0 + len * 0.6)} ${r1(y + slope + 3)} ${x0} ${r1(y + 7)}Z`;
		d += `M${x1} ${r1(y + 3)}Q${r1(x1 - len * 0.6)} ${r1(y + slope)} ${r1(x1 - len)} ${r1(y + 3 + slope)}Q${r1(x1 - len * 0.6)} ${r1(y + slope + 6)} ${x1} ${r1(y + 10)}Z`;
	}
	return d;
}

/** Étoile à cinq branches */
function star(cx: number, cy: number, r: number): string {
	const pts: string[] = [];
	for (let i = 0; i < 10; i++) {
		const a = -Math.PI / 2 + (i * Math.PI) / 5;
		const rr = i % 2 === 0 ? r : r * 0.45;
		pts.push(`${r1(cx + rr * Math.cos(a))} ${r1(cy + rr * Math.sin(a))}`);
	}
	return `M${pts.join('L')}Z`;
}

/** Le corps en poire, la tête au sommet, et tout ce qui s'y accroche */
export function pearGeometry(stage: MathouStage | StageTemplate): PearGeometry {
	const st = typeof stage === 'string' ? STAGES[stage] : stage;
	const cx = 100;
	const { top, bot, hw, bw } = st;
	const hy = top + (bot - top) * 0.28;
	const wy = top + (bot - top) * 0.7;
	const side = (k: number): string =>
		`C${cx + k * hw} ${top} ${r1(cx + k * hw * 1.12)} ${r1(hy - (hy - top) * 0.45)} ${cx + k * hw} ${r1(hy)}` +
		`C${r1(cx + k * hw * 0.93)} ${r1(hy + (hy - top) * 0.27)} ${cx + k * bw} ${r1(wy - (wy - hy) * 0.45)} ${cx + k * bw} ${r1(wy)}` +
		`C${cx + k * bw} ${bot - 3} ${r1(cx + k * bw * 0.5)} ${bot} ${cx} ${bot}`;
	const left =
		`C${r1(cx - bw * 0.5)} ${bot} ${cx - bw} ${bot - 3} ${cx - bw} ${r1(wy)}` +
		`C${cx - bw} ${r1(wy - (wy - hy) * 0.45)} ${r1(cx - hw * 0.93)} ${r1(hy + (hy - top) * 0.27)} ${cx - hw} ${r1(hy)}` +
		`C${r1(cx - hw * 1.12)} ${r1(hy - (hy - top) * 0.45)} ${cx - hw} ${top} ${cx} ${top}Z`;
	const body = `M${cx} ${top}` + side(1) + left;
	const headY = r1(top + (hy - top) * 0.55);

	// Oreilles aux pointes arrondies
	const T = top;
	const w = hw;
	const ear = (k: number): string =>
		`M${r1(cx + k * w * 0.2)} ${T + 6}C${r1(cx + k * w * 0.5)} ${r1(T - w * 0.4)} ${r1(cx + k * w * 0.8)} ${r1(T - w * 0.82)} ${r1(cx + k * w * 0.95)} ${r1(T - w * 0.78)}C${r1(cx + k * w * 1.1)} ${r1(T - w * 0.72)} ${r1(cx + k * w * 1.1)} ${r1(T - w * 0.1)} ${r1(cx + k * w * 1.04)} ${r1(T + w * 0.55)}Z`;
	const earIn = (k: number): string =>
		`M${r1(cx + k * w * 0.45)} ${T + 4}C${r1(cx + k * w * 0.62)} ${r1(T - w * 0.3)} ${r1(cx + k * w * 0.8)} ${r1(T - w * 0.6)} ${r1(cx + k * w * 0.9)} ${r1(T - w * 0.56)}C${r1(cx + k * w * 0.98)} ${r1(T - w * 0.3)} ${r1(cx + k * w * 0.96)} ${r1(T)} ${r1(cx + k * w * 0.92)} ${r1(T + w * 0.3)}Z`;

	// Queue en tire-bouchon
	const tx = cx + bw * 0.92;
	const ty = wy + 18;
	const tail = `M${r1(tx - 6)} ${r1(ty)}C${r1(tx + 22)} ${r1(ty + 2)} ${r1(tx + 26)} ${r1(ty - 30)} ${r1(tx + 12)} ${r1(ty - 34)}C${r1(tx + 2)} ${r1(ty - 36)} ${r1(tx + 2)} ${r1(ty - 22)} ${r1(tx + 12)} ${r1(ty - 24)}`;

	// Pieds ; chaton : en dedans et dépareillés (la maladresse est dans les proportions)
	const fy = bot + 2;
	const feet: Ellipse[] = [-1, 1].map((k) => {
		const fx = r1(cx + k * bw * lerp(0.42, 0.34, st.youth));
		// Pied droit du chaton : plus bas et plus petit
		const odd = k === 1 ? st.youth : 0;
		return {
			cx: fx,
			cy: r1(fy + 2 * odd),
			rx: r1(st.foot - 1.5 * odd),
			ry: 6,
			// `+ 0` : jamais de -0 (adulte, pied gauche)
			rotate: r1(k * -16 * st.youth) + 0
		};
	});

	// Ombre propre : aplat sur le flanc droit
	const shade = `M${cx + bw * 0.3} ${top}L210 ${top}L210 210L${cx + bw * 0.2} 210C${cx + bw * 0.9} ${bot - 20} ${cx + bw * 0.95} ${r1(hy + 20)} ${cx + bw * 0.3} ${top}Z`;

	return {
		stage: st,
		body,
		shoulderY: r1(hy),
		waistY: r1(wy),
		hx: cx,
		hy: headY,
		ears: ear(-1) + ear(1),
		earsOuter: [ear(-1), ear(1)],
		earsInner: [earIn(-1), earIn(1)],
		tail,
		feet,
		gidouille: spiral(cx, wy - 4, st.gid[0], st.gid[1]),
		shade
	};
}

/** Couleurs et calques de motif d'une race, posés sur le gabarit */
export function dressing(race: MathouRace, g: PearGeometry): Dressing {
	const { top, bot, hw, bw } = g.stage;
	const P = race.primary;
	const S = race.secondary;
	const T3 = race.tertiary ?? race.secondary;
	const cx = g.hx;
	const sy = g.shoulderY;
	const wy = g.waistY;
	const s = bw / 64;
	const layers: Layer[] = [];
	const innerFor = (fur: string): string =>
		isDark(fur) ? 'hsl(10, 55%, 40%)' : 'hsl(5, 55%, 70%)';

	const d: Dressing = {
		layers,
		smoke: null,
		ears: [P, P],
		earsInner: [innerFor(P), innerFor(P)],
		tail: P,
		tailRings: null,
		tailTip: null,
		feet: [P, P],
		eyeFur: [P, P],
		muzzle: P,
		gidouille: { color: lineOn(P), width: 3.4 },
		shadeFill: isDark(P) ? 'hsl(220, 22%, 24%)' : INK,
		shadeOpacity: isDark(P) ? 1 : 0.16
	};

	// Repères : museau, plastron, bas du corps
	const muzzle = ellipsePath(cx, g.hy + 9 * (hw / 26), hw * 0.62, (sy - g.hy) * 0.78);
	const bib = ellipsePath(cx, (sy + wy) / 2 + 10 * s, bw * 0.52, (bot - sy) * 0.46);
	const forehead = (h: number): string =>
		`M${r1(cx - 8 * h)} ${top + 2}Q${r1(cx - 4 * h)} ${r1(top + 10 * h)} ${r1(cx - 3 * h)} ${r1(top + 15 * h)}Q${r1(cx - 1 * h)} ${r1(top + 9 * h)} ${r1(cx - 2 * h)} ${top + 1}Z` +
		`M${r1(cx - 2.5 * h)} ${top}Q${cx} ${r1(top + 10 * h)} ${cx} ${r1(top + 17 * h)}Q${r1(cx + 1.5 * h)} ${r1(top + 10 * h)} ${r1(cx + 2.5 * h)} ${top}Z` +
		`M${r1(cx + 8 * h)} ${top + 2}Q${r1(cx + 4 * h)} ${r1(top + 10 * h)} ${r1(cx + 3 * h)} ${r1(top + 15 * h)}Q${r1(cx + 1 * h)} ${r1(top + 9 * h)} ${r1(cx + 2 * h)} ${top + 1}Z`;
	const h = hw / 26;

	switch (race.pattern) {
		case 'uni':
			break;
		case 'tigre':
			layers.push({ d: tabby(cx - bw - 2, cx + bw + 2, sy, bot, 14, bw * 0.45), fill: S });
			layers.push({ d: forehead(h), fill: S });
			d.tailRings = S;
			break;
		case 'tachete': {
			let spots = '';
			for (let y = sy + 4, row = 0; y < bot - 6; y += 13 * s, row++) {
				for (const k of [-1, 1]) {
					const off = row % 2 === 0 ? 0.62 : 0.82;
					spots += ellipsePath(cx + k * bw * off, y, 4.2 * s, 3.4 * s);
					if (row % 2 === 1) spots += ellipsePath(cx + k * bw * 0.98, y + 6 * s, 3.6 * s, 3 * s);
				}
			}
			spots +=
				ellipsePath(cx - 7 * h, top + 7 * h, 2.6 * h, 2.2 * h) +
				ellipsePath(cx + 7 * h, top + 7 * h, 2.6 * h, 2.2 * h);
			spots += ellipsePath(cx, top + 4 * h, 2.4 * h, 2 * h);
			layers.push({ d: spots, fill: S });
			d.tailRings = S;
			break;
		}
		case 'smoking':
			layers.push({ d: bib, fill: S });
			layers.push({ d: muzzle, fill: S });
			d.feet = [S, S];
			d.muzzle = S;
			d.gidouille = { color: INK, width: 3.4 };
			break;
		case 'pointes':
			// Masque, oreilles, pieds et queue foncés ; corps crème ombré vers le bas
			layers.push({
				d: `M0 ${r1(bot - 18 * s)}Q${cx} ${r1(bot - 30 * s)} 200 ${r1(bot - 18 * s)}V210H0Z`,
				fill: S,
				opacity: 0.35
			});
			layers.push({ d: ellipsePath(cx, g.hy + 6 * h, hw * 0.8, (sy - top) * 0.5), fill: S });
			d.ears = [S, S];
			d.earsInner = [innerFor(S), innerFor(S)];
			d.feet = [S, S];
			d.tail = S;
			d.eyeFur = [S, S];
			d.muzzle = S;
			break;
		case 'gidouille':
			d.gidouille = { color: S, width: 7.5 * Math.max(s, 0.85) };
			d.earsInner = [S, S];
			break;
		case 'ecaille':
			layers.push({
				d: ellipsePath(cx - bw * 0.6, sy + (wy - sy) * 0.35, bw * 0.48, (bot - sy) * 0.3, -25),
				fill: S
			});
			layers.push({
				d: ellipsePath(cx + bw * 0.62, wy + 14 * s, bw * 0.4, (bot - sy) * 0.22, 20),
				fill: T3
			});
			layers.push({
				d: ellipsePath(
					cx + hw * 0.55,
					top + (g.hy - top) * 0.35,
					hw * 0.55,
					(g.hy - top) * 0.7,
					15
				),
				fill: S
			});
			layers.push({ d: ellipsePath(cx - bw * 0.3, bot - 6, bw * 0.35, 12 * s, -8), fill: T3 });
			layers.push({ d: ellipsePath(cx + bw * 0.8, sy + 6 * s, bw * 0.25, 10 * s, 30), fill: S });
			d.ears = [P, S];
			d.eyeFur = [P, S];
			d.feet = [T3, P];
			d.tail = S;
			break;
		case 'tricolore':
			layers.push({
				d: ellipsePath(cx - hw * 0.6, top + (g.hy - top) * 0.3, hw * 0.75, (g.hy - top) * 0.9, -10),
				fill: S
			});
			layers.push({
				d: ellipsePath(cx + bw * 0.6, wy - 6 * s, bw * 0.44, (bot - sy) * 0.3, 15),
				fill: T3
			});
			layers.push({
				d: ellipsePath(cx - bw * 0.72, wy + 12 * s, bw * 0.32, (bot - sy) * 0.2, -20),
				fill: S
			});
			layers.push({ d: ellipsePath(cx + hw * 0.75, top + 2, hw * 0.4, hw * 0.35, 0), fill: T3 });
			d.ears = [S, T3];
			d.earsInner = [innerFor(S), innerFor(T3)];
			d.eyeFur = [S, P];
			d.tail = S;
			d.tailRings = T3;
			break;
		case 'arlequin': {
			// Losanges de cabaret sur la panse, de part et d'autre de la gidouille
			let red = '';
			let black = '';
			const dw = 11 * s;
			const dh = 16 * s;
			let n = 0;
			for (let y = sy + 2; y < bot + dh; y += dh) {
				for (let x = cx - bw - dw; x < cx + bw + dw; x += dw * 2) {
					const ox = (Math.round((y - sy) / dh) % 2) * dw;
					const px = r1(x + ox);
					const diamond = `M${px} ${r1(y - dh / 2)}L${r1(px + dw)} ${r1(y)}L${px} ${r1(y + dh / 2)}L${r1(px - dw)} ${r1(y)}Z`;
					if (n % 3 === 0) red += diamond;
					else if (n % 3 === 1) black += diamond;
					n++;
				}
			}
			layers.push({ d: red, fill: S });
			layers.push({ d: black, fill: T3 });
			// la tête reste crème : on la recouvre
			layers.push({ d: `M0 0H200V${r1(sy + 4)}H0Z`, fill: P });
			d.tailRings = S;
			d.ears = [S, T3];
			d.gidouille = { color: INK, width: 3.4 };
			break;
		}
		case 'masque':
			// Bandeau de bandit sur les yeux, queue annelée
			layers.push({
				d: `M${r1(cx - hw * 1.1)} ${r1(g.hy - g.stage.eye * 2.6)}Q${cx} ${r1(g.hy - g.stage.eye * 3.4)} ${r1(cx + hw * 1.1)} ${r1(g.hy - g.stage.eye * 2.6)}V${r1(g.hy + g.stage.eye * 1.5)}Q${cx} ${r1(g.hy + g.stage.eye * 2.6)} ${r1(cx - hw * 1.1)} ${r1(g.hy + g.stage.eye * 1.5)}Z`,
				fill: S
			});
			d.eyeFur = [S, S];
			d.tailRings = S;
			d.ears = [S, S];
			d.earsInner = [innerFor(S), innerFor(S)];
			break;
		case 'marbre': {
			// Tabby classique : un « œil de bœuf » sur chaque flanc, trois traits au front
			for (const k of [-1, 1]) {
				const fx = cx + k * bw * 0.82;
				layers.push({
					d: ellipsePath(fx, wy - 2 * s, bw * 0.3, (bot - sy) * 0.24, k * 10),
					fill: 'none',
					stroke: S,
					width: 6 * s
				});
				layers.push({
					d: ellipsePath(fx + k * 2, wy - 2 * s, bw * 0.1, (bot - sy) * 0.08, 0),
					fill: S
				});
			}
			layers.push({
				d: `M${cx - bw} ${r1(sy + 6 * s)}Q${cx} ${r1(sy + 18 * s)} ${cx + bw} ${r1(sy + 6 * s)}`,
				fill: 'none',
				stroke: S,
				width: 5 * s
			});
			layers.push({ d: forehead(h), fill: S });
			d.tailRings = S;
			break;
		}
		case 'fume':
			d.smoke = S;
			d.earsInner = [S, S];
			break;
		case 'van':
			// Tête et queue colorées, le reste blanc ; une liste blanche partage la calotte
			layers.push({
				d: ellipsePath(cx, top + (g.hy - top) * 0.15, hw * 1.25, (g.hy - top) * 0.8),
				fill: S
			});
			layers.push({
				d: ellipsePath(cx, top + (g.hy - top) * 0.5, hw * 0.14, (g.hy - top) * 0.6),
				fill: P
			});
			d.ears = [S, S];
			d.earsInner = [innerFor(S), innerFor(S)];
			d.tail = S;
			d.tailRings = 'hsl(14, 70%, 38%)';
			break;
		case 'chaussettes':
			for (const foot of g.feet)
				layers.push({ d: ellipsePath(foot.cx, bot - 2, foot.rx * 1.25, 10 * s), fill: S });
			layers.push({ d: ellipsePath(cx, g.hy + 13 * h, hw * 0.4, 6 * h), fill: S });
			d.feet = [S, S];
			d.tailTip = S;
			break;
		case 'bicolore':
			// Blanc du bas, en arche sous les épaules, et museau blanc
			layers.push({
				d: `M0 210V${r1(wy - 4 * s)}Q${cx} ${r1(sy - 2)} 200 ${r1(wy - 4 * s)}V210Z`,
				fill: S
			});
			layers.push({ d: muzzle, fill: S });
			d.feet = [S, S];
			d.muzzle = S;
			d.gidouille = { color: INK, width: 3.4 };
			d.tailTip = S;
			break;
		case 'plastron': {
			// Croissant de lune qui berce la gidouille, cornes en haut
			const gr = g.stage.gid[0];
			const gy = wy - 4;
			layers.push({ d: ellipsePath(cx, gy + gr * 0.18, gr * 1.38, gr * 1.3), fill: S });
			layers.push({ d: ellipsePath(cx, gy - gr * 0.12, gr * 1.22, gr * 1.18), fill: P });
			break;
		}
		case 'etoile':
			layers.push({ d: star(cx, top + (g.hy - top) * 0.3, hw * 0.36), fill: S });
			d.tailTip = S;
			break;
	}
	return d;
}

/**
 * Le visage « juste milieu » : yeux en amande à pupille fendue, paupière posée (l'œil droit un rien
 * plus couvert), sourcils courts, bouche neutre au coin droit à peine relevé.
 * mode : 'open' | 'proud' (mi-clos, solennel) | 'closed' (sieste).
 */
export function faceDrawing(g: PearGeometry, dr: Dressing, mode: FaceMode): FaceDrawing {
	const st = g.stage;
	const { hx, hy } = g;
	const k = st.hw / 26;
	const eW = r1(st.hw * 0.42);
	const e = st.eye;
	const eyes: EyeDrawing[] = [];
	const closedEyes: { d: string; color: string }[] = [];
	const brows: { d: string; color: string }[] = [];

	[hx - eW, hx + eW].forEach((x, i) => {
		const fur = dr.eyeFur[i];
		if (mode === 'closed') {
			closedEyes.push({
				d: `M${r1(x - e)} ${hy}Q${x} ${r1(hy + e * 0.75)} ${r1(x + e)} ${hy}`,
				color: lineOn(fur)
			});
			return;
		}
		const w = r1(e * 1.28);
		const eh = r1(e * 1.08);
		const lidPart = mode === 'proud' ? 0.47 : lerp(0.12, 0.05, st.youth) + (i === 1 ? 0.1 : 0);
		const pupil = lerp(0.19, 0.3, st.youth);
		const shape = `M${r1(x - w)} ${r1(hy)}C${r1(x - w * 0.62)} ${r1(hy - eh * 1.3)} ${r1(x + w * 0.62)} ${r1(hy - eh * 1.3)} ${r1(x + w)} ${r1(hy)}C${r1(x + w * 0.62)} ${r1(hy + eh * 1.25)} ${r1(x - w * 0.62)} ${r1(hy + eh * 1.25)} ${r1(x - w)} ${r1(hy)}Z`;
		const ly = r1(hy - eh * 1.05 + 2 * eh * lidPart);
		const lidTop = r1(hy - eh * 1.6);
		eyes.push({
			shape,
			pupil: { cx: r1(x), cy: r1(hy + eh * 0.08), rx: r1(w * pupil), ry: r1(eh * 0.92) },
			glint:
				mode === 'proud'
					? null
					: { cx: r1(x + w * pupil * 0.2), cy: r1(hy - eh * 0.25), r: r1(Math.max(0.7, w * 0.08)) },
			lid: {
				x: r1(x - w - 2),
				y: lidTop,
				width: r1(2 * w + 4),
				height: r1(ly - lidTop),
				line: `M${r1(x - w - 2)} ${ly}H${r1(x + w + 2)}`
			},
			fur,
			outline: !isDark(fur)
		});
		// sourcil : trait court et plat ; le droit un peu levé (un brin ironique), sauf en majesté
		const by = r1(hy - e * 1.45 - 2.5 * k);
		const lift = i === 1 && mode !== 'proud' ? r1(1.8 * k) : 0;
		const sgn = i === 0 ? -1 : 1;
		brows.push({
			d: `M${r1(x - sgn * 3 * k)} ${r1(by - lift * 0.4)}Q${r1(x + sgn * 1.5 * k)} ${r1(by - lift - 0.8)} ${r1(x + sgn * 5.5 * k)} ${r1(by - lift * 0.3)}`,
			color: lineOn(fur)
		});
	});

	// Truffe arrondie
	const ny = r1(hy + 6 * k + 1);
	const nose = `M${r1(hx - 3.2)} ${ny}Q${hx} ${r1(ny - 1)} ${r1(hx + 3.2)} ${ny}Q${r1(hx + 2.4)} ${r1(ny + 3)} ${hx} ${r1(ny + 3.4)}Q${r1(hx - 2.4)} ${r1(ny + 3)} ${r1(hx - 3.2)} ${ny}Z`;
	const mL = lightness(dr.muzzle);
	const noseFill = mL < 36 ? 'hsl(350, 35%, 55%)' : mL > 82 ? 'hsl(350, 55%, 66%)' : INK;
	// Bouche neutre : philtrum, deux arcs courts ; coin droit à peine relevé (éveillé seulement)
	const my = r1(ny + 3.4);
	const mw = r1(3.6 * Math.max(k, 0.8));
	const j = r1(my + 1.6);
	const rEnd = mode === 'open' ? r1(j + mw * 0.38) : r1(j + mw * 0.62);
	const mouth = `M${hx} ${my}V${j}M${hx} ${j}Q${r1(hx - mw * 0.25)} ${r1(j + mw * 0.75)} ${r1(hx - mw * 1.3)} ${r1(j + mw * 0.62)}M${hx} ${j}Q${r1(hx + mw * 0.25)} ${r1(j + mw * 0.7)} ${r1(hx + mw * 1.35)} ${rEnd}`;
	// Moustaches presque droites
	const wl = st.hw + 16;
	const wy = ny + 2;
	const whiskers = `M${hx - 9} ${wy}Q${r1(hx - wl * 0.6)} ${r1(wy - 3)} ${r1(hx - wl)} ${r1(wy - 2)}M${hx - 9} ${wy + 3}Q${r1(hx - wl * 0.6)} ${r1(wy + 3)} ${r1(hx - wl)} ${r1(wy + 6)}M${hx + 9} ${wy}Q${r1(hx + wl * 0.6)} ${r1(wy - 3)} ${r1(hx + wl)} ${r1(wy - 2)}M${hx + 9} ${wy + 3}Q${r1(hx + wl * 0.6)} ${r1(wy + 3)} ${r1(hx + wl)} ${r1(wy + 6)}`;
	// Sur un museau sombre, la moustache encre disparaît : on la double de crème sur la joue
	const innerWhiskers = isDark(dr.muzzle)
		? `M${hx - 12} ${wy}Q${r1(hx - st.hw * 0.6)} ${r1(wy - 2)} ${r1(hx - st.hw + 3)} ${r1(wy - 1.5)}M${hx + 12} ${wy}Q${r1(hx + st.hw * 0.6)} ${r1(wy - 2)} ${r1(hx + st.hw - 3)} ${r1(wy - 1.5)}`
		: null;

	return {
		eyes,
		closedEyes,
		brows,
		browWidth: r1(1.5 * Math.max(k, 0.85)),
		nose,
		noseFill,
		mouth,
		mouthColor: lineOn(dr.muzzle),
		whiskers,
		innerWhiskers
	};
}

// Décor de l'affiche

/** Gloire rayonnante du grand matou */
export function rays(cx: number, cy: number, n = 18): string {
	let d = '';
	for (let i = 0; i < n; i++) {
		const a0 = (i / n) * Math.PI * 2;
		const a1 = a0 + Math.PI / n;
		const am = (a0 + a1) / 2;
		d += `M${cx} ${cy}Q${r1(cx + 90 * Math.cos(am - 0.06))} ${r1(cy + 90 * Math.sin(am - 0.06))} ${r1(cx + 170 * Math.cos(a0))} ${r1(cy + 170 * Math.sin(a0))}L${r1(cx + 170 * Math.cos(a1))} ${r1(cy + 170 * Math.sin(a1))}Z`;
	}
	return d;
}

/** Couronne aux pointes perlées (chemin + trois perles) */
export function crown(
	hx: number,
	top: number
): { d: string; pearls: { cx: number; cy: number; r: number }[] } {
	return {
		d: `M${hx - 15} ${top - 2}C${hx - 16} ${top - 10} ${hx - 17} ${top - 16} ${hx - 17} ${top - 21}C${hx - 13} ${top - 15} ${hx - 9} ${top - 12} ${hx - 6} ${top - 12}C${hx - 4} ${top - 18} ${hx - 2} ${top - 23} ${hx} ${top - 27}C${hx + 2} ${top - 23} ${hx + 4} ${top - 18} ${hx + 6} ${top - 12}C${hx + 9} ${top - 12} ${hx + 13} ${top - 15} ${hx + 17} ${top - 21}C${hx + 17} ${top - 16} ${hx + 16} ${top - 10} ${hx + 15} ${top - 2}Q${hx} ${top + 2} ${hx - 15} ${top - 2}Z`,
		pearls: [
			{ cx: hx, cy: top - 29, r: 3 },
			{ cx: hx - 17, cy: top - 23, r: 2.4 },
			{ cx: hx + 17, cy: top - 23, r: 2.4 }
		]
	};
}

/** Fraise du grand matou : sept godrons */
export function ruff(hx: number, y: number): { cx: number; cy: number }[] {
	const out: { cx: number; cy: number }[] = [];
	for (let i = -3; i <= 3; i++) out.push({ cx: hx + i * 8, cy: r1(y + Math.abs(i) * 0.6) });
	return out;
}

/** Bonnet de nuit, dessiné pour une tête de matou (sommet y = 38), à mettre à l'échelle */
export const NIGHTCAP = {
	cap: 'M74 48C76 20 102 4 128 10C146 14 156 32 152 54C144 38 132 32 124 48Z',
	stripes: [0, 1, 2, 3, 4].map((i) => `M${70 + i * 18} 54L${100 + i * 18} -6`).join(''),
	band: 'M72 44Q100 54 128 44Q130 48 128 52Q100 62 72 52Q70 48 72 44Z',
	pompom: { cx: 153, cy: 56, r: 7 }
} as const;

/** Les trois « z » de la sieste, du plus grand au plus petit */
export function zzz(x: number, y: number, s: number): string[] {
	const z = (zx: number, zy: number, k: number): string =>
		`M${r1(zx)} ${r1(zy)}h${r1(10 * k)}l${r1(-10 * k)} ${r1(10 * k)}h${r1(10 * k)}`;
	return [z(x, y, s), z(x + 14 * s, y - 14 * s, 0.75 * s), z(x + 25 * s, y - 25 * s, 0.55 * s)];
}

export const MOON = 'M152 24A26 26 0 1 0 178 60A20 20 0 1 1 152 24Z';

// --- Fête de naissance : confettis et étoiles autour du nouveau-né ---

export interface Confetto {
	/** Arrivée, relative au point de départ (centre de l'affiche) */
	dx: number;
	dy: number;
	rotate: number;
	width: number;
	height: number;
	color: string;
	delay: number;
}

export interface Sparkle {
	x: number;
	y: number;
	scale: number;
	delay: number;
}

/** Étoile à quatre branches, centrée sur l'origine (rayon 9) */
export const SPARKLE =
	'M0 -9C1.6 -1.6 1.6 -1.6 9 0C1.6 1.6 1.6 1.6 0 9C-1.6 1.6 -1.6 1.6 -9 0C-1.6 -1.6 -1.6 -1.6 0 -9Z';

/** Point d'où partent les confettis */
export const CELEBRATION_ORIGIN = { x: 100, y: 105 } as const;

/**
 * Gerbe déterministe (même dessin à chaque naissance) : 16 confettis tout autour, plus hauts que
 * larges vers le haut, aux couleurs de l'affiche et de la race ; 5 étoiles autour de la tête.
 */
export function celebration(halo: string): { confetti: Confetto[]; sparkles: Sparkle[] } {
	const colors = [RED, INK, CREAM, halo];
	const confetti: Confetto[] = Array.from({ length: 16 }, (_, i) => {
		const angle = (i / 16) * Math.PI * 2 + (i % 3) * 0.17;
		const dist = 62 + ((i * 37) % 26);
		return {
			dx: r1(Math.cos(angle) * dist),
			dy: r1(Math.sin(angle) * dist * 0.85 - 12),
			rotate: ((i * 83) % 360) - 180,
			width: i % 2 === 0 ? 5 : 7,
			height: i % 2 === 0 ? 10 : 5,
			color: colors[i % colors.length],
			delay: r1((i % 4) * 0.06)
		};
	});
	const sparkles: Sparkle[] = [
		{ x: 40, y: 48, scale: 1.1, delay: 0.5 },
		{ x: 162, y: 40, scale: 0.9, delay: 0.75 },
		{ x: 172, y: 118, scale: 0.7, delay: 1 },
		{ x: 30, y: 128, scale: 0.8, delay: 1.2 },
		{ x: 104, y: 18, scale: 0.75, delay: 0.9 }
	];
	return { confetti, sparkles };
}
