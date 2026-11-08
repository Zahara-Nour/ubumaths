/**
 * Catalogue — bloc ```figure-a-completer (case « figure »)
 *
 * Réglages : `src/lib/ubumark/parser/construction-parser.ts` (lignes propres au
 * bloc) ; le reste est l'en-tête et le langage de ```figure.
 *
 * @module block-catalog/figure-a-completer
 */
import { fence } from './fence';
import type { BlockCatalogEntry } from './types';

export const figureACompleterEntry: BlockCatalogEntry = {
	slug: 'figure-a-completer',
	title: 'Figure à compléter',
	fences: ['figure-a-completer'],
	nodeType: 'figure',
	summary: 'Une figure de départ sur laquelle l’élève trace ; sa figure est corrigée seule.',
	intro:
		'Dans une question, le bloc est à la fois la figure de départ et la case réponse : l’élève touche un point puis un autre, la droite (ou le segment) se trace, et « Valider » la juge. On écrit la figure comme un bloc figure (fenêtre, puis les points après ---), et on dit ce qu’il faut vérifier. Hors d’une question, ou dans une fiche imprimée, seule la figure de départ s’affiche.',
	settingGroups: [
		{
			settings: [
				{
					key: 'verifier',
					values:
						"droite_par A ; B · carre A ; B · rectangle A ; B ; C · symetrique par d · symetrique A ; B ; C par d · point A' = symetrie(A, axe=d) · droite m = mediatrice(A, B) · droite d = bissectrice(A, O, B) · cercle c = cercle_circonscrit(A, B, C) · cercle c = cercle(O, passant=A) · cercle c = cercle(O, rayon=distance(D, E)) · segment AB = 6 cm · angle AOy = 50 · mesure AOB · mesure AOB, rapporteur posé · triangle ABC : AC = u ; BC = v · triangle ABC : CAB = 40 ; ABC = 65 · triangle ABC : AC = u ; CAB = 40",
					defaultValue: null,
					description:
						"Ce que la figure de l’élève doit contenir. droite_par : une droite qui passe par les deux points nommés (une ligne par droite ; toute droite en plus est fausse). carre : le côté [AB] est tracé, l’élève trace les trois autres, d’un côté ou de l’autre. rectangle : les côtés [AB] et [BC] sont tracés, l’élève trace les deux autres. symetrique par d : l’élève trace le symétrique de tout ce qui est tracé (segments, polygones) sauf l’axe d ; par O (un point) : symétrie centrale ; symetrique A ; B ; C par d : seulement les traits entre ces points. Sur quadrillage (grille:), le symétrique dans la fenêtre et sur les nœuds. Un seul carré, rectangle ou symétrique par figure. point A' = <expression> : l’élève place un point là où l’expression du langage des figures le met (symetrie, milieu, intersection…) ; une ligne par point, l’élève ne les nomme pas ; A' n’est pas un nom de la figure, il sert à la correction et aux messages. Sur quadrillage (grille:), le point dans la fenêtre et sur un nœud. Sans quadrillage (papier uni), l’élève construit avec la règle, l’équerre et le compas : seulement un symétrique (symetrie(A, axe=d) ou symetrie(A, centre=O)), l’axe dans la fenêtre ; un point qui n’est ni un point de la figure ni une intersection de traits est « placé à l’œil », faux même s’il est bien placé. Le symétrique d’une figure se construit aussi sur papier uni, et le milieu (milieu(A, B)) par la médiatrice. droite m = <expression> : une des droites que trace l’élève (règle, équerre) doit être celle de l’expression (mediatrice, perpendiculaire…) ; ses autres droites et ses cercles sont des traits de construction ; m sert à la correction. Sur papier uni, la droite passe par deux points construits (ou, à l’équerre, par un point construit) : sinon elle est « tracée à l’œil ». Sans quadrillage, seulement une médiatrice (mediatrice(A, B)), avec au moins 2 unités de médiatrice dans la fenêtre (l’élève y croise deux cercles de même rayon, centrés en A et B), ou une bissectrice (bissectrice(A, O, B), sommet O au milieu ; O, A, B visibles et non alignés, les deux côtés de l’angle tracés (demi-droites, droites ou segments partant de O vers A et vers B), au moins 2 unités de bissectrice dans la fenêtre ; papier uni seulement, outils: peut y ajouter le rapporteur, la bissectrice est alors admise à 1° près) ; sur quadrillage, toute droite qui passe par deux nœuds, la règle et l’équerre allant aux nœuds. Une droite à construire ne se mêle pas à d’autres vérifications, et sa palette ne prend que la règle, l’équerre, le compas et le report (le report sur papier uni seulement : il garde l’écartement des deux cercles égaux). cercle c = cercle_circonscrit(A, B, C) : un des cercles que trace l’élève (compas ou report) doit être le cercle circonscrit, son centre et son point de passage construits (sinon « tracé à l’œil ») ; ses autres cercles et ses droites sont des traits de construction. Papier uni seulement ; les sommets visibles, le cercle entier dans la fenêtre, et au moins deux médiatrices constructibles dans la fenêtre (2 unités de médiatrice dans la fenêtre). Le centre seul : point O = centre(cercle_circonscrit(A, B, C)). Mêmes règles de mélange et de palette que la droite. cercle c = cercle(O, passant=A) : l’élève pique le compas en O et l’ouvre jusqu’à A (palette : le compas) ; sur papier uni ou sur quadrillage (O et A sur des nœuds). cercle c = cercle(O, rayon=distance(D, E)) : l’élève prend l’écartement [DE] au report et le pique en O (palette : compas, report) ; papier uni seulement. Les points nommés visibles, le cercle entier dans la fenêtre ; les autres cercles et droites de l’élève sont des traits de construction. segment AB = 6 cm : l’élève trace à la règle graduée, depuis le point A de la figure, un segment de 6 cm (aussi 5 cm 3 mm, 5,3 cm, 72 mm : au millimètre près) ; B nomme l’autre bout (voir l’exemple). angle AOy = 50 : l’élève construit au rapporteur le côté [Oy) (voir l’exemple). mesure AOB : l’angle est tracé, l’élève le mesure au rapporteur et tape sa mesure sous la figure (voir l’exemple) ; mesure AOB, rapporteur posé : le rapporteur est déjà posé, l’élève lit seulement (voir l’exemple). triangle ABC : … : [AB] est tracé, l’élève construit C par deux données, trois longueurs (compas, report), un côté et deux angles (rapporteur), ou deux côtés et l’angle compris (voir les exemples) ; triangle rectangle : CAB = 90 à l’équerre, seul ou avec la longueur de [AC], et sur quadrillage AC = 3 carreaux ou AC = AB (voir les exemples). Pour un angle, à construire ou à mesurer : papier uni, seul dans la figure, et une fenêtre au plus deux fois plus large que haute (ou l’inverse), sinon le rapporteur serait illisible sur un petit écran."
				},
				{
					key: 'outils',
					values: 'droite, segment, point, equerre, compas, report, rapporteur, regle',
					defaultValue: 'celui de la vérification ; sans quadrillage, les instruments',
					description:
						'Les outils proposés à l’élève : droite (la règle) pour droite_par, segment pour carre, rectangle et symetrique, point pour point ; un seul outil pour droite_par, carre, rectangle ; droite m = … reçoit la règle, l’équerre et le compas, avec ou sans quadrillage, et le report sur papier uni ; cercle c = cercle_circonscrit(…) la règle, l’équerre, le compas et le report, sans quadrillage ; cercle c = cercle(O, passant=A) le compas, avec ou sans quadrillage ; cercle c = cercle(O, rayon=distance(D, E)) le compas et le report, sans quadrillage ; segment AB = 6 cm la règle graduée (regle) et le segment, sans quadrillage, la règle graduée ne servant qu’à lui. Avec un quadrillage (grille:) et le segment ou le point, chaque toucher va au nœud le plus proche. Sans quadrillage, point et symetrique reçoivent une palette d’instruments (droite, equerre, compas, et point ou segment) : l’équerre trace la perpendiculaire à une droite par un point, le compas un cercle par son centre et un point ; chaque toucher s’aimante sur un point, une intersection de deux traits ou un trait. Écrire outils: pour restreindre la palette.'
				},
				{
					key: 'fenetre, taille…',
					values: 'comme pour le bloc figure',
					defaultValue: 'comme pour le bloc figure',
					description:
						'L’en-tête de la figure de départ, sans deplacable: ni rendu: (elle ne se déplace jamais). Sans repère ni quadrillage, l’élève trace sur une feuille blanche.'
				}
			]
		}
	],
	examples: [
		{
			title: 'Tracer la droite (AB), avec un point piège',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 6',
				'outils: droite',
				'verifier: droite_par A ; B',
				'---',
				'A = point(1, 2)',
				'B = point(7, 2)',
				'C = point(4, 5)'
			),
			explanation:
				'Le point C ne doit pas être pris : sans lui, l’élève ne pourrait pas se tromper (le doigt est aimanté sur les points).'
		},
		{
			title: 'Deux droites à tracer',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 6',
				'verifier: droite_par A ; B',
				'verifier: droite_par A ; C',
				'---',
				'A = point(2, 1)',
				'B = point(8, 2)',
				'C = point(4, 5)'
			),
			explanation: 'Une ligne par droite attendue ; il faut toutes les tracer, et rien de plus.'
		},
		{
			title: 'Terminer un carré sur quadrillage, sans lettres',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 12 ; 0 ; 8',
				'grille: 1',
				'outils: segment',
				'verifier: carre A ; B',
				'---',
				'A = point(2, 4, visible=faux)',
				'B = point(5, 4, visible=faux)',
				'ab = segment(A, B)'
			),
			explanation:
				'Le côté [AB] est tracé, ses sommets sont cachés. Un côté tracé en plusieurs morceaux est accepté ; un trait qui dépasse ou qui ne suit pas les lignes est faux.'
		},
		{
			title: 'Tracer le symétrique d’un triangle (axe vertical)',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 12 ; 0 ; 8',
				'grille: 1',
				'verifier: symetrique par d',
				'---',
				'P = point(6, 0, visible=faux)',
				'Q = point(6, 8, visible=faux)',
				'd = droite(P, Q)',
				'A = point(2, 2)',
				'B = point(4, 2)',
				'C = point(4, 6)',
				'polygone(A, B, C)'
			),
			explanation:
				'L’élève trace le triangle retourné de l’autre côté de d. Une figure seulement glissée reçoit « Ta figure a glissé » ; un trait repassé sur le triangle ou sur l’axe ne compte pas. Pour « compléter une figure pour la rendre symétrique », donner la moitié qui touche l’axe (segments) : l’élève trace l’autre moitié.'
		},
		{
			title: 'Symétrie centrale',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 12 ; 0 ; 8',
				'grille: 1',
				'verifier: symetrique par O',
				'---',
				'O = point(6, 4)',
				'A = point(2, 2)',
				'B = point(4, 2)',
				'C = point(4, 3)',
				'segment(A, B)',
				'segment(B, C)'
			),
			explanation: 'Après « par », un point : le symétrique fait un demi-tour autour de O.'
		},
		{
			title: 'Placer le symétrique d’un point (axe oblique)',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 8',
				'grille: 1',
				"verifier: point A' = symetrie(A, axe=d)",
				'---',
				'P = point(1, 1, visible=faux)',
				'Q = point(7, 7, visible=faux)',
				'd = droite(P, Q)',
				'A = point(2, 5)'
			),
			explanation:
				'L’élève place A’ en (5 ; 2). À la même distance de l’axe mais à l’horizontale de A, il lit « Le segment [AA’] doit être perpendiculaire à l’axe » ; sur la perpendiculaire mais trop près ou trop loin, « A’ doit être à la même distance de l’axe que A ». Plusieurs points : une ligne « verifier: point … » par point.'
		},
		{
			title: 'Construire le symétrique d’un point sur papier uni',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 8',
				"verifier: point A' = symetrie(A, axe=d)",
				'---',
				'P = point(1, 1, visible=faux)',
				'Q = point(7, 7, visible=faux)',
				'd = droite(P, Q)',
				'A = point(2, 5)'
			),
			explanation:
				'Sans grille:, l’élève reçoit la règle, l’équerre, le compas et le point. Il trace la perpendiculaire à d par A (équerre), pique le compas au pied de cette perpendiculaire et l’ouvre jusqu’à A, puis place A’ à l’autre intersection. Deux cercles centrés sur l’axe et passant par A donnent aussi A’. Un point posé à l’œil, même pile au bon endroit, est faux : « Ton point est placé à l’œil : construis-le avec tes instruments. »'
		},
		{
			title: 'Construire la médiatrice d’un segment',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 8',
				'verifier: droite m = mediatrice(A, B)',
				'---',
				'A = point(3, 4)',
				'B = point(6, 5)',
				'segment(A, B)'
			),
			explanation:
				'L’élève reçoit la règle, l’équerre, le compas et le report. Il trace deux cercles de même rayon centrés en A et en B (compas ouvert de A à B, ou un écartement pris au report), puis la droite par leurs deux intersections. Une droite perpendiculaire à [AB] hors du milieu : « Ta droite est perpendiculaire à [AB] mais ne passe pas par son milieu » ; une droite tracée sans passer par des points construits : « Ta droite est tracée à l’œil ». À la correction, la médiatrice en pointillés, l’angle droit et les moitiés codés.'
		},
		{
			title: 'Construire la bissectrice d’un angle',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 8',
				'verifier: droite d = bissectrice(A, O, B)',
				'---',
				'O = point(2, 2)',
				'A = point(8, 3)',
				'B = point(4, 7)',
				'x = demidroite(O, A)',
				'y = demidroite(O, B)'
			),
			explanation:
				'L’élève reçoit la règle, l’équerre, le compas et le report. Il pique le compas en O, ouvert comme il veut : l’arc coupe [OA) et [OB) en deux points ; il trace deux arcs de même rayon centrés en ces points (compas de l’un à l’autre, ou un écartement pris au report), puis la droite de O à leur intersection. Une droite tracée sans passer par des points construits : « Ta bissectrice est tracée à l’œil » ; une droite qui ne part pas de O : « Ta bissectrice doit partir du sommet O » ; des arcs piqués sur le prolongement d’un côté : « Ta droite partage l’angle voisin, pas l’angle AOB ». Avec outils: droite, compas, rapporteur, la bissectrice se trace aussi au rapporteur (repère à la moitié de la mesure), à 1° près. À la correction, la bissectrice en pointillés, les deux demi-angles codés et les arcs de la construction en traits fins.'
		},
		{
			title: 'Construire le cercle circonscrit à un triangle',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 8',
				'verifier: cercle c = cercle_circonscrit(A, B, C)',
				'---',
				'A = point(3, 4)',
				'B = point(7, 4)',
				'C = point(4, 7)',
				'triangle(A, B, C)'
			),
			explanation:
				'L’élève reçoit la règle, l’équerre, le compas et le report. Il construit deux médiatrices (deux cercles de même rayon centrés aux bouts d’un côté, au compas ou au report, la droite par leurs intersections), pique le compas à leur intersection et l’ouvre jusqu’à un sommet. Un cercle dont le centre n’est pas construit : « Ton cercle est tracé à l’œil » ; le bon centre mais pas le bon rayon : « Ton cercle a le bon centre mais ne passe pas par les sommets du triangle » ; un centre sur une seule médiatrice : « Ton cercle passe par A et B mais pas par C ». À la correction, le cercle et son centre en pointillés, et deux médiatrices en traits fins.'
		},
		{
			title: 'Tracer un cercle de centre donné, sur quadrillage',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 8',
				'grille: 1',
				'verifier: cercle c = cercle(O, passant=A)',
				'---',
				'O = point(5, 4)',
				'A = point(7, 5)'
			),
			explanation:
				'L’élève reçoit le compas ; chaque toucher va au nœud le plus proche. Il pique en O et ouvre jusqu’à A (ou jusqu’à un autre nœud du même cercle). Compas piqué ailleurs : « Pique ton compas en O » ; bon centre mais pas jusqu’à A : « Ton cercle a le bon centre mais ne passe pas par A ». Sans grille:, la même vérification sur papier uni : le compas s’aimante sur O et A ; ouvert à l’œil au bon rayon : « Ton compas est ouvert à l’œil : ouvre-le jusqu’à A ».'
		},
		{
			title: 'Tracer un cercle de rayon donné par un segment',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 8',
				'verifier: cercle c = cercle(O, rayon=distance(D, E))',
				'---',
				'O = point(3, 4)',
				'D = point(6, 1)',
				'E = point(8, 1)',
				'segment(D, E)'
			),
			explanation:
				'L’élève reçoit le compas et le report. Il prend l’écartement [DE] au report et le pique en O. Rayon pris au compas à l’œil : « Ton compas est ouvert à l’œil : prends l’écartement DE avec le Report » ; autre longueur reportée : « Ton cercle a le bon centre mais pas le bon rayon : reporte la longueur DE ».'
		},
		{
			title: 'Construire un triangle de trois longueurs données',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 12 ; 0 ; 9',
				'verifier: triangle ABC : AC = u ; BC = v',
				'---',
				'A = point(2, 2)',
				'B = point(8, 2)',
				's = segment(A, B)',
				'u = segment(point(1, 8), point(5, 8))',
				'v = segment(point(7, 8), point(10, 8))',
				'texte(2.5, 8.5, "4 cm")',
				'texte(8, 8.5, "3 cm")'
			),
			explanation:
				'Le côté [AB] est tracé ; les longueurs de [AC] et [BC] sont données par les segments u et v (ou par deux points : « AC = AB » pour un triangle isocèle). L’élève reçoit le segment, le compas, le report et la règle : avec le report, il prend l’écartement de u (ses deux bouts s’aimantent), pique en A, puis fait de même avec v en B ; il trace [AC] et [BC] jusqu’à une intersection. Les deux triangles, de part et d’autre de (AB), sont justes. Un sommet hors d’une intersection de cercles construits : « Ton sommet C est placé à l’œil » ; un côté trop long ou trop court : « Ton côté [AC] n’a pas la bonne longueur ». Trois longueurs qui ne font pas un triangle sont refusées à la publication. À la correction, les côtés en pointillés, les arcs de report en traits fins, les longueurs codées.'
		},
		{
			title: 'Construire un triangle par un côté et deux angles (rapporteur)',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 12 ; 0 ; 8',
				'verifier: triangle ABC : CAB = 40 ; ABC = 65',
				'---',
				'A = point(3, 2)',
				'B = point(9, 2)',
				's = segment(A, B)'
			),
			explanation:
				'Le côté [AB] est tracé ; « CAB = 40 ; ABC = 65 » donne l’angle en A et l’angle en B (le sommet au milieu, mesures entières de 1 à 179, une variable du modèle convient : CAB = {{a}}). L’énoncé dit les mesures à l’élève. Il reçoit le rapporteur, la règle et le segment : il pose le rapporteur en A sur [AB), place un repère à 40, trace à la règle la droite de A au repère, fait de même en B, puis trace [AC] et [BC] jusqu’au croisement des deux droites. Les deux triangles, de part et d’autre de (AB), sont justes. Un sommet hors du croisement de deux côtés tracés depuis un repère : « Ton sommet C est placé à l’œil » ; un angle d’un côté de [AB] et l’autre de l’autre : « Tes deux angles sont tracés de part et d’autre de [AB] » ; 115° au lieu de 65° : « tu as lu la mauvaise graduation du rapporteur ». Refusés à la publication : deux angles qui font 180° ou plus, un rapporteur qui sort de la figure en A ou en B (le rayon est 0,35 du plus petit côté de la fenêtre), les deux sommets C hors de la fenêtre. À la correction, les côtés en pointillés et les deux angles codés.'
		},
		{
			title: 'Construire un triangle par deux côtés et l’angle compris',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 12 ; 0 ; 8',
				'verifier: triangle ABC : AC = u ; CAB = 50',
				'---',
				'A = point(3, 2)',
				'B = point(9, 2)',
				's = segment(A, B)',
				'u = segment(point(0.5, 7.5), point(4.5, 7.5))',
				'texte(2.5, 7.9, "4 cm")'
			),
			explanation:
				'Le côté [AB] est tracé, la longueur de [AC] est donnée par le segment u, l’angle en A par sa mesure (l’angle compris entre [AB] et [AC] : avec « AC = u », l’angle en A ; avec « BC = v », l’angle en B). L’élève reçoit le rapporteur, la règle, le segment, le report et le compas : repère à 50 en A, droite de A au repère, report de u piqué en A, puis [AC] et [BC] jusqu’au croisement de la droite et de l’arc. Un sommet pris de l’autre côté de A : « Ton angle CAB mesure 130° au lieu de 50° » ; une mauvaise longueur : « Ton côté [AC] n’a pas la bonne longueur ».'
		},
		{
			title: 'Construire un triangle rectangle à l’équerre',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 12 ; 0 ; 8',
				'verifier: triangle ABC : CAB = 90 ; AC = u',
				'---',
				'A = point(3, 2)',
				'B = point(9, 2)',
				's = segment(A, B)',
				'u = segment(point(6, 6.5), point(10, 6.5))',
				'texte(8, 6.9, "4 cm")'
			),
			explanation:
				'Le côté [AB] est tracé ; « CAB = 90 » demande l’angle droit en A, construit à l’équerre (pas au rapporteur), et « AC = u » la longueur de [AC] (ou « AC = AB », deux points). L’élève reçoit le segment, l’équerre et le report : équerre le long de (AB) en A, report de u piqué en A, puis [AC] et [BC] jusqu’au croisement de la perpendiculaire et de l’arc. Les deux côtés de (AB) sont justes. « CAB = 90 » seul : un triangle rectangle quelconque, C n’importe où sur la perpendiculaire (palette : segment, équerre). L’angle droit se donne seul ou avec le côté qui le porte (ni l’hypoténuse, ni un autre angle). Un côté sans équerre : « Ton côté [AC] est tracé à l’œil : utilise l’équerre » ; un angle qui n’est pas droit : « Ton angle en A n’est pas droit : trace la perpendiculaire à (AB) avec l’équerre ». À la correction, la perpendiculaire et l’arc en traits fins, l’angle droit codé.'
		},
		{
			title: 'Construire un triangle rectangle sur quadrillage',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 8',
				'grille: 1',
				'verifier: triangle ABC : CAB = 90 ; AC = 4 carreaux',
				'---',
				'A = point(2, 2)',
				'B = point(8, 2)',
				's = segment(A, B)'
			),
			explanation:
				'Sur quadrillage, sans instrument : l’élève trace [AC] et [BC] au segment, de nœud en nœud. « AC = 4 carreaux » (l’unité est obligatoire) demande [AB] sur une ligne du quadrillage ; pour [AB] en oblique, donner « AC = AB » (le triangle rectangle isocèle : pas de (3 ; 1) → (−1 ; 3)) ; « CAB = 90 » seul : C sur n’importe quel nœud de la perpendiculaire. A et B sur des nœuds. Le report d’un segment (« AC = u ») se fait sur papier uni. Messages : « Ton angle en A n’est pas droit », « Ton côté [AC] mesure 5 carreaux au lieu de 4 ».'
		},
		{
			title: 'Tracer un segment de longueur donnée (règle graduée)',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 8',
				'verifier: segment AB = 6 cm',
				'---',
				'A = point(2, 4)'
			),
			explanation:
				'« segment AB = 6 cm » demande un segment de 6 cm partant du point A (aussi « 5 cm 3 mm », « 5,3 cm », « 72 mm » : au millimètre près) ; B nomme l’autre bout dans les messages et ne doit pas exister dans la figure. Une unité de la figure vaut 1 cm : la règle est graduée à l’échelle de la figure (ce n’est pas un vrai centimètre de l’écran, l’énoncé ne doit pas inviter à mesurer l’écran). L’élève reçoit la règle graduée et le segment : il touche A pour y mettre le 0 de la règle, puis un point dans la direction voulue (Retourner change le bord de la règle) ; au segment, il trace de A jusqu’à la règle, le bout s’arrête sur la graduation du millimètre la plus proche, ‹ › l’ajustent d’un millimètre. Toutes les directions sont justes. Un bout hors d’une graduation de la règle posée en A : « Ton segment est tracé à l’œil » ; 5,8 cm au lieu de 6 cm : « Ton segment mesure 5,8 cm au lieu de 6 cm » (dans l’unité de l’auteur : 58 mm, 5 cm 8 mm). La règle mesure le plus grand côté de la fenêtre, en centimètres entiers, 20 cm au plus. Refusés à la publication : quadrillage, fenêtre absente, A absent ou invisible, une longueur plus grande que la règle, ou qui ne tient pas dans la fenêtre depuis A. À la correction, la règle posée en A et le segment en pointillés.'
		},
		{
			title: 'Construire un angle de mesure donnée (rapporteur)',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 8',
				'verifier: angle AOy = 50',
				'---',
				'O = point(4, 3)',
				'A = point(9, 4)',
				'x = demidroite(O, A)'
			),
			explanation:
				'Le côté [OA) est tracé ; « angle AOy = 50 » demande le côté [Oy) tel que l’angle AOy mesure 50° (une mesure entière, de 1 à 179). L’élève reçoit le rapporteur et le segment : il pique le centre du rapporteur en O, touche le côté [OA) pour y poser la base, puis touche le bord du rapporteur à la graduation voulue (‹ › ajustent d’un degré, Retourner passe de l’autre côté) ; il trace au segment le côté de O jusqu’au repère. Les deux côtés de (OA) sont justes. Le rapporteur a pour rayon 0,35 du plus petit côté de la fenêtre : posé en O, il doit tenir entier dans la figure d’un côté de (OA) au moins, sinon la figure est refusée à la publication (éloigner O du bord). Un côté sans repère : « Ton côté est tracé à l’œil » ; 130° au lieu de 50° : « tu as lu la mauvaise graduation du rapporteur ». À la correction, le côté en pointillés et l’arc de l’angle codé de sa mesure.'
		},
		{
			title: 'Mesurer un angle (rapporteur)',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 8',
				'verifier: mesure AOB',
				'---',
				'O = point(4, 3)',
				'A = point(9, 3)',
				'B = rotation(A, angle=50, centre=O)',
				'x = demidroite(O, A)',
				'y = demidroite(O, B)'
			),
			explanation:
				'L’angle AOB est tracé (ses deux côtés) ; « mesure AOB » demande sa mesure, que l’élève tape sous la figure en degrés entiers. La bonne réponse est calculée sur la figure : placer B avec rotation(A, angle=…, centre=O) (une variable du modèle convient, angle={{a}}) ; un angle dont la mesure n’est pas un nombre entier de degrés est refusé à la publication. L’élève reçoit le rapporteur seul : il le pique en O, touche un côté pour y poser la base, et lit (Retourner passe le rapporteur de l’autre côté) ; ses repères ne sont pas notés. Les deux côtés doivent être tracés au moins jusqu’au bord du rapporteur, et le rapporteur posé en O tenir entier dans la figure sur l’un des côtés. Juste : la mesure exacte ; 130 au lieu de 50 : « tu as lu la mauvaise graduation du rapporteur ». À la correction, l’arc de l’angle codé de sa mesure.'
		},
		{
			title: 'Lire un angle sur un rapporteur déjà posé',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 8',
				'verifier: mesure AOB, rapporteur posé',
				'---',
				'O = point(4, 3)',
				'A = point(9, 3)',
				'B = rotation(A, angle=50, centre=O)',
				'x = demidroite(O, A)',
				'y = demidroite(O, B)'
			),
			explanation:
				'Comme « mesure AOB », mais le rapporteur est déjà posé : centre en O, base sur le premier côté nommé ([OA) pour AOB), du côté de B. L’élève n’a aucun outil : il lit et tape la mesure sous la figure. L’ordre des lettres choisit la pose, donc l’échelle à lire : « mesure BOA, rapporteur posé » pose la base sur [OB). Si le rapporteur posé sort de la figure, la publication est refusée et le message propose l’autre pose. Ne pas écrire outils:. Juste : la mesure exacte ; 130 au lieu de 50 : « tu as lu la mauvaise graduation du rapporteur ». À la correction, l’arc codé, le rapporteur toujours posé.'
		},
		{
			title: 'Placer le 4e sommet d’un parallélogramme',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 8',
				'verifier: point D = sommet(parallelogramme(A, B, C), 4)',
				'---',
				'A = point(2, 2)',
				'B = point(7, 2)',
				'C = point(8, 6)',
				'segment(A, B)',
				'segment(B, C)'
			),
			explanation:
				'L’élève reçoit le point, la règle, l’équerre, le compas et le report. Trois chemins sont justes : reporter BC depuis A et AB depuis C, puis placer le point à l’intersection ; par les diagonales (milieu de [AC], compas centré au milieu passant par B) ; par les parallèles (équerre deux fois). Le point à l’autre intersection des reports : « Avec ce point, ABCD est croisé : prends l’autre intersection. »'
		},
		{
			title: 'Vérifier un alignement, puis répondre oui ou non',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 6',
				'outils: droite',
				'verifier: droite_par A ; B',
				'---',
				'A = point(2, 3)',
				'B = point(8, 5)',
				'C = point(5, 4.25)'
			),
			explanation:
				'C est à un quart de carreau de la droite (AB) : invisible à l’œil, net une fois la droite tracée. Dans la question, une case [_] suit le bloc pour « oui » ou « non » (majuscules acceptées) ; Valider reste grisé tant que la droite manque. Une coordonnée décimale s’écrit avec un point (4.25) : une variable calculée par eval: donnerait une fraction, que la figure ne lit pas (la vérification du modèle refuse alors les tirages).'
		}
	],
	mistakes: [
		{
			title: 'Vérification oubliée',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 6',
				'---',
				'A = point(1, 2)',
				'B = point(7, 2)'
			),
			message: 'Vérification manquante',
			explanation:
				'Sans « verifier: », rien ne dit ce qu’il faut tracer : ajouter « verifier: droite_par A ; B ».'
		},
		{
			title: 'Un seul point dans la vérification',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 10 ; 0 ; 6',
				'verifier: droite_par A',
				'---',
				'A = point(1, 2)',
				'B = point(7, 2)'
			),
			message: 'droite_par attend deux points',
			explanation: 'Une droite passe par deux points : les nommer tous les deux, séparés par « ; ».'
		},
		{
			title: 'Symétrique sans « par »',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 12 ; 0 ; 8',
				'grille: 1',
				'verifier: symetrique d',
				'---',
				'P = point(6, 0)',
				'Q = point(6, 8)',
				'd = droite(P, Q)'
			),
			message: 'symetrique attend un axe ou un centre',
			explanation: 'Écrire « symetrique par d » (l’axe) ou « symetrique par O » (le centre).'
		},
		{
			title: 'Point sans expression',
			source: fence(
				'figure-a-completer',
				'fenetre: 0 ; 12 ; 0 ; 8',
				'grille: 1',
				"verifier: point A'",
				'---',
				'A = point(2, 5)'
			),
			message: 'point attend un nom et une expression',
			explanation: "Écrire où va le point : « point A' = symetrie(A, axe=d) »."
		}
	],
	tryIt: fence(
		'figure-a-completer',
		'fenetre: 0 ; 10 ; 0 ; 6',
		'verifier: droite_par A ; B',
		'---',
		'A = point(2, 4)',
		'B = point(8, 1)',
		'C = point(6, 5)'
	),
	seeAlso: { href: '/aide-ecriture/geometrie', label: 'Le langage des figures' }
};
