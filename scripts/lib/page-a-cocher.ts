/**
 * Page à cocher d'un lot de modèles : les fiches (un exemple par variation, tiré par le vrai
 * générateur) et les blocs dessinés par les scènes de l'appli — logique pure, testée dans
 * `scripts/__tests__/page-a-cocher.test.ts`.
 *
 * Le gabarit (`scripts/questions/page-a-cocher.html`) rend le texte et les formules ; ce module
 * lui donne les blocs déjà dessinés, préfixés de `@@HTML@@`. Un bloc que la page ne sait pas
 * dessiner est montré par sa source, signalé : le jouer dans l'aperçu admin.
 * Démarche : docs/pratiques/couvrir-un-niveau.md § 8.
 */

import { generateInstance } from '../../src/lib/questions/generator/instance-generator';
import { prepareStatement, withoutChoiceCases } from '../../src/lib/questions/expected-result';
import { correctChoiceIndexesOf, isChoiceBlank } from '../../src/lib/questions/choice-case';
import { parseFigureContent } from '../../src/lib/ubumark/parser/figure-parser';
import { buildFigureScene } from '../../src/lib/ubumark/utils/figure-scene';
import { figureToSvg, type FigureShape } from '../../src/lib/ubumark/utils/figure-svg';
import { parseMonnaieContent } from '../../src/lib/ubumark/parser/monnaie-parser';
import { parseCollectionContent } from '../../src/lib/ubumark/parser/collection-parser';
import { parseHorlogeContent } from '../../src/lib/ubumark/parser/horloge-parser';
import {
	buildMonnaieScene,
	MONNAIE_LABEL,
	MONNAIE_VIEW,
	type MonnaieItem
} from '../../src/lib/ubumark/utils/monnaie-scene';
import * as monnaieConstruire from '../../src/lib/ubumark/utils/monnaie-construire';
import { coinFamily, denominationLabel } from '../../src/lib/ubumark/utils/monnaie-valeurs';
import { parsePartageContent } from '../../src/lib/ubumark/parser/partage-parser';
import {
	PARTAGE_CM_PER_UNIT,
	PARTAGE_MARGIN,
	PARTAGE_STROKE,
	buildPartageScenes,
	partageFigureLabel,
	type PartagePart,
	type PartageScene
} from '../../src/lib/ubumark/utils/partage-scene';
import {
	buildCollectionScene,
	COLLECTION_VIEW,
	type CollectionItem
} from '../../src/lib/ubumark/utils/collection-scene';
import * as collectionConstruire from '../../src/lib/ubumark/utils/collection-construire';
import {
	buildHorlogeScene,
	HORLOGE_FONT,
	HORLOGE_STROKE,
	HORLOGE_VIEW
} from '../../src/lib/ubumark/utils/horloge-scene';
import { parseCourbeContent } from '../../src/lib/ubumark/parser/courbe-parser';
import {
	COURBE_COLORS,
	type CourbeColor,
	type CourbeLabel
} from '../../src/lib/ubumark/types/courbe';
import { buildCourbeScene, type ScenePoint } from '../../src/lib/ubumark/utils/courbe-scene';
import {
	parseVariationTableContent,
	withImplicitEndpoints
} from '../../src/lib/ubumark/parser/variation-table-parser';
import type {
	SignValue,
	VariationMarker,
	VariationPosition,
	VariationValue
} from '../../src/lib/ubumark/types/variation-table';
import { parseStatChartContent } from '../../src/lib/ubumark/parser/stat-chart-parser';
import type { StatChartKind } from '../../src/lib/ubumark/types/stat-chart';
import {
	buildStatChartScene,
	SCATTER_LABEL_CHAR_PX,
	STAT_CHART_CHAR_PX,
	type BarScene,
	type BoxPlotScene,
	type ComparisonScene,
	type CrossTableScene,
	type CumulativeScene,
	type HistogramScene,
	type SceneReading,
	type SimulationScene,
	type StatChartScene
} from '../../src/lib/ubumark/utils/stat-chart-scene';
import { parseProbTreeContent } from '../../src/lib/ubumark/parser/probability-tree-parser';
import type { ProbTreeNode } from '../../src/lib/ubumark/types/probability-tree';
import { namedColorScreen, namedColorTable } from '../../src/lib/theme/named-colors';
import { toFrenchDecimal, toLocaleDecimal } from '../../src/lib/utils/french-math';
import type { ModeleFichier } from './lot-questions';

// Types

/** Un point du programme dans `docs/systeme/programmes/bornes/<cycle>.json` */
export interface PointBornes {
	libelle: string;
	bornes: { borne: string }[];
	remarque?: string;
}

/** Ce que la base dit du modèle : son id, son nœud, ses points */
export interface InfosEnBase {
	id: string;
	statut: string;
	/** Niveau en base (peut différer du fichier d'un ancien lot, renuméroté après coup) */
	niveau: number;
	/** Chemin du nœud (« branche > notion > sous-notion »), null sans nœud */
	rangement: string | null;
	codes: string[];
}

export interface Exemple {
	variation: number;
	statement: string;
	choices: { content: string; bon: boolean }[] | null;
	answer: string;
	/** Construction juste des blocs à construire (déjà dessinée), vide sinon */
	solution: string;
	steps: string[];
}

/** Une fiche de la page : la forme que lit le gabarit (`const MODELES = […]`) */
export interface Fiche {
	id: string;
	code: string;
	titre: string;
	description: string;
	rangement: string;
	niveau: number;
	statut: string;
	libelle: string;
	bornes: string[];
	variables: string[];
	conditions: string[];
	specs: string[];
	exemples: Exemple[];
	/** Ce qui cloche (sans point, sans nœud, bloc non dessiné) : affiché en tête de fiche */
	alertes: string[];
}

/** Pleine largeur de la scène (`*_VIEW.fullWidth`) et taille d'une scène pleine largeur */
interface Echelle {
	pleine: number;
	tailleCm: number;
}

interface Bloc {
	html: string;
	solution?: string;
	/** Avertissements du bloc (ceux que l'écran montre au prof) : remontés en alerte de fiche */
	avertissements?: string[];
}

// Constantes

/** Marqueur de bloc déjà dessiné, que le gabarit insère tel quel */
export const HTML = '@@HTML@@';
const BLOC = /```([a-z][a-z-]*)\n([\s\S]*?)\n```/g;
const LEGENDES = ['A', 'B', 'C', 'D'];
/** Graine du premier exemple ; variation i → graine + i (pages reproductibles) */
const GRAINE = 7;

// Functions

const attr = (s: string | number) =>
	String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
/** Largeur à l'écran, comme `calc(var(--monnaie-taille, 8cm) * ratio)` : `taille:` du bloc, sinon 8 cm */
const largeur = (w: number, e: Echelle) =>
	`width:calc(${e.tailleCm}cm * ${+(w / e.pleine).toFixed(4)})`;

/** Légende de chaque ensemble : celles du bloc, sinon A, B, C s'il y en a plusieurs */
function legendes(captions: string[] | null, n: number): (string | null)[] {
	return Array.from({ length: n }, (_, i) => captions?.[i] ?? (n > 1 ? LEGENDES[i] : null));
}

function figures(svgs: string[], captions: (string | null)[]): string {
	return `<div class="m-bloc">${svgs.map((svg, i) => `<figure class="m-fig">${svg}${captions[i] ? `<figcaption>${attr(captions[i])}</figcaption>` : ''}</figure>`).join('')}</div>`;
}

// ---- Figure : formes de `figureToSvg`, comme FigureRenderer ----

function forme(s: FigureShape): string {
	const dash = 'dash' in s && s.dash ? ` stroke-dasharray="${s.dash}"` : '';
	const fill = (f: string | null, o?: number) =>
		`fill:${f ?? 'none'}"${f && o !== undefined ? ` fill-opacity="${o}"` : ''}`;
	switch (s.kind) {
		case 'line':
			return `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" style="stroke:${s.color}" stroke-width="${s.width}"${dash}/>`;
		case 'circle':
			return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" stroke-width="${s.width}"${dash} style="stroke:${s.color};${fill(s.fill, s.fillOpacity)}/>`;
		case 'path':
			return `<path d="${s.d}" stroke-width="${s.width}"${dash} style="stroke:${s.color};${fill(s.fill)}/>`;
		case 'polygon':
			return `<polygon points="${s.points}" stroke-width="${s.width}"${dash} stroke-linejoin="round" style="stroke:${s.color};${fill(s.fill, s.fillOpacity)}/>`;
		case 'arrowhead':
			return `<polygon points="${s.points}" style="fill:${s.color}"/>`;
		case 'dot': {
			if (s.shape === 'cross') {
				const h = s.r * 1.25;
				return `<path class="fp" d="M ${s.cx - h} ${s.cy - h} L ${s.cx + h} ${s.cy + h} M ${s.cx + h} ${s.cy - h} L ${s.cx - h} ${s.cy + h}" style="stroke:${s.color}"/>`;
			}
			if (s.shape === 'circle')
				return `<circle class="fp" cx="${s.cx}" cy="${s.cy}" r="${s.r}" style="stroke:${s.color}" fill="none"/>`;
			if (s.shape === 'square') {
				const h = s.r * 0.875;
				return `<rect x="${s.cx - h}" y="${s.cy - h}" width="${2 * h}" height="${2 * h}" style="fill:${s.color}"/>`;
			}
			return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" style="fill:${s.color}"/>`;
		}
		case 'label':
			return `<text class="fe${s.italic ? ' fn' : ''}" x="${s.x}" y="${s.y}" style="fill:${s.color}" text-anchor="${s.anchor}"${s.baseline === 'middle' ? ' dominant-baseline="middle"' : ''}>${attr(s.text)}</text>`;
	}
}

