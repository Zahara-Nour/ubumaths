# Bornes des points de seconde (grade 2). Source unique : BO 2de (bo/2de.txt).
PROG = '2de'


def b(aspect, borne, p, force='BO', detail=None):
    d = {'aspect': aspect, 'borne': borne}
    if detail is not None:
        d['detail'] = detail
    d['source'] = f'BO {PROG} p.{p}'
    d['force'] = force
    return d


DEMO = "Point-démonstration : pas de grain questionnable propre ; un modèle ne s'y rattache que s'il fait reconstituer ou compléter cette démonstration (le résultat lui-même relève des points de connaissance voisins)."
COMP = "Point-compétence ({}) : pas de grain questionnable propre ; un modèle s'y rattache seulement s'il fait {}, sous les bornes générales."
SITU = b('autre', "Appris « en situation », sur des propositions tirées des chapitres du programme (pas de séquence de logique formelle).", 4)

GENERAL = [
    b('nombres', "Nombres réels : ensembles ℕ, ℤ, 𝔻, ℚ, ℝ et intervalles de ℝ ; les irrationnels (√2, π…) s'ajoutent aux nombres du cycle 4.", '6-7',
      detail={'ensembles': ['ℕ', 'ℤ', '𝔻', 'ℚ', 'ℝ']}),
    b('autre', "Les règles de calcul sur les racines carrées entrent au programme (√ab = √a √b pour a, b positifs ; √a² = |a|) : la borne de 3e « aucune propriété algébrique des racines carrées » ne vaut plus (portée : question l2-7).", '7-8'),
    b('autre', "Valeur absolue : notation |a| pour la distance de a à 0, distance entre deux réels, intervalles de centre donné (|x − a| ⩽ r) ; « Toute autre utilisation est hors programme » (contradiction avec la fonction valeur absolue : question l2-1).", 7),
    b('fonctions', "Fonctions à valeurs réelles définies sur un intervalle ou une réunion finie d'intervalles de ℝ, données par une courbe, une expression algébrique, un programme de calcul ou un tableau de valeurs ; fonctions définies sur ℕ possibles pour un phénomène discret, avec la notation u(n).", 10),
    b('fonctions', "Fonctions de référence nommées : affines (dont linéaires), valeur absolue, carré, inverse (définition, courbe) ; racine carrée et cube n'apparaissent que pour résoudre f(x) = k, f(x) < k (statut : question l2-2). Pas de polynôme du second degré général, de dérivée ni d'exponentielle : absents du BO de 2de.", '10-11',
      detail={'liste': ['affine', 'linéaire', 'valeur absolue', 'carré', 'inverse'], 'resolution_seulement': ['racine carrée', 'cube']}),
    b('autre', "Équations et inéquations « se ramenant au premier degré » : premier degré, produit nul, quotient, x² = a, f(x) = k pour les fonctions de référence ; pas de méthode générale du second degré (ni forme canonique ni discriminant).", '6, 8'),
    b('figures', "Géométrie plane seulement ; vecteurs manipulés dans un repère orthogonal ; norme, distance et déterminant dans une base (un repère) orthonormée.", '8-9'),
    b('autre', "L'histogramme entre au programme (classes de même amplitude) ; rotation, homothétie et triangles semblables restent absents.", '8-12'),
    b('autre', "Notations ensemblistes Ø, ∈, ⊂, ∩, ∪, {…}, Ā ou E \\ A, Card(A) ; les symboles ∀ et ∃ sont hors programme.", 4),
    b('autre', "Algorithmique en Python (passage langage naturel ↔ Python) ; « Aucune connaissance sur les listes n'est exigée ».", '4-5'),
    b('autre', "Probabilités : le calcul de la probabilité d'un évènement à partir de ses probabilités conditionnelles relatives à une partition de l'univers (probabilités totales) « n'est pas un attendu du programme » (portée sur les arbres : question l2-4).", 13),
    b('autre', "Les approfondissements possibles ne sont « en aucun cas obligatoires ».", 4),
]

P = {}


def pt(code, *bornes, rem=None):
    assert code not in P, code
    P[code] = (list(bornes), rem)


