/**
 * Détecte un événement venu d'un champ de saisie.
 *
 * Utilisé par le clavier et le balayage : une frappe ou un geste commencé
 * dans un champ appartient au champ, pas à la navigation du diaporama.
 */

// Balises dont le contenu se saisit au clavier (MATH-FIELD = champ MathLive)
const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'MATH-FIELD']);

/**
 * Vrai si l'événement vient d'un champ de saisie.
 *
 * `composedPath()` traverse les shadow roots : une frappe tapée dans
 * l'élément interne d'un `<math-field>` porte le champ dans son chemin,
 * alors que `event.target` peut ne désigner que l'hôte ou l'intérieur.
 */
export function isFromEditableField(event: Event): boolean {
	const path = event.composedPath();
	const candidates = path.length > 0 ? path : [event.target];
	for (const item of candidates) {
		if (!(item instanceof HTMLElement)) continue;
		if (EDITABLE_TAGS.has(item.tagName) || item.isContentEditable) return true;
	}
	return false;
}
