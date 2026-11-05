/**
 * Calcul aligné dans un bloc `$$` de l'éditeur
 * ============================================
 *
 * Une suite de calculs ou un raisonnement s'écrit en `\begin{aligned}…\end{aligned}` :
 * une ligne par étape, toutes alignées sur leur relation.
 *
 * ```
 * A &= 3 + 4          x^2-1=0 &\iff x^2=1
 *   &= 7                      &\iff x=1 ou x=-1
 * ```
 *
 * Cmd+Entrée (ou Ctrl/Alt+Entrée) dans un bloc ajoute une ligne : le bloc entier
 * passe par {@link ajouterLigne}, le curseur repéré par {@link MARQUEUR_CURSEUR}.
 *
 * La coupure (le `&`, point d'alignement) tombe sur le premier connecteur logique
 * hors parenthèses, à défaut sur la première relation : un raisonnement s'aligne
 * sur ses ⇔, un calcul sur ses =.
 *
 * @module extensions/calcul-aligne
 */

/**
 * Marqueur posé à la place du curseur dans le LaTeX du champ : MathLive le garde
 * tel quel, en un seul atome, et il n'apparaît jamais dans une formule de cours.
 */
export const MARQUEUR_CURSEUR = '\\maltese';

/**
 * Mots d'un raisonnement, tapés dans un bloc. `\mathrm` et non `\text` : après un
 * `\text{…}`, MathLive reste en mode texte et la suite de la formule s'y écrit.
 */
export const RACCOURCIS_MOTS = {
	ou: '\\:\\mathrm{ou}\\:',
	et: '\\:\\mathrm{et}\\:'
} as const;

/** Bloc inséré par le bouton « Calcul aligné » : une ligne, le curseur dedans. */
export const CALCUL_ALIGNE_VIDE = `\\begin{aligned}${MARQUEUR_CURSEUR}\\end{aligned}`;

/** Connecteurs logiques : la coupure les préfère aux relations. */
const CONNECTEURS = new Set([
	'\\iff',
	'\\Leftrightarrow',
	'\\Longleftrightarrow',
	'\\implies',
	'\\Rightarrow',
	'\\Longrightarrow',
	'\\impliedby',
	'\\Leftarrow',
	'\\Longleftarrow'
]);

const RELATIONS = new Set([
	'=',
	'<',
	'>',
	'\\lt',
	'\\gt',
	'\\le',
	'\\leq',
	'\\leqslant',
	'\\ge',
	'\\geq',
	'\\geqslant',
	'\\ne',
	'\\neq',
	'\\approx'
]);

/** Ouvrants de structure : toujours fermés dans un LaTeX valide. */
const OUVRANTS = new Set(['{', '\\left', '\\begin']);
const FERMANTS = new Set(['}', '\\right', '\\end']);

const LIGNE = '\\\\';
const CELLULE = '&';

interface Jeton {
	texte: string;
	debut: number;
	/** Profondeur d'imbrication au début du jeton (0 = niveau de la ligne). */
	profondeur: number;
}

/**
 * Découpe un LaTeX en jetons : commande (`\le`, `\left`), symbole échappé
 * (`\\`, `\&`, `\{`) ou caractère seul.
 */
function jetons(latex: string): Jeton[] {
	const resultat: Jeton[] = [];
	let structure = 0;
	// Les parenthèses comptent à part, jamais sous zéro : un intervalle `[0,1)` a une
	// `)` sans `(`, qui ne doit pas faire croire la suite plus haut que la ligne.
	let parentheses = 0;
	let i = 0;
	while (i < latex.length) {
		let fin = i + 1;
		if (latex[i] === '\\') {
			fin = i + 2;
			if (/[a-zA-Z]/.test(latex[i + 1] ?? '')) {
				while (fin < latex.length && /[a-zA-Z]/.test(latex[fin])) fin++;
			}
		}
		const texte = latex.slice(i, fin);
		resultat.push({ texte, debut: i, profondeur: structure + parentheses });
		if (OUVRANTS.has(texte)) structure++;
		if (FERMANTS.has(texte)) structure--;
		if (texte === '(') parentheses++;
		if (texte === ')') parentheses = Math.max(0, parentheses - 1);
		i = fin;
	}
	return resultat;
}

/** Coupe `latex` sur chaque séparateur de niveau 0. */
function decouper(latex: string, separateur: string): string[] {
	const morceaux: string[] = [];
	let debut = 0;
	for (const jeton of jetons(latex)) {
		if (jeton.profondeur === 0 && jeton.texte === separateur) {
			morceaux.push(latex.slice(debut, jeton.debut));
			debut = jeton.debut + jeton.texte.length;
		}
	}
	morceaux.push(latex.slice(debut));
	return morceaux;
}

/** Vrai si rien ne se ferme sans s'être ouvert, et tout ce qui s'ouvre se ferme. */
function equilibre(latex: string): boolean {
	let profondeur = 0;
	for (const { texte } of jetons(latex)) {
		if (OUVRANTS.has(texte)) profondeur++;
		if (FERMANTS.has(texte)) profondeur--;
		if (profondeur < 0) return false;
	}
	return profondeur === 0;
}

/** Indice de la coupure : premier connecteur de niveau 0, sinon première relation, sinon -1. */
function indiceCoupure(latex: string): number {
	const auNiveau0 = jetons(latex).filter((j) => j.profondeur === 0);
	const connecteur = auNiveau0.find((j) => CONNECTEURS.has(j.texte));
	if (connecteur) return connecteur.debut;
	const relation = auNiveau0.find((j) => RELATIONS.has(j.texte));
	return relation ? relation.debut : -1;
}