# ---------- Vocabulaire ensembliste et logique ----------
pt('2-201', b('autre', "Symbole ∈ ; ensembles écrits {…}.", 4))
pt('2-403', b('autre', "Symbole ⊂.", 4))
pt('2-202', b('autre', "Symbole Ø.", 4))
pt('2-404', b('autre', "Symbole ∪.", 4))
pt('2-405', b('autre', "Symbole ∩.", 4))
pt('2-406', b('autre', "Notations Ā (celle des probabilités) ou E \\ A.", 4))
pt('2-203', b('autre', "Symboles Ø, ∈, ⊂, ∩, ∪, {…} (liste du BO).", 4, detail={'liste': ['Ø', '∈', '⊂', '∩', '∪', '{…}']}))
pt('2-204', b('autre', "ℕ, ℤ, 𝔻, ℚ, ℝ.", '4, 7', detail={'liste': ['ℕ', 'ℤ', '𝔻', 'ℚ', 'ℝ']}))
pt('2-407', b('format', "Notations du type [a ; +∞[, ]−∞ ; a], [a ; b], etc. (le BO écrit la virgule : [a, b]).", 7))
pt('2-205', b('autre', "Notion « rencontrée » seulement (« Ils rencontrent également la notion de couple et celle de produit cartésien ») ; aucune notation (E × F) n'est citée.", 4, force='déduite'),
   rem="Lecture déduite (texte implicite) : « rencontrent » dit une rencontre, pas une connaissance exigible ; la notation E × F n'est pas écrite au BO.")
pt('2-206', b('autre', "Ā (notation des probabilités) ou E \\ A.", 4))
pt('2-207', b('autre', "Card(A), ensemble fini seulement.", 4))
pt('2-208', SITU)
pt('2-209', SITU)
pt('2-210', SITU, b('autre', "Connecteur « et ».", 4))
pt('2-408', SITU, b('autre', "Connecteur « ou ».", 4))
pt('2-211', SITU, b('autre', "Propositions simples, sans implication ni quantificateurs.", 4))
pt('2-212', SITU)
pt('2-213', SITU)
pt('2-409', SITU)
pt('2-410', SITU, b('autre', "Raisonnement simple.", 4))
pt('2-214', SITU)
pt('2-411', SITU)
pt('2-215', SITU, b('format', "Quantification universelle en mots (« pour tout ») ; symbole ∀ hors programme.", 4))
pt('2-412', SITU, b('format', "Quantification existentielle en mots (« il existe ») ; symbole ∃ hors programme.", 4))
pt('2-216', rem=COMP.format("raisonner", "produire un raisonnement par disjonction des cas"))
pt('2-217', rem=COMP.format("raisonner", "produire un raisonnement par l'absurde"))

# ---------- Algorithmique et programmation ----------
pt('2-218', b('autre', "Types entier, booléen, flottant, chaine de caractères.", 4, detail={'liste': ['entier', 'booléen', 'flottant', 'chaine de caractères']}))
pt('2-219', b('format', "Affectation notée ← en langage naturel.", 5))
pt('2-220')
pt('2-221')
pt('2-222')
pt('2-413')
pt('2-223', b('autre', "Types à choisir parmi entier, flottant ou chaine de caractères (le booléen n'est pas dans la liste de cette capacité).", 5, detail={'liste': ['entier', 'flottant', 'chaine de caractères']}))
pt('2-224')
pt('2-414')
pt('2-415')
pt('2-225')
pt('2-226', b('autre', "Dans des cas simples.", 5))
pt('2-227', b('autre', "Dans des cas simples.", 5))
pt('2-228', b('autre', "Cas plus complexes : lire, comprendre, modifier ou compléter seulement (écrire un programme complexe en entier n'est pas demandé).", 5))
pt('2-229')
pt('2-230')
pt('2-231', b('autre', "Fonctions simples.", 5))
pt('2-416')
pt('2-232', b('autre', "Fonctions plus complexes : lire, comprendre, modifier, compléter seulement (pas écrire).", 5))
pt('2-233', b('autre', "Lire et comprendre seulement (pas écrire) ; aucune connaissance sur les listes exigée.", 5))
pt('2-417', b('autre', "Lire et comprendre seulement (pas écrire) ; aucune connaissance sur les listes exigée.", 5))
pt('2-234')

# ---------- Automatismes ----------
pt('2-489', b('operandes', "Les égalités de la liste du BO : x = 1 × x, x = x/1, (−1) × a = a/(−1) = −a ; 0 = 0x, 0/a = 0, x/a = (1/a)x, ab/c = a × (b/c) = (a/c) × b ; 1/(1/a) = a, 1/(a/b) = b/a, (a/b)/(c/d) = (a/b) : (c/d) = (a/b) ÷ (c/d) = (a/b) × (d/c) = ad/(bc).", 5,
                     detail={'liste': ['x = 1×x', 'x = x/1', '(−1)×a = a/(−1) = −a', '0 = 0x', '0/a = 0', 'x/a = (1/a)x', 'ab/c = a×b/c = a/c×b', '1/(1/a) = a', '1/(a/b) = b/a', '(a/b)/(c/d) = ad/(bc)']}),
   rem="Fractions de la puce relues sur le rendu image de la page 5 du PDF (extraction pdftotext en plusieurs lignes).")
