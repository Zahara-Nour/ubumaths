/**
 * Styles de fiche et résolution du gabarit (ADR 0028)
 * ===================================================
 *
 * Un style regroupe des gabarits qui se ressemblent, un par forme (fiche,
 * réponses, corrigé, fiche + corrections), et le code Typst qu'ils partagent
 * (`{{style_common}}`). Une forme absente d'un style prend celle du style par
 * défaut, « Fiche élève » (D2, D7) ; sauf la fiche + corrections, qui garde la
 * fiche du style et lui ajoute la partie de fin (`CORRECTIONS_PART`).
 *
 * Les styles fournis par Chiphre vivent ici, un par gabarit intégré ; ils ont
 * aussi une ligne en base (`worksheet_styles`, même identifiant) pour qu'une
 * fiche puisse les désigner, mais leur Typst se prend toujours dans le code
 * (D9). La fiche désigne son style par `style_id` (`styleIdOf`).
 */

import type { DocumentForm } from '$lib/worksheets/document/types';
import type { TextSize } from '../text-size';
import {
	CORRECTIONS_PART,
	DEFAULT_TEMPLATES,
	DEFAULT_TEMPLATE_IDS,
	STUDENT_LANDSCAPE_STYLE_COMMON,
	STUDENT_STYLE_COMMON,
	STUDENT_STYLE_FORMS
} from './default-templates';

/** Les formes d'un document : les trois PDF d'une fiche, plus la fiche suivie de ses corrections */
export type TemplateForm = DocumentForm | 'worksheet_with_corrections';

export interface WorksheetStyle {
	id: string;
	name: string;
	description: string;
	/** Code Typst commun, inséré à la place de `{{style_common}}` */
	common: string;
	/** Un gabarit par forme ; forme absente → celle du style par défaut */
	templates: Partial<Record<TemplateForm, string>>;
}

/**
 * Un style tel que le menu « Style » de la fiche le propose. Le style ne décide
 * plus des points : le type de la fiche s'en charge (ADR 0030).
 */
export interface StyleOption {
	id: string;
	name: string;
	description: string | null;
}

/** Le gabarit d'une forme */
export interface ResolvedTemplate {
	/** Prêt pour `renderTemplate` */
	content: string;
}

const STYLE_COMMON = '{{style_common}}';

/** Le style d'une fiche qui n'en a pas choisi (D7) */
export const DEFAULT_STYLE_ID: string = DEFAULT_TEMPLATE_IDS.studentStyle;

/**
 * Code commun des styles qui ont leurs quatre formes : « Fiche élève » et sa
 * version paysage partagent les gabarits, pas l'orientation de la page.
 */
const STUDENT_STYLE_COMMONS: Record<string, string> = {
	[DEFAULT_TEMPLATE_IDS.studentStyle]: STUDENT_STYLE_COMMON,
	[DEFAULT_TEMPLATE_IDS.studentStyleLandscape]: STUDENT_LANDSCAPE_STYLE_COMMON
};

/** Les styles fournis par Chiphre : un par gabarit intégré */
export const BUILT_IN_STYLES: WorksheetStyle[] = DEFAULT_TEMPLATES.map((template) =>
	template.id in STUDENT_STYLE_COMMONS
		? {
				id: template.id,
				name: template.name,
				description: template.description,
				common: STUDENT_STYLE_COMMONS[template.id],
				templates: STUDENT_STYLE_FORMS
			}
		: {
				id: template.id,
				name: template.name,
				description: template.description,
				common: '',
				templates: { worksheet: template.template_content }
			}
);

/**
 * Styles qui imitaient un type de fiche (Contrôle, Examen, Devoirs, Quiz) :
 * le type décide désormais de l'en-tête (ADR 0030). Retirés du menu, mais
 * toujours résolus : une fiche qui en désigne un s'imprime comme avant.
 */
