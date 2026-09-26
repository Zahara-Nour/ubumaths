/**
 * Rendu Typst d'une fiche EN COURS DE RÉDACTION (avant toute écriture en base)
 * ============================================================================
 *
 * Passe les .md d'un dossier de rédaction par le VRAI générateur de fiches
 * (`WorksheetGenerator`, comme le bouton PDF de l'application) et écrit quatre
 * fichiers .typ : énoncé et corrigé, en français et en anglais (langue de la
 * fiche → point décimal en anglais). Compiler ensuite avec `compile-prod.mjs`.
 *
 * Deux dispositions de dossier (voir docs/ref/fiches-exercices.md) :
 *  - fiche technique : `titles.txt` (un titre par ligne) et `md/01.md`… ;
 *  - fiche d'applications : `plan.json` (sections, exercices) et
 *    `md/<CLÉ>-guided.md` (+ `-autonomous.md` facultatif).
 * Dans les deux cas : `md/` énoncés FR, `sol/` corrigés FR, `en/` et `sol-en/`.
 *
 * Signale aussi, dans le Typst produit, les erreurs de formule rendues en texte
 * (« Unexpected… ») et les mots découpés lettre par lettre (`c o s`).
 *
 * Usage : pnpm tsx scripts/fiches/rendu-fiche.ts <dossier> [titre de la fiche]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { WorksheetGenerator } from '$lib/typst/generators/worksheet-generator';
import { STUDENT_STYLE_TEMPLATE } from '$lib/typst/templates/default-templates';
import type {
	InstanceData,
	WorksheetConfig,
	WorksheetRow,
	WorksheetTemplateRow
} from '$lib/types/worksheets';

type Plan = {
	sections: { id: string; title: string; position: number; en: string }[];
	exercises: { key: string; section: string; title: string; en_title: string }[];
};
type Exercice = { title: string; statement: string; solution: string; section_id?: string };

const DOCUMENTS = [
	{ nom: 'fiche', mode: 'worksheet', langue: 'fr' },
	{ nom: 'corrige', mode: 'correction', langue: 'fr' },
	{ nom: 'fiche-en', mode: 'worksheet', langue: 'en' },
	{ nom: 'corrige-en', mode: 'correction', langue: 'en' }
] as const;

const dossier = process.argv[2];
if (!dossier) {
	console.error('Usage : pnpm tsx scripts/fiches/rendu-fiche.ts <dossier> [titre de la fiche]');
	process.exit(2);
}
const titreFiche = process.argv[3] ?? 'Fiche en rédaction';
const lire = (p: string) => readFileSync(p, 'utf8');

/** Exercices du dossier, dans la langue voulue (titres FR, sauf `en_title` du plan). */
function exercices(langue: 'fr' | 'en'): { liste: Exercice[]; sections?: Plan['sections'] } {
	const enonces = langue === 'fr' ? 'md' : 'en';
	const corriges = langue === 'fr' ? 'sol' : 'sol-en';
	if (existsSync(join(dossier, 'titles.txt'))) {
		const titres = lire(join(dossier, 'titles.txt')).trim().split('\n');
		return {
			liste: titres.map((title, i) => {
				const f = `${String(i + 1).padStart(2, '0')}.md`;
				return {
					title,
					statement: lire(join(dossier, enonces, f)),
					solution: lire(join(dossier, corriges, f))
				};
			})
		};
	}
	const plan = JSON.parse(lire(join(dossier, 'plan.json'))) as Plan;
	const liste: Exercice[] = [];
	for (const e of plan.exercises) {
		for (const variante of ['guided', 'autonomous']) {
			const f = `${e.key}-${variante}.md`;
			if (!existsSync(join(dossier, 'md', f))) continue;
			liste.push({
				title: `${langue === 'en' ? e.en_title : e.title} [${variante}]`,
				statement: lire(join(dossier, enonces, f)),
				solution: lire(join(dossier, corriges, f)),
				section_id: e.section
			});
		}
	}
	const sections = plan.sections.map((s) => ({
		...s,
		title: langue === 'en' ? s.en : s.title
	}));
	return { liste, sections };
}

const template = {
	id: 't',
	name: 'Fiche élève',
	description: null,
	template_content: STUDENT_STYLE_TEMPLATE.template_content,
	placeholders: [],
	created_by: 'x',
	created_at: '',
	updated_at: ''
} as WorksheetTemplateRow;

let alertes = 0;
for (const doc of DOCUMENTS) {
	const config = {
		show_title: true,
		show_date: false,
		show_student_name: false,
		show_class: false,
		show_points: false,
		numbering_style: 'numeric',
		page_layout: 'A4',
		font_size: 12,
		margins: { top: 20, bottom: 20, left: 15, right: 15 },
		language: doc.langue
	} as WorksheetConfig;
	const { liste, sections } = exercices(doc.langue);
	const instance = {
		exercises: liste.map((e, i) => ({
			exercise_id: `e${i}`,
			title: e.title,
			position: i + 1,
			parameters: {},
			section_id: e.section_id,
			statement: e.statement,
			solution: e.solution
		})),
		sections
	} as unknown as InstanceData;
	const worksheet = {
		id: 'w',
		title: titreFiche,
		type: 'worksheet',
		config
	} as unknown as WorksheetRow;
	const typst = new WorksheetGenerator(config, {}, { mode: doc.mode }).generate({
		worksheet,
		instance,
		template
	}).typstContent;
	const sortie = join(dossier, `${doc.nom}.typ`);
	writeFileSync(sortie, typst);

	const erreurs = typst.match(/Unexpected|Expected|Unknown command|Could not parse/g) ?? [];
	const decoupes = [...new Set(typst.match(/\b([a-z] ){3,}[a-z]\b/g) ?? [])];
	alertes += erreurs.length + decoupes.length;
	console.log(
		`${doc.nom}.typ : ${liste.length} exercices` +
			(erreurs.length ? ` — ⛔ ${erreurs.length} erreur(s) de formule` : '') +
			(decoupes.length ? ` — ⛔ mots découpés : ${decoupes.join(' | ')}` : '')
	);
}
process.exit(alertes ? 1 : 0);