pt('2-491', b('autre', "Lecture graphique sur une courbe donnée.", 6))
pt('2-492', b('autre', "Lecture graphique sur une courbe donnée.", 6))
pt('2-401', b('figures', "Polygones ; le cercle, cité dans la même puce, est un autre savoir.", 6))
pt('2-490', b('format', "Proportion donnée sous forme décimale, fractionnaire ou de pourcentage.", 6, force='déduite'),
   rem="Lecture déduite (texte implicite) : les trois formes viennent de la puce précédente du même bloc (« exprimer une proportion sous différentes formes (décimale, fractionnaire, pourcentage) »).")
pt('2-402', b('autre', "Série présentée en données brutes, regroupées par classes, ou par une représentation graphique.", 6),
   rem="La définition des quartiles reste celle de 3e (décision c4-2) : le BO de 2de ne la redonne pas.")

# ---------- Fonctions > Représentation algébrique et graphique ----------
pt('2-325', b('fonctions', "Ensemble de définition : un intervalle ou une réunion finie d'intervalles de ℝ.", 10))
pt('2-326', b('fonctions', "Ensemble de définition d'une expression, en lien avec l'équation quotient (dénominateur non nul).", '8, 10'),
   rem="Domaine d'une expression avec racine carrée (√(x − 2)) : dépend du statut de la fonction racine carrée (question l2-2).")
pt('2-327', b('fonctions', "Courbe d'équation y = f(x) : points dont les coordonnées (x, y) vérifient y = f(x).", 10))
pt('2-328', b('fonctions', "Fonctions affines x ↦ mx + p ; signe relié au sens de variation et à la droite.", '10-11'))
pt('2-329', b('fonctions', "Fonctions de référence du programme ; la valeur absolue et le carré sont nommés pour le signe.", '10-11'),
   rem="La liste des fonctions de référence (racine carrée, cube ?) : question l2-2.")
FACT = b('fonctions', "Facteurs dont le signe est au programme : expressions affines et fonctions de référence (pas de trinôme non factorisé).", '8, 10', force='déduite')
FACT_REM = "Lecture déduite (texte implicite) : le BO relie l'étude du signe de A(x)B(x) et A(x)/B(x) à la section « Fonctions », qui ne donne que le signe d'une fonction affine et des fonctions de référence ; les objectifs parlent d'équations et d'inéquations « se ramenant au premier degré »."
pt('2-330', FACT, rem=FACT_REM)
pt('2-446', FACT, b('fonctions', "Quotient : valeurs où le dénominateur s'annule exclues.", 8), rem=FACT_REM)
pt('2-331', b('autre', "Appartenance d'un point à la courbe d'équation y = f(x), par calcul de f(x_A).", '6, 10'))
pt('2-447', b('autre', "Calcul d'une coordonnée d'un point de la courbe : l'ordonnée par f(a) ; une abscisse seulement si l'équation f(x) = b est d'un type du programme.", '6, 10', force='déduite'),
   rem="Lecture déduite (texte implicite) : « calcul de coordonnées » sans précision ; trouver une abscisse revient à résoudre f(x) = b, borné par les types d'équations du programme.")