const RETIRED_STYLE_IDS: readonly string[] = [
	DEFAULT_TEMPLATE_IDS.assessment,
	DEFAULT_TEMPLATE_IDS.exam,
	DEFAULT_TEMPLATE_IDS.homework,
	DEFAULT_TEMPLATE_IDS.quiz
];

/** Les styles de Chiphre proposés au menu, dans l'ordre du code */
export const BUILT_IN_STYLE_OPTIONS: StyleOption[] = BUILT_IN_STYLES.filter(
	(style) => !RETIRED_STYLE_IDS.includes(style.id)
).map((style) => ({
	id: style.id,
	name: style.name,
	description: style.description
}));

function builtInStyle(id: string | null | undefined): WorksheetStyle | undefined {
	return id ? BUILT_IN_STYLES.find((style) => style.id === id) : undefined;
}

/** Le style est-il fourni par Chiphre (Typst dans le code) ? */
export function isBuiltInStyle(id: string | null | undefined): boolean {
	return builtInStyle(id) !== undefined;
}

/**
 * Le style retenu pour une fiche : `style_id`, sinon aucun — `resolveTemplate`
 * prend alors le style par défaut. Les fiches d'avant le lot 3 ont reçu leur
 * `style_id` de l'ancien `template_id` (migration du 2026-10-17, #1529).
 */
export function styleIdOf(worksheet: { style_id?: string | null }): string | null {
	return worksheet.style_id ?? null;
}

/**
 * Le style imprimé : « Fiche élève » en Grande ou Très grande taille du texte
 * passe en paysage (son jumeau « 2 colonnes - paysage » : mêmes gabarits, page
 * retournée), sauf la forme Réponses (David, 2026-10-17). Les autres styles, la
 * taille normale et le style d'un prof (`custom`) ne changent pas.
 */
export function printedStyleId(
	styleId: string | null | undefined,
	form: TemplateForm,
	textSize: TextSize,
	custom?: string | null
): string | null | undefined {
	if (textSize === 'normal' || form === 'answers') return styleId;
	// Sans style de Chiphre reconnu ni gabarit du prof : « Fiche élève » (par défaut)
	const isStudentStyle = styleId === DEFAULT_STYLE_ID || (!isBuiltInStyle(styleId) && !custom);
	return isStudentStyle ? DEFAULT_TEMPLATE_IDS.studentStyleLandscape : styleId;
}

/**
 * Le gabarit d'une forme, `{{style_common}}` remplacé par le code commun du
 * style qui fournit le gabarit.
 *
 * - `custom` : la fiche du style lue en base (style du prof), utilisée pour la
 *   forme « fiche » seulement. Ignorée pour un style de Chiphre : son Typst
 *   vient du code ;
 * - style inconnu ou absent → style par défaut ; forme absente du style →
 *   celle du style par défaut.
 */
export function resolveTemplate(
	styleId: string | null | undefined,
	form: TemplateForm,
	custom?: string | null
): ResolvedTemplate {
	// Fiche + corrections d'un style qui n'a que sa fiche : sa fiche, puis la
	// partie de fin (David, 2026-10-14 : les énoncés gardent le style)
	const withCorrections = form === 'worksheet_with_corrections';
	if ((form === 'worksheet' || withCorrections) && custom && !isBuiltInStyle(styleId)) {
		return { content: withCorrections ? `${custom}\n${CORRECTIONS_PART}` : custom };
	}

	const fallback = builtInStyle(DEFAULT_STYLE_ID) as WorksheetStyle;
	const chosen = builtInStyle(styleId) ?? fallback;
	if (withCorrections && !chosen.templates[form] && chosen.templates.worksheet) {
		const sheet = chosen.templates.worksheet.split(STYLE_COMMON).join(chosen.common);
		return { content: `${sheet}\n${CORRECTIONS_PART}` };
	}
	const owner = chosen.templates[form] ? chosen : fallback;
	const template = owner.templates[form] as string;
	return { content: template.split(STYLE_COMMON).join(owner.common) };
}
