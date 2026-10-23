/**
 * Réécriture des constructions publiques de la prod (2026-10-23)
 * ==============================================================
 *
 * Les 9 constructions publiques viennent de l'ancien convertisseur InstrumenPoche.
 * Trois constructions géométriques étaient fausses ou incomplètes (points `NaN`,
 * I = J = K confondus, titre « symétrie centrale » sur une symétrie axiale) : elles
 * sont réécrites en gardant l'idée, la progression et les consignes de leur auteur,
 * avec les chorégraphies quand elles font la construction annoncée. Les titres et
 * descriptions des 9 reprennent leurs accents ; « Repérage de points » (sans axes ni
 * noms, segments vers `NaN`) est dépublié, rien n'est supprimé.
 *
 * Lu par `appliquer.ts` (écriture) et par `scripts/__tests__/constructions-prod.test.ts`.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ConstructionChange {
	id: string;
	/** Titre lu en prod avant réécriture : garde contre une ligne modifiée entre-temps */
	titreAvant: string;
	title: string;
	description: string;
	/** Nouveau script, ou `undefined` pour garder celui de la prod */
	dslScript?: string;
	isPublic: boolean;
}

// ============================================================================
// CONSTANTES : SCRIPTS
// ============================================================================

/** D'après Françoise Chomat : ABCD à partir de A, B, C, par les diagonales */
export const PARALLELOGRAMME = `# Construction d'un parallélogramme (d'après Françoise Chomat)
@instruction("Construire un parallélogramme en traçant ses diagonales.")
@pause(1000)
@instruction("Ici on construit un parallélogramme ABCD à partir de trois points A, B et C.")
A = point(-5, -2.5)
@pause(500)
B = point(-2.5, 2.5)
@pause(500)
C = point(4.6, 0.3)
@pause(1000)
@instruction("Les diagonales d'un parallélogramme se coupent en leur milieu.")
@pause(2000)
@instruction("1. On trace les segments [AB] et [BC], puis la diagonale [AC].")
segment(A, B)
segment(B, C)
segment(A, C)
@pause(500)
@instruction("2. En utilisant les graduations de la règle, on place le milieu O du segment [AC].")
O = milieu(A, C) @mesure
@pause(500)
@instruction("3. On trace la demi-droite [BO).")
demidroite(B, O)
@pause(500)
@instruction("4. Avec le compas, on place le point D sur la demi-droite [BO) tel que O soit le milieu de [BD].")
arc(O, rayon=4.272, debut=-72, fin=-43)
D = point(2.1, -4.7)
@pause(1000)
@instruction("Remarque : D est le symétrique de B par rapport à O.")
@pause(2000)
@instruction("5. On trace les deux segments [CD] et [DA].")
segment(C, D)
segment(D, A)
@pause(1000)
`;

/** D'après Jean-Louis Kahn : report de trois longueurs égales, puis deux parallèles */
export const PARTAGE_TROIS = `# Partage d'un segment en trois parts égales (d'après Jean-Louis Kahn)
@instruction("Partage d'un segment en trois parts égales (règle, compas).")
A = point(-6, -3)
B = point(4, -2.5)
segment(A, B)
@pause(1000)
@instruction("1. On trace une demi-droite d'origine le point A.")
X = point(6, 3, visible=faux)
demidroite(A, X)
@pause(500)
@instruction("2. On choisit une ouverture de compas que l'on reporte trois fois sur la demi-droite.")
arc(A, rayon=3, debut=17, fin=37)
I = point(A, longueur=3, direction=X)
arc(I, rayon=3, debut=17, fin=37)
J = point(A, longueur=6, direction=X)
arc(J, rayon=3, debut=17, fin=37)
K = point(A, longueur=9, direction=X)
@pause(500)
@instruction("3. On trace la droite (KB), puis les parallèles à (KB) passant par J et par I : constructions de parallélogrammes au compas.")
droite(K, B)
d2 = parallele(J, K, B) @euclide @epure
d1 = parallele(I, K, B) @euclide @epure
@pause(500)
@instruction("Les parallèles coupent [AB] en M et N.")
M = intersection(d1, droite(A, B, visible=faux))
N = intersection(d2, droite(A, B, visible=faux))
@pause(1000)
@instruction("Les segments consécutifs [AM], [MN] et [NB] sont de même longueur.")
marque_segment(A, M)
marque_segment(M, N)
marque_segment(N, B)
@pause(1000)
`;