pt('2-495', rem=COMP.format("modéliser", "écrire l'expression d'une fonction à partir d'une situation"))
pt('2-333', b('fonctions', "x ↦ |x| : définition et courbe.", 10), rem="Statut de la fonction valeur absolue face à « Toute autre utilisation est hors programme » (BO p.7) : question l2-1.")
pt('2-334', b('fonctions', "x ↦ x² : définition et courbe.", 10))
pt('2-335', b('fonctions', "x ↦ 1/x : définition et courbe.", 10))
ALG = b('autre', "Méthode au choix (graphique, algébrique, logicielle) ; la résolution algébrique ne porte que sur les types d'équations et d'inéquations du programme.", 10, force='déduite')
ALG_REM = "Lecture déduite (texte implicite) : f est quelconque (courbe, expression, tableau), mais une résolution algébrique n'est attendue que pour les types que le BO liste ailleurs (premier degré, produit nul, quotient, x² = a, fonctions de référence)."
pt('2-336', ALG, rem=ALG_REM)
pt('2-448', ALG, rem=ALG_REM + " Sens de l'inégalité : question l2-3.")
pt('2-337', FACT, b('autre', "f produit ; équation f(x) = 0 à l'aide d'un tableau de signes.", 10), rem=FACT_REM)
pt('2-449', FACT, b('autre', "f quotient ; équation f(x) = 0 à l'aide d'un tableau de signes.", 10), rem=FACT_REM)
pt('2-450', FACT, b('autre', "f produit ; inéquation f(x) > 0 à l'aide d'un tableau de signes.", 10), rem=FACT_REM + " Sens de l'inégalité : question l2-3.")
pt('2-451', FACT, b('autre', "f quotient ; inéquation f(x) > 0 à l'aide d'un tableau de signes.", 10), rem=FACT_REM + " Sens de l'inégalité : question l2-3.")
FG = b('autre', "Graphiquement ou à l'aide d'un outil numérique seulement : aucune résolution algébrique de f(x) = g(x) n'est demandée par ce point.", 11)
pt('2-338', FG)
pt('2-452', FG)
pt('2-453', FG, rem="Sens de l'inégalité : question l2-3.")
pt('2-454', FG, rem="Sens de l'inégalité : question l2-3.")
AFF = b('fonctions', "f affine, x ↦ mx + p.", 11)
pt('2-339', AFF)
pt('2-455', AFF)
pt('2-456', AFF, rem="Sens de l'inégalité : question l2-3.")
pt('2-457', AFF, rem="Sens de l'inégalité : question l2-3.")
ABS = b('fonctions', "f(x) = |x|.", 11)
pt('2-340', ABS, rem="Question l2-1.")
pt('2-458', ABS, rem="Question l2-1.")
pt('2-459', ABS, rem="Questions l2-1 et l2-3.")
pt('2-460', ABS, rem="Questions l2-1 et l2-3.")
CAR = b('fonctions', "f(x) = x².", 11)
pt('2-341', CAR)
pt('2-461', CAR, b('format', "x² = a : ensemble des solutions (deux, une ou aucune solution) ; solutions exactes en √a.", '5, 8'))
pt('2-462', CAR, rem="Sens de l'inégalité : question l2-3.")
pt('2-463', CAR, rem="Sens de l'inégalité : question l2-3.")
INV = b('fonctions', "f(x) = 1/x.", 11)
pt('2-342', INV)
pt('2-464', INV, b('format', "Forme a/x = b admise (automatisme).", 5))
pt('2-465', INV, rem="Sens de l'inégalité : question l2-3.")
pt('2-466', INV, rem="Sens de l'inégalité : question l2-3.")
RAC = b('fonctions', "f(x) = √x.", 11)
RAC_REM = "La fonction racine carrée n'a ni définition ni courbe au BO de 2de (seulement cette puce et un approfondissement) : question l2-2."
pt('2-343', RAC, rem=RAC_REM)
pt('2-467', RAC, rem=RAC_REM)
pt('2-468', RAC, rem=RAC_REM + " Sens de l'inégalité : question l2-3.")
pt('2-469', RAC, rem=RAC_REM + " Sens de l'inégalité : question l2-3.")
CUB = b('fonctions', "f(x) = x³.", 11)
CUB_REM = "La fonction cube n'a ni définition ni courbe au BO de 2de (seulement cette puce) : question l2-2."
pt('2-344', CUB, rem=CUB_REM)
pt('2-470', CUB, rem=CUB_REM)
pt('2-471', CUB, rem=CUB_REM + " Sens de l'inégalité : question l2-3.")
pt('2-472', CUB, rem=CUB_REM + " Sens de l'inégalité : question l2-3.")

# ---------- Fonctions > Variations et extrémums ----------
pt('2-345', b('fonctions', "Fonction définie sur un intervalle.", 11))
pt('2-473')
pt('2-346', b('fonctions', "Sur un intervalle.", 11))
pt('2-347', b('fonctions', "f(x) = mx + p : m taux d'accroissement.", 11))
pt('2-474', b('fonctions', "f(x) = mx + p : p ordonnée à l'origine.", 11))
pt('2-348', b('fonctions', "Selon le signe du coefficient directeur.", 11))
pt('2-349')
pt('2-350', b('autre', "Lecture graphique, sur un intervalle.", 11))
pt('2-351', b('autre', "Outil : logiciel de géométrie dynamique ou de calcul formel, calculatrice, Python ; fonction donnée par une formule.", 11))
pt('2-352', b('fonctions', "Fonctions affines seulement.", 11))
pt('2-353', rem=COMP.format("résoudre un problème", "chercher un extremum dans une situation (graphiquement, à l'outil numérique ou par les variations connues ; pas de dérivée en 2de)"))
pt('2-475', ABS, rem="Question l2-1.")
pt('2-354', ABS, rem="Question l2-1.")
pt('2-476', CAR)
pt('2-355', CAR)
REF = b('fonctions', "f fonction de référence du programme.", 11)
pt('2-356', REF, b('autre', "Comparaison numérique.", 11), rem="Liste des fonctions de référence (racine carrée, cube ?) : question l2-2.")
pt('2-477', REF, b('autre', "Comparaison graphique.", 11), rem="Liste des fonctions de référence (racine carrée, cube ?) : question l2-2.")
pt('2-357', rem=DEMO)
pt('2-358', rem=DEMO)
pt('2-359', rem=DEMO)
pt('2-360', rem=DEMO)
pt('2-361', b('autre', "Tableau de variations donné ; balayage ou dichotomie.", 11))
pt('2-362')
pt('2-363', b('fonctions', "Sur ℝ+.", 11))