function figure(source: string): Bloc {
	const node = parseFigureContent(source);
	const r = buildFigureScene(node, { locale: 'fr' });
	if (!r.scene)
		throw new Error('bloc figure en erreur : ' + r.errors.map((e) => e.message).join(' ; '));
	const d = figureToSvg(r.scene, node.header.size);
	const objets = d.shapes.map(forme).join('');
	const label = attr(r.scene.ariaLabel);
	if (!d.frame) {
		return {
			html: `<svg class="fig" role="img" aria-label="${label}" viewBox="0 0 ${d.width} ${d.height}" style="max-width:${d.width}px">${objets}</svg>`
		};
	}
	const m = d.margin ?? 0;
	const fr = d.frame;
	const seg = (c: string, l: { x1: number; y1: number; x2: number; y2: number }) =>
		`<line class="${c}" x1="${l.x1}" y1="${l.y1}" x2="${l.x2}" y2="${l.y2}"/>`;
	const repere = [
		...fr.gridLines.map((l) => seg('fg', l)),
		...fr.axisLines.map((l) => seg('fa', l)),
		...fr.arrowheads.map((p) => `<polygon class="ff" points="${p}"/>`),
		...fr.tickLines.map((l) => seg('fa', l)),
		...fr.tickLabels.map(
			(t) =>
				`<text class="ft" x="${t.x}" y="${t.y}" text-anchor="${t.anchor}">${attr(t.text)}</text>`
		)
	].join('');
	const w = d.width + 2 * m;
	const h = d.height + 2 * m;
	return {
		html: `<svg class="fig" role="img" aria-label="${label}" viewBox="0 0 ${w} ${h}" style="max-width:${w}px"><g aria-hidden="true" transform="translate(${m}, ${m})">${repere}</g><svg x="${m}" y="${m}" width="${d.width}" height="${d.height}" viewBox="0 0 ${d.width} ${d.height}" overflow="hidden">${objets}</svg></svg>`
	};
}

// ---- Monnaie et collection : balisage de Monnaie.svelte et CollectionObjets.svelte ----

function monnaieObjets(items: readonly MonnaieItem[]): string {
	const N = MONNAIE_LABEL.note;
	const C = MONNAIE_LABEL.coin;
	return items
		.map((it) => {
			if (it.kind === 'billet') {
				const coin = (x: number, y: number) =>
					`<text class="m-val" x="${x}" y="${y}" font-size="${N.cornerSize}">${it.value}</text>`;
				return `<g><rect class="m-billet" x="${it.x}" y="${it.y}" width="${it.width}" height="${it.height}" rx="${N.radius}"/><text class="m-val" x="${it.cx}" y="${it.cy}" font-size="${N.size}">${denominationLabel(it.value)}</text>${coin(it.x + N.cornerInset + N.cornerBox / 2, it.y + 1 + N.cornerBox / 2)}${coin(it.x + it.width - N.cornerInset - N.cornerBox / 2, it.y + it.height - 1 - N.cornerBox / 2)}</g>`;
			}
			const r = it.width / 2;
			const disque =
				it.value === 2
					? `<circle class="m-anneau" cx="${it.cx}" cy="${it.cy}" r="${r}"/><circle class="m-piece" cx="${it.cx}" cy="${it.cy}" r="${+(r * C.innerRatio).toFixed(2)}"/>`
					: `<circle class="m-piece m-piece-${coinFamily(it.value)}" cx="${it.cx}" cy="${it.cy}" r="${r}"/>`;
			// « 50 c » sur une pièce de centimes, « 2 € » sinon, comme MonnaieObjets.svelte
			return `<g>${disque}<text class="m-val" x="${it.cx}" y="${it.cy}" font-size="${C.size}">${denominationLabel(it.value)}</text></g>`;
		})
		.join('');
}

function collectionObjets(items: readonly CollectionItem[]): string {
	return items
		.map((it) => {
			if (it.kind === 'jeton')
				return `<circle class="c-forme" cx="${it.cx}" cy="${it.cy}" r="${it.width / 2}"/>`;
			if (it.kind === 'cube')
				return `<rect class="c-forme" x="${it.x}" y="${it.y}" width="${it.width}" height="${it.height}"/>`;
			if (it.kind === 'barre') {
				const sep = Array.from({ length: 9 }, (_, k) => {
					const y = +(it.y + ((k + 1) * it.height) / 10).toFixed(2);
					return `<line class="c-sep" x1="${it.x}" x2="${it.x + it.width}" y1="${y}" y2="${y}"/>`;
				}).join('');
				return `<g><rect class="c-forme" x="${it.x}" y="${it.y}" width="${it.width}" height="${it.height}"/>${sep}</g>`;
			}
			const jetons = (it.jetons ?? [])
				.map(
					(j) =>
						`<circle class="c-forme" cx="${j.cx}" cy="${j.cy}" r="${COLLECTION_VIEW.object / 2}"/>`
				)
				.join('');
			return `<g><rect class="c-contour" x="${it.x}" y="${it.y}" width="${it.width}" height="${it.height}" rx="6"/>${jetons}</g>`;
		})
		.join('');
}

interface Scene<I> {
	width: number;
	height: number;
	items: I[];
}

function svgScene<I>(
	scene: Scene<I>,
	dessin: (items: I[]) => string,
	label: string,
	echelle: Echelle
): string {
	return `<svg class="m-dessin" role="img" aria-label="${attr(label)}" viewBox="0 0 ${scene.width} ${scene.height}" style="${largeur(scene.width, echelle)}"><rect class="m-cadre" x="0.5" y="0.5" width="${scene.width - 1}" height="${scene.height - 1}" rx="6"/>${dessin(scene.items)}</svg>`;
}

/** La réserve : chaque coupure ou objet dans sa vignette, comme dans l'appli */
function reserve<I extends { x: number; y: number; width: number; height: number }>(
	items: I[],
	dessin: (items: I[]) => string,
	echelle: Echelle
): string {
	const icones = items
		.map(
			(it) =>
				`<svg class="r-icone" viewBox="${it.x - 1} ${it.y - 1} ${it.width + 2} ${it.height + 2}" style="${largeur(it.width + 2, echelle)}">${dessin([it])}</svg>`
		)
		.join('');
	const plan = `<svg class="m-dessin" role="img" aria-label="Plan de travail vide" viewBox="0 0 ${echelle.pleine} 90" style="width:${echelle.tailleCm}cm"><rect class="plan" x="1" y="1" width="${echelle.pleine - 2}" height="88" rx="6"/><text class="plan-txt" x="${echelle.pleine / 2}" y="45">plan de travail (vide au départ)</text></svg>`;
	return `<div class="cons"><div class="reserve"><span class="r-tag">Réserve</span>${icones}</div>${plan}</div>`;
}

function monnaie(source: string): Bloc {
	const spec = parseMonnaieContent(source).spec;
	if (!spec) throw new Error('bloc monnaie en erreur : ' + source);
	const echelle = { pleine: MONNAIE_VIEW.fullWidth, tailleCm: spec.sizeCm ?? 8 };
	if (spec.build == null) {
		const svgs = spec.sets.map((_, i) =>
			svgScene(buildMonnaieScene(spec, i), monnaieObjets, 'Pièces et billets', echelle)
		);
		return { html: figures(svgs, legendes(spec.captions, spec.sets.length)) };
	}
	const coupures = spec.reserve ?? monnaieConstruire.DEFAULT_RESERVE;
	const juste = monnaieConstruire.solutionBuild(spec.build, coupures);
	return {
		html: reserve(monnaieConstruire.reserveScene(coupures).items, monnaieObjets, echelle),
		solution: juste
			? svgScene(
					monnaieConstruire.buildScene(juste),
					monnaieObjets,
					'Une construction juste',
					echelle
				)
			: '<b>aucune construction possible avec cette réserve</b>'
	};
}

function collection(source: string): Bloc {
	const spec = parseCollectionContent(source).spec;
	if (!spec) throw new Error('bloc collection en erreur : ' + source);
	const echelle = { pleine: COLLECTION_VIEW.fullWidth, tailleCm: spec.sizeCm ?? 8 };
	if (spec.build == null) {
		const svgs = spec.sets.map((_, i) =>
			svgScene(buildCollectionScene(spec, i), collectionObjets, 'Collection', echelle)
		);
		return { html: figures(svgs, legendes(spec.captions, spec.sets.length)) };
	}
	return {
		html: reserve(collectionConstruire.reserveScene(spec.drawing).items, collectionObjets, echelle),
		solution: svgScene(
			collectionConstruire.buildScene(spec.drawing, collectionConstruire.solutionBuild(spec.build)),
			collectionObjets,
			'Une construction juste',
			echelle
		)
	};
}

// ---- Horloge : balisage de Horloge.svelte ----