/** Relation qui ouvre la partie droite d'une ligne (`=7` → `=`), sinon null. */
function relationEnTete(droite: string): string | null {
	const premier = jetons(droite.trim())[0];
	if (!premier) return null;
	return CONNECTEURS.has(premier.texte) || RELATIONS.has(premier.texte) ? premier.texte : null;
}

/**
 * Lignes d'un bloc qui n'est QU'un `aligned` (chaque ligne en cellules), sinon null.
 * Un marqueur collé avant ou après l'environnement (curseur en début ou en fin de
 * champ) est ramené dans la première ou la dernière ligne.
 */
function lignesAligned(latex: string): string[][] | null {
	const m = latex
		.trim()
		.match(/^(\\maltese)?\s*\\begin\{aligned\}([\s\S]*)\\end\{aligned\}\s*(\\maltese)?$/);
	if (!m || !equilibre(m[2])) return null;
	const corps = (m[1] ?? '') + m[2] + (m[3] ?? '');
	return decouper(corps, LIGNE).map((ligne) => decouper(ligne, CELLULE).map((c) => c.trim()));
}

/**
 * Retire le marqueur du curseur, et l'espace que MathLive met derrière — sauf
 * quand cet espace sépare une commande d'une lettre (`\\alpha x`, pas `\\alphax`).
 */
function sansMarqueur(latex: string): string {
	const indice = latex.indexOf(MARQUEUR_CURSEUR);
	if (indice < 0) return latex.trim();
	const avant = latex.slice(0, indice);
	const apres = latex.slice(indice + MARQUEUR_CURSEUR.length).replace(/^ /, '');
	const souderait = /\\[a-zA-Z]+$/.test(avant) && /^[a-zA-Z]/.test(apres);
	return (avant + (souderait ? ' ' : '') + apres).trim();
}

/**
 * Remet en forme la ligne du curseur quand son alignement n'a pas été choisi :
 * formule entière à gauche (pas de `&`, ou rien après) → coupée sur sa relation,
 * ou alignée à gauche sans relation. Un `&` suivi de contenu est respecté.
 */
function normaliserLigne(cellules: string[]): string[] {
	if (cellules.length > 2) return cellules;
	if (cellules.length === 2 && cellules[1] !== '') return cellules;
	const texte = cellules[0];
	const coupure = indiceCoupure(texte);
	if (coupure < 0) return ['', texte];
	return [texte.slice(0, coupure).trim(), texte.slice(coupure).trim()];
}

/**
 * Ajoute une ligne au calcul aligné, sous celle du curseur.
 *
 * @param latex - LaTeX du bloc, {@link MARQUEUR_CURSEUR} à la place du curseur
 * @returns LaTeX du calcul aligné, le marqueur au début de la nouvelle ligne,
 *   juste après la relation reprise de la ligne du dessus
 */
export function ajouterLigne(latex: string): string {
	const lignes = lignesAligned(latex) ?? [[latex.trim()]];

	const trouve = lignes.findIndex((l) => l.some((c) => c.includes(MARQUEUR_CURSEUR)));
	const indice = trouve < 0 ? lignes.length - 1 : trouve;

	const ligne = normaliserLigne(lignes[indice].map(sansMarqueur));
	lignes[indice] = ligne;

	const relation = relationEnTete(ligne[1] ?? '');
	const debut = relation ? (relation.startsWith('\\') ? `${relation} ` : relation) : '';
	lignes.splice(indice + 1, 0, ['', `${debut}${MARQUEUR_CURSEUR}`]);

	return `\\begin{aligned}${lignes.map((l) => l.join(CELLULE)).join(LIGNE)}\\end{aligned}`;
}

/** Vrai si le bloc est un calcul aligné dont une ligne est vide (test rapide, sans curseur). */
export function aUneLigneVide(latex: string): boolean {
	const lignes = lignesAligned(latex);
	return lignes !== null && lignes.some((l) => l.every((c) => c === ''));
}

/**
 * Retire la ligne du curseur si elle est vide : MathLive, lui, s'arrête sur une
 * ligne vide et ne la supprime jamais.
 *
 * @param latex - LaTeX du bloc, {@link MARQUEUR_CURSEUR} à la place du curseur
 * @returns le calcul sans cette ligne, le marqueur en fin de ligne précédente
 *   (au début de la suivante pour la première), ou null s'il n'y a rien à retirer
 */
export function retirerLigneVide(latex: string): string | null {
	const lignes = lignesAligned(latex);
	if (!lignes || lignes.length < 2) return null;

	const indice = lignes.findIndex((l) => l.some((c) => c.includes(MARQUEUR_CURSEUR)));
	if (indice < 0 || !lignes[indice].every((c) => sansMarqueur(c) === '')) return null;

	lignes.splice(indice, 1);
	if (indice === 0) {
		lignes[0][0] = MARQUEUR_CURSEUR + lignes[0][0];
	} else {
		const precedente = lignes[indice - 1];
		precedente[precedente.length - 1] += MARQUEUR_CURSEUR;
	}
	return `\\begin{aligned}${lignes.map((l) => l.join(CELLULE)).join(LIGNE)}\\end{aligned}`;
}
