/**
 * Transformation des références `[[type:uuid|libellé]]` en liens, DANS DU HTML.
 * ============================================================================
 *
 * Le cahier de texte est saisi dans TipTap et stocké en **HTML**, pas en
 * ubumark : le rendu passe donc par `{@html}` et non par `MarkdownRenderer`. Les
 * références insérées par le sélecteur `[[` y restaient donc du texte brut —
 * l'élève lisait littéralement `[[worksheet_exercise:3f2a…|Exercice 3]]`.
 *
 * Cette fonction est la moitié manquante côté lecture : même grammaire que
 * l'extracteur (`REFERENCE_REGEX`), mêmes URL que le registre.
 *
 * ⚠️ À APPLIQUER APRÈS L'ASSAINISSEMENT (`transformMathHtml`). Le libellé est
 * réinjecté tel quel dans le document : il doit déjà être du texte HTML échappé.
 * L'appliquer avant laisserait passer ce que l'assainisseur aurait retiré.
 *
 * @module resources/linkify
 */

import { REFERENCE_REGEX } from './references';
import { isResourceKind, resolveResource, type ViewerRole } from './registry';

/** Classes reprises telles quelles de `InternalLink.svelte` : même objet, même allure. */
const LINK_CLASS =
	'internal-link inline-flex items-center gap-1 rounded-sm px-1 py-0.5 ' +
	'text-primary underline decoration-primary/30 underline-offset-2 ' +
	'hover:bg-primary/10 hover:decoration-primary/50 transition-colors';

const INERT_CLASS =
	'internal-link inline-flex items-center gap-1 rounded-sm px-1 py-0.5 text-muted-foreground';

export interface LinkifyOptions {
	/** Qui lit : détermine la route, donc l'existence même du lien. */
	role: ViewerRole;
	/** Classe de lecture, indispensable pour situer un chapitre côté professeur. */
	classId?: string;
}

/**
 * Découpe le HTML en segments texte / balises.
 *
 * Sans ce découpage, une référence écrite dans un attribut (un `title`, un
 * `href`) serait remplacée par un `<a>` au milieu d'une balise ouvrante, ce qui
 * casse le document. On ne transforme donc que ce qui est hors balise.
 */
const TAG_SEGMENT = /(<[^>]*>)/;

/**
 * Remplace les références par des liens (ou du texte inerte).
 *
 * Un type inconnu, ou un type sans page pour ce lecteur, reste lisible : le
 * libellé s'affiche en gris plutôt que de mener à une 404.
 */
export function linkifyResourceReferences(html: string, { role, classId }: LinkifyOptions): string {
	if (!html || !html.includes('[[')) return html;

	return html
		.split(TAG_SEGMENT)
		.map((segment) => (segment.startsWith('<') ? segment : linkifySegment(segment, role, classId)))
		.join('');
}

function linkifySegment(text: string, role: ViewerRole, classId: string | undefined): string {
	return text.replace(REFERENCE_REGEX, (whole, rawKind: string, id: string, label: string) => {
		const kind = rawKind.toLowerCase();
		if (!isResourceKind(kind)) return whole;

		const resolved = resolveResource(kind, id.toLowerCase(), {
			role,
			label: label.trim(),
			context: { classId }
		});

		// Le libellé vient d'un HTML déjà assaini : le ré-échapper produirait des
		// `&amp;lt;` à la lecture. L'attribut `title` ne reçoit qu'une constante du
		// registre, mais on l'échappe quand même — une constante se change, et le
		// jour où elle contiendra un guillemet, il ne faut pas que ce soit une
		// faille plutôt qu'un mot mal affiché.
		const title = escapeAttribute(resolved.kindLabel);

		return resolved.url
			? `<a href="${resolved.url}" class="${LINK_CLASS}" title="${title}">${resolved.label}</a>`
			: `<span class="${INERT_CLASS}" title="${title} non consultable ici">${resolved.label}</span>`;
	});
}

function escapeAttribute(value: string): string {
	return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}
