/**
 * Rendu Typst de fiches EN BASE (lecture seule)
 * =============================================
 *
 * Relit des fiches en base (prod, clé de service du .env) et écrit, pour chacune,
 * quatre .typ : énoncé et corrigé, en français et en anglais, avec TOUTES les
 * variantes de chaque exercice. La langue est posée dans la config de la fiche,
 * comme le ferait une fiche anglaise (point décimal). Les images sont téléchargées
 * dans `<sortie>/virtual/images/` (chemins virtuels, comme en production) pour que
 * `compile-prod.mjs` les trouve. La production convertit les WebP en PNG dans le
 * navigateur (canvas) ; ici, `sips` de macOS fait la même conversion.
 *
 * Sert à vérifier une fiche APRÈS son écriture en base, ou à mesurer l'effet d'un
 * correctif du générateur sur des fiches existantes. Aucune écriture en base.
 *
 * Usage : pnpm tsx scripts/fiches/regen-depuis-base.ts <dossier de sortie> <préfixe d'id>...
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config as dotenv } from 'dotenv';
import { WorksheetGenerator } from '$lib/typst/generators/worksheet-generator';
import { STUDENT_STYLE_TEMPLATE } from '$lib/typst/templates/default-templates';
import { urlToVirtualPath } from '$lib/typst/image-loader';
import type { Database } from '$lib/types/database';
import type {
	InstanceData,
	WorksheetConfig,
	WorksheetRow,
	WorksheetTemplateRow
} from '$lib/types/worksheets';

dotenv({ path: '.env' });

type Variation = {
	label: string;
	statement_md: string;
	solution_md: string;
	translations?: { en?: { statement_md?: string; solution_md?: string } };
};
type Exercice = { title: string; variations: Variation[]; generic_functions: string[] | null };

const [sortie, ...prefixes] = process.argv.slice(2);
if (!sortie || prefixes.length === 0) {
	console.error(
		'Usage : pnpm tsx scripts/fiches/regen-depuis-base.ts <dossier de sortie> <préfixe d’id>...'
	);
	process.exit(2);
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

/**
 * Télécharge les images des énoncés et corrigés sous leur chemin virtuel : le
 * générateur écrit déjà `/virtual/images/<empreinte de l'URL>`, comme en production.
 */
function telechargerImages(textes: string[]): void {
	const urls = [
		...new Set(textes.flatMap((t) => [...t.matchAll(/\]\((https?:\/\/[^\s)]+)/g)].map((m) => m[1])))
	];
	const dossierImages = join(sortie, 'virtual', 'images');
	for (const url of urls) {
		const cible = join(dossierImages, urlToVirtualPath(url).split('/').pop()!);
		if (existsSync(cible)) continue;
		mkdirSync(dossierImages, { recursive: true });
		try {
			const brut = `${cible}.source`;
			execFileSync('curl', ['-sfL', url, '-o', brut]);
			// Typst ne lit pas le WebP : conversion en PNG, comme le fait la production
			if (/\.webp(\?|$)/i.test(url)) {
				execFileSync('sips', ['-s', 'format', 'png', brut, '--out', cible], { stdio: 'ignore' });
				rmSync(brut);
			} else {
				execFileSync('mv', [brut, cible]);
			}
		} catch {
			console.warn(`  ⚠️ image non téléchargée : ${url}`);
		}
	}
}

async function main() {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const cle = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !cle) throw new Error('PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants');
	const supabase = createClient<Database>(url, cle);
	mkdirSync(sortie, { recursive: true });

	const { data: fiches, error } = await supabase.from('worksheets').select('id');
	if (error) throw new Error(`Lecture des fiches impossible : ${error.message}`);
	for (const prefixe of prefixes) {
		const trouvees = (fiches ?? []).filter((w) => w.id.startsWith(prefixe));
		if (trouvees.length !== 1) throw new Error(`Préfixe ${prefixe} : ${trouvees.length} fiche(s)`);
		const id = trouvees[0].id;

		const { data: w, error: e1 } = await supabase
			.from('worksheets')
			.select('title, config')
			.eq('id', id)
			.single();
		const { data: sections, error: e2 } = await supabase
			.from('worksheet_sections')
			.select('id, title, position')
			.eq('worksheet_id', id);
		const { data: lignes, error: e3 } = await supabase
			.from('worksheet_exercises')
			.select('exercise_id, section_id, position, exercises(title, variations, generic_functions)')
			.eq('worksheet_id', id);
		const erreur = e1 ?? e2 ?? e3;
		if (erreur || !w) throw new Error(`Fiche ${prefixe} : ${erreur?.message ?? 'introuvable'}`);

		const rang = (sectionId: string | null) =>
			sections?.find((s) => s.id === sectionId)?.position ?? 0;
		const ordonnees = (lignes ?? []).sort(
			(a, b) => rang(a.section_id) - rang(b.section_id) || a.position - b.position
		);

		for (const langue of ['fr', 'en'] as const) {
			for (const mode of ['worksheet', 'correction'] as const) {
				const exercises = ordonnees.flatMap((ligne, i) => {
					const ex = ligne.exercises as unknown as Exercice;
					return ex.variations.map((v, k) => ({
						exercise_id: `${ligne.exercise_id}${k}`,
						title: `${ex.title} [${v.label}]`,
						generic_functions: ex.generic_functions,
						position: i * 10 + k + 1,
						parameters: {},
						section_id: ligne.section_id ?? undefined,
						statement:
							langue === 'fr'
								? v.statement_md
								: (v.translations?.en?.statement_md ?? v.statement_md),
						solution:
							langue === 'fr' ? v.solution_md : (v.translations?.en?.solution_md ?? v.solution_md)
					}));
				});
				const config = {
					...(w.config as object),
					show_points: false,
					language: langue
				} as WorksheetConfig;
				const worksheet = {
					id,
					title: w.title,
					type: 'worksheet',
					config
				} as unknown as WorksheetRow;
				const typst = new WorksheetGenerator(config, {}, { mode }).generate({
					worksheet,
					instance: { exercises, sections } as unknown as InstanceData,
					template
				}).typstContent;
				writeFileSync(join(sortie, `${id.slice(0, 8)}-${langue}-${mode}.typ`), typst);
				telechargerImages(exercises.flatMap((e) => [e.statement, e.solution]));
			}
		}
		console.log(`${w.title} : ${ordonnees.length} exercices`);
	}
}

main().catch((e) => {
	console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
