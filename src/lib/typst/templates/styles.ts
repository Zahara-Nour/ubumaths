/**
 * Styles de fiche et résolution du gabarit (ADR 0028)
 * ===================================================
 *
 * Un style regroupe des gabarits qui se ressemblent, un par forme (fiche,
 * réponses, corrigé, fiche + corrections), et le code Typst qu'ils partagent
 * (`{{style_common}}`). Une forme absente d'un style prend celle du style par
 * défaut, « Fiche élève » (D2, D7).
 *
 * Lot 2 : les styles fournis par Chiphre vivent ici, un par gabarit intégré ;
 * la fiche désigne encore son style par `worksheets.template_id`. Le lot 3 les
 * range en base (`worksheet_styles`).
 */

import type { DocumentForm } from '$lib/worksheets/document/types';
import {
	DEFAULT_TEMPLATES,
	DEFAULT_TEMPLATE_IDS,
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

const STYLE_COMMON = '{{style_common}}';

/** Le style d'une fiche qui n'en a pas choisi (D7) */
export const DEFAULT_STYLE_ID: string = DEFAULT_TEMPLATE_IDS.studentStyle;

/** Les styles fournis par Chiphre : un par gabarit intégré */
export const BUILT_IN_STYLES: WorksheetStyle[] = DEFAULT_TEMPLATES.map((template) =>
	template.id === DEFAULT_STYLE_ID
		? {
				id: template.id,
				name: template.name,
				description: template.description,
				common: STUDENT_STYLE_COMMON,
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

function builtInStyle(id: string | null | undefined): WorksheetStyle | undefined {
	return id ? BUILT_IN_STYLES.find((style) => style.id === id) : undefined;
}

/**
 * Le gabarit d'une forme, prêt pour `renderTemplate` : `{{style_common}}`
 * remplacé par le code commun du style qui fournit le gabarit.
 *
 * - `custom` : le gabarit de la fiche lu en base (gabarit du prof), utilisé
 *   pour la forme « fiche » seulement ;
 * - style inconnu ou absent → style par défaut ; forme absente du style →
 *   celle du style par défaut.
 */
export function resolveTemplate(
	styleId: string | null | undefined,
	form: TemplateForm,
	custom?: string | null
): string {
	if (form === 'worksheet' && custom) return custom;

	const fallback = builtInStyle(DEFAULT_STYLE_ID) as WorksheetStyle;
	const chosen = builtInStyle(styleId) ?? fallback;
	const owner = chosen.templates[form] ? chosen : fallback;
	const template = owner.templates[form] as string;
	return template.split(STYLE_COMMON).join(owner.common);
}