function horloge(source: string): Bloc {
	const spec = parseHorlogeContent(source).spec;
	if (!spec) throw new Error('bloc horloge en erreur : ' + source);
	const h = HORLOGE_VIEW.half;
	const cadrans = spec.times.map((time) => {
		const s = buildHorlogeScene(spec, time);
		const traits = s.ticks
			.map(
				(t) =>
					`<line class="h-trait${t.major ? ' h-heure' : ''}" x1="${t.x1}" y1="${t.y1}" x2="${t.x2}" y2="${t.y2}" stroke-width="${t.major ? HORLOGE_STROKE.majorTick : HORLOGE_STROKE.minorTick}"/>`
			)
			.join('');
		const chiffres = s.numbers
			.map(
				(n) =>
					`<text class="h-chiffre${n.inner ? ' h-24' : ''}" x="${n.x}" y="${n.y}" font-size="${n.inner ? HORLOGE_FONT.innerNumbers : HORLOGE_FONT.numbers}" text-anchor="middle" dominant-baseline="central">${n.text}</text>`
			)
			.join('');
		const minutes = s.minuteHand
			? `<line class="h-aiguille h-minutes" x1="0" y1="0" x2="${s.minuteHand.x}" y2="${s.minuteHand.y}" stroke-width="${HORLOGE_STROKE.minuteHand}"/>`
			: '';
		const taille = spec.sizeCm == null ? '4cm' : `${spec.sizeCm}cm`;
		return `<svg class="h-cadran" role="img" aria-label="Horloge à aiguilles" viewBox="${-h} ${-h} ${2 * h} ${2 * h}" style="width:${taille}"><circle class="h-fond" r="${HORLOGE_VIEW.radius}" stroke-width="${HORLOGE_VIEW.rim}"/>${traits}${chiffres}${minutes}<line class="h-aiguille h-heures" x1="0" y1="0" x2="${s.hourHand.x}" y2="${s.hourHand.y}" stroke-width="${HORLOGE_STROKE.hourHand}"/><circle class="h-axe" r="${HORLOGE_STROKE.center}"/></svg>`;
	});
	return { html: figures(cadrans, legendes(spec.captions, spec.times.length)) };
}

// ---- Courbe : balisage de Courbe.svelte, même scène `buildCourbeScene` ----

/** Marge autour du cadre et décalage des rangs u_k de l'escalier, en px (Courbe.svelte) */
const COURBE_PAD = 26;
const COURBE_RANG = 26;
const COURBE_COULEUR = namedColorTable(COURBE_COLORS, namedColorScreen);
/** Lettres calligraphiques Unicode (`\mathcal{C}` → 𝒞), comme Courbe.svelte */
const CALLIGRAPHIE: Record<string, string> = {
	B: 'ℬ',
	E: 'ℰ',
	F: 'ℱ',
	H: 'ℋ',
	I: 'ℐ',
	L: 'ℒ',
	M: 'ℳ',
	R: 'ℛ'
};

function lettreDeCourbe(label: CourbeLabel): string {
	if (!label.calligraphic) return label.base;
	const m = label.base.toUpperCase();
	return CALLIGRAPHIE[m] ?? String.fromCodePoint(0x1d49c + m.charCodeAt(0) - 65);
}

function courbe(source: string): Bloc {
	const node = parseCourbeContent(source);
	if (!node.spec)
		throw new Error('bloc courbe en erreur : ' + node.errors.map((e) => e.message).join(' ; '));
	const sc = buildCourbeScene(node.spec, { locale: 'fr' });
	const avertissements = [...node.warnings, ...sc.warnings].map(
		(w) => `bloc courbe : ${w.message}`
	);
	const { width: w, height: h } = sc.pixelSize;
	const P = COURBE_PAD;
	const sx = (x: number) =>
		+(P + ((x - sc.window.xMin) / (sc.window.xMax - sc.window.xMin)) * w).toFixed(2);
	const sy = (y: number) =>
		+(P + ((sc.window.yMax - y) / (sc.window.yMax - sc.window.yMin)) * h).toFixed(2);
	const pts = (ps: ScenePoint[]) => ps.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ');
	const seg = (c: string, a: ScenePoint, b: ScenePoint, style = '') =>
		`<line class="${c}" x1="${sx(a.x)}" y1="${sy(a.y)}" x2="${sx(b.x)}" y2="${sy(b.y)}"${style}/>`;
	const trait = (c: CourbeColor) => ` style="stroke:${COURBE_COULEUR[c]}"`;
	const ax = sy(sc.axes.xAxisY);
	const ay = sx(sc.axes.yAxisX);
	const bas = sc.sequences.some((s) => (s.staircase?.termLabels.length ?? 0) > 0) ? COURBE_RANG : 0;
	const parties = [
		// Grille
		...sc.grid.xs.map(
			(x) => `<line class="cg" x1="${sx(x)}" y1="${P}" x2="${sx(x)}" y2="${P + h}"/>`
		),
		...sc.grid.ys.map(
			(y) => `<line class="cg" x1="${P}" y1="${sy(y)}" x2="${P + w}" y2="${sy(y)}"/>`
		),
		// Aires
		...sc.areas.map(
			(a) =>
				`<polygon points="${pts(a.polygon)}" style="fill:color-mix(in srgb, ${COURBE_COULEUR[a.color]} 22%, transparent)"/>`
		),
		// Axes et pointes
		`<line class="ca" x1="${P}" y1="${ax}" x2="${P + w + 8}" y2="${ax}"/>`,
		`<line class="ca" x1="${ay}" y1="${P + h}" x2="${ay}" y2="${P - 8}"/>`,
		`<polygon class="cf" points="${P + w + 12},${ax} ${P + w + 5},${ax - 3.5} ${P + w + 5},${ax + 3.5}"/>`,
		`<polygon class="cf" points="${ay},${P - 12} ${ay - 3.5},${P - 5} ${ay + 3.5},${P - 5}"/>`,
		// Graduations
		...sc.ticks.x.map(
			(t) =>
				`<line class="ck" x1="${sx(t.value)}" y1="${ax - 3}" x2="${sx(t.value)}" y2="${ax + 3}"/><text class="ct" x="${sx(t.value)}" y="${ax + 13}" text-anchor="middle">${attr(t.label)}</text>`
		),
		...sc.ticks.y.map(
			(t) =>
				`<line class="ck" x1="${ay - 3}" y1="${sy(t.value)}" x2="${ay + 3}" y2="${sy(t.value)}"/><text class="ct" x="${ay - 5}" y="${sy(t.value) + 3.5}" text-anchor="end">${attr(t.label)}</text>`
		),
		sc.originVisible
			? `<text class="ct" x="${sx(0) - 5}" y="${sy(0) + 13}" text-anchor="end">O</text>`
			: '',
		// Asymptotes, courbes
		...sc.asymptotes.map((a) => seg('cas', a.from, a.to)),
		...sc.curves.flatMap((c) =>
			c.polylines.map(
				(p) => `<polyline class="cc${c.dashed ? ' cpt' : ''}" points="${pts(p)}"${trait(c.color)}/>`
			)
		),
		// Escaliers : y = x, relation, rappels, marches, rangs u_k
		...sc.sequences.flatMap((s) =>
			s.staircase
				? [
						...s.staircase.diagonal.map((p) => `<polyline class="cas" points="${pts(p)}"/>`),
						...s.staircase.curve.map(
							(p) => `<polyline class="cc" points="${pts(p)}"${trait(s.staircase!.relationColor)}/>`
						),
						...s.staircase.guides.map((g) => seg('crp', g.from, g.to, trait(s.color))),
						...s.staircase.steps.map(
							(p) => `<polyline class="ce" points="${pts(p)}"${trait(s.color)}/>`
						),
						...s.staircase.termLabels.map(
							(l) =>
								`<text class="cr" x="${sx(l.x)}" y="${ax + COURBE_RANG}" text-anchor="middle" style="fill:${COURBE_COULEUR[s.color]}">${attr(s.name)}<tspan class="ci" dy="3">${l.n}</tspan></text>`
						)
					]
				: []
		),
		// Tangentes et point de contact
		...sc.tangents.flatMap((t) => [
			...t.line.map((p) => `<polyline class="ctg" points="${pts(p)}"${trait(t.color)}/>`),
			`<circle cx="${sx(t.point.x)}" cy="${sy(t.point.y)}" r="3" style="fill:${COURBE_COULEUR[t.color]}"/>`
		]),
		// Bornes du domaine, termes des suites, points nommés, noms des courbes
		...sc.endpoints.map(
			(e) =>
				`<circle cx="${sx(e.x)}" cy="${sy(e.y)}" r="3.5" stroke-width="1.5" style="stroke:${COURBE_COULEUR[e.color]};fill:${e.open ? 'var(--color-background)' : COURBE_COULEUR[e.color]}"/>`
		),
		...sc.sequences.flatMap((s) =>
			s.terms.map(
				(t) =>
					`<circle cx="${sx(t.x)}" cy="${sy(t.y)}" r="3" style="fill:${COURBE_COULEUR[s.color]}"/>`
			)
		),
		...sc.points.map(
			(p) =>
				`<circle class="cf" cx="${sx(p.x)}" cy="${sy(p.y)}" r="2.75"/><text class="cpn" x="${sx(p.x) + 5}" y="${sy(p.y) - 5}">${attr(p.name)}</text>`
		),
		...sc.curveLabels.map(
			(l) =>
				`<text class="cn" x="${sx(l.x) + 6}" y="${sy(l.y) - 6}" style="fill:${COURBE_COULEUR[l.color]}">${attr(lettreDeCourbe(l.label))}${l.label.sub ? `<tspan class="ci" dy="4">${attr(l.label.sub)}</tspan>` : ''}</text>`
		)
	].join('');
	const vw = w + 2 * P;
	const vh = h + 2 * P + bas;
	return {
		html: `<svg class="courbe" role="img" aria-label="${attr(sc.ariaLabel)}" viewBox="0 0 ${vw} ${vh}" style="max-width:${vw}px">${parties}</svg>`,
		avertissements
	};
}

// ---- Variation : tableau de VariationTable.svelte (même parseur, mêmes flèches) ----

/** `±inf` en `±\infty`, comme `toLatex` de VariationTable.svelte */
const versLatex = (e: string) =>
	e.replace(/\+inf/g, '+\\infty').replace(/-inf/g, '-\\infty').replace(/^inf$/g, '\\infty');
