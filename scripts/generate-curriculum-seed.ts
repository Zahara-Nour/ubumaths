#!/usr/bin/env tsx
/**
 * Génère le SQL d'amorçage d'un niveau depuis son markdown de référentiel.
 *
 * Le markdown est la SOURCE DE VÉRITÉ le temps de l'amorçage : on ne retranscrit
 * pas 200 points à la main. Passé l'amorçage, c'est la page Programme qui fait
 * foi — le seed généré est gardé et ne rejoue rien sur un niveau déjà rempli.
 *
 * Un seul script pour tous les niveaux : dupliquer, c'est laisser les copies
 * diverger. La table `NIVEAUX` ci-dessous est le seul endroit à étendre.
 *
 * Usage :
 *   pnpm tsx scripts/generate-curriculum-seed.ts 1_SPE
 *   pnpm tsx scripts/generate-curriculum-seed.ts 2
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Un niveau = son markdown, son fichier de seed, et le préfixe de ses codes. */
const NIVEAUX: Record<string, { md: string; out: string; prefixe: string }> = {
	'1_SPE': {
		md: 'docs/wip/referentiel/1re-spe-programme.md',
		out: 'supabase/migrations/20260830090000_seed_curriculum_1re_spe.sql',
		prefixe: '1SPE'
	},
	'2': {
		md: 'docs/wip/referentiel/2de-programme.md',
		out: 'supabase/migrations/20260903090000_seed_curriculum_2de.sql',
		prefixe: '2'
	}
};

const GRADE = process.argv[2];
if (!GRADE || !NIVEAUX[GRADE]) {
	console.error(
		`Usage : pnpm tsx scripts/generate-curriculum-seed.ts <${Object.keys(NIVEAUX).join('|')}>`
	);
	process.exit(1);
}
const NIVEAU = NIVEAUX[GRADE];
const SRC = join(ROOT, NIVEAU.md);
const OUT = join(ROOT, NIVEAU.out);

type Kind = 'connaissance' | 'savoir_faire' | 'demonstration';
type Point = {
	code: string;
	theme: string;
	objective: string;
	name: string;
	ord: number;
	kind: Kind;
	regime: 'fluence' | 'diversite';
	exigence: 'attendu' | 'approfondissement';
};

const TAGS: Record<string, { kind: Kind; exigence: Point['exigence'] }> = {
	C: { kind: 'connaissance', exigence: 'attendu' },
	SF: { kind: 'savoir_faire', exigence: 'attendu' },
	D: { kind: 'demonstration', exigence: 'attendu' },
	'SF+': { kind: 'savoir_faire', exigence: 'approfondissement' }
};

/** Le corps utile commence au premier thème et s'arrête au récapitulatif. */
function body(md: string): string[] {
	const lines = md.split('\n');
	const start = lines.findIndex((l) => l.startsWith('## 1. '));
	const end = lines.findIndex((l) => l.startsWith('## Récapitulatif'));
	if (start === -1 || end === -1) throw new Error('bornes du corps introuvables');
	return lines.slice(start, end);
}

