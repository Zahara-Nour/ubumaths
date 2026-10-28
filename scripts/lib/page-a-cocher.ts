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
import { prepareStatement } from '../../src/lib/questions/expected-result';
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
import { namedColorScreen, namedColorTable } from '../../src/lib/theme/named-colors';
import { toFrenchDecimal } from '../../src/lib/utils/french-math';
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
				return `<g><rect class="m-billet" x="${it.x}" y="${it.y}" width="${it.width}" height="${it.height}" rx="${N.radius}"/><text class="m-val" x="${it.cx}" y="${it.cy}" font-size="${N.size}">${it.value} €</text>${coin(it.x + N.cornerInset + N.cornerBox / 2, it.y + 1 + N.cornerBox / 2)}${coin(it.x + it.width - N.cornerInset - N.cornerBox / 2, it.y + it.height - 1 - N.cornerBox / 2)}</g>`;
			}
			const r = it.width / 2;
			const disque =
				it.value === 2
					? `<circle class="m-anneau" cx="${it.cx}" cy="${it.cy}" r="${r}"/><circle class="m-piece" cx="${it.cx}" cy="${it.cy}" r="${+(r * C.innerRatio).toFixed(2)}"/>`
					: `<circle class="m-piece" cx="${it.cx}" cy="${it.cy}" r="${r}"/>`;
			return `<g>${disque}<text class="m-val" x="${it.cx}" y="${it.cy}" font-size="${C.size}">${it.value} €</text></g>`;
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

const DESSINS: Record<string, (source: string) => Bloc> = {
	figure,
	monnaie,
	collection,
	horloge,
	courbe
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
		const enonce = dessine(casesDeTexte(prepareStatement(inst.statement, inst)));
		return {
			variation: i + 1,
			statement: enonce.markdown,
			choices: inst.choices
				? inst.choices.map((c) => ({ content: dessine(c.content).markdown, bon: c.isCorrect }))
				: null,
			answer: (inst.blanks ?? []).map((b) => toFrenchDecimal(b.expectedAnswer)).join(' | '),
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