# ---------- Géométrie > Droites du plan ----------
pt('2-311')
pt('2-312')
pt('2-439', b('format', "y = mx + p, ou x = c pour une droite parallèle à l'axe des ordonnées.", 9, force='déduite'),
   rem="Lecture déduite (texte implicite) : le BO ne donne pas la forme ; il réserve la pente aux droites non parallèles à l'axe des ordonnées, ce qui laisse x = c à ces droites.")
pt('2-313', b('figures', "Droite non parallèle à l'axe des ordonnées.", 9))
EQ = b('format', "Équation cartésienne ou réduite (le BO ne fixe pas la forme attendue).", 9, force='déduite')
EQ_REM = "Lecture déduite (texte implicite) : « déterminer une équation de droite » sans forme imposée, les deux formes étant au programme."
pt('2-314', EQ, b('autre', "À partir de deux points.", 9), rem=EQ_REM)
pt('2-440', EQ, b('autre', "À partir d'un point et d'un vecteur directeur.", 9), rem=EQ_REM)
pt('2-441', EQ, b('autre', "À partir d'un point et de la pente.", 9), rem=EQ_REM)
pt('2-315', b('autre', "Lecture graphique ; droite non parallèle à l'axe des ordonnées.", 9))
pt('2-442', b('autre', "Droite donnée par une équation (cartésienne ou réduite) ; non parallèle à l'axe des ordonnées.", 9))
pt('2-443', b('autre', "Droite donnée par une équation (cartésienne ou réduite).", 9))
pt('2-444', b('autre', "Lecture graphique.", 9))
pt('2-316', b('autre', "Équation réduite.", 9))
pt('2-445', b('autre', "Équation cartésienne.", 9))
pt('2-317', b('autre', "Par la colinéarité (déterminant ou proportionnalité des coordonnées) ou par une équation de droite.", 9))
pt('2-318')
pt('2-319', b('autre', "Deux droites données par leur équation réduite seulement ; aucun système de deux équations à deux inconnues sous forme générale n'est cité.", 9))
pt('2-320', rem=DEMO)
pt('2-321')
pt('2-322')
pt('2-323')
pt('2-324', b('autre', "Sur des exemples.", 10))

# ---------- Géométrie > Vecteurs ----------
pt('2-287', b('format', "Notation u⃗.", 9))
pt('2-433')
pt('2-288')
pt('2-289', b('nombres', "Produit par un nombre réel.", 9))
pt('2-290')
pt('2-291', b('autre', "Combinaison de deux vecteurs non colinéaires ; relation u⃗ = x i⃗ + y j⃗ mise en évidence.", 9))
pt('2-292')
pt('2-434', b('autre', "Coordonnées dans une base ; relation u⃗ = x i⃗ + y j⃗.", 9))
pt('2-293', b('figures', "Dans une base orthonormée.", 9))
pt('2-294')
pt('2-295', b('figures', "Dans une base orthonormée.", 9))
pt('2-435', b('autre', "Critère de colinéarité ; application à l'alignement et au parallélisme.", 9))
pt('2-296', rem="Formule des coordonnées du milieu : approfondissement (2-306) ; question l2-8.")
pt('2-297', b('figures', "À partir de représentants de même origine.", 9))
pt('2-298')
pt('2-299')
pt('2-300')
pt('2-436', b('nombres', "Produit par un nombre réel.", 9))
pt('2-301', b('figures', "Repère orthonormé.", 9, force='déduite'),
   rem="Lecture déduite (texte implicite) : l'expression de la norme est donnée « dans une base orthonormée » (BO p.9) ; la distance AB est la norme de AB⃗.")