/** Formule que le gabarit rend en KaTeX (`data-tex`), rien si la valeur est implicite */
const tex = (e: string) => (e ? `<span class="tex" data-tex="${attr(versLatex(e))}"></span>` : '');
const RANG: Record<VariationPosition, number> = {
	top: 3,
	'limit-top': 3,
	center: 2,
	bottom: 1,
	'limit-bottom': 1
};
const PLACE: Record<VariationPosition, string> = {
	top: 'vt-haut',
	'limit-top': 'vt-haut',
	center: 'vt-milieu',
	bottom: 'vt-bas',
	'limit-bottom': 'vt-bas'
};
const MARQUE: Record<VariationMarker, string> = {
	zero: '<span class="vt-zero">0</span>',
	asymptote: '<span class="vt-barre"></span>',
	forbidden: '<span class="vt-hachure"></span>',
	discontinuity: '<span class="vt-zero">d</span>'
};
/** Hachure sur toute la case d'intervalle (`vt-hatch-wide` de l'écran) */
const MARQUE_LARGE = '<span class="vt-hachure vt-large"></span>';

function signe(v: SignValue | undefined): string {
	if (!v) return '';
	if (v.type === 'marker') return MARQUE[v.marker];
	return `<span class="vt-signe">${v.value === '-' ? '−' : '+'}</span>`;
}

/** Case d'intervalle : l'écran n'y montre que le signe ou la hachure, jamais 0, barre ni `d` */
function signeDIntervalle(v: SignValue | undefined): string {
	if (!v) return '';
	if (v.type === 'marker') return v.marker === 'forbidden' ? MARQUE_LARGE : '';
	return signe(v);
}

/** Zone interdite : ni flèche ni valeur (valeur interdite, asymptote sans limite) */
const interdite = (v: VariationValue | undefined) =>
	!!v && (v.marker === 'forbidden' || (v.marker === 'asymptote' && !v.limits && !v.limitSide));

function valeurDeVariation(v: VariationValue | undefined): string {
	if (!v) return '';
	const val = (e: string, p: VariationPosition) =>
		`<div class="vt-val ${PLACE[p]}">${tex(e)}</div>`;
	if (v.marker === 'forbidden') return MARQUE.forbidden;
	if (v.marker === 'asymptote') {
		if (v.limits)
			return `<div class="vt-asy">${val(v.limits[0].expression, v.limits[0].position)}${MARQUE.asymptote}${val(v.limits[1].expression, v.limits[1].position)}</div>`;
		if (v.limitSide === 'left')
			return `<div class="vt-asy">${val(v.expression, v.position)}${MARQUE.asymptote}</div>`;
		if (v.limitSide === 'right')
			return `<div class="vt-asy">${MARQUE.asymptote}${val(v.expression, v.position)}</div>`;
		return MARQUE.asymptote;
	}
	return val(v.expression, v.position);
}

/** Sens de la flèche : on quitte la limite de DROITE, on arrive à celle de GAUCHE (comme l'écran) */
function sens(de: VariationValue | undefined, vers: VariationValue | undefined): 1 | -1 | 0 {
	if (!de || !vers) return 0;
	const a = RANG[de.limits ? de.limits[1].position : de.position] ?? 2;
	const b = RANG[vers.limits ? vers.limits[0].position : vers.position] ?? 2;
	return a === b ? 0 : b > a ? 1 : -1;
}

/** Flèche de la case (cadre 100 × 60, comme l'écran), pointe dessinée : pas de `marker` à identifiant */
function fleche(s: 1 | -1): string {
	const [y1, y2] = s === 1 ? [55, 5] : [5, 55];
	const angle = Math.atan2(y2 - y1, 90);
	const pointe = [0, -0.4, 0.4]
		.map((da, k) =>
			k === 0 ? [95, y2] : [95 - 22 * Math.cos(angle + da), y2 - 22 * Math.sin(angle + da)]
		)
		.map(([x, y]) => `${+x.toFixed(2)},${+y.toFixed(2)}`)
		.join(' ');
	return `<svg class="vt-fleche" viewBox="0 0 100 60" role="img" aria-label="${s === 1 ? 'croissante' : 'décroissante'}"><line x1="5" y1="${y1}" x2="95" y2="${y2}"/><polygon points="${pointe}"/></svg>`;
}

function variation(source: string): Bloc {
	const { node, errors } = parseVariationTableContent(source.split('\n'));
	if (!node || errors.length > 0)
		throw new Error(
			'bloc variation en erreur : ' +
				(errors
					.map(
						(e) =>
							`${e.message}${e.line ? ` (ligne ${e.line})` : ''}${e.content ? ` : ${e.content}` : ''}`
					)
					.join(' ; ') || 'illisible')
		);
	const d = node.domain;
	const derniere = d.length - 1;
	// Une ligne : l'étiquette, puis une case par valeur et une par intervalle
	const ligne = (
		classe: string,
		etiquette: string,
		point: (i: number) => string,
		intervalle: (i: number) => string
	) =>
		`<tr class="${classe}"><th>${tex(etiquette)}</th>${d
			.map(
				(_, i) =>
					`<td class="vt-point">${point(i)}</td>` +
					(i < derniere ? `<td class="vt-intervalle">${intervalle(i)}</td>` : '')
			)
			.join('')}</tr>`;
	const tete = `<tr class="vt-tete"><th>${tex(node.variable)}</th>${d
		.map((p, i) => `<th>${tex(p.expression)}</th>` + (i < derniere ? '<th></th>' : ''))
		.join('')}</tr>`;
	const lignes = node.rows.map((row) => {
		if (row.type === 'sign')
			return ligne(
				'vt-ligne-signe',
				row.label,
				(i) => signe(row.values.get(d[i].expression)),
				(i) => signeDIntervalle(row.values.get(`${d[i].expression},${d[i + 1].expression}`))
			);
		const r = withImplicitEndpoints(row, d);
		const v = (i: number) => r.values.get(d[i].expression);
		return ligne(
			'vt-ligne-variation',
			r.label,
			(i) => valeurDeVariation(v(i)),
			(i) => {
				if (interdite(v(i)) || interdite(v(i + 1))) return MARQUE_LARGE;
				const s = sens(v(i), v(i + 1));
				return s === 0 ? '' : fleche(s);
			}
		);
	});
	return {
		html: `<table class="vt" aria-label="Tableau de la fonction ${attr(node.variable)}">${tete}${lignes.join('')}</table>`
	};
}

// ---- Partage : polygones de `buildPartageScenes`, comme Partage.svelte ----

function partageSvg(
	scene: PartageScene,
	label: string,
	coloriees: (part: PartagePart) => boolean
): string {
	const w = scene.width + 2 * PARTAGE_MARGIN;
	const h = scene.height + 2 * PARTAGE_MARGIN;
	const parts = scene.parts
		.map((part) => {
			const points = part.points
				.map((p) => `${+(p.x + PARTAGE_MARGIN).toFixed(2)},${+(p.y + PARTAGE_MARGIN).toFixed(2)}`)
				.join(' ');
			return `<polygon class="p-part${coloriees(part) ? ' p-coloriee' : ''}" points="${points}"/>`;
		})
		.join('');
	return `<svg class="p-dessin" role="img" aria-label="${attr(label)}" viewBox="0 0 ${w} ${h}" style="width:${+(w * PARTAGE_CM_PER_UNIT).toFixed(2)}cm" stroke-width="${PARTAGE_STROKE}" stroke-linejoin="round">${parts}</svg>`;
}

/**
 * Figure partagée. À colorier (`colorier:`) : la figure vide que voit l'élève, puis un coloriage
 * juste (les premières parts ; l'appli accepte toutes les parts qui font la fraction).
 */
function partage(source: string): Bloc {
	const node = parsePartageContent(source);
	const spec = node.spec;
	if (!spec || node.errors.length > 0)
		throw new Error('bloc partage en erreur : ' + node.errors.join(' ; ') + ' : ' + source);
	const scenes = buildPartageScenes(spec);
	const dessins = (coloriees: (part: PartagePart) => boolean) =>
		scenes.map((scene, i) => partageSvg(scene, partageFigureLabel(spec, i), coloriees));
	if (!spec.colorier)
		return {
			html: figures(
				dessins((part) => part.shaded),
				[]
			)
		};
	const n = spec.colorier.parts;
	const total = scenes.reduce((t, sc) => t + sc.parts.length, 0);
	return {
		html:
			`<div class="cons"><span class="r-tag">À colorier : ${spec.colorier.num}/${spec.colorier.den}, l'élève touche les parts</span>${figures(
				dessins(() => false),
				[]
			)}` +
			`<span class="r-tag">Un coloriage juste : ${n} part${n > 1 ? 's' : ''} sur ${total}</span>${figures(
				dessins((part) => part.rank <= n),
				[]
			)}</div>`
	};
}

// ---- Statistiques : scènes de `buildStatChartScene`, balisage de StatChart.svelte / BoxPlotChart.svelte ----

const STAT_HAUT = 26;
const STAT_DROITE = 12;
const STAT_BAS = 26;
const STAT_TITRE_AXE = 18;
const STAT_GAUCHE = 44;
const STAT_GAUCHE_MIN = 40;
const STAT_CHIFFRE_PX = 6.2;
const SIN_45 = Math.SQRT1_2;
/** Nombre de motifs de hachures posés : un identifiant par motif, unique dans la page */
let hachuresPosees = 0;

/** Coordonnée de SVG arrondie au centième */
const c2 = (x: number) => +x.toFixed(2);
const trait = (c: CourbeColor) => ` style="stroke:${COURBE_COULEUR[c]}"`;

function motifHachures(id: string, couleur: CourbeColor): string {
	return `<defs><pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke-width="2.5" style="stroke:${COURBE_COULEUR[couleur]}"/></pattern></defs>`;
}