function parse(md: string) {
	const themes: { name: string; ord: number }[] = [];
	const objectives: { theme: string; name: string; ord: number }[] = [];
	const points: Point[] = [];

	let theme = '';
	let objective = '';
	let objOrdInTheme = 0;
	let pointOrdInObjective = 0;
	// La partie « Automatismes » du BO : provenance + enjeu d'examen. Ces points
	// se mesurent par la fluence ; le tag permet de les retrouver à travers les
	// programmes des différentes années, indépendamment du thème qui les porte.
	let isAutomatismes = false;

	for (const line of body(md)) {
		const mTheme = /^## \d+\.\s+(.+)$/.exec(line);
		if (mTheme) {
			theme = mTheme[1].trim();
			themes.push({ name: theme, ord: themes.length + 1 });
			objOrdInTheme = 0;
			isAutomatismes = theme === 'Automatismes';
			continue;
		}

		const mObj = /^### \d+\.\d+\s+(.+)$/.exec(line);
		if (mObj) {
			objective = mObj[1].trim();
			objOrdInTheme += 1;
			objectives.push({ theme, name: objective, ord: objOrdInTheme });
			pointOrdInObjective = 0;
			continue;
		}

		// `- [SF] \`<CODE>\` libellé…` — le code, s'il est déjà là, fait foi.
		const mPoint = /^- \[(C|SF\+|SF|D)\]\s+(?:`([A-Z0-9_]+-\d+)`\s+)?(.+)$/.exec(line);
		if (mPoint) {
			if (!theme || !objective) throw new Error(`point hors objectif : ${line}`);
			const tag = TAGS[mPoint[1]];
			pointOrdInObjective += 1;
			points.push({
				code: mPoint[2] ?? '',
				theme,
				objective,
				name: mPoint[3].trim(),
				ord: pointOrdInObjective,
				kind: tag.kind,
				regime: isAutomatismes ? 'fluence' : 'diversite',
				exigence: tag.exigence
			});
		}
	}

	return { themes, objectives, points };
}

/**
 * Quoting SQL standard : apostrophes doublées.
 *
 * Le seed de 6ᵉ utilisait le dollar-quoting (`$$…$$`) pour éviter de doubler les
 * 123 apostrophes des libellés français. Sa promesse est conditionnelle au
 * contenu : « rien à échapper, à condition que le contenu ne contienne jamais le
 * délimiteur ». Le passage aux formules ubumark a introduit 208 `$` et cassé
 * cette condition — un libellé finissant par une formule collait son `$` au
 * délimiteur de fermeture.
 *
 * Le quoting standard promet autre chose : « un seul caractère est toujours
 * doublé ». Cette règle ne dépend d'aucun contenu, donc rien n'est à vérifier
 * quand le contenu change de nature. Les apostrophes doublées sont écrites par
 * ce script, dans un fichier que personne n'édite à la main.
 */
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

const md = readFileSync(SRC, 'utf8');
const { themes, objectives, points } = parse(md);

/**
 * Attribue un code aux points qui n'en ont pas et RÉÉCRIT le markdown.
 *
 * Les codes existants ne bougent jamais : c'est toute leur raison d'être. Un
 * nouveau point prend le numéro suivant le plus haut déjà attribué — jamais un
 * trou laissé par un point supprimé, pour qu'un code ne soit jamais réutilisé
 * pour désigner autre chose.
 */
function assignMissingCodes(markdown: string): string {
	const used = points.map((pt) => pt.code).filter(Boolean);
	let next =
		used.reduce((max, c) => Math.max(max, Number.parseInt(c.split('-')[1] ?? '0', 10)), 0) + 1;

	const missing = points.filter((pt) => !pt.code);
	if (missing.length === 0) return markdown;

	const lines = markdown.split('\n');
	let cursor = 0;
	for (const pt of points) {
		// On retrouve la ligne du point dans l'ordre du document.
		while (cursor < lines.length) {
			const m = /^- \[(C|SF\+|SF|D)\]\s+(?:`([A-Z0-9_]+-\d+)`\s+)?(.+)$/.exec(lines[cursor]);
			if (m && m[3].trim() === pt.name) break;
			cursor++;
		}
		if (cursor >= lines.length) throw new Error(`ligne introuvable pour : ${pt.name}`);
		if (!pt.code) {
			pt.code = `${NIVEAU.prefixe}-${String(next++).padStart(3, '0')}`;
			const m = /^(- \[(?:C|SF\+|SF|D)\]\s+)(.+)$/.exec(lines[cursor])!;
			lines[cursor] = `${m[1]}\`${pt.code}\` ${m[2]}`;
		}
		cursor++;
	}
	console.log(`  ${missing.length} code(s) attribué(s), markdown réécrit`);
	return lines.join('\n');
}