pt('2-302', rem="La formule des coordonnées du milieu est un approfondissement (2-306) alors que ce calcul est attendu : question l2-8.")
pt('2-303', b('autre', "Par la colinéarité de vecteurs (déterminant nul ou proportionnalité des coordonnées).", 9))
pt('2-437', b('autre', "Par la colinéarité de vecteurs (déterminant nul ou proportionnalité des coordonnées).", 9))
pt('2-493', rem=COMP.format("résoudre un problème", "choisir la représentation des vecteurs pour résoudre un problème"))
pt('2-494', rem=COMP.format("résoudre un problème", "résoudre un problème de géométrie par une méthode au choix"))
pt('2-304', rem=DEMO)
pt('2-438', rem=DEMO)
pt('2-305', b('figures', "Deux ou trois points.", 9))
pt('2-306', rem="Question l2-8.")
pt('2-307', rem=DEMO)
pt('2-308', b('format', "Aire = ½ ab sin C.", 9), b('figures', "Angle C aigu.", 9, force='déduite'),
   rem="Lecture déduite (texte implicite) : le sinus n'est défini en 2de que dans le triangle rectangle (automatisme p.6, « lignes trigonométriques dans le triangle rectangle ») ; le sinus d'un angle obtus n'est pas au programme.")
pt('2-309', rem=DEMO)
pt('2-310', rem=DEMO)

# ---------- Nombres et calculs, algèbre > Algèbre ----------
pt('2-260', b('nombres', "Exposants entiers relatifs.", 7),
   rem="Portée des « règles de calcul » ((aᵐ)ⁿ, (a/b)ⁿ) : question l2-6.")
pt('2-261', b('autre', "Règles de calcul sur les racines carrées ; √ab = √a √b (a, b positifs) est démontré.", '7-8'),
   rem="Quelles règles au-delà du produit (quotient, a√b, dénominateur rationnel) : question l2-7.")
pt('2-423', b('format', "√a² = |a|, a réel.", 7), rem="Question l2-1.")
pt('2-262', b('autre', "Exemples simples de calcul, en particulier sur des expressions fractionnaires.", 7))
pt('2-263')
pt('2-424', b('autre', "Multiplication par un réel positif (sens conservé) ou négatif (sens changé), en liaison avec le sens de variation d'une fonction affine.", 7))
pt('2-264', b('autre', "Comparaison par la différence.", '5, 8'))
pt('2-425', b('nombres', "Deux nombres strictement positifs.", '5, 8'))
pt('2-265', b('format', "Type ax + b = 0 ; ensemble des solutions.", 8))
pt('2-266', b('format', "Forme ax + b > 0 ; ensemble des solutions (intervalle).", '7-8'), rem="Sens de l'inégalité : question l2-3.")
PN = b('autre', "A(x) et B(x) du premier degré.", '6, 8', force='déduite')
PN_REM = "Lecture déduite (texte implicite) : les objectifs visent des équations et inéquations « se ramenant au premier degré » (BO p.6)."
pt('2-267', PN, rem=PN_REM)
pt('2-268', FACT, rem=FACT_REM)
pt('2-426', FACT, b('fonctions', "Quotient : valeurs où B(x) s'annule exclues.", 8), rem=FACT_REM)
pt('2-269', PN, b('autre', "En lien avec l'ensemble de définition de l'expression (B(x) ≠ 0) ; a/x = b en est un cas (automatisme).", '5, 8'), rem=PN_REM)
pt('2-270', b('nombres', "Puissances entières relatives ; calculs numériques ou littéraux.", '7-8'), rem="Question l2-6.")
pt('2-271', b('autre', "Racines carrées ; calculs numériques ou littéraux.", 8), rem="Question l2-7.")
pt('2-272', b('operandes', "Écritures fractionnaires numériques et littérales ; égalités de l'automatisme (a/b ÷ c/d = ad/bc…).", '5, 8'))
pt('2-273', b('autre', "Cas simples de relations entre variables ; U = RI, d = vt, S = πr², V = abc, V = πr²h sont donnés « par exemple » (liste non limitative), y compris des formules d'autres disciplines.", '5, 8'),
   rem="⚠ libellé : le BO écrit « (par exemple U = RI, … ) » ; le libellé a perdu « par exemple » et se lit comme une liste fermée.")
