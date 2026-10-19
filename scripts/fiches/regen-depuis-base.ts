/**
 * Rendu Typst de fiches EN BASE (lecture seule)
 * =============================================
 *
 * Relit des fiches en base (prod, clé de service du .env) et écrit, pour chacune,
 * un .typ par PDF (fiche, réponses, corrigé) et par langue (français, anglais),
 * avec TOUTES les variantes de chaque exercice. Le Corrigé porte les règles de
 * police Shantell Sans / Chiphre Math : le compiler avec
 * `compile-prod.mjs --polices-corrige`. La langue est posée dans la config de la fiche,
 * comme le ferait une fiche anglaise (point décimal). Les images sont téléchargées
 * dans `<sortie>/virtual/images/` (chemins virtuels, comme en production) pour que
 * `compile-prod.mjs` les trouve. La production convertit les WebP en PNG dans le
 * navigateur (canvas) ; ici, `sips` de macOS fait la même conversion.
 *
 * Sert à vérifier une fiche APRÈS son écriture en base, ou à mesurer l'effet d'un
 * correctif du générateur sur des fiches existantes. Aucune écriture en base.
 *
 * Usage : pnpm tsx scripts/fiches/regen-depuis-base.ts <sortie> [--modes worksheet,answers,correction]
 *         [--langues fr,en] [--variante guided] (--toutes | <préfixe d'id>...)
 * `--toutes` : toutes les fiches en base. Par défaut : les trois PDF, les deux langues.
 * `--variante <label>` : une seule variante par exercice (ex. `guided`), titre sans étiquette,
 * comme le PDF de l'application ; sans elle, toutes les variantes, étiquetées.
 * En anglais, titres de la fiche et des sections traduits (`translations.en.title`).
 * `--modele-de-la-fiche` : le modèle de la fiche (comme en production) au lieu du
 * modèle « fiche élève » ; une fiche en échec de lecture est signalée, pas bloquante.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { config as dotenv } from 'dotenv';
import { WorksheetGenerator } from '$lib/typst/generators/worksheet-generator';
import { STUDENT_STYLE_TEMPLATE, getDefaultTemplate } from '$lib/typst/templates/default-templates';
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
	answers_md?: string;
	translations?: { en?: { statement_md?: string; solution_md?: string; answers_md?: string } };
};
type Mode = 'worksheet' | 'answers' | 'correction';
type Langue = 'fr' | 'en';
type Exercice = { title: string; variations: Variation[]; generic_functions: string[] | null };

const [sortie, ...args] = process.argv.slice(2);
const prefixes: string[] = [];
let modes: Mode[] = ['worksheet', 'answers', 'correction'];
let langues: Langue[] = ['fr', 'en'];
let toutes = false;
let modeleDeLaFiche = false;
let variante: string | undefined;
for (let i = 0; i < args.length; i++) {
	if (args[i] === '--modes') modes = args[++i].split(',') as Mode[];
	else if (args[i] === '--langues') langues = args[++i].split(',') as Langue[];
	else if (args[i] === '--toutes') toutes = true;
	else if (args[i] === '--variante') variante = args[++i];
	else if (args[i] === '--modele-de-la-fiche') modeleDeLaFiche = true;
	else prefixes.push(args[i]);
}
if (!sortie || (prefixes.length === 0 && !toutes)) {
	console.error(
		'Usage : pnpm tsx scripts/fiches/regen-depuis-base.ts <sortie> [--modes …] [--langues …] (--toutes | <préfixe d’id>...)'
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
	const ids = toutes
		? (fiches ?? []).map((w) => w.id)
		: prefixes.map((prefixe) => {
				const trouvees = (fiches ?? []).filter((w) => w.id.startsWith(prefixe));
				if (trouvees.length !== 1) {
					throw new Error(`Préfixe ${prefixe} : ${trouvees.length} fiche(s)`);
				}
				return trouvees[0].id;
			});
	const enEchec: string[] = [];
	for (const id of ids) {
		try {
			await ecrireFiche(supabase, id);
		} catch (e) {
			if (!toutes) throw e;
			enEchec.push(`${id.slice(0, 8)} : ${e instanceof Error ? e.message : String(e)}`);
		}
	}
	console.log(`${ids.length} fiche(s) ; lecture en échec : ${enEchec.length}`);
	for (const ligne of enEchec) console.log(`  ⛔ ${ligne}`);
}

/**
 * Le modèle de la fiche, comme le choisit la production : d'après son `style_id`
 * (#1529) — un style de Chiphre est dans le code, celui d'un prof a sa fiche
 * `form = 'worksheet'` (absent : mise en page par défaut).
 */
