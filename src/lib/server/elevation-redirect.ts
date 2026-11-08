/**
 * Retour après l'élévation admin
 * ==============================
 *
 * Sorti de `dashboard/elevate/+page.server.ts` (chantier demo-debug) pour être testé
 * seul et pour admettre `/dev`, gardé lui aussi par l'élévation (`reservedAreasHandle`).
 *
 * @module server/elevation-redirect
 */

// Constantes

/** Retour par défaut une fois élevé. */
const DEFAULT_REDIRECT = '/dashboard/admin';

/** Sections gardées par l'élévation : seuls retours admis. */
const ELEVATED_SECTIONS = ['/dashboard/admin', '/dev'];

/**
 * Segments « . » et « .. », encodés compris : l'analyseur d'URL du navigateur les
 * résout (`%2e%2e` vaut `..`), un chemin qui en contient sortirait de sa section.
 */
const DOT_SEGMENT = /^(?:\.|%2e){1,2}$/i;

/** Dernier caractère de contrôle C0 (tabulation, retour ligne…) et DEL. */
const LAST_C0_CONTROL = 0x1f;
const DEL = 0x7f;

// Functions

/** Caractère de contrôle (code ≤ 0x1f, ou DEL), que l'analyseur d'URL retire. */
function hasControlCharacter(text: string): boolean {
	return [...text].some((char) => {
		const code = char.charCodeAt(0);
		return code <= LAST_C0_CONTROL || code === DEL;
	});
}

/**
 * Valide un retour interne après l'élévation. N'accepte qu'un chemin relatif à la
 * racine (jamais `//hôte`, qui sortirait du site), sans barre oblique inverse ni segment `.`/`..`,
 * situé dans une section gardée par l'élévation ; tout le reste retombe sur l'accueil
 * admin.
 */
export function safeElevationRedirect(raw: string | null): string {
	if (!raw) return DEFAULT_REDIRECT;
	if (!raw.startsWith('/') || raw.startsWith('//')) return DEFAULT_REDIRECT;
	if (raw.includes('\\')) return DEFAULT_REDIRECT;
	// Caractères de contrôle : l'analyseur d'URL retire tabulations et retours ligne,
	// `.\t.` deviendrait `..` après le contrôle des segments
	if (hasControlCharacter(raw)) return DEFAULT_REDIRECT;
	const path = raw.split(/[?#]/)[0];
	if (path.split('/').some((segment) => DOT_SEGMENT.test(segment))) return DEFAULT_REDIRECT;
	const inSection = ELEVATED_SECTIONS.some((s) => path === s || path.startsWith(`${s}/`));
	return inSection ? raw : DEFAULT_REDIRECT;
}