pt('2-274', b('format', "Relation du premier degré ax + by = c.", 8))
pt('2-275', b('format', "Deux formes seulement : factorisée, développée réduite.", 8))
pt('2-276', b('autre', "Comparaison par la différence.", '5, 8'))
pt('2-427', b('nombres', "Quantités strictement positives.", '5, 8'))
pt('2-277', b('autre', "Interprétation selon le contexte, en variation additive.", 8))
pt('2-428', b('autre', "Interprétation selon le contexte, en variation multiplicative.", 8))
pt('2-278', b('autre', "Inéquations « se ramenant au premier degré ».", '6, 8'),
   rem="Point en partie compétence (modéliser) : un modèle s'y rattache s'il fait écrire l'inéquation qui traduit la situation.")
pt('2-279', b('format', "Type ax + b = cx + d ; ensemble des solutions.", '5, 8'))
pt('2-429', b('format', "Type ax = b ; ensemble des solutions.", 8))
pt('2-430', b('format', "Type a + x = b ; ensemble des solutions.", 8))
pt('2-280', b('format', "Type ax + b ⩾ cx + d ; ensemble des solutions (intervalle).", '5, 7-8'), rem="Sens de l'inégalité : question l2-3.")
pt('2-431', b('format', "Type ax ⩾ b ; ensemble des solutions (intervalle).", 8),
   rem="Le BO imprime « a ⩾ b » (coquille vérifiée sur le rendu image de la page 8) : question l2-5. Sens de l'inégalité : question l2-3.")
pt('2-432', b('format', "Type a + x ⩾ b ; ensemble des solutions (intervalle).", 8), rem="Sens de l'inégalité : question l2-3.")
pt('2-281', b('format', "Type x² = a ; ensemble des solutions (deux, une ou aucune solution), solutions exactes en √a.", '5, 8'))
pt('2-282', rem=DEMO)
pt('2-283', b('nombres', "Nombre positif donné ; première puissance supérieure ou inférieure à une valeur donnée.", 8))
pt('2-284', b('format', "(a + b + c)².", 8))
pt('2-285', b('format', "(a + b)³.", 8))
pt('2-286', b('nombres', "Deux réels strictement positifs.", 8))

# ---------- Nombres et calculs, algèbre > Arithmétique ----------
pt('2-235')
pt('2-236')
pt('2-418')
pt('2-419')
pt('2-237', b('autre', "Notions mobilisées : multiple, diviseur, nombre pair, nombre impair (liste du BO).", 7, detail={'liste': ['multiple', 'diviseur', 'pair', 'impair']}),
   rem="Point en partie compétence (modéliser et résoudre) : un modèle s'y rattache s'il fait traduire ou résoudre un problème avec ces seules notions.")
pt('2-238', b('autre', "Forme irréductible, en liaison avec l'étude des multiples et diviseurs.", '6-7'))
pt('2-239', rem=DEMO)
pt('2-240', rem=DEMO)
pt('2-241', b('nombres', "Entiers naturels.", 7))
pt('2-242', b('nombres', "Entiers donnés a et b.", 7))

# ---------- Nombres et calculs, algèbre > Nombres réels ----------
pt('2-243')
pt('2-244', b('format', "Notations du type [a ; +∞[, ]−∞ ; a], [a ; b], etc. ; représentation graphique (le BO écrit la virgule : [a, b]).", 7))
pt('2-245', b('autre', "|a| = distance de a à 0.", 7), rem="Question l2-1.")
pt('2-420', b('autre', "Distance entre deux réels a et b, exprimée par |a − b|.", 7), rem="Question l2-1.")
pt('2-246', b('format', "Inéquation |x − a| ⩽ r ; solutions représentées graphiquement, intervalle [a − r ; a + r].", 7), rem="Questions l2-1 et l2-3.")
pt('2-247')
pt('2-421', b('format', "Encadrement décimal à 10⁻ⁿ près.", 7))
pt('2-248')
pt('2-422', b('nombres', "Exemples fournis par la géométrie, « par exemple √2 et π » (liste non limitative).", 7))
pt('2-249', b('nombres', "Abscisses réelles.", 7))
pt('2-250', b('nombres', "Abscisses réelles.", 7))
pt('2-251', b('autre', "Intervalle de la droite numérique, borné ou non.", 7))
pt('2-252')
pt('2-253', b('format', "Encadrement d'amplitude donnée par des décimaux.", 7))
pt('2-254', b('format', "Arrondi au nombre de chiffres significatifs adapté, dans le cadre d'un problème.", 7))
pt('2-255', rem=DEMO)
pt('2-256', rem=DEMO)
pt('2-257', b('autre', "Balayage ; amplitude inférieure ou égale à 10⁻ⁿ.", 7))
pt('2-258')
pt('2-259', b('autre', "Sur des exemples.", 7))

