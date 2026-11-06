/**
 * Calcul aligné dans un bloc `$$` de l'éditeur
 * ============================================
 *
 * Une suite de calculs ou un raisonnement s'écrit en `\begin{array}{rcl}…\end{array}` :
 * une ligne par étape, trois colonnes — membre de gauche (aligné à droite),
 * relation (centrée), membre de droite (aligné à gauche).
 *
 * ```
 * A & = & 3 + 4          x^2-1=0 & \iff       & x^2=1
 *   & = & 7                      & \Rightarrow & x=1 ou x=-1
 * ```
 *
 * La relation a sa colonne : un ⇒ court se centre sous un ⇔ long, et les membres
 * de droite partent tous du même bord (un `aligned` les alignait sur le bord
 * gauche des flèches, décalés dès que deux flèches n'ont pas la même largeur).
 *
 * Cmd+Entrée (ou Ctrl/Alt+Entrée) dans un bloc ajoute une ligne : le bloc entier
 * passe par {@link ajouterLigne}, le curseur repéré par {@link MARQUEUR_CURSEUR}.
 * Un bloc `aligned` (écrit à la main, ou par l'éditeur de #2410) y est converti
 * en calcul centré.
 *
 * La coupure tombe sur le premier connecteur logique hors parenthèses, à défaut
 * sur la première relation : un raisonnement s'aligne sur ses ⇔, un calcul sur
 * ses =.
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

const DEBUT_CENTRE = '\\begin{array}{rcl}';
const FIN_CENTRE = '\\end{array}';

/** Bloc inséré par le bouton « Calcul aligné » : une ligne, le curseur dedans. */
export const CALCUL_ALIGNE_VIDE = `${DEBUT_CENTRE}${MARQUEUR_CURSEUR}${FIN_CENTRE}`;

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

/** Forme d'un calcul aligné : l'ancienne (`aligned`, 2 colonnes) ou la centrée. */
type Forme = 'aligned' | 'centre';

interface Calcul {
	forme: Forme;
	/** Cellules de chaque ligne, rognées. */
	lignes: string[][];
}

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

const estRelation = (texte: string) => CONNECTEURS.has(texte) || RELATIONS.has(texte);

/** Jeton de la coupure : premier connecteur de niveau 0, sinon première relation. */
function coupure(latex: string): Jeton | undefined {
	const auNiveau0 = jetons(latex).filter((j) => j.profondeur === 0);
	return (
		auNiveau0.find((j) => CONNECTEURS.has(j.texte)) ?? auNiveau0.find((j) => RELATIONS.has(j.texte))
	);
}

/**
 * Sépare la relation qui ouvre `texte` du reste : `\iff x=1` → [`\iff`, `x=1`].
 * Sans relation en tête : [``, texte].
 */
function separerRelation(texte: string): [string, string] {
	const t = texte.trim();
	const premier = jetons(t)[0];
	if (!premier || !estRelation(premier.texte)) return ['', t];
	return [premier.texte, t.slice(premier.texte.length).trim()];
}

const MOTIF_ALIGNED = /^(\\maltese)?\s*\\begin\{aligned\}([\s\S]*)\\end\{aligned\}\s*(\\maltese)?$/;
const MOTIF_CENTRE =
	/^(\\maltese)?\s*\\begin\{array\}\s*\{\s*rcl\s*\}([\s\S]*)\\end\{array\}\s*(\\maltese)?$/;

/**
 * Lignes d'un bloc qui n'est QU'un calcul aligné (`aligned` ou `array{rcl}`),
 * chaque ligne en cellules, sinon null. Un marqueur collé avant ou après
 * l'environnement (curseur en début ou en fin de champ) est ramené dans la
 * première ou la dernière ligne.
 */