async function modeleDe(
	supabase: ReturnType<typeof createClient<Database>>,
	styleId: string | null
): Promise<WorksheetTemplateRow | null> {
	if (!modeleDeLaFiche) return template;
	if (!styleId) return null;
	const defaut = getDefaultTemplate(styleId);
	if (defaut) return { ...template, id: styleId, template_content: defaut.template_content };
	const { data } = await supabase
		.from('worksheet_templates')
		.select('*')
		.eq('style_id', styleId)
		.eq('form', 'worksheet')
		.maybeSingle();
	return (data as WorksheetTemplateRow | null) ?? null;
}

async function ecrireFiche(supabase: ReturnType<typeof createClient<Database>>, id: string) {
	{
		const prefixe = id.slice(0, 8);

		const { data: w, error: e1 } = await supabase
			.from('worksheets')
			.select('title, config, style_id, translations')
			.eq('id', id)
			.single();
		const { data: sections, error: e2 } = await supabase
			.from('worksheet_sections')
			.select('id, title, position, translations')
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

		for (const langue of langues) {
			for (const mode of modes) {
				const exercises = ordonnees.flatMap((ligne, i) => {
					const ex = ligne.exercises as unknown as Exercice;
					const gardees = variante
						? ex.variations.filter((v) => v.label === variante)
						: ex.variations;
					return gardees.map((v, k) => ({
						exercise_id: `${ligne.exercise_id}${k}`,
						title: variante ? ex.title : `${ex.title} [${v.label}]`,
						generic_functions: ex.generic_functions,
						position: i * 10 + k + 1,
						parameters: {},
						section_id: ligne.section_id ?? undefined,
						statement:
							langue === 'fr'
								? v.statement_md
								: (v.translations?.en?.statement_md ?? v.statement_md),
						solution:
							langue === 'fr' ? v.solution_md : (v.translations?.en?.solution_md ?? v.solution_md),
						answers:
							langue === 'fr' ? v.answers_md : (v.translations?.en?.answers_md ?? v.answers_md)
					}));
				});
				const config = {
					...(w.config as object),
					show_points: false,
					language: langue
				} as WorksheetConfig;
				const titreEn = (t: { translations?: unknown; title: string }) =>
					langue === 'en'
						? ((t.translations as { en?: { title?: string } } | null)?.en?.title ?? t.title)
						: t.title;
				const worksheet = {
					id,
					title: titreEn(w),
					type: 'worksheet',
					config
				} as unknown as WorksheetRow;
				const typst = new WorksheetGenerator(config, {}, { mode }).generate({
					worksheet,
					instance: {
						exercises,
						sections: (sections ?? []).map((x) => ({ ...x, title: titreEn(x) }))
					} as unknown as InstanceData,
					template: await modeleDe(supabase, w.style_id)
				}).typstContent;
				writeFileSync(join(sortie, `${id.slice(0, 8)}-${langue}-${mode}.typ`), typst);
				telechargerImages(exercises.flatMap((e) => [e.statement, e.solution, e.answers ?? '']));
			}
		}
		console.log(`${w.title} : ${ordonnees.length} exercices`);
	}
}

main().catch((e) => {
	console.error(`⛔ ${e instanceof Error ? e.message : String(e)}`);
	process.exit(1);
});
