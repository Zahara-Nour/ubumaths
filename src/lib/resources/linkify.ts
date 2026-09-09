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
	/** Jeton du cahier partagé, quand la lecture se fait par ce lien. */
	shareToken?: string;
}

/**
 * Découpe le HTML en segments texte / balises.
 *
 * Sans ce découpage, une référence écrite dans un attribut (un `title`, un
 * `href`) serait remplacée par un `<a>` au milieu d'une balise ouvrante, ce qui
 * casse le document. On ne transforme donc que ce qui est hors balise.
 *
 * ⚠️ La reconnaissance doit tenir compte des GUILLEMETS. La sérialisation HTML
 * n'échappe, dans une valeur d'attribut, que `&` et `"` : un `>` y survit
 * littéralement. Un `/(<[^>]*>)/` naïf coupe donc la balise au premier `>` de
 * `title="a > b"` et prend la fin de l'attribut pour du texte — de quoi injecter
 * un `<a>` À L'INTÉRIEUR d'une valeur d'attribut et disloquer le paragraphe.
 */
const TAG_SEGMENT = /(<\/?[a-zA-Z!][^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>)/;

/** Forme canonique attendue d'un `classId` avant de le laisser entrer dans une URL. */
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

/**
 * Remplace les références par des liens (ou du texte inerte).
 *
 * Un type inconnu, ou un type sans page pour ce lecteur, reste lisible : le
 * libellé s'affiche en gris plutôt que de mener à une 404.
 */
export function linkifyResourceReferences(
	html: string,
	{ role, classId, shareToken }: LinkifyOptions
): string {
	if (!html || !html.includes('[[')) return html;

	// `resolve()` de SvelteKit substitue les paramètres VERBATIM, sans encodage :
	// un `classId` mal formé se retrouverait tel quel dans un `href`. Aucun
	// appelant actuel n'en passe, et c'est précisément le moment de fermer la
	// porte — pas le jour où une page prof en passera un venu de la base.
	const safeClassId = classId && UUID.test(classId) ? classId : undefined;

	return html
		.split(TAG_SEGMENT)
		.map((segment) =>
			segment.startsWith('<') ? segment : linkifySegment(segment, role, safeClassId, shareToken)
		)
		.join('');
}

function linkifySegment(
	text: string,
	role: ViewerRole,
	classId: string | undefined,
	shareToken: string | undefined
): string {
	return text.replace(
		REFERENCE_REGEX,
		(whole, rawKind: string, id: string, _selection: string | undefined, label: string) => {
			const kind = rawKind.toLowerCase();
			if (!isResourceKind(kind)) return whole;

			const resolved = resolveResource(kind, id.toLowerCase(), {
				role,
				label: label.trim(),
				context: { classId, shareToken }
			});

			// Le libellé vient d'un HTML déjà assaini : `<`, `>` et `"` y sont donc
			// déjà des entités, et les échapper est un no-op. On le fait quand même,
			// parce que ce n'est vrai que du FLUX DE TEXTE : dans une valeur
			// d'attribut, ces caractères survivent littéralement. Volontairement pas
			// `&`, qui produirait le `&amp;lt;` que ce double échappement redoute.
			const title = escapeAttribute(resolved.kindLabel);

			// Une puce devant le libellé : sans elle, une référence sans destination est
			// indiscernable de la prose — c'est ce qui a fait croire que le lien ne
			// marchait pas. Le rendu markdown, lui, affiche depuis toujours une icône.
			return resolved.url
				? `<a href="${escapeAttribute(resolved.url)}" class="${LINK_CLASS}" title="${title}">${escapeText(resolved.label)}</a>`
				: `<span class="${INERT_CLASS}" title="${title} non consultable ici">◆&nbsp;${escapeText(resolved.label)}</span>`;
		}
	);
}

function escapeAttribute(value: string): string {
	return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
}

/** Cf. le commentaire ci-dessus : sans `&`, pour ne jamais doubler l'échappement. */
function escapeText(value: string): string {
	return value.replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