function cadreSvg(
	scene: StatChartScene,
	largeur: number,
	hauteur: number,
	contenu: string,
	classe = ''
): string {
	return `<svg class="stat-svg${classe}" role="img" aria-label="${attr(`${scene.accessibleTitle}. ${scene.description}`)}" viewBox="0 0 ${c2(largeur)} ${c2(hauteur)}" style="max-width:${c2(largeur)}px">${contenu}</svg>`;
}

function pointsDe(ps: ScenePoint[], x: (v: number) => number, y: (v: number) => number): string {
	return ps.map((p) => `${c2(x(p.x))},${c2(y(p.y))}`).join(' ');
}

/** Axes : flèche de l'axe vertical, titres, axe horizontal (communs aux barres et aux classes) */
function axesStat(
	gauche: number,
	largeur: number,
	yAxe: number,
	titreY: string | null,
	titreX: string | null,
	bas: number
): string {
	return (
		`<g class="stat-axes"><line x1="${gauche}" y1="${c2(yAxe)}" x2="${c2(gauche + largeur)}" y2="${c2(yAxe)}"/>` +
		`<line x1="${gauche}" y1="${c2(yAxe)}" x2="${gauche}" y2="${STAT_HAUT - 10}"/>` +
		`<polygon points="${gauche},${STAT_HAUT - 14} ${gauche - 3.5},${STAT_HAUT - 7} ${gauche + 3.5},${STAT_HAUT - 7}"/>` +
		(titreY
			? `<text class="stat-titre-axe" x="${gauche + 6}" y="${STAT_HAUT - 12}">${attr(titreY)}</text>`
			: '') +
		(titreX
			? `<text class="stat-titre-axe" x="${c2(gauche + largeur / 2)}" y="${c2(bas - 4)}" text-anchor="middle">${attr(titreX)}</text>`
			: '') +
		'</g>'
	);
}

function graduationsY(
	ticks: { value: number; label: string }[],
	gauche: number,
	largeur: number,
	y: (v: number) => number
): string {
	return (
		'<g class="stat-graduations">' +
		ticks
			.map(
				(t) =>
					`<line class="stat-grille" x1="${gauche}" y1="${c2(y(t.value))}" x2="${c2(gauche + largeur)}" y2="${c2(y(t.value))}"/>` +
					`<line x1="${gauche - 4}" y1="${c2(y(t.value))}" x2="${gauche}" y2="${c2(y(t.value))}"/>` +
					`<text x="${gauche - 6}" y="${c2(y(t.value))}" text-anchor="end" dominant-baseline="middle">${attr(t.label)}</text>`
			)
			.join('') +
		'</g>'
	);
}

const legendeSeries = (items: string) => `<ul class="stat-legende-series">${items}</ul>`;