function lireCalcul(latex: string): Calcul | null {
	const t = latex.trim();
	const centre = t.match(MOTIF_CENTRE);
	const m = centre ?? t.match(MOTIF_ALIGNED);
	if (!m || !equilibre(m[2])) return null;
	const corps = (m[1] ?? '') + m[2] + (m[3] ?? '');
	return {
		forme: centre ? 'centre' : 'aligned',
		lignes: decouper(corps, LIGNE).map((ligne) => decouper(ligne, CELLULE).map((c) => c.trim()))
	};
}

/** Remet des lignes de cellules dans leur environnement. */
function ecrire(lignes: string[][], forme: Forme): string {
	const corps = lignes.map((l) => l.join(CELLULE)).join(LIGNE);
	return forme === 'centre'
		? `${DEBUT_CENTRE}${corps}${FIN_CENTRE}`
		: `\\begin{aligned}${corps}\\end{aligned}`;
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

/** Indice de la ligne du curseur, la dernière à défaut. */
function ligneDuCurseur(lignes: string[][]): number {
	const trouve = lignes.findIndex((l) => l.some((c) => c.includes(MARQUEUR_CURSEUR)));
	return trouve < 0 ? lignes.length - 1 : trouve;
}

/**
 * Ligne en trois colonnes [gauche, relation, droite]. Ce qui suit le premier `&`
 * forme la droite, la relation qui l'ouvre prend la colonne du milieu : la même
 * lecture vaut pour un `aligned` (`A &= 7`), un `a &\iff& b`, une relation tapée
 * en tête de la droite ou une suite tapée dans le milieu. Une ligne sans `&`
 * reste à gauche.
 */
function enTroisColonnes(cellules: string[]): string[] {
	if (cellules.length === 1) return [cellules[0], '', ''];
	return [cellules[0], ...separerRelation(cellules.slice(1).join(' '))];
}

/**
 * Ligne du curseur, marqueur retiré. Quand son alignement n'a pas été choisi
 * (formule entière à gauche : pas de `&`, ou rien après), elle est coupée sur sa
 * relation, ou mise à droite sans relation. Sinon, {@link enTroisColonnes}.
 */
function remettreLigneDuCurseur(cellules: string[]): string[] {
	const propres = cellules.map(sansMarqueur);
	if (propres.slice(1).some((c) => c !== '')) return enTroisColonnes(propres);
	const texte = propres[0];
	const jeton = coupure(texte);
	if (!jeton) return ['', '', texte];
	return [
		texte.slice(0, jeton.debut).trim(),
		jeton.texte,
		texte.slice(jeton.debut + jeton.texte.length).trim()
	];
}

/**
 * Ajoute une ligne au calcul, sous celle du curseur. Le résultat est toujours un
 * calcul centré, quelle que soit la forme lue.
 *
 * @param latex - LaTeX du bloc, {@link MARQUEUR_CURSEUR} à la place du curseur
 * @returns LaTeX du calcul centré, le marqueur au début de la colonne de droite
 *   de la nouvelle ligne, la relation de la ligne du dessus reprise au milieu
 */
export function ajouterLigne(latex: string): string {
	const lignes = lireCalcul(latex)?.lignes ?? [[latex.trim()]];
	const indice = ligneDuCurseur(lignes);

	const remises = lignes.map((l, i) =>
		i === indice ? remettreLigneDuCurseur(l) : enTroisColonnes(l)
	);
	remises.splice(indice + 1, 0, ['', remises[indice][1], MARQUEUR_CURSEUR]);

	return ecrire(remises, 'centre');
}

/** Vrai si le bloc est un calcul centré (`array{rcl}`). */
export function estCalculCentre(latex: string): boolean {
	return lireCalcul(latex)?.forme === 'centre';
}

/** Vrai si le bloc est un calcul aligné dont une ligne est vide (test rapide, sans curseur). */
export function aUneLigneVide(latex: string): boolean {
	const calcul = lireCalcul(latex);
	return calcul !== null && calcul.lignes.some((l) => l.every((c) => c === ''));
}

/**
 * Retire la ligne du curseur si elle est vide : MathLive, lui, s'arrête sur une
 * ligne vide et ne la supprime jamais. La forme du bloc est gardée.
 *
 * @param latex - LaTeX du bloc, {@link MARQUEUR_CURSEUR} à la place du curseur
 * @returns le calcul sans cette ligne, le marqueur en fin de ligne précédente
 *   (au début de la suivante pour la première), ou null s'il n'y a rien à retirer
 */
export function retirerLigneVide(latex: string): string | null {
	const calcul = lireCalcul(latex);
	if (!calcul || calcul.lignes.length < 2) return null;
	const { lignes, forme } = calcul;

	const indice = lignes.findIndex((l) => l.some((c) => c.includes(MARQUEUR_CURSEUR)));
	if (indice < 0 || !lignes[indice].every((c) => sansMarqueur(c) === '')) return null;

	lignes.splice(indice, 1);
	if (indice === 0) {
		lignes[0][0] = MARQUEUR_CURSEUR + lignes[0][0];
	} else {
		const precedente = lignes[indice - 1];
		precedente[precedente.length - 1] += MARQUEUR_CURSEUR;
	}
	return ecrire(lignes, forme);
}

/**
 * Retour arrière au début de la colonne de droite d'un calcul centré : efface la
 * relation de la colonne du milieu (MathLive, lui, ne passe pas d'une cellule à
 * l'autre et ne fait rien). Le curseur reste à droite, prêt pour la nouvelle
 * relation, que {@link rangerRelation} remettra au milieu.
 *
 * @param latex - LaTeX du bloc, {@link MARQUEUR_CURSEUR} à la place du curseur
 * @returns le calcul sans cette relation, ou null s'il n'y a rien à effacer
 */
export function effacerRelation(latex: string): string | null {
	const calcul = lireCalcul(latex);
	if (calcul?.forme !== 'centre') return null;
	const ligne = calcul.lignes[ligneDuCurseur(calcul.lignes)];
	if (ligne.length < 3 || !ligne[2].startsWith(MARQUEUR_CURSEUR) || ligne[1] === '') return null;
	if (ligne[1].includes(MARQUEUR_CURSEUR)) return null;
	ligne[1] = '';
	return ecrire(calcul.lignes, 'centre');
}

/**
 * Relation à ranger : milieu vide, droite ouverte par une relation suivie d'autre
 * chose. Seule, la relation reste où elle est : un raccourci comme `<=>` se tape
 * en trois touches (`<`, `≤`, `⇔`), le ranger dès la première le casserait.
 */
function relationARanger(ligne: string[]): [string, string] | null {
	if (ligne.length < 3 || ligne[1] !== '') return null;
	const [relation, reste] = separerRelation(ligne.slice(2).join(' '));
	if (relation === '' || sansMarqueur(reste) === '') return null;
	return [relation, reste];
}

/** Vrai si une relation est à ranger au milieu (test rapide, sans curseur). */
export function aRelationARanger(latex: string): boolean {
	const calcul = lireCalcul(latex);
	return calcul?.forme === 'centre' && calcul.lignes.some((l) => relationARanger(l) !== null);
}

/**
 * Range au milieu la relation tapée en tête de la colonne de droite (après un
 * Retour arrière qui a effacé l'ancienne) : sans quoi elle resterait alignée à
 * gauche, décalée par rapport aux relations centrées des autres lignes.
 *
 * @param latex - LaTeX du bloc, {@link MARQUEUR_CURSEUR} à la place du curseur
 * @returns le calcul rangé, le marqueur à sa place dans la droite, ou null
 */
export function rangerRelation(latex: string): string | null {
	const calcul = lireCalcul(latex);
	if (calcul?.forme !== 'centre') return null;
	let range = false;
	const lignes = calcul.lignes.map((ligne) => {
		const separee = relationARanger(ligne);
		if (!separee) return ligne;
		range = true;
		return [ligne[0], ...separee];
	});
	return range ? ecrire(lignes, 'centre') : null;
}
