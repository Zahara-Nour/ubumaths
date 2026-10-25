/**
 * Coloration des blocs de code ubumark
 * ====================================
 *
 * `highlight.js` est chargé à la demande : le cœur au premier bloc coloré,
 * puis chaque langage à sa première apparition (un petit morceau par langage,
 * jamais le paquet complet). Les pages sans bloc de code n'en chargent rien.
 *
 * Langage absent ou hors liste : pas de coloration (texte brut). Pas de
 * détection automatique : un pseudo-code ou une sortie de programme se ferait
 * colorer au hasard.
 *
 * Le HTML rendu par `highlight.js` échappe le texte du code : seules ses
 * balises `<span class="hljs-…">` y sont ajoutées.
 */
import type { HLJSApi, LanguageFn } from 'highlight.js';

// Types
type LanguageLoader = () => Promise<{ default: LanguageFn }>;

// Constantes
// Langages colorés, chacun dans son propre morceau
const LANGUAGES: Record<string, LanguageLoader> = {
	python: () => import('highlight.js/lib/languages/python'),
	javascript: () => import('highlight.js/lib/languages/javascript'),
	typescript: () => import('highlight.js/lib/languages/typescript'),
	bash: () => import('highlight.js/lib/languages/bash'),
	json: () => import('highlight.js/lib/languages/json'),
	xml: () => import('highlight.js/lib/languages/xml'),
	css: () => import('highlight.js/lib/languages/css'),
	sql: () => import('highlight.js/lib/languages/sql'),
	latex: () => import('highlight.js/lib/languages/latex')
};

// Autres noms courants d'un même langage
const ALIASES: Record<string, string> = {
	py: 'python',
	js: 'javascript',
	ts: 'typescript',
	sh: 'bash',
	shell: 'bash',
	html: 'xml',
	svg: 'xml',
	tex: 'latex'
};

// Variables
let core: Promise<HLJSApi> | null = null;
const registered = new Set<string>();

// Functions
/** Le langage coloré désigné par l'étiquette du bloc, ou null (texte brut). */
export function resolveLanguage(language: string | undefined): string | null {
	if (!language) return null;
	const name = language.trim().toLowerCase();
	const resolved = ALIASES[name] ?? name;
	return Object.hasOwn(LANGUAGES, resolved) ? resolved : null;
}

/** Le HTML coloré du code, ou null quand son langage n'est pas coloré. */
export async function highlightCode(
	code: string,
	language: string | undefined
): Promise<string | null> {
	const name = resolveLanguage(language);
	if (name === null) return null;
	core ??= import('highlight.js/lib/core').then((module) => module.default);
	const hljs = await core;
	if (!registered.has(name)) {
		hljs.registerLanguage(name, (await LANGUAGES[name]()).default);
		registered.add(name);
	}
	return hljs.highlight(code, { language: name, ignoreIllegals: true }).value;
}