function barresStat(s: BarScene): string {
	const hachure = s.secondColor ? `stat-hachures-${++hachuresPosees}` : '';
	const tourne = s.rotateLabels;
	const etendue = tourne ? s.longestLabel * STAT_CHART_CHAR_PX * SIN_45 : 0;
	const w = s.pixelSize.width;
	const h = s.pixelSize.height;
	const bas = (tourne ? 16 + etendue : STAT_BAS) + (s.axisTitles.x ? STAT_TITRE_AXE : 0);
	const gauche = Math.max(
		STAT_GAUCHE_MIN,
		12 + Math.max(...s.ticks.map((t) => t.label.length)) * STAT_CHIFFRE_PX,
		etendue - w / s.labels.length / 2 + 6
	);
	const sx = (x: number) => gauche + (x / s.labels.length) * w;
	const sy = (v: number) => STAT_HAUT + (1 - v / s.yMax) * h;
	const rects = s.bars
		.map((b) => {
			const fond =
				b.series === 1
					? `url(#${hachure})`
					: b.highlighted === false
						? 'var(--color-muted-foreground)'
						: COURBE_COULEUR[s.color];
			const bord =
				b.series === 1 && s.secondColor ? `;stroke:${COURBE_COULEUR[s.secondColor]}` : '';
			return (
				`<rect class="stat-barre" x="${c2(sx(b.left))}" y="${c2(sy(b.value))}" width="${c2(sx(b.right) - sx(b.left))}" height="${c2(sy(0) - sy(b.value))}" style="fill:${fond}${bord}"/>` +
				(s.showValues
					? `<text class="stat-valeur${s.legend ? ' stat-valeur-serree' : ''}" x="${c2((sx(b.left) + sx(b.right)) / 2)}" y="${c2(sy(b.value) - 4)}" text-anchor="middle">${attr(b.valueLabel)}</text>`
					: '')
			);
		})
		.join('');
	const noms = s.labels
		.map((l) => {
			const x = c2(sx(l.center));
			return tourne
				? `<text x="${x}" y="${c2(sy(0) + 10)}" text-anchor="end" transform="rotate(-45 ${x} ${c2(sy(0) + 10)})">${attr(l.text)}</text>`
				: `<text x="${x}" y="${c2(sy(0) + 16)}" text-anchor="middle">${attr(l.text)}</text>`;
		})
		.join('');
	const total = STAT_HAUT + h + bas;
	let html = cadreSvg(
		s,
		gauche + w + STAT_DROITE,
		total,
		(s.secondColor ? motifHachures(hachure, s.secondColor) : '') +
			graduationsY(s.ticks, gauche, w, sy) +
			rects +
			`<g class="stat-categories">${noms}</g>` +
			axesStat(gauche, w, sy(0), s.axisTitles.y, s.axisTitles.x, total)
	);
	if (s.legend && s.secondColor) {
		const seconde = s.secondColor;
		html += legendeSeries(
			s.legend
				.map(
					(nom, i) =>
						`<li><svg width="12" height="12" aria-hidden="true"><rect x="0.5" y="0.5" width="11" height="11" style="fill:${i === 0 ? COURBE_COULEUR[s.color] : `url(#${hachure})`};stroke:${i === 0 ? 'none' : COURBE_COULEUR[seconde]}"/></svg>${attr(nom)}</li>`
				)
				.join('')
		);
	}
	if (s.indicatorTable) html += comparaisonStat(s.indicatorTable);
	return html;
}

/** Cadre commun des classes (histogramme, polygone) : marges, échelles, graduations horizontales */
function classesStat(
	s: HistogramScene | CumulativeScene,
	dessin: (cx: (x: number) => number, cy: (v: number) => number, yMax: number) => string,
	defs = ''
): string {
	const w = s.pixelSize.width;
	const h = s.pixelSize.height;
	const yMax = s.kind === 'histogramme' ? s.yMax : 100;
	const bas = STAT_BAS + (s.axisTitles.x ? STAT_TITRE_AXE : 0);
	const cx = (x: number) => STAT_GAUCHE + ((x - s.xMin) / (s.xMax - s.xMin)) * w;
	const cy = (v: number) => STAT_HAUT + (1 - v / (yMax || 1)) * h;
	const carreaux = s.kind === 'histogramme' && s.mode === 'carreaux';
	const total = STAT_HAUT + h + bas;
	const xTicks = s.xTicks
		.map(
			(t) =>
				`<line x1="${c2(cx(t.value))}" y1="${c2(cy(0))}" x2="${c2(cx(t.value))}" y2="${c2(cy(0) + 4)}"/><text x="${c2(cx(t.value))}" y="${c2(cy(0) + 16)}" text-anchor="middle">${attr(t.label)}</text>`
		)
		.join('');
	return cadreSvg(
		s,
		STAT_GAUCHE + w + STAT_DROITE,
		total,
		defs +
			(carreaux ? '' : graduationsY(s.ticks, STAT_GAUCHE, w, cy)) +
			dessin(cx, cy, yMax) +
			`<g class="stat-axes">${xTicks}</g>` +
			axesStat(STAT_GAUCHE, w, cy(0), s.axisTitles.y, s.axisTitles.x, total)
	);
}

function histogrammeStat(s: HistogramScene): string {
	const id = s.hatched ? `stat-hachures-${++hachuresPosees}` : '';
	const defs = s.hatched ? motifHachures(id, s.hatchColor ?? 'orange') : '';
	let html = s.seriesName ? `<div class="stat-nom-serie">${attr(s.seriesName)}</div>` : '';
	html += classesStat(
		s,
		(cx, cy, yMax) => {
			const rects = s.rects
				.map((r) => {
					const fond = s.hatched
						? `url(#${id})`
						: r.highlighted === false
							? 'var(--color-muted-foreground)'
							: COURBE_COULEUR[s.color];
					const bord = s.hatched ? `;stroke:${COURBE_COULEUR[s.hatchColor ?? 'orange']}` : '';
					return (
						`<rect class="stat-rectangle${s.densityCurve ? ' stat-rectangle-sous-courbe' : ''}" x="${c2(cx(r.lower))}" y="${c2(cy(r.height))}" width="${c2(cx(r.upper) - cx(r.lower))}" height="${c2(cy(0) - cy(r.height))}" style="fill:${fond}${bord}"/>` +
						(s.showValues
							? `<text class="stat-valeur" x="${c2((cx(r.lower) + cx(r.upper)) / 2)}" y="${c2(cy(r.height) - 4)}" text-anchor="middle">${attr(r.valueLabel)}</text>`
							: '')
					);
				})
				.join('');
			const courbe = s.densityCurve
				? `<polyline class="stat-polygone" points="${pointsDe(s.densityCurve.points, cx, cy)}"${trait(s.densityCurve.color)}/>`
				: '';
			const grille =
				s.mode === 'carreaux'
					? `<g class="stat-quadrillage">${s.grid.xs.map((x) => `<line x1="${c2(cx(x))}" y1="${c2(cy(0))}" x2="${c2(cx(x))}" y2="${c2(cy(yMax))}"/>`).join('')}${s.grid.ys.map((y) => `<line x1="${c2(cx(s.xMin))}" y1="${c2(cy(y))}" x2="${c2(cx(s.xMax))}" y2="${c2(cy(y))}"/>`).join('')}</g>`
					: '';
			return rects + courbe + grille;
		},
		defs
	);
	if (s.carreau)
		html += `<p class="stat-legende-aire"><span class="stat-carreau"></span>${attr(s.carreau.legend)}</p>`;
	if (s.second) html += histogrammeStat(s.second);
	if (s.indicatorTable) html += comparaisonStat(s.indicatorTable);
	return html;
}

function polygoneStat(s: CumulativeScene): string {
	let html = classesStat(s, (cx, cy) => {
		const polygone = (points: ScenePoint[], couleur: CourbeColor, classe: string): string =>
			`<polyline class="stat-polygone${classe}" points="${pointsDe(points, cx, cy)}"${trait(couleur)}/>` +
			points
				.map(
					(p) =>
						`<circle class="stat-sommet" cx="${c2(cx(p.x))}" cy="${c2(cy(p.y))}" r="2.5" style="fill:${COURBE_COULEUR[couleur]}"/>`
				)
				.join('');
		/** Lecture : pointillés de l'axe vertical au polygone, puis à l'axe horizontal */
		const lecture = (r: SceneReading, x: number, y: number, style: string, texteStyle: string) =>
			`<g class="stat-lecture"><polyline points="${c2(cx(s.xMin))},${c2(cy(r.percent))} ${c2(cx(r.x))},${c2(cy(r.percent))} ${c2(cx(r.x))},${c2(cy(0))}"${style}/><text x="${c2(x)}" y="${c2(y)}"${texteStyle}>${attr(r.text)}</text></g>`;
		const croissant = s.direction === 'croissantes';
		let out = polygone(s.points, s.color, '');
		if (s.second) {
			const sec = s.second;
			out += polygone(sec.points, sec.color, ' stat-polygone-second');
			out += sec.readings
				.map((r) =>
					lecture(
						r,
						cx(r.x) + 4,
						cy(r.percent) + (croissant ? 12 : -4),
						trait(sec.color),
						` style="fill:${COURBE_COULEUR[sec.color]}"`
					)
				)
				.join('');
		}
		out += s.readings
			.map((r) => lecture(r, cx(s.xMin) + 4, cy(r.percent) + (croissant ? -4 : 12), '', ''))
			.join('');
		return out;
	});
	if (s.legend && s.second) {
		const seconde = s.second;
		html += legendeSeries(
			s.legend
				.map(
					(nom, i) =>
						`<li><svg width="18" height="8" aria-hidden="true"><line x1="0" y1="4" x2="18" y2="4" stroke-width="2"${i === 0 ? '' : ' stroke-dasharray="4 3"'} style="stroke:${COURBE_COULEUR[i === 0 ? s.color : seconde.color]}"/></svg>${attr(nom)}</li>`
				)
				.join('')
		);
	}
	if (s.indicatorTable) html += comparaisonStat(s.indicatorTable);
	return html;
}

/** Légende visible seulement quand l'auteur a écrit un titre (sinon `sr-only` à l'écran) */
const tableStat = (legende: string, corps: string) =>
	`<div class="stat-tableau-defilement"><table class="stat-tableau">${legende === '' ? '' : `<caption>${legende}</caption>`}${corps}</table></div>`;

/** Tableau croisé : cases `?` ou masquées vides (`stat-case-vide`), à compléter */
function croiseStat(s: CrossTableScene): string {
	const tete = `<thead><tr><td class="stat-coin">${s.corner === null ? '' : attr(s.corner)}</td>${s.columnHeaders.map((c) => `<th>${attr(c)}</th>`).join('')}</tr></thead>`;
	const lignes = s.rows
		.map(
			(r) =>
				`<tr><th>${attr(r.header)}</th>${r.cells.map((c) => (c.hidden ? '<td class="stat-case-vide"></td>' : `<td>${attr(c.text)}</td>`)).join('')}</tr>`
		)
		.join('');
	return tableStat(attr(s.title ?? ''), `${tete}<tbody>${lignes}</tbody>`);
}

function comparaisonStat(s: ComparisonScene): string {
	const tete = `<thead><tr><td></td>${s.columns.map((c) => `<th>${attr(c)}</th>`).join('')}</tr></thead>`;
	const lignes = s.rows
		.map(
			(r) =>
				`<tr${r.groupStart ? ' class="stat-groupe"' : ''}><th>${attr(r.header)}</th>${r.cells.map((c) => `<td>${attr(c)}</td>`).join('')}</tr>`
		)
		.join('');
	return tableStat(attr(s.accessibleTitle), `${tete}<tbody>${lignes}</tbody>`);
}

function simulationStat(s: SimulationScene): string {
	const tete = `<thead><tr><th><i>${attr(s.variable.toLowerCase())}</i><sub>i</sub></th><th>${attr(s.headers.count)}</th><th>${attr(s.headers.frequency)}</th><th>${attr(s.headers.probability)}</th></tr></thead>`;
	const lignes = s.rows
		.map(
			(r) =>
				`<tr><th>${attr(r.value)}</th><td>${attr(r.count)}</td><td>${attr(r.frequency)}</td><td>${attr(r.probability)}</td></tr>`
		)
		.join('');
	return tableStat(
		(s.title ? `<span class="stat-titre">${attr(s.title)}</span>` : '') + attr(s.caption),
		`${tete}<tbody>${lignes}</tbody>`
	);
}

/** Boîtes à moustaches horizontales (BoxPlotChart.svelte) */
function boitesStat(s: BoxPlotScene): string {
	const w = s.pixelSize.width;
	const hauteur = s.pixelSize.height;
	const marge = (t: { label: string } | undefined) =>
		Math.max(12, ((t?.label.length ?? 0) * SCATTER_LABEL_CHAR_PX) / 2 + 4);
	const gauche = marge(s.xTicks[0]);
	const droite = marge(s.xTicks.at(-1));
	const haut = 4;
	const axe = haut + hauteur;
	const total = axe + 26 + (s.axisTitle ? STAT_TITRE_AXE : 0);
	const sx = (v: number) => gauche + ((v - s.xMin) / (s.xMax - s.xMin || 1)) * w;
	const couleur = COURBE_COULEUR[s.color];
	const grille = s.xTicks
		.map(
			(t) =>
				`<line class="stat-grille" x1="${c2(sx(t.value))}" y1="${haut}" x2="${c2(sx(t.value))}" y2="${axe}"/>`
		)
		.join('');
	const ligne = (c: string, x1: number, y1: number, x2: number, y2: number) =>
		`<line class="${c}" x1="${c2(x1)}" y1="${c2(y1)}" x2="${c2(x2)}" y2="${c2(y2)}"/>`;
	const boites = s.boxes
		.map((box, i) => {
			const band = s.bands[i];
			const top = haut + band.top;
			const bottom = haut + band.bottom;
			const milieu = (top + bottom) / 2;
			const bout = (bottom - top) / 4;
			const [min, q1, med, q3, max] = box.values;
			const nom =
				box.name !== null && band.nameY !== null
					? `<text class="stat-nom-boite" x="${gauche}" y="${haut + band.nameY}">${attr(box.name)}</text>`
					: '';
			// Boîte à construire (`placer:`) : son nom seul, comme l'écran hors geste
			if (box.toPlace) return `<g>${nom}</g>`;
			return (
				`<g style="stroke:${couleur}">${nom}` +
				ligne('stat-moustache', sx(min), milieu, sx(q1), milieu) +
				ligne('stat-moustache', sx(q3), milieu, sx(max), milieu) +
				ligne('stat-moustache-bout', sx(min), top + bout, sx(min), bottom - bout) +
				ligne('stat-moustache-bout', sx(max), top + bout, sx(max), bottom - bout) +
				`<rect class="stat-boite" x="${c2(sx(q1))}" y="${c2(top)}" width="${c2(sx(q3) - sx(q1))}" height="${c2(bottom - top)}" style="fill:color-mix(in oklab, ${couleur} 22%, var(--color-background))"/>` +
				ligne('stat-mediane', sx(med), top, sx(med), bottom) +
				(s.showValues
					? box.values
							.map(
								(v, j) =>
									`<text class="stat-valeur" x="${c2(sx(v))}" y="${haut + band.valueY[box.valueRows[j]]}" text-anchor="middle">${attr(box.labels[j])}</text>`
							)
							.join('')
					: '') +
				'</g>'
			);
		})
		.join('');
	const graduations = s.xTicks
		.map(
			(t) =>
				`<line x1="${c2(sx(t.value))}" y1="${axe}" x2="${c2(sx(t.value))}" y2="${axe + 4}"/><text x="${c2(sx(t.value))}" y="${axe + 16}" text-anchor="middle">${attr(t.label)}</text>`
		)
		.join('');
	const axes =
		`<g class="stat-axes"><line x1="${gauche}" y1="${axe}" x2="${c2(gauche + w)}" y2="${axe}"/>${graduations}` +
		(s.axisTitle
			? `<text class="stat-titre-axe" x="${c2(gauche + w / 2)}" y="${total - 4}" text-anchor="middle">${attr(s.axisTitle)}</text>`
			: '') +
		'</g>';
	return cadreSvg(s, gauche + w + droite, total, grille + boites + axes, ' stat-boites');
}

/** Messages situés d'un bloc que le parseur refuse : la page s'arrête sur la ligne fautive */
const erreursSituees = (
	bloc: string,
	errors: { message: string; line?: number; content?: string }[]
) =>
	`bloc ${bloc} en erreur : ` +
	(errors
		.map(
			(e) =>
				`${e.message}${e.line ? ` (ligne ${e.line})` : ''}${e.content ? ` : ${e.content}` : ''}`
		)
		.join(' ; ') || 'illisible');

/** Un bloc statistique : parse, scène (la même que l'écran), puis balisage de la scène */
function statistique(kind: StatChartKind, source: string): Bloc {
	const node = parseStatChartContent(kind, source);
	if (!node.spec || node.errors.length > 0) throw new Error(erreursSituees(kind, node.errors));
	const sc = buildStatChartScene(node.spec, { locale: 'fr' });
	const avertissements = node.warnings.map((w) => `bloc ${kind} : ${w.message}`);
	const figure = (corps: string, titre = true) =>
		(titre && sc.title ? `<div class="stat-titre">${attr(sc.title)}</div>` : '') +
		(sc.series ? `<p class="stat-serie">${attr(sc.series).replace(/\n/g, '<br>')}</p>` : '') +
		corps +
		(sc.indicators.length > 0
			? `<ul class="stat-indicateurs">${sc.indicators.map((i) => `<li>${attr(i)}</li>`).join('')}</ul>`
			: '');
	// « série: seule » : l'écran ne montre que la série (figure à construire par l'élève)
	if (sc.seriesOnly && sc.series) {
		return {
			html: `<figure class="stat"><p class="stat-serie">${attr(sc.series).replace(/\n/g, '<br>')}</p></figure>`,
			avertissements
		};
	}
	let corps: string;
	switch (sc.kind) {
		case 'barres':
			corps = figure(barresStat(sc));
			break;
		case 'histogramme':
			corps = figure(histogrammeStat(sc));
			break;
		case 'frequences-cumulees':
			corps = figure(polygoneStat(sc));
			break;
		case 'tableau-croise':
			corps = figure(croiseStat(sc), false);
			break;
		case 'boite-a-moustaches':
			corps = figure(boitesStat(sc));
			break;
		case 'simulation':
			corps = figure(simulationStat(sc), false);
			break;
		default:
			// Scène que la page ne sait pas encore dessiner : la source, signalée
			return {
				html: `<div class="non-dessine"><span class="r-tag">bloc ${attr(kind)} (scène ${attr(sc.kind)}), non dessiné ici : le jouer dans l'aperçu</span><code>${source.split('\n').map(attr).join('<br>')}</code></div>`,
				avertissements: [`bloc ${kind} : scène « ${sc.kind} » non dessinée par la page`]
			};
	}
	const aPlacer =
		node.spec.toPlace || node.spec.boxPlot?.toPlace
			? '<span class="r-tag">À construire par l’élève : la correction est dessinée</span>'
			: '';
	return { html: `<figure class="stat">${aPlacer}${corps}</figure>`, avertissements };
}

// ---- Arbre de probabilités : mise en page de ProbabilityTree.svelte (pas de scène partagée) ----

const ARBRE_BRANCHE = 80;
const ARBRE_ECART = 50;
const ARBRE_CAR = 8;
const ARBRE_ETIQUETTE_MIN = 25;
const ARBRE_MARGE_ETIQUETTE = 16;
const ARBRE_PROB_PERP = 14;
const ARBRE_PROB_DECALAGE = 12;
const ARBRE_RACINE_X = 20;
const ARBRE_HAUT = 30;
const ARBRE_DROITE = 40;
const ARBRE_ISSUES = 120;
const ARBRE_INTERSECTION = 180;

/** Largeur visuelle d'une étiquette : une commande LaTeX compte pour un caractère */
function longueurVisuelle(texte: string): number {
	const t = texte
		.replace(/\\(bar|hat|tilde|overline|underline|vec|dot|ddot)\{([^}]*)\}/g, '$2')
		.replace(/\\[a-zA-Z]+/g, 'X')
		.replace(/[{}\\]/g, '');
	return t.length || 1;
}

