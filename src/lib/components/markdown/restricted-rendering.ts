/**
 * Rendu RESTREINT du markdown — contexte des composants markdown
 * ==============================================================
 *
 * Le chat élève affiche le contenu tapé par un élève à d'AUTRES élèves (des
 * mineurs). Audit du 2026-10-03 : avec le rendu complet, un message faisait
 * charger à chaque lecteur une URL choisie par l'auteur (fuite d'adresse IP) —
 * image ou vidéo externe, formule MathLive `\htmlStyle{background-image:url(…)}`,
 * bloc ubumark (```trig, ```figure…) recopié depuis un bloc de code.
 *
 * Décision S1 de David (2026-10-03) — en mode restreint :
 * - texte, marques en ligne, listes, citations, code (en TEXTE) ;
 * - formules rendues SAUF si elles contiennent une commande MathLive capable de
 *   poser style, classe, identifiant, données ou lien (alors : texte) ;
 * - images : seulement depuis le stockage Supabase du projet ;
 * - ni vidéo, ni bloc spécial (affiché comme bloc de code).
 *
 * Le filtrage se fait au RENDU : le contenu stocké n'est pas modifié. Le mode
 * normal (cours, exercices, fiches) n'est pas touché.
 *
 * Un rendu imbriqué sous un rendu restreint reste restreint : le mode ne se
 * relâche jamais en descendant.
 *
 * @module components/markdown/restricted-rendering
 */

import { getContext, hasContext, setContext } from 'svelte';
import type { ASTNode, BlockNode, DocumentNode } from '$lib/ubumark';

const RESTRICTED_RENDERING_KEY = Symbol('markdown-restricted-rendering');

type FlagGetter = () => boolean;

/** Poser le mode pour les descendants ; un parent restreint l'impose. */
export function provideRestrictedRendering(get: () => boolean | undefined): void {
	const parent = readRestrictedRendering();
	setContext<FlagGetter>(RESTRICTED_RENDERING_KEY, () => parent() || get() === true);
}

/** Le rendu est-il restreint ? Repli : non (rendu complet, comme avant). */
export function readRestrictedRendering(): FlagGetter {
	return hasContext(RESTRICTED_RENDERING_KEY)
		? getContext<FlagGetter>(RESTRICTED_RENDERING_KEY)
		: () => false;
}

// ============================================================================
// FORMULES
// ============================================================================

/**
 * Commandes MathLive (0.10x) qui écrivent dans le DOM autre chose que des
 * symboles : style CSS libre (`\htmlStyle`, alias `\style`), classe
 * (`\class`, `\htmlClass`), identifiant (`\cssId`, `\htmlId`), attributs
 * `data-` (`\htmlData`), lien (`\href`, `\url` par précaution), cadres dont
 * les paramètres sont recopiés dans le style (`\enclose` : `mathbackground`,
 * `padding`, `shadow` ; `\bbox`). Et les définitions de macros, qui
 * permettraient de les cacher.
 */
export const UNSAFE_MATH_COMMANDS = [
	// Style, classes, attributs, liens : posés tels quels dans le DOM
	'htmlStyle',
	'style',
	'class',
	'htmlClass',
	'cssId',
	'htmlId',
	'htmlData',
	'href',
	'url',
	'enclose',
	'bbox',
	// Couleurs : une couleur non reconnue est recopiée TELLE QUELLE dans `style=`
	// (`\colorbox{zz;background-image:url(…)}` — audit du 2026-10-03)
	'color',
	'textcolor',
	'colorbox',
	'fcolorbox',
	// Polices : la valeur devient `font-family` / `font-weight` / `font-style`
	'fontfamily',
	'fontseries',
	'fontshape',
	// Dimensions et déplacements : une valeur libre finit en marge / position
	'raise',
	'lower',
	'raisebox',
	'rule',
	'hskip',
	'hspace',
	'hspace*',
	'kern',
	'mkern',
	'mskip',
	'mspace',
	'the',
	// Définitions de macros : contourneraient toute liste
	'def',
	'gdef',
	'edef',
	'xdef',
	'let',
	'newcommand',
	'renewcommand',
	'providecommand',
	'DeclareMathOperator',
	'csname'
] as const;

/**
 * Commandes MathLive à argument libre EXAMINÉES et sûres : l'argument n'atteint
 * jamais un style ni un attribut. Accents (un caractère), code de caractère,
 * option d'alignement (`\cfrac[l]`, `\smash[t]`).
 * Garde : `mathlive-commandes-a-valeur.test.ts` échoue si MathLive ajoute une
 * commande à argument libre absente des deux listes.
 */
