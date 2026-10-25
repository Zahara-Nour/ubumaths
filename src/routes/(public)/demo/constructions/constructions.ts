/**
 * Les 3 constructions de la vitrine `/demo/constructions` (choix validé par David le
 * 2026-10-25, chantier demo-debug, phase 8).
 *
 * Scripts recopiés des réécritures des constructions publiques de la prod
 * (`scripts/constructions-prod/contenu.ts`, 2026-10-23) : la vitrine ne lit pas la
 * base, elle s'ouvre sans compte.
 */

// Types
export interface DemoConstruction {
	title: string;
	text: string;
	dsl: string;
}

// Constantes

/** Taille du lecteur sur grand écran ; il se réduit à la largeur disponible. */
export const PLAYER_WIDTH = 560;
export const PLAYER_HEIGHT = 460;

export const DEMO_CONSTRUCTIONS: DemoConstruction[] = [
	{
		title: 'Un parallélogramme par ses diagonales',
		text: 'À partir de trois points A, B et C : les diagonales d’un parallélogramme se coupent en leur milieu. La règle graduée place le milieu O de [AC], le compas reporte la longueur OB de l’autre côté.',
		dsl: `# Construction d'un parallélogramme
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
@instruction("4. Pointe du compas en O, on prend l'écartement OB.")
# Arc de 1° sous le point B : le compas s'ouvre de O jusqu'à B (mesure, sans trace visible)
arc(O, rayon=4.272, debut=122.07, fin=123.07)
@pause(1000)
@instruction("On reporte cet écartement de l'autre côté de O : on place D sur la demi-droite [BO) tel que O soit le milieu de [BD].")
arc(O, rayon=4.272, debut=-72, fin=-43)
D = point(2.1, -4.7)
@pause(1000)
@instruction("Remarque : D est le symétrique de B par rapport à O.")
@pause(2000)
@instruction("5. On trace les deux segments [CD] et [DA].")
segment(C, D)
segment(D, A)
@pause(1000)
`
	},
	{
		title: 'Partager un segment en trois',
		text: 'Sans rien mesurer, [AB] est partagé en trois longueurs égales : le compas reporte trois fois le même écartement sur une demi-droite, puis deux parallèles ramènent ce partage sur [AB].',
		dsl: `# Partage d'un segment en trois parts égales
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
`
	},
	{
		title: 'Le symétrique d’un point, au compas',
		text: 'Le symétrique d’un point M par rapport à une droite, avec le compas seul : deux arcs centrés sur l’axe et passant par M se recoupent en M′.',
		dsl: `# Symétrie axiale au compas
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
`
	}
];