/** Étiquette de plusieurs lettres : en `\text{}`, comme l'écran */
const etiquetteTex = (e: string) => (e.includes('\\') || e.length === 1 ? e : `\\text{${e}}`);

function arbre(source: string): Bloc {
	const { node, errors } = parseProbTreeContent(source.split('\n'));
	if (!node || errors.length > 0) throw new Error(erreursSituees('probtree', errors));
	const etiquettes: string[] = node.config.rootLabel ? [node.config.rootLabel] : [];
	const collecte = (n: ProbTreeNode) =>
		n.branches.forEach((b) => {
			etiquettes.push(b.eventLabel);
			collecte(b.child);
		});
	collecte(node.root);
	const largeurEtiquette = etiquettes.length
		? Math.max(
				ARBRE_ETIQUETTE_MIN,
				Math.max(...etiquettes.map(longueurVisuelle)) * ARBRE_CAR + ARBRE_MARGE_ETIQUETTE
			)
		: ARBRE_ETIQUETTE_MIN;
	const niveau = ARBRE_BRANCHE + largeurEtiquette;
	const hauteurDe = (n: ProbTreeNode): number =>
		n.isLeaf ? ARBRE_ECART : n.branches.reduce((t, b) => t + hauteurDe(b.child), 0);
	const positions = new Map<string, { x: number; y: number }>();
	const place = (n: ProbTreeNode, x: number, yDebut: number): number => {
		const hauteur = hauteurDe(n);
		if (n.isLeaf) {
			positions.set(n.id, { x, y: yDebut + hauteur / 2 });
			return hauteur;
		}
		let y = yDebut;
		const ys: number[] = [];
		for (const b of n.branches) {
			y += place(b.child, x + niveau, y);
			ys.push(positions.get(b.child.id)!.y);
		}
		positions.set(n.id, { x, y: (Math.min(...ys) + Math.max(...ys)) / 2 });
		return hauteur;
	};
	place(node.root, ARBRE_RACINE_X, ARBRE_HAUT);
	const largeur =
		ARBRE_RACINE_X +
		niveau * node.maxDepth +
		largeurEtiquette +
		ARBRE_DROITE +
		(node.config.showIntersection ? ARBRE_INTERSECTION : 0) +
		(node.config.showOutcomes ? ARBRE_ISSUES : 0);
	const hauteur = hauteurDe(node.root) + 2 * ARBRE_HAUT;
	/** Formule que le gabarit rend en KaTeX, dans un cadre HTML du SVG */
	const formule = (x: number, y: number, l: number, h: number, latex: string, classe: string) =>
		`<foreignObject x="${c2(x)}" y="${c2(y)}" width="${c2(l)}" height="${h}"><div class="pt-label ${classe}"><span class="tex" data-tex="${attr(toLocaleDecimal(latex, 'fr'))}"></span></div></foreignObject>`;
	let corps = '';
	if (node.config.rootLabel) {
		const p = positions.get(node.root.id)!;
		corps += formule(p.x, p.y - 10, largeurEtiquette, 20, etiquetteTex(node.config.rootLabel), '');
	}
	const feuilles: { n: ProbTreeNode; chemin: string[] }[] = [];
	const branches = (n: ProbTreeNode, chemin: string[]) => {
		const p = positions.get(n.id)!;
		for (const b of n.branches) {
			const q = positions.get(b.child.id)!;
			const x1 = p.x + largeurEtiquette;
			const dx = q.x - x1;
			const dy = q.y - p.y;
			const longueur = Math.hypot(dx, dy);
			const decalage =
				Math.abs(dy / dx) < 0.3 ? ARBRE_PROB_DECALAGE : dy > 10 ? ARBRE_PROB_DECALAGE * 0.5 : 0;
			const lx = (x1 + q.x) / 2 + (dy / longueur) * ARBRE_PROB_PERP + (dx / longueur) * decalage;
			const ly = (p.y + q.y) / 2 - (dx / longueur) * ARBRE_PROB_PERP + (dy / longueur) * decalage;
			corps +=
				`<line class="pt-branche" x1="${c2(x1)}" y1="${c2(p.y)}" x2="${c2(q.x)}" y2="${c2(q.y)}"/>` +
				formule(lx - 40, ly - 10, 80, 20, b.probability.display, 'pt-prob') +
				formule(q.x, q.y - 10, largeurEtiquette, 20, etiquetteTex(b.eventLabel), '');
			branches(b.child, [...chemin, etiquetteTex(b.eventLabel.replace(/^\$|\$$/g, ''))]);
		}
		if (n.isLeaf) feuilles.push({ n, chemin });
	};
	branches(node.root, []);
	const decalageIssues = node.config.showIntersection ? ARBRE_INTERSECTION : 0;
	for (const { n, chemin } of feuilles) {
		const p = positions.get(n.id)!;
		if (node.config.showIntersection && chemin.length > 0)
			corps += formule(
				p.x + largeurEtiquette + 10,
				p.y - 12,
				ARBRE_INTERSECTION - 20,
				24,
				`P(${chemin.join('\\,\\cap\\,')})`,
				'pt-inter'
			);
		if (node.config.showOutcomes && n.outcome)
			corps += formule(
				p.x + largeurEtiquette + 10 + decalageIssues,
				p.y - 12,
				ARBRE_ISSUES - 20,
				24,
				n.outcome,
				'pt-issue'
			);
	}
	return {
		html: `<svg class="pt-svg" role="img" aria-label="Arbre de probabilité${node.config.rootLabel ? ` : ${attr(node.config.rootLabel)}` : ''}" viewBox="0 0 ${c2(largeur)} ${c2(hauteur)}" style="width:${c2(largeur)}px;max-width:100%">${corps}</svg>`
	};
}

