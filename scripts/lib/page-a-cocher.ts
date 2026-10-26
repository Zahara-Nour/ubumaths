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

interface Bloc {
	html: string;
	solution?: string;
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
const largeur = (w: number, pleine: number) => `width:calc(8cm * ${+(w / pleine).toFixed(4)})`;

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

function svgScene<I>(scene: Scene<I>, dessin: (items: I[]) => string, label: string): string {
	return `<svg class="m-dessin" role="img" aria-label="${attr(label)}" viewBox="0 0 ${scene.width} ${scene.height}" style="${largeur(scene.width, MONNAIE_VIEW.fullWidth)}"><rect class="m-cadre" x="0.5" y="0.5" width="${scene.width - 1}" height="${scene.height - 1}" rx="6"/>${dessin(scene.items)}</svg>`;
}

/** La réserve : chaque coupure ou objet dans sa vignette, comme dans l'appli */
function reserve<I extends { x: number; y: number; width: number; height: number }>(
	items: I[],
	dessin: (items: I[]) => string
): string {
	const icones = items
		.map(
			(it) =>
				`<svg class="r-icone" viewBox="${it.x - 1} ${it.y - 1} ${it.width + 2} ${it.height + 2}" style="${largeur(it.width + 2, MONNAIE_VIEW.fullWidth)}">${dessin([it])}</svg>`
		)
		.join('');
	const plan = `<svg class="m-dessin" role="img" aria-label="Plan de travail vide" viewBox="0 0 ${MONNAIE_VIEW.fullWidth} 90" style="width:8cm"><rect class="plan" x="1" y="1" width="${MONNAIE_VIEW.fullWidth - 2}" height="88" rx="6"/><text class="plan-txt" x="${MONNAIE_VIEW.fullWidth / 2}" y="45">plan de travail (vide au départ)</text></svg>`;
	return `<div class="cons"><div class="reserve"><span class="r-tag">Réserve</span>${icones}</div>${plan}</div>`;
}

function monnaie(source: string): Bloc {
	const spec = parseMonnaieContent(source).spec;
	if (!spec) throw new Error('bloc monnaie en erreur : ' + source);
	if (spec.build == null) {
		const svgs = spec.sets.map((_, i) =>
			svgScene(buildMonnaieScene(spec, i), monnaieObjets, 'Pièces et billets')
		);
		return { html: figures(svgs, legendes(spec.captions, spec.sets.length)) };
	}
	const coupures = spec.reserve ?? monnaieConstruire.DEFAULT_RESERVE;
	const juste = monnaieConstruire.solutionBuild(spec.build, coupures);
	return {
		html: reserve(monnaieConstruire.reserveScene(coupures).items, monnaieObjets),
		solution: juste
			? svgScene(monnaieConstruire.buildScene(juste), monnaieObjets, 'Une construction juste')
			: '<b>aucune construction possible avec cette réserve</b>'
	};
}

function collection(source: string): Bloc {
	const spec = parseCollectionContent(source).spec;
	if (!spec) throw new Error('bloc collection en erreur : ' + source);
	if (spec.build == null) {
		const svgs = spec.sets.map((_, i) =>
			svgScene(buildCollectionScene(spec, i), collectionObjets, 'Collection')
		);
		return { html: figures(svgs, legendes(spec.captions, spec.sets.length)) };
	}
	return {
		html: reserve(collectionConstruire.reserveScene(spec.drawing).items, collectionObjets),
		solution: svgScene(
			collectionConstruire.buildScene(spec.drawing, collectionConstruire.solutionBuild(spec.build)),
			collectionObjets,
			'Une construction juste'
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

const DESSINS: Record<string, (source: string) => Bloc> = { figure, monnaie, collection, horloge };

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
} {
	const solutions: string[] = [];
	const nonDessines: string[] = [];
	const rendu = markdown.replace(BLOC, (_m, type: string, source: string) => {
		const dessin = DESSINS[type];
		if (!dessin) {
			nonDessines.push(type);
			const lignes = source.split('\n').map(attr).join('<br>');
			return `${HTML}<div class="non-dessine"><span class="r-tag">bloc ${attr(type)}, non dessiné ici : le jouer dans l'aperçu</span><code>${lignes}</code></div>`;
		}
		const bloc = dessin(source);
		if (bloc.solution) solutions.push(bloc.solution);
		return HTML + bloc.html;
	});
	return { markdown: rendu, solutions, nonDessines };
}

/** Case de texte `{{blank:N}}` → la même case que dans une formule, que le gabarit dessine */
const casesDeTexte = (md: string) => md.replace(/\{\{blank:(\d+)\}\}/g, '$\\placeholder[$1]{}$');

/** Un exemple par variation, tiré par le vrai générateur (graine fixe : page reproductible) */
export function exemplesDuModele(modele: ModeleFichier): {
	exemples: Exemple[];
	nonDessines: string[];
} {
	const nonDessines = new Set<string>();
	const dessine = (md: string) => {
		const r = dessinerBlocs(md);
		r.nonDessines.forEach((t) => nonDessines.add(t));
		return r;
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
			answer: (inst.blanks ?? []).map((b) => b.expectedAnswer).join(' | '),
			solution: enonce.solutions.join(''),
			steps: (inst.correction?.steps ?? []).map((s) => dessine(s).markdown)
		};
	});
	return { exemples, nonDessines: [...nonDessines] };
}

/** La fiche d'un modèle : ce que dit le fichier, ce que dit la base, ce que dit le programme */
export function ficheDuModele(
	modele: ModeleFichier,
	base: InfosEnBase,
	bornes: Readonly<Record<string, PointBornes>>
): Fiche {
	const alertes: string[] = [];
	if (base.codes.length === 0) alertes.push('sans point');
	if (base.codes.length > 1) alertes.push(`${base.codes.length} points (ADR 0020 : un seul)`);
	if (!base.rangement) alertes.push('sans nœud');
	if (base.niveau !== modele.level) {
		alertes.push(`niveau ${base.niveau} en base, ${modele.level} dans le fichier`);
	}
	const point = base.codes.length === 1 ? bornes[base.codes[0]] : undefined;
	if (base.codes.length === 1 && !point) alertes.push(`point ${base.codes[0]} absent des bornes`);
	const { exemples, nonDessines } = exemplesDuModele(modele);
	for (const t of nonDessines) alertes.push(`bloc ${t} non dessiné : le jouer dans l'aperçu`);
	return {
		id: base.id,
		code: base.codes.join(', ') || '—',
		titre: modele.title,
		description: modele.description ?? '',
		rangement: base.rangement ?? '—',
		niveau: base.niveau,
		statut: base.statut,
		libelle: point?.libelle ?? '',
		bornes: point
			? [...point.bornes.map((b) => b.borne), ...(point.remarque ? [point.remarque] : [])]
			: [],
		variables: modele.variations.flatMap((v, i) =>
			(v.variables ?? []).map((x) => `v${i + 1} : ${x.name} = ${x.expression}`)
		),
		conditions: modele.variations.flatMap((v, i) =>
			(v.conditions ?? []).map((c) => `v${i + 1} : ${c}`)
		),
		specs: (modele.testSpecs ?? []).map(
			(s) => `${s.description} : ${(s.answers ?? []).join(', ')} → ${s.expected.status}`
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
	// `</script>` dans une donnée fermerait le script du gabarit
	const donnees = JSON.stringify(options.fiches).replace(/<\//g, '<\\/');
	return gabarit
		.replaceAll('@@TITRE@@', echapperHtml(options.titre))
		.replace('@@INTRO@@', () => options.intro)
		.replace(MODELES, () => donnees);
}