/** D'après Jean-Louis Kahn : symétrique d'un point par rapport à une droite, deux arcs */
export const SYMETRIE_AXIALE = `# Symétrie axiale au compas (d'après Jean-Louis Kahn)
@instruction("Construction du symétrique d'un point par rapport à une droite, au compas.")
@pause(1000)
@instruction("On considère un point M et un axe de symétrie (d).")
U = point(-6, -2.5, visible=faux)
V = point(6, 2.5, visible=faux)
d = droite(U, V)
M = point(-2.5, 2.5)
@pause(1000)
@instruction("1. On place deux points N et P sur l'axe (d).")
N = point(3, 1.25)
@pause(500)
P = point(-3.6, -1.5)
@pause(500)
@instruction("2. Avec le compas, on trace deux arcs de cercle passant par M et de centres N puis P.")
arc(N, rayon=5.640, debut=160, fin=245)
arc(P, rayon=4.148, debut=-37, fin=82)
@pause(500)
@instruction("3. Le point d'intersection de ces deux arcs de cercle est le symétrique M′ du point M par rapport à (d).")
cN = cercle(N, passant=M, visible=faux)
cP = cercle(P, passant=M, visible=faux)
Ms = intersection(cN, cP, 1, etiquette="aucune")
texte(Ms, "M′", dx=0.2, dy=-0.2)
@pause(1000)
segment(M, Ms)
H = intersection(d, segment(M, Ms, visible=faux), visible=faux)
marque_segment(M, H, traits=2)
marque_segment(H, Ms, traits=2)
@pause(1000)
`;

// ============================================================================
// CONSTANTES : CHANGEMENTS
// ============================================================================

export const CHANGES: readonly ConstructionChange[] = [
	{
		id: '7687e832-0069-4299-b05e-c9eabff60bf0',
		titreAvant: "Axes de symetrie et construction d'un carre",
		title: "Axes de symétrie et construction d'un carré",
		description:
			"Construction d'un carré à partir de ses diagonales, avec mise en évidence des axes de symétrie. (Auteur : Sésamath)",
		isPublic: true
	},
	{
		id: 'e07ebed9-0db1-497f-9aea-1b5ba03023a1',
		titreAvant: 'Calcul mental : Ajouter 19',
		title: 'Calcul mental : Ajouter 19',
		description:
			'Animation explicative pour le calcul mental. Technique : ajouter 20 puis soustraire 1. (Auteur : Julien Crémoux)',
		isPublic: true
	},
	{
		id: '11c51859-19b6-4f45-82f0-abe7baabdd3b',
		titreAvant: 'Calcul mental : Soustraire 99',
		title: 'Calcul mental : Soustraire 99',
		description:
			'Animation explicative pour le calcul mental. Technique : soustraire 100 puis ajouter 1. (Auteur : Julien Crémoux)',
		isPublic: true
	},
	{
		id: '2a865958-dfa9-49aa-8157-9605df6efc2a',
		titreAvant: "Construction d'un parallelogramme",
		title: "Construction d'un parallélogramme",
		description:
			"Construction d'un parallélogramme à partir de ses diagonales, avec la règle graduée et le compas. (Auteur : Françoise Chomat)",
		dslScript: PARALLELOGRAMME,
		isPublic: true
	},
	{
		id: 'd25a9985-1d78-4b1c-9f56-88fcd7bb3f68',
		titreAvant: 'Exemple MathJax/LaTeX',
		title: 'Exemple MathJax/LaTeX',
		description:
			"Démonstration de l'affichage de formules mathématiques avec MathJax. (Auteur : Florence Decool)",
		isPublic: true
	},
	{
		id: '8afe4af8-9b35-46fb-80f5-7de9f958f5a5',
		titreAvant: 'Exercice de reperage de points',
		title: 'Exercice de repérage de points',
		description: 'Exercice interactif pour relier des points dans un repère.',
		isPublic: false
	},
	{
		id: 'aa5b18b9-64dd-4681-9152-39ddd04c3277',
		titreAvant: "Partage d'un segment en 3 parts egales",
		title: "Partage d'un segment en trois parts égales",
		description:
			'Construction à la règle et au compas pour partager un segment [AB] en trois parts égales. (Auteur : Jean-Louis Kahn)',
		dslScript: PARTAGE_TROIS,
		isPublic: true
	},
	{
		id: 'b050247a-9257-4852-8fd8-b51a6c2a22f8',
		titreAvant: 'Segment avec marque',
		title: 'Segment avec marque',
		description:
			"Construction simple d'un segment avec une marque de codage. (Auteur : Julien Crémoux)",
		isPublic: true
	},
	{
		id: '89b21e2c-ed1b-4196-a0be-0ad35f84abf6',
		titreAvant: 'Symetrie centrale au compas',
		title: 'Symétrie axiale au compas',
		description:
			"Construction du symétrique d'un point par rapport à une droite, au compas, avec deux arcs de cercle. (Auteur : Jean-Louis Kahn)",
		dslScript: SYMETRIE_AXIALE,
		isPublic: true
	}
];