const updatedMd = assignMissingCodes(md);
if (updatedMd !== md) writeFileSync(SRC, updatedMd);

/**
 * Garde-fou : toute commande LaTeX doit être connue de MathLive.
 *
 * Les libellés sont rendus par MathLive (`math-span`), qui ne couvre pas tout
 * LaTeX. Une commande inconnue s'affiche en clair au milieu de la phrase — c'est
 * ce qui est arrivé le 2026-08-30 avec `\dots` et `\overrightarrow`, écrites à la
 * main et découvertes par David à l'écran, pas par un test.
 *
 * On lit la table de MathLive plutôt que d'en figer une copie : elle suit alors
 * les montées de version du paquet.
 */
function assertMathLiveKnowsEveryCommand(points: { code: string; name: string }[]) {
	const bundle = join(ROOT, 'node_modules/mathlive/mathlive.mjs');
	if (!existsSync(bundle)) {
		console.warn('  ⚠ mathlive introuvable — vérification des commandes LaTeX sautée');
		return;
	}
	const src = readFileSync(bundle, 'utf8');
	const unknown = new Map<string, string[]>();

	for (const pt of points) {
		for (const formula of pt.name.match(/\$[^$]+\$/g) ?? []) {
			for (const [, cmd] of formula.matchAll(/\\([a-zA-Z]+)/g)) {
				// Dans le bundle, les commandes sont écrites avec un antislash échappé.
				if (src.includes(`\\\\${cmd}"`) || src.includes(`\\\\${cmd}'`)) continue;
				const codes = unknown.get(cmd) ?? [];
				if (!codes.includes(pt.code)) codes.push(pt.code);
				unknown.set(cmd, codes);
			}
		}
	}

	if (unknown.size > 0) {
		const detail = [...unknown]
			.map(([cmd, codes]) => `  \\${cmd} — ${codes.slice(0, 4).join(', ')}`)
			.join('\n');
		throw new Error(
			`Commandes LaTeX inconnues de MathLive (elles s'afficheraient en clair) :\n${detail}`
		);
	}
}

// Garde-fous : les contraintes UNIQUE de la base doivent tenir.
for (const [label, seen] of [
	['thème', new Set<string>()],
	['objectif', new Set<string>()],
	['point', new Set<string>()]
] as const) {
	const keys =
		label === 'thème'
			? themes.map((t) => t.name)
			: label === 'objectif'
				? objectives.map((o) => `${o.theme}//${o.name}`)
				: points.map((p) => `${p.theme}//${p.objective}//${p.name}`);
	for (const k of keys) {
		if (seen.has(k)) throw new Error(`doublon ${label} (viole l'UNIQUE) : ${k}`);
		seen.add(k);
	}
}

assertMathLiveKnowsEveryCommand(points);