export const REVIEWED_SAFE_MATH_COMMANDS = [
	'"',
	"'",
	'.',
	'=',
	'^',
	'`',
	'~',
	'c',
	'char',
	'unicode',
	'cfrac',
	'smash'
] as const;

// `\nom` suivi d'autre chose qu'une lettre (`\displaystyle` ≠ `\style`)
// Les noms peuvent contenir `*` (`hspace*`) : échappés pour la regex
const escapeRegex = (name: string): string => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const UNSAFE_MATH_REGEX = new RegExp(
	`\\\\(?:${UNSAFE_MATH_COMMANDS.map(escapeRegex).join('|')})(?![A-Za-z])`
);

/** La formule contient-elle une commande interdite en mode restreint ? */
export function hasUnsafeMathCommand(latex: string): boolean {
	return UNSAFE_MATH_REGEX.test(latex);
}

// ============================================================================
// IMAGES
// ============================================================================

/**
 * L'image vient-elle du stockage Supabase du projet ? Seule source admise en
 * mode restreint : même origine que `supabaseUrl`, chemin sous
 * `/storage/v1/object/` (public, signé ou authentifié). `src` est l'adresse
 * BRUTE du contenu : un chemin relatif, `//hôte/…` ou `data:` n'est pas une URL
 * absolue, donc refusé.
 */
export function isProjectStorageImage(src: string, supabaseUrl: string): boolean {
	try {
		const base = new URL(supabaseUrl);
		const url = new URL(src);
		return (
			(url.protocol === 'https:' || url.protocol === 'http:') &&
			url.origin === base.origin &&
			url.pathname.startsWith('/storage/v1/object/')
		);
	} catch {
		return false;
	}
}

// ============================================================================
// BLOCS SPÉCIAUX
// ============================================================================

/**
 * Ouverture de bloc de code (` ``` ` ou `~~~`), éventuellement en retrait, dans
 * une citation ou un item de liste, suivie d'une langue.
 */
const FENCE_WITH_INFO_REGEX =
	/^((?:[ \t]*>)*[ \t]*(?:(?:[-*+]|\d+[.)])[ \t]+)*)(`{3,}|~{3,})[ \t]*[^`\s][^`\n]*$/gm;

/**
 * Retirer la langue de toutes les ouvertures de blocs de code : ```trig,
 * ```figure, ```courbe… deviennent de simples blocs de code, affichés en
 * texte. (Les clôtures n'ont pas de langue : intactes.)
 */
export function stripFenceLanguages(markdown: string): string {
	return markdown.replace(FENCE_WITH_INFO_REGEX, '$1$2');
}

/** Types de nœuds ubumark admis tels quels en mode restreint (liste blanche). */
const ALLOWED_NODE_TYPES: ReadonlySet<string> = new Set([
	'document',
	'paragraph',
	'heading',
	'list',
	'list-item',
	'blockquote',
	'code-block',
	'math-block',
	'horizontal-rule',
	'table',
	'image',
	'video'
]);

/** Libellé du bloc remplacé (rendu en bloc de code, donc échappé). */
export const RESTRICTED_BLOCK_PLACEHOLDER = '[bloc non affiché dans la discussion]';

/**
 * Filet de sécurité : tout nœud de BLOC hors liste blanche qui aurait échappé
 * à `stripFenceLanguages` (figure, courbe, cercle trigo, arbre…) devient un
 * bloc de code neutre. Copie : l'AST mis en cache n'est jamais modifié.
 * Les nœuds en ligne (texte, formule, lien…) ne sont pas concernés : seuls les
 * conteneurs de blocs sont parcourus.
 */
export function restrictDocument(doc: DocumentNode): DocumentNode {
	return { ...doc, children: doc.children.map(restrictBlock) };
}

function restrictBlock(node: BlockNode): BlockNode {
	if (!ALLOWED_NODE_TYPES.has(node.type)) {
		return { type: 'code-block', code: RESTRICTED_BLOCK_PLACEHOLDER };
	}
	if (node.type === 'blockquote') {
		return { ...node, children: node.children.map(restrictBlock) };
	}
	if (node.type === 'list') {
		return {
			...node,
			items: node.items.map((item) => ({ ...item, children: item.children.map(restrictAny) }))
		};
	}
	return node;
}

/** Enfant d'un item de liste : bloc ou nœud en ligne. */
function restrictAny(node: ASTNode): ASTNode {
	return isBlockLike(node) ? restrictBlock(node) : node;
}

const INLINE_NODE_TYPES: ReadonlySet<string> = new Set([
	'text',
	'math-inline',
	'link',
	'line-break',
	'blank',
	'hashtag',
	'mention',
	'hint-reference',
	'internal-link'
]);

function isBlockLike(node: ASTNode): node is BlockNode {
	return !INLINE_NODE_TYPES.has(node.type);
}