DR = "« Données réelles » : question l2-9."
# ---------- Statistiques et probabilités > Croisement ----------
pt('2-383', b('autre', "Deux variables qualitatives (nominales ou ordinales).", 12), rem="« Données réelles » : question l2-9.")
pt('2-384', rem=DR)
pt('2-485', rem=DR)
pt('2-385', rem=DR)
pt('2-486', rem=DR)
pt('2-386', b('autre', "Par des raisonnements sur les effectifs.", 12), rem=DR)
pt('2-487', b('autre', "En utilisant des fréquences conditionnelles.", 12), rem=DR)
pt('2-387', b('autre', "Deux listes représentant deux caractères ; filtre avec ET, OU, NON.", 12))
pt('2-388', rem=DR)

# ---------- Statistiques et probabilités > Information chiffrée ----------
pt('2-364')
pt('2-365')
pt('2-366')
pt('2-367')
pt('2-368', b('autre', "Coefficient multiplicateur global = produit des coefficients.", 12))
pt('2-478', b('autre', "Coefficient multiplicateur réciproque = inverse.", 12))
pt('2-369')
pt('2-370', b('autre', "L'écart type est le seul indicateur de dispersion cité dans les contenus (la variance n'est pas citée).", 12, force='déduite'),
   rem="Lecture déduite (texte implicite) : « Indicateurs de dispersion : écart type » ; la variance n'apparait nulle part au BO de 2de.")
pt('2-371', b('autre', "Ajout ou suppression d'une valeur.", 12))
pt('2-479', b('autre', "Ajout ou suppression d'une valeur.", 12))
pt('2-372', b('autre', "Série continue regroupée en classes de même amplitude.", 12))
pt('2-480', b('autre', "Série continue regroupée en classes de même amplitude.", 12))
pt('2-375')
pt('2-376', b('autre', "Situations simples.", 12))
pt('2-377')
pt('2-378')
pt('2-379')
CL = b('autre', "Série regroupée en classes de même amplitude.", 12)
pt('2-380', CL)
pt('2-481', CL, b('autre', "Répartition uniforme dans chaque classe : centre de la classe.", 12))
pt('2-381', CL)
pt('2-482', CL, b('autre', "Répartition uniforme dans la classe médiane.", 12))
pt('2-382', b('autre', "Couple moyenne–écart type.", 12))
pt('2-483', b('autre', "Couple médiane–écart interquartile.", 12))
pt('2-484', b('autre', "Représentations graphiques données.", 12))

# ---------- Statistiques et probabilités > Probabilités ----------
pt('2-389')
pt('2-390', b('format', "Notation P_A(B), A de probabilité non nulle.", 13))
pt('2-391', b('autre', "Pas de calcul par les probabilités totales (partition de l'univers).", 13), rem="Question l2-4.")
pt('2-392', b('autre', "Simulation sur Python ou tableur.", 13))
pt('2-393', b('autre', "En lien avec une situation donnée.", 13))
pt('2-394', b('autre', "En lien avec une situation donnée.", 13),
   rem="⚠ libellé : le BO dit « Construire un arbre pondéré ou un tableau », sans « croisé d'effectifs » ; question l2-10.")
NOT = b('format', "Notations du programme : P(A), Ā, P(A ∩ B), P_A(B).", '4, 13')
pt('2-395', NOT, rem="⚠ libellé : la puce du BO dit seulement « Passer du registre de la langue naturelle au registre symbolique et inversement » ; la liste de notations est ajoutée (chaque notation est bien au BO, p.4 et p.13).")
pt('2-488', NOT, rem="⚠ libellé : la puce du BO dit seulement « Passer du registre de la langue naturelle au registre symbolique et inversement » ; la liste de notations est ajoutée (chaque notation est bien au BO, p.4 et p.13).")
pt('2-396', b('autre', "Tableau croisé d'effectifs ; tirage au sort avec équiprobabilité d'un individu dans une population : P_B(A) = Card(A ∩ B) / Card(B).", 13))
pt('2-397', b('autre', "Arbre de probabilité ; pas de calcul par les probabilités totales.", 13), rem="Question l2-4.")
pt('2-398')
pt('2-399', b('autre', "Probabilité d'un chemin = produit des probabilités de ses branches.", 13), rem="Somme de chemins : question l2-4.")
pt('2-400', b('autre', "Situations de type « faux positifs » ; vocabulaire des tests : faux positifs, faux négatifs, spécificité, sensibilité.", 13), rem="Inversion du conditionnement sur un arbre : passe par P(B), donc par la question l2-4.")