const sql = `-- ============================================================================
-- Amorçage — Référentiel de programme, niveau '${GRADE}'
-- ============================================================================
-- GÉNÉRÉ par scripts/generate-curriculum-seed.ts depuis
-- ${NIVEAU.md} — ne pas éditer à la main.
--
-- Source : « Programme de spécialité de mathématiques de la classe de première
-- de la voie générale » (programme en vigueur, avec la partie transversale
-- « Automatismes » ; ce n'est PAS l'arrêté du 17 janvier 2019).
--
--   ${themes.length} thèmes · ${objectives.length} objectifs · ${points.length} points
--   kind        : ${points.filter((p) => p.kind === 'connaissance').length} connaissance · ${points.filter((p) => p.kind === 'savoir_faire').length} savoir_faire · ${points.filter((p) => p.kind === 'demonstration').length} demonstration
--   exigence    : ${points.filter((p) => p.exigence === 'attendu').length} attendu · ${points.filter((p) => p.exigence === 'approfondissement').length} approfondissement
--
-- AMORÇAGE, PAS SYNCHRONISATION.
--
-- Ce fichier remplit un niveau VIDE, une fois. Ensuite c'est la page Programme
-- qui fait foi : ajouts, renommages, déplacements, archivages s'y font, et le
-- markdown n'a plus voix au chapitre. Corriger le markdown après coup ne
-- produit donc plus rien sur une base déjà amorcée — la correction se fait
-- dans l'app.
--
-- D'où la garde ci-dessous : le rejeu (un \`db:reset\` en local, une migration
-- relancée) ne peut rien écraser, il ne fait rien du tout. C'est la différence
-- avec la version précédente, qui re-synchronisait depuis le markdown et
-- archivait ce qui en avait disparu — elle aurait défait le travail fait dans
-- l'app.
--
-- Le markdown garde un seul rôle : amorcer un niveau NEUF (2de, terminale…).
-- Y saisir 153 points à la main dans un formulaire serait une punition.
--
-- Ce que le seed ne renseigne pas, volontairement :
--   · \`regime_acquisition\` — au défaut ('diversite') ; c'est un choix de prof
--   · \`rang\` — NULL ; le programme ne propose aucune échelle de difficulté
-- ============================================================================

do $bootstrap$
BEGIN

IF EXISTS (SELECT 1 FROM public.curriculum_themes WHERE grade = '${GRADE}') THEN
	RAISE NOTICE 'Référentiel ${GRADE} déjà amorcé — aucune modification.';
	RETURN;
END IF;

-- ---------------------------------------------------------------------------
-- 1. Thèmes
-- ---------------------------------------------------------------------------
INSERT INTO public.curriculum_themes (grade, name, display_order) VALUES
${themes.map((t) => `\t('${GRADE}', ${q(t.name)}, ${t.ord})`).join(',\n')};

-- ---------------------------------------------------------------------------
-- 2. Objectifs
-- ---------------------------------------------------------------------------
INSERT INTO public.curriculum_objectives (theme_id, name, display_order)
SELECT t.id, v.objective_name, v.ord
FROM (VALUES
${objectives.map((o) => `\t(${q(o.theme)}, ${q(o.name)}, ${o.ord})`).join(',\n')}
) AS v(theme_name, objective_name, ord)
JOIN public.curriculum_themes t ON t.grade = '${GRADE}' AND t.name = v.theme_name;

-- ---------------------------------------------------------------------------
-- 3. Points
-- ---------------------------------------------------------------------------
-- \`code\` explicite : la série du markdown. Le trigger d'attribution ne prend
-- la main que pour les points créés ensuite depuis l'app, qui prennent la suite.
INSERT INTO public.curriculum_points (objective_id, code, name, display_order, kind, exigence)
SELECT o.id, v.code, v.point_name, v.ord, v.kind, v.exigence
FROM (VALUES
${points
	.map(
		(p) =>
			`\t(${q(p.code)}, ${q(p.theme)}, ${q(p.objective)}, ${q(p.name)}, ${p.ord}, ${q(p.kind)}, ${q(p.exigence)})`
	)
	.join(',\n')}
) AS v(code, theme_name, objective_name, point_name, ord, kind, exigence)
JOIN public.curriculum_themes t     ON t.grade = '${GRADE}' AND t.name = v.theme_name
JOIN public.curriculum_objectives o ON o.theme_id = t.id AND o.name = v.objective_name;

END $bootstrap$;
`;

writeFileSync(OUT, sql);
console.log(
	`✓ ${OUT.replace(ROOT + '/', '')}\n` +
		`  ${themes.length} thèmes · ${objectives.length} objectifs · ${points.length} points\n` +
		`  kind : C=${points.filter((p) => p.kind === 'connaissance').length} ` +
		`SF=${points.filter((p) => p.kind === 'savoir_faire').length} ` +
		`D=${points.filter((p) => p.kind === 'demonstration').length}\n` +
		`  approfondissement=${points.filter((p) => p.exigence === 'approfondissement').length} · ` +
		`fluence=${points.filter((p) => p.regime === 'fluence').length}`
);
