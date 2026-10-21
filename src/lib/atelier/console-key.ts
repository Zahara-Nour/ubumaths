/**
 * Atelier — le raccourci de la console déroulante
 *
 * Lot 2 de `docs/archive/wip/atelier-refonte-interface-phase0.md`, décisions de David
 * du 2026-10-18 :
 *
 * - **la touche physique sous Échap**, lue par sa POSITION (`event.code`) et
 *   non par son caractère : `²` sur un PC AZERTY, `@` sur un Mac AZERTY, `` ` ``
 *   en QWERTY. Sans effet quand le focus est dans un champ, où elle tape son
 *   caractère ;
 * - **Ctrl+Entrée**, partout, y compris depuis un champ. Ctrl et non Cmd sur
 *   Mac : Cmd+Entrée est pris ailleurs, et Ctrl ne tape rien.
 *
 * ⚠️ Mesure du 2026-10-18 (Chrome 154, Mac AZERTY ISO de David) : la touche
 * sous Échap rend `IntlBackslash`, la touche `<` voisine de Maj rend
 * `Backquote` — l'inversion connue des claviers Apple ISO. Sur Mac on accepte
 * donc les deux : un Mac QWERTY ANSI n'a pas d'`IntlBackslash`, et sa touche
 * sous Échap rend `Backquote`. Safari non mesuré.
 *
 * Module pur : la règle se teste sans navigateur.
 *
 * @module atelier/console-key
 */

/** Ce que la règle lit d'un `KeyboardEvent`. */
export interface ShortcutKey {
	readonly code: string;
	readonly key: string;
	readonly ctrlKey: boolean;
	readonly metaKey: boolean;
	readonly altKey: boolean;
	readonly shiftKey: boolean;
}

/** Ce que la règle sait de l'endroit où l'on tape. */
export interface ShortcutContext {
	readonly isMac: boolean;
	/** Le focus est-il dans un champ (texte, mathématique, éditable) ? */
	readonly inField: boolean;
}

/** Ce que `isMacPlatform` lit de `navigator`. */
export interface PlatformInfo {
	readonly userAgentData?: { readonly platform?: string };
	readonly platform?: string;
}

/** La touche sous Échap, selon le système (cf. la mesure ci-dessus). */
const UNDER_ESCAPE_MAC = new Set(['IntlBackslash', 'Backquote']);
const UNDER_ESCAPE_OTHER = new Set(['Backquote']);

/** Un champ où la touche sous Échap tape son caractère. */
export const FIELD_SELECTOR = 'input, textarea, select, [contenteditable], math-field';

/** La touche ouvre-t-elle ou ferme-t-elle la console ? */
export function consoleShortcut(event: ShortcutKey, context: ShortcutContext): boolean {
	if (event.key === 'Enter') {
		return event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey;
	}
	if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return false;
	if (context.inField) return false;
	const codes = context.isMac ? UNDER_ESCAPE_MAC : UNDER_ESCAPE_OTHER;
	return codes.has(event.code);
}

/** Est-on sur un Mac ? `userAgentData` d'abord (Chromium), `platform` sinon. */
export function isMacPlatform(info: PlatformInfo): boolean {
	const platform = info.userAgentData?.platform || info.platform || '';
	return /mac/i.test(platform);
}