const DESSINS: Record<string, (source: string) => Bloc> = {
	figure,
	monnaie,
	partage,
	collection,
	horloge,
	courbe,
	variation,
	histogramme: (s) => statistique('histogramme', s),
	'frequences-cumulees': (s) => statistique('frequences-cumulees', s),
	barres: (s) => statistique('barres', s),
	'boite-a-moustaches': (s) => statistique('boite-a-moustaches', s),
	'tableau-croise': (s) => statistique('tableau-croise', s),
	simulation: (s) => statistique('simulation', s),
	probtree: arbre
};

/** Types de blocs que la page dessine elle-même */
export const BLOCS_DESSINES = Object.keys(DESSINS);

/**
 * Remplace chaque bloc ``` du markdown par son dessin (`@@HTML@@…`, sur une ligne).
 * Un bloc inconnu de la page est montré par sa source et signalé dans `nonDessines`.
 */
export function dessinerBlocs(markdown: string): {
	markdown: string;
	solutions: string[];
	nonDessines: string[];
	avertissements: string[];
} {
	const solutions: string[] = [];
	const nonDessines: string[] = [];
	const avertissements: string[] = [];
	const rendu = markdown.replace(BLOC, (_m, type: string, source: string) => {
		// Un programme se lit tel quel : rien à dessiner, rien à signaler
		if (type === 'python')
			return `${HTML}<pre class="code"><code>${source.split('\n').map(attr).join('<br>')}</code></pre>`;
		const dessin = DESSINS[type];
		if (!dessin) {
			nonDessines.push(type);
			const lignes = source.split('\n').map(attr).join('<br>');
			return `${HTML}<div class="non-dessine"><span class="r-tag">bloc ${attr(type)}, non dessiné ici : le jouer dans l'aperçu</span><code>${lignes}</code></div>`;
		}
		const bloc = dessin(source);
		if (bloc.solution) solutions.push(bloc.solution);
		avertissements.push(...(bloc.avertissements ?? []));
		return HTML + bloc.html;
	});
	return { markdown: rendu, solutions, nonDessines, avertissements };
}

/** Case de texte `{{blank:N}}` → la même case que dans une formule, que le gabarit dessine */
const casesDeTexte = (md: string) => md.replace(/\{\{blank:(\d+)\}\}/g, '$\\placeholder[$1]{}$');

/** Nombres des formules à la française (`7{,}2`, espaces fines), comme le rendu de l'appli
 *  (`toLocaleDecimal` de components/markdown/utils/math-utils.ts) ; les blocs dessinés n'y passent pas */
const aLaFrancaise = (md: string) =>
	md
		.split(/(@@HTML@@[^\n]*)/)
		.map((p) =>
			p.startsWith('@@HTML@@')
				? p
				: p.replace(/\$\$([\s\S]*?)\$\$|\$([^$]*)\$/g, (_, bloc?: string, ligne?: string) =>
						bloc === undefined
							? `$${toFrenchDecimal(ligne ?? '')}$`
							: `$$${toFrenchDecimal(bloc)}$$`
					)
		)
		.join('');

/** Un exemple par variation, tiré par le vrai générateur (graine fixe : page reproductible) */
export function exemplesDuModele(modele: ModeleFichier): {
	exemples: Exemple[];
	nonDessines: string[];
	avertissements: string[];
} {
	const nonDessines = new Set<string>();
	const avertissements = new Set<string>();
	const dessine = (md: string) => {
		const r = dessinerBlocs(md);
		r.nonDessines.forEach((t) => nonDessines.add(t));
		r.avertissements.forEach((a) => avertissements.add(a));
		return { ...r, markdown: aLaFrancaise(r.markdown) };
	};
	const exemples = modele.variations.map((variation, i) => {
		const r = generateInstance(
			{ id: 'page-a-cocher', ...modele, variations: [variation] },
			GRAINE + i
		);
		if (!r.success) {
			throw new Error(`« ${modele.title} » v${i + 1} : ${r.errors.join(' ; ')}`);
		}
		const inst = r.instance;
		// Case choix : ses choix listés à part (ordre affiché, bon marqué), bloc retiré de l'énoncé
		const blanks = inst.blanks ?? [];
		const choiceBlank = blanks.find(isChoiceBlank);
		const statement = choiceBlank ? withoutChoiceCases(String(inst.statement)) : inst.statement;
		const enonce = dessine(casesDeTexte(prepareStatement(statement, inst)));
		const bons = choiceBlank ? correctChoiceIndexesOf(choiceBlank) : [];
		return {
			variation: i + 1,
			statement: enonce.markdown,
			choices: choiceBlank
				? choiceBlank.choice.order.map((index) => ({
						content: dessine(choiceBlank.choice.choices[index]).markdown,
						bon: bons.includes(index)
					}))
				: null,
			answer: blanks
				.filter((b) => !isChoiceBlank(b))
				.map((b) => toFrenchDecimal(b.expectedAnswer))
				.join(' | '),
			solution: enonce.solutions.join(''),
			steps: (inst.correction?.steps ?? []).map((s) => dessine(s).markdown)
		};
	});
	return { exemples, nonDessines: [...nonDessines], avertissements: [...avertissements] };
}

/** Programme d'un code de point : ce qui précède le dernier tiret (`1SPE-224` → `1SPE`) */
export function programmeDuCode(code: string): string {
	const i = code.lastIndexOf('-');
	return i === -1 ? code : code.slice(0, i);
}

/** La fiche d'un modèle : ce que dit le fichier, ce que dit la base, ce que dit le programme */
export function ficheDuModele(
	modele: ModeleFichier,
	base: InfosEnBase,
	bornes: Readonly<Record<string, PointBornes>>
): Fiche {
	const alertes: string[] = [];
	if (base.codes.length === 0) alertes.push('sans point');
	// ADR 0020 : au plus un point PAR PROGRAMME (1SPE-224 avec 1TECHNO-037 est permis)
	const parProgramme = new Map<string, number>();
	for (const code of base.codes)
		parProgramme.set(programmeDuCode(code), (parProgramme.get(programmeDuCode(code)) ?? 0) + 1);
	for (const [programme, n] of parProgramme) {
		if (n > 1) alertes.push(`${n} points de ${programme} (ADR 0020 : un par programme)`);
	}
	if (!base.rangement) alertes.push('sans nœud');
	if (base.niveau !== modele.level) {
		alertes.push(`niveau ${base.niveau} en base, ${modele.level} dans le fichier`);
	}
	const points = base.codes.flatMap((code) => {
		const point = bornes[code];
		if (!point) alertes.push(`point ${code} absent des bornes`);
		return point ? [{ code, point }] : [];
	});
	// Plusieurs programmes : chaque libellé et chaque borne disent leur point
	const prefixe = (code: string) => (points.length > 1 ? `${code} : ` : '');
	const { exemples, nonDessines, avertissements } = exemplesDuModele(modele);
	for (const t of nonDessines) alertes.push(`bloc ${t} non dessiné : le jouer dans l'aperçu`);
	alertes.push(...avertissements);
	return {
		id: base.id,
		code: base.codes.join(', ') || '—',
		titre: modele.title,
		description: modele.description ?? '',
		rangement: base.rangement ?? '—',
		niveau: base.niveau,
		statut: base.statut,
		libelle: points.map(({ code, point }) => prefixe(code) + point.libelle).join(' · '),
		bornes: points.flatMap(({ code, point }) =>
			[...point.bornes.map((b) => b.borne), ...(point.remarque ? [point.remarque] : [])].map(
				(b) => prefixe(code) + b
			)
		),
		variables: modele.variations.flatMap((v, i) =>
			(v.variables ?? []).map((x) => `v${i + 1} : ${x.name} = ${x.expression}`)
		),
		conditions: modele.variations.flatMap((v, i) =>
			(v.conditions ?? []).map((c) => `v${i + 1} : ${c}`)
		),
		specs: (modele.testSpecs ?? []).map(
			(s) =>
				`${s.description} : ${(s.answers ?? []).map((a) => `$${a}$`).join(', ')} → ${s.expected.status}`
		),
		exemples,
		alertes
	};
}

/** Chemin d'un nœud, de la branche au nœud (« branche > notion > sous-notion ») */
export function cheminDuNoeud(
	id: string,
	noeuds: ReadonlyMap<string, { name: string; parent_id: string | null }>
): string | null {
	const noms: string[] = [];
	let courant = noeuds.get(id);
	while (courant && noms.length < 10) {
		noms.unshift(courant.name);
		courant = courant.parent_id ? noeuds.get(courant.parent_id) : undefined;
	}
	return noms.length > 0 ? noms.join(' > ') : null;
}

const echapperHtml = (s: string) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** La page : le gabarit, son titre, son introduction (HTML permis) et ses fiches */
export function assemblerPage(
	gabarit: string,
	options: { titre: string; intro: string; fiches: readonly Fiche[] }
): string {
	// La marque des données tolère les espaces que prettier ajoute (`/*@@MODELES@@*/ []`)
	const MODELES = /\/\*@@MODELES@@\*\/\s*\[\]/;
	if (!gabarit.includes('@@TITRE@@')) throw new Error('gabarit sans la marque @@TITRE@@');
	if (!gabarit.includes('@@INTRO@@')) throw new Error('gabarit sans la marque @@INTRO@@');
	if (!MODELES.test(gabarit)) throw new Error('gabarit sans la marque /*@@MODELES@@*/ []');
	// `</script>` ou `<!--` dans une donnée dérègleraient le script du gabarit
	const donnees = JSON.stringify(options.fiches)
		.replace(/<\//g, '<\\/')
		.replace(/<!--/g, '<\\u0021--');
	return gabarit
		.replaceAll('@@TITRE@@', echapperHtml(options.titre))
		.replace('@@INTRO@@', () => options.intro)
		.replace(MODELES, () => donnees);
}
