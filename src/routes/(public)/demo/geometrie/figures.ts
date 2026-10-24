/**
 * Les 10 figures de la vitrine `/demo/geometrie`, rangées par public.
 *
 * Scripts repris des pages d'aide `/aide-ecriture/geometrie/…` (galerie validée par
 * David le 2026-10-24, chantier demo-debug, PR 6f), sauf l'épicycloïde : celle de
 * `sliders/epicycloide` trace un cercle, la vitrine fait rouler un vrai petit cercle.
 */
import { buildKochDsl } from '$lib/components/geometry/koch-dsl';

// Types
export type DemoSectionId = 'college' | 'lycee' | 'plaisir';

export interface DemoSection {
	id: DemoSectionId;
	title: string;
}

export interface DemoFigure {
	section: DemoSectionId;
	title: string;
	text: string;
	dsl: string;
	/** Taille de la toile sur grand écran ; elle se réduit à la largeur disponible. */
	width: number;
	height: number;
	pixelsPerUnit: number;
}

// Constantes
export const DEMO_SECTIONS: DemoSection[] = [
	{ id: 'college', title: 'Au collège' },
	{ id: 'lycee', title: 'Au lycée' },
	{ id: 'plaisir', title: 'Pour le plaisir' }
];

export const DEMO_FIGURES: DemoFigure[] = [
	{
		section: 'college',
		title: "Droite d'Euler",
		text: 'Le centre de gravité G, l’orthocentre H et le centre O du cercle circonscrit sont toujours alignés. Déplacez A, B ou C : les trois points bougent, la droite les suit.',
		dsl: `A = point(-4, -2, couleur="bleu")
B = point(4, -2, couleur="bleu")
C = point(-3, 4, couleur="bleu")
triangle(A, B, C)
G = centre_gravite(A, B, C)
style(G, couleur="orange")
H = orthocentre(A, B, C)
style(H, couleur="rouge")
cc = cercle_circonscrit(A, B, C)
O = centre(cc)
montre(O, couleur="violet")
style(cc, couleur="violet", trait="tirets")
droite_euler(A, B, C, couleur="cyan")`,
		width: 600,
		height: 500,
		pixelsPerUnit: 40
	},
	{
		section: 'college',
		title: 'Symétries et rotation',
		text: 'Un segment et un cercle, avec leurs images par la rotation de 90° autour de O, par la symétrie de centre O et par la symétrie d’axe la droite en pointillés. Déplacez A ou B : les images suivent.',
		dsl: `A = point(3, 2, couleur="bleu")
B = point(5, 2, couleur="bleu")
# s sert aux transformations ; caché, son nom ne s'affiche pas
s = segment(A, B, visible=faux)
segment(A, B, couleur="bleu")
c = cercle(A, rayon=1, couleur="bleu")
O = point(0, 0, couleur="noir")
P1 = point(-6, 0, couleur="gris", etiquette="aucune")
P2 = point(6, 0, couleur="gris", etiquette="aucune")
droite(P1, P2, couleur="gris", trait="tirets")

rot = rotation(angle=90, centre=O)
transforme(rot, s, couleur="rouge")
transforme(rot, c, couleur="rouge")

sym = symetrie(centre=O)
transforme(sym, s, couleur="vert")
transforme(sym, c, couleur="vert")

refl = symetrie(axe=(P1, P2))
transforme(refl, s, couleur="violet")
transforme(refl, c, couleur="violet")`,
		width: 700,
		height: 500,
		pixelsPerUnit: 35
	},
	{
		section: 'college',
		title: 'Homothétie variable',
		text: 'A parcourt le cercle, et B est l’image de P par l’homothétie de centre A et de rapport k : B dessine un nouveau cercle. Faites varier k : s’il est négatif, B passe de l’autre côté de A.',
		dsl: `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=3, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(5, 3, couleur="vert")
k = slider(min=-2, max=3, valeur=0.5, pas=0.1)
B = homothetie(P, centre=A, rapport=k, couleur="orange")
L = lieu(B, A, couleur="violet")`,
		width: 600,
		height: 400,
		pixelsPerUnit: 40
	},
	{
		section: 'college',
		title: 'Cercle par trois points',
		text: 'Par trois points non alignés passe un seul cercle. Déplacez A, B ou C : le cercle se recalcule et son rayon s’affiche.',
		dsl: `A = point(3, 0, couleur="bleu")
B = point(0, 3, couleur="bleu")
C = point(-3, 0, couleur="bleu")
c = cercle(A, B, C)
style(c, couleur="violet")
r = rayon(c)
rtexte(-5, -4, "r = {r:.2f}")`,
		width: 600,
		height: 450,
		pixelsPerUnit: 40
	},
	{
		section: 'lycee',
		title: 'Intégrale dynamique',
		text: 'La zone colorée représente l’intégrale de x³ − x entre a et b. Faites glisser a et b : sous l’axe, l’aire compte en négatif.',
		dsl: `f = courbe("y = x^3 - x", couleur="bleu")
a = slider(min=-2, max=2, valeur=-1.5, pas=0.05)
b = slider(min=-2, max=2, valeur=1.5, pas=0.05)
A = integrale(f, a, b, couleur="violet", opacite_fond=0.35)
mtexte(2.5, 2.5, "\\int_a^b (x^3 - x)\\, dx = {A:.3f}")`,
		width: 500,
		height: 400,
		pixelsPerUnit: 40
	},
	{
		section: 'lycee',
		title: 'Aire entre deux courbes',
		text: 'Entre π/4 et 5π/4, l’aire entre sin et cos vaut exactement 2√2. Déplacez les bornes : quand les courbes se croisent, les morceaux s’ajoutent sans se compenser.',
		dsl: `unite_angle("radians")
f = courbe("y = sin(x)", couleur="bleu")
g = courbe("y = cos(x)", couleur="vert")
a = slider(min=-1, max=1.5, valeur=0.7853981633974483, pas=0.05)
b = slider(min=2, max=5, valeur=3.9269908169872414, pas=0.05)
E = aire_entre(f, g, a, b, opacite_fond=0.4)
mtexte(-3, 1.6, "\\text{Aire entre } f \\text{ et } g = {E:.3f}")
mtexte(-3, 1.2, "\\text{Valeur exacte : } 2\\sqrt{2}")`,
		width: 500,
		height: 400,
		pixelsPerUnit: 40
	},
	{
		section: 'lycee',
		title: "Lieu d'un milieu",
		text: 'A parcourt le cercle, P reste fixe et M est le milieu de [AP] : M dessine un cercle deux fois plus petit. Déplacez P pour le promener.',
		dsl: `O = point(0, 0, couleur="bleu")
c = cercle(O, rayon=4, couleur="bleu")
A = point_sur(c, 0, couleur="rouge")
P = point(3, 0, couleur="vert")
M = milieu(A, P, couleur="orange")
L = lieu(M, A, couleur="violet")`,
		width: 500,
		height: 400,
		pixelsPerUnit: 40
	},
	{
		section: 'plaisir',
		title: 'Flocon de Von Koch',
		text: 'À chaque étape, chaque côté est coupé en trois et une pointe pousse sur le tiers du milieu. Le périmètre grandit sans fin, l’aire reste bornée.',
		dsl: buildKochDsl(4),
		width: 500,
		height: 500,
		pixelsPerUnit: 60
	},
	{
		section: 'plaisir',
		title: 'Épicycloïde',
		text: 'Un petit cercle roule sans glisser autour d’un grand. Un point de son bord dessine trois arches. Faites glisser t pour le faire rouler.',
		// Grand cercle de rayon 3, petit cercle de rayon 1 : son centre tourne de t
		// autour de O, et le petit cercle tourne de 3t sur lui-même en plus.
		dsl: `unite_angle("radians")
O = point(0, 0, couleur="bleu")
t = slider(min=0, max=2*\\pi, valeur=2.1, pas=0.02)
fixe = cercle(O, rayon=3, couleur="bleu")
C0 = point(4, 0, visible=faux)
C = rotation(C0, centre=O, angle=t, visible=faux)
roule = cercle(C, rayon=1, couleur="gris")
M0 = point(3, 0, visible=faux)
M1 = rotation(M0, centre=O, angle=t, visible=faux)
k = 3 * t
M = rotation(M1, centre=C, angle=k, couleur="orange")
segment(C, M, couleur="gris")
courbe("x = 4*cos(u) - cos(4*u)", "y = 4*sin(u) - sin(4*u)", t_min=0, t_max=t, param="u", couleur="violet")`,
		width: 500,
		height: 500,
		pixelsPerUnit: 40
	},
	{
		section: 'plaisir',
		title: "Spirale d'Archimède",
		text: 'Le point tourne autour de O et s’en éloigne à mesure : la distance grandit comme l’angle. Faites glisser t lentement.',
		dsl: `O = point(0, 0, couleur="bleu")
t = slider(min=0, max=1080, valeur=0, pas=2)
A = point(1, 0, visible=faux)
B = rotation(A, centre=O, angle=t, visible=faux)
r = t / 360
C = homothetie(B, centre=O, rapport=r, couleur="orange")
T = trace(C, couleur="violet")`,
		width: 600,
		height: 500,
		pixelsPerUnit: 60
	}
];
