#!/usr/bin/env tsx
/**
 * Génère `supabase/migrations/<ts>_seed_curriculum_1re_spe.sql` depuis
 * `docs/wip/referentiel/1re-spe-programme.md`.
 *
 * Le markdown est la SOURCE DE VÉRITÉ : on ne retranscrit pas 170 points à la
 * main. Rejouer le script après une correction du markdown régénère le seed à
 * l'identique (même convention que `generate-competence-seeds.ts` pour la 6ᵉ).
 *
 * Usage : pnpm tsx scripts/generate-curriculum-1re-spe-seed.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'docs/wip/referentiel/1re-spe-programme.md');
const OUT = join(ROOT, 'supabase/migrations/20260830090000_seed_curriculum_1re_spe.sql');
const GRADE = '1_SPE';

type Kind = 'connaissance' | 'savoir_faire' | 'demonstration';
type Point = {
	theme: string;
	objective: string;
	name: string;
	ord: number;
	kind: Kind;
	knowledgeType: 'automatisme' | 'capacite_attendue';
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
	// Le thème « Automatismes » est le seul où le BO isole des automatismes.
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

		const mPoint = /^- \[(C|SF\+|SF|D)\]\s+(.+)$/.exec(line);
		if (mPoint) {
			if (!theme || !objective) throw new Error(`point hors objectif : ${line}`);
			const tag = TAGS[mPoint[1]];
			pointOrdInObjective += 1;
			points.push({
				theme,
				objective,
				name: mPoint[2].trim(),
				ord: pointOrdInObjective,
				kind: tag.kind,
				knowledgeType: isAutomatismes ? 'automatisme' : 'capacite_attendue',
				exigence: tag.exigence
			});
		}
	}

	return { themes, objectives, points };
}

/** Dollar-quoting comme le seed 6ᵉ : les libellés contiennent apostrophes et accents. */
const q = (s: string) => {
	if (s.includes('$$')) throw new Error(`libellé contenant $$ : ${s}`);
	return `$$${s}$$`;
};

const { themes, objectives, points } = parse(readFileSync(SRC, 'utf8'));

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

const sql = `-- ============================================================================
-- Seed — Programme de suivi 1ʳᵉ spécialité mathématiques (grade '${GRADE}')
-- ============================================================================
-- GÉNÉRÉ par scripts/generate-curriculum-1re-spe-seed.ts — ne pas éditer à la
-- main : corriger docs/wip/referentiel/1re-spe-programme.md puis relancer.
--
-- Source : « Programme de spécialité de mathématiques de la classe de première
-- de la voie générale » (programme en vigueur, avec la partie transversale
-- « Automatismes » ; ce n'est PAS l'arrêté du 17 janvier 2019).
--
--   ${themes.length} thèmes · ${objectives.length} objectifs · ${points.length} points
--   kind        : ${points.filter((p) => p.kind === 'connaissance').length} connaissance · ${points.filter((p) => p.kind === 'savoir_faire').length} savoir_faire · ${points.filter((p) => p.kind === 'demonstration').length} demonstration
--   exigence    : ${points.filter((p) => p.exigence === 'attendu').length} attendu · ${points.filter((p) => p.exigence === 'approfondissement').length} approfondissement
--   knowledge_type : ${points.filter((p) => p.knowledgeType === 'automatisme').length} automatisme · ${points.filter((p) => p.knowledgeType === 'capacite_attendue').length} capacite_attendue
--
-- \`rang\` reste NULL partout : le programme ne propose aucune échelle de
-- difficulté. Les objectifs s'affichent en liste avec un compteur n/m ; une
-- échelle 1-4 peut être ajoutée plus tard depuis la page Programme.
--
-- Idempotent : jointures par nom + ON CONFLICT DO NOTHING. Le prof peut éditer
-- l'arbre dans l'app ensuite sans qu'un rejeu écrase ses modifications.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Thèmes
-- ---------------------------------------------------------------------------
insert into public.curriculum_themes (grade, name, display_order) values
${themes.map((t) => `\t('${GRADE}', ${q(t.name)}, ${t.ord})`).join(',\n')}
on conflict (grade, name) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Objectifs
-- ---------------------------------------------------------------------------
insert into public.curriculum_objectives (theme_id, name, display_order)
select t.id, v.objective_name, v.ord
from (values
${objectives.map((o) => `\t(${q(o.theme)}, ${q(o.name)}, ${o.ord})`).join(',\n')}
) as v(theme_name, objective_name, ord)
join public.curriculum_themes t on t.grade = '${GRADE}' and t.name = v.theme_name
on conflict (theme_id, name) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Points
-- ---------------------------------------------------------------------------
insert into public.curriculum_points (objective_id, name, display_order, kind, knowledge_type, exigence)
select o.id, v.point_name, v.ord, v.kind, v.knowledge_type, v.exigence
from (values
${points
	.map(
		(p) =>
			`\t(${q(p.theme)}, ${q(p.objective)}, ${q(p.name)}, ${p.ord}, ${q(p.kind)}, ${q(p.knowledgeType)}, ${q(p.exigence)})`
	)
	.join(',\n')}
) as v(theme_name, objective_name, point_name, ord, kind, knowledge_type, exigence)
join public.curriculum_themes t on t.grade = '${GRADE}' and t.name = v.theme_name
join public.curriculum_objectives o on o.theme_id = t.id and o.name = v.objective_name
on conflict (objective_id, name) do nothing;
`;

writeFileSync(OUT, sql);
console.log(
	`✓ ${OUT.replace(ROOT + '/', '')}\n` +
		`  ${themes.length} thèmes · ${objectives.length} objectifs · ${points.length} points\n` +
		`  kind : C=${points.filter((p) => p.kind === 'connaissance').length} ` +
		`SF=${points.filter((p) => p.kind === 'savoir_faire').length} ` +
		`D=${points.filter((p) => p.kind === 'demonstration').length}\n` +
		`  approfondissement=${points.filter((p) => p.exigence === 'approfondissement').length} · ` +
		`automatisme=${points.filter((p) => p.knowledgeType === 'automatisme').length}`
);
