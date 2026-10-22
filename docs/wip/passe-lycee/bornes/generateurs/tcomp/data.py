# Bornes des points de Tle mathématiques complémentaires (T_COMP).
# Source : BO n° 14 du 2026-04-02, extrait dans docs/wip/passe-lycee/bo/tcomp.txt.


def src(p):
    return "BO Tle compl. p." + p


def B(aspect, borne, p, force="BO", detail=None, extra=None):
    b = {"aspect": aspect, "borne": borne}
    if detail:
        b["detail"] = detail
    s = src(p)
    if extra:
        s += " ; " + extra
    b["source"] = s
    b["force"] = force
    return b


DEMO = "Démonstration (« démonstration possible » du BO) : point-compétence, aucune borne propre au-delà des bornes générales."
ALGO = "Exemple d'algorithme du BO : hérite de la borne générale d'algorithmique (langage naturel avec ← ou Python, aucune notion nouvelle)."

GENERAL = [
    B("fonctions",
      "Fonctions de référence : carré, cube, racine carrée, inverse, exponentielle, logarithme népérien. Le logarithme est la seule famille nouvelle ; polynômes du second degré, x ↦ xⁿ (n ∈ ℤ) et t ↦ e^{at} viennent de la 1re spécialité.",
      "9", detail={"liste": ["carré", "cube", "racine carrée", "inverse", "exponentielle", "logarithme népérien"]},
      extra="BO 1re spé p.7-8"),
    B("fonctions",
      "Pas de fonctions trigonométriques (x ↦ cos x, x ↦ sin x) : la 1re spécialité ne voit que le cosinus et le sinus d'un réel sur le cercle, et la Tle compl. ne les ajoute pas aux fonctions de référence.",
      "9", force="déduite", detail={"exclus": ["cos", "sin", "tan"]}, extra="BO 1re spé p.8"),
    B("fonctions",
      "Compositions : seulement x ↦ f(ax + b), x ↦ e^{u(x)}, x ↦ ln u(x), x ↦ u(x)², en plus des opérations de 1re spé (somme, produit, inverse, quotient).",
      "9", detail={"liste": ["f(ax + b)", "e^{u}", "ln u", "u²"], "exclus": ["√u (u non affine)", "uⁿ (n ⩾ 3)"]}),
    B("autre",
      "Limites et continuité : approche intuitive. La formalisation de la limite n'est pas un attendu ; les opérations sur les limites sont admises ; composition des limites et théorèmes de comparaison seulement « en contexte » ; on admet qu'une fonction dérivable sur un intervalle est continue.",
      "8-9"),
    B("autre",
      "Équations différentielles : la résolution se limite aux équations linéaires du premier ordre à coefficients constants (y' = ay, y' = ay + b). Une équation non linéaire (logistique) peut apparaître, sans aucune connaissance exigible à son sujet.",
      "9"),
    B("autre",
      "Lois de probabilité au programme : uniforme sur {1, …, n}, Bernoulli, binomiale, géométrique ; à densité : uniforme sur [a, b], exponentielle. Aucune autre (la loi normale n'y figure pas).",
      "11", detail={"liste": ["uniforme discrète", "Bernoulli", "binomiale", "géométrique", "uniforme sur [a, b]", "exponentielle"]}),
    B("format",
      "Le symbole Σ sert à écrire concisément ; son emploi comme outil de calcul n'est pas un objectif.",
      "3"),
    B("format",
      "Symboles ∀ et ∃ non exigibles ; complémentaire noté Ā ou E \\ A ; cardinal noté Card(A).",
      "3", detail={"notation_reponse": "∀, ∃ jamais exigés"}),
    B("autre",
      "Algorithmes écrits en langage naturel (affectation notée ←) ou en Python ; aucune notion d'algorithmique nouvelle par rapport à la 2de et à la 1re (variable, type, affectation, instruction conditionnelle, boucle, fonction, liste).",
      "12"),
]

GEN_REM = {
    1: "Lecture déduite : le BO de Tle compl. liste les fonctions de référence sans cos ni sin, et le BO de 1re spé (p.8) s'arrête au cosinus et au sinus d'un nombre réel (cercle trigonométrique, valeurs remarquables), sans étude de fonction.",
}

P = {}

# --- Vocabulaire ensembliste et logique
P["TCOMP-201"] = ([], "Vocabulaire transversal : le BO (p.3) ne dit rien au-delà de la notion ; hérite des bornes générales.")
P["TCOMP-330"] = ([], "Le BO (p.3) donne la notion et la notation Card(A), mais aucune règle de dénombrement (Card(E × F) = Card E × Card F, nombre de n-uplets) : voir ltc-9.")

# --- Thème Répartition des richesses
P["TCOMP-202"] = ([
    B("autre", "Déciles d'une série statistique (répartition de richesses, de salaires), en prolongement de la médiane et des quartiles de 2de ; convention de calcul non fixée par le BO (ltc-5).", "5-6"),
], "Point tiré des « contenus associés » d'un thème d'étude, exigence d'approfondissement. Convention des déciles : ltc-5.")
P["TCOMP-331"] = ([
    B("faits", "Rapport interdécile = D9 / D1 (quotient, à ne pas confondre avec l'écart interdécile D9 − D1).", "6", force="déduite"),
], "Lecture déduite : le BO nomme le rapport interdécile sans le définir ; le sens usuel (INSEE) est le quotient D9/D1. Point tiré d'un thème d'étude, exigence d'approfondissement.")

# --- Suites
INTUITIF_S = B("autre", "Approche intuitive, sur des exemples (calculs numériques, graphiques) ; aucune définition formelle de la limite.", "8-9")
P["TCOMP-203"] = ([INTUITIF_S], None)
P["TCOMP-204"] = ([B("autre", "Opérations sur les limites admises, utilisées sans démonstration.", "8-9")], None)
P["TCOMP-332"] = ([B("autre", "Approche intuitive : résultat admis et utilisé, sans démonstration.", "8")], None)
P["TCOMP-205"] = ([B("autre", "Approche intuitive : théorème admis et utilisé, sans démonstration.", "8")], None)
GEO_POS = B("nombres", "Raison positive seulement (q ⩾ 0) : pas de suite géométrique de raison négative.", "8", detail={"ensemble": "q ⩾ 0"})
P["TCOMP-206"] = ([GEO_POS], None)
SOMME = B("nombres", "Raison q avec 0 ⩽ q < 1 ; limite de la somme des termes u₀ + u₁ + … + uₙ.", "8", detail={"ensemble": "0 ⩽ q < 1"})
P["TCOMP-207"] = ([SOMME], None)
AG_LIM = B("nombres", "Limite d'une suite arithmético-géométrique uₙ₊₁ = a uₙ + b seulement si a ⩾ 0 (la suite géométrique associée doit avoir une raison positive).", "8", force="déduite", detail={"ensemble": "a ⩾ 0 pour la limite"})
AG_REM = "Lecture déduite : le BO ne donne la limite que pour une suite géométrique de raison positive ; la limite d'une suite arithmético-géométrique passe par la suite géométrique uₙ − ℓ de raison a, donc a ⩾ 0."
P["TCOMP-208"] = ([AG_LIM], AG_REM)
P["TCOMP-377"] = ([B("format", "Suite donnée par une formule explicite ou par une relation de récurrence (dont arithmético-géométrique).", "8")], None)
P["TCOMP-209"] = ([GEO_POS, AG_LIM], AG_REM)
P["TCOMP-210"] = ([SOMME], None)
REC = B("fonctions", "Récurrence uₙ₊₁ = f(uₙ) avec f continue d'un intervalle I dans lui-même.", "8")
P["TCOMP-211"] = ([REC], None)
P["TCOMP-212"] = ([REC, B("autre", "Conjecture seulement (comportement global ou asymptotique) : aucune preuve exigée.", "8")], None)
P["TCOMP-213"] = ([B("nombres", "Suite constante ℓ solution de ℓ = aℓ + b, donc a ≠ 1.", "8", force="déduite")],
                  "Lecture déduite : une solution constante n'existe (en général) que pour a ≠ 1 ; le BO ne l'écrit pas.")
P["TCOMP-214"] = ([B("autre", "Toutes les solutions par la suite géométrique uₙ − ℓ : uₙ = ℓ + (u₀ − ℓ)aⁿ.", "8", force="déduite"), AG_LIM],
                  "Lecture déduite : la forme uₙ = ℓ + (u₀ − ℓ)aⁿ est la seule conséquence de la méthode du BO (« utilisation de cette suite pour déterminer toutes les solutions »). " + AG_REM)
P["TCOMP-215"] = ([], DEMO)
P["TCOMP-216"] = ([], ALGO)
P["TCOMP-217"] = ([], ALGO)
P["TCOMP-218"] = ([B("nombres", "Exemples du BO : π, ln 2, √2 (liste ouverte : « par exemple »).", "9", detail={"liste": ["π", "ln 2", "√2"]})], ALGO)

# --- Fonctions
INTUITIF_F = B("autre", "Notion intuitive de limite, en un point ou aux bornes d'un intervalle ; la formalisation n'est pas un attendu.", "9")
P["TCOMP-333"] = ([INTUITIF_F], None)
P["TCOMP-219"] = ([B("figures", "Asymptotes horizontales et verticales seulement (pas d'asymptote oblique).", "9", detail={"exclus": ["asymptote oblique"]})], None)
P["TCOMP-220"] = ([B("autre", "Continuité intuitive ; une fonction dérivable sur un intervalle est continue (admis).", "9")], None)
P["TCOMP-221"] = ([B("faits", "Limites aux bornes de ℝ : +∞ en −∞ et en +∞.", "9")], None)
P["TCOMP-334"] = ([B("faits", "Limites aux bornes de ℝ : −∞ en −∞, +∞ en +∞.", "9")], None)
P["TCOMP-335"] = ([B("faits", "Limite en +∞ : +∞ (fonction définie sur [0, +∞[).", "9")], None)
P["TCOMP-336"] = ([B("faits", "Limites : 0 en −∞ et en +∞ ; −∞ en 0 à gauche, +∞ en 0 à droite.", "9")], None)
P["TCOMP-337"] = ([B("faits", "Limites : 0 en −∞, +∞ en +∞.", "9")], None)
P["TCOMP-338"] = ([B("faits", "Limites : −∞ en 0 (à droite), +∞ en +∞.", "9")], None)
P["TCOMP-222"] = ([B("autre", "Théorème admis, pour une fonction continue sur un intervalle.", "9")], None)
P["TCOMP-339"] = ([B("autre", "Fonction continue strictement monotone sur un intervalle : existence et unicité de la solution de f(x) = k.", "9")], None)
RECIP = B("autre", "Pas de développement théorique ; notion illustrée par les couples carré / racine carrée et exponentielle / logarithme.", "9", detail={"liste": ["carré ↔ racine carrée", "exponentielle ↔ logarithme"]})
P["TCOMP-223"] = ([RECIP], "Faut-il s'en tenir aux deux couples illustrés ? ltc-8.")
P["TCOMP-340"] = ([RECIP], "Faut-il s'en tenir aux deux couples illustrés ? ltc-8.")
P["TCOMP-224"] = ([B("fonctions", "Logarithme défini comme réciproque de l'exponentielle, donc sur ]0, +∞[ ; le thème historique le relie aussi à l'équation fonctionnelle et à la quadrature de l'hyperbole, sans en faire une définition.", "5 ; 9")],
                  "La quadrature de l'hyperbole (aire sous 1/t) n'est qu'un « problème possible » d'un thème : voir ltc-7.")
P["TCOMP-225"] = ([], None)
LN_PROP = B("faits", "Propriétés : ln(ab) = ln a + ln b, ln(1/a) = −ln a, ln(qⁿ) = n ln q (a, b, q > 0).", "9", detail={"liste": ["ln(ab) = ln a + ln b", "ln(1/a) = −ln a", "ln(qⁿ) = n ln q"]})
P["TCOMP-226"] = ([LN_PROP], None)
P["TCOMP-227"] = ([B("faits", "(ln x)' = 1/x sur ]0, +∞[.", "9")], None)
P["TCOMP-341"] = ([B("faits", "(f(ax + b))' = a f'(ax + b), f étant une fonction dont la dérivée est connue.", "9")], None)
P["TCOMP-228"] = ([B("faits", "(e^{u})' = u' e^{u}.", "9")], None)
LNU = B("fonctions", "u strictement positive sur l'intervalle d'étude ; pas de ln |u|.", "9", force="déduite", detail={"exclus": ["ln |u|"]})
LNU_REM = "Lecture déduite : ln n'est défini que sur ]0, +∞[ (réciproque de exp) et le BO n'écrit que ln u ; ln |u| n'apparaît nulle part."
P["TCOMP-342"] = ([B("faits", "(ln u)' = u'/u.", "9"), LNU], LNU_REM)
P["TCOMP-343"] = ([B("faits", "(u²)' = 2u u' ; pas de formule générale pour uⁿ.", "9", detail={"exclus": ["(uⁿ)' pour n ⩾ 3"]})], None)
P["TCOMP-229"] = ([B("fonctions", "Fonctions construites sur les fonctions de référence par somme, produit, inverse, quotient (1re spé) et par les seules compositions f(ax + b), e^{u}, ln u, u².", "9", detail={"exclus": ["√u avec u non affine", "uⁿ (n ⩾ 3)", "fonctions trigonométriques"]}, extra="BO 1re spé p.7")], None)
LIMS = B("autre", "Limites des fonctions de référence et opérations sur les limites (admises) ; composition et comparaison seulement en contexte.", "9")
P["TCOMP-230"] = ([LIMS], "Les croissances comparées (eˣ/x, x e^{−x}, ln x / x) ne figurent pas au BO : ltc-1.")
P["TCOMP-231"] = ([B("autre", "Études sur des intervalles quelconques, avec une notion intuitive de limite aux bornes.", "9")], None)
P["TCOMP-378"] = ([LIMS], "Capacité de résolution de problème ; mêmes bornes que TCOMP-230 (croissances comparées : ltc-1).")
P["TCOMP-232"] = ([B("fonctions", "Allure des courbes des seules fonctions inverse, carré, cube, racine carrée, exponentielle, logarithme.", "9", detail={"liste": ["inverse", "carré", "cube", "racine carrée", "exponentielle", "logarithme"]})], None)
P["TCOMP-233"] = ([B("autre", "Équation du type f(x) = k ; nombre de solutions lu dans le tableau de variation (théorème des valeurs intermédiaires, cas strictement monotone).", "9")], None)
P["TCOMP-234"] = ([B("autre", "Inéquation du type f(x) ⩽ k, résolue à partir du tableau de variation.", "9")], None)
P["TCOMP-235"] = ([B("autre", "Valeurs approchées ou encadrement d'une solution de f(x) = k (calculatrice, balayage, dichotomie) ; aucune précision imposée par le BO.", "4 ; 9")], None)
P["TCOMP-236"] = ([LN_PROP], None)
EXP_PROP = B("faits", "Propriétés de 1re spé : e^{x + y} = eˣ eʸ, eˣ e^{−x} = 1 ; la stricte croissance de exp ; passage par ln (réciproque) possible.", "9", extra="BO 1re spé p.8")
P["TCOMP-237"] = ([EXP_PROP], None)
P["TCOMP-344"] = ([EXP_PROP], None)
LN_DOM = B("nombres", "Résolution sur l'ensemble où les expressions sous ln sont strictement positives.", "9", force="déduite")
LN_DOM_REM = "Lecture déduite : conséquence de la définition de ln sur ]0, +∞[ ; le BO n'en parle pas explicitement."
P["TCOMP-238"] = ([LN_PROP, LN_DOM], LN_DOM_REM)
P["TCOMP-345"] = ([LN_PROP, LN_DOM], LN_DOM_REM)
P["TCOMP-239"] = ([B("nombres", "Seuil pour qⁿ (q > 0, n entier naturel) : qⁿ ⩽ s ou qⁿ ⩾ s résolu par n ln q.", "9")], None)
P["TCOMP-240"] = ([], DEMO)
P["TCOMP-346"] = ([], DEMO)
P["TCOMP-241"] = ([B("autre", "La dérivabilité du logarithme est admise.", "9")], DEMO)
P["TCOMP-242"] = ([], DEMO)
P["TCOMP-347"] = ([], DEMO)
P["TCOMP-243"] = ([], ALGO)
P["TCOMP-348"] = ([], ALGO)
P["TCOMP-349"] = ([], ALGO)
P["TCOMP-244"] = ([], ALGO)

# --- Primitives et équations différentielles
P["TCOMP-245"] = ([B("autre", "Sur des exemples seulement ; existence et unicité de la solution vérifiant une condition initiale mises en évidence sur ces exemples, pas démontrées.", "9")], None)
P["TCOMP-246"] = ([B("autre", "Primitive F de f : F' = f, en lien avec l'équation y' = f.", "9")], None)
P["TCOMP-247"] = ([B("autre", "Fonction continue sur un intervalle.", "9")], None)
YAB = B("nombres", "a et b réels ; la solution particulière constante −b/a suppose a ≠ 0.", "9", force="déduite")
YAB_REM = "Lecture déduite : le BO dit « a et b réels » ; la solution constante n'existe que pour a ≠ 0 (pour a = 0, y' = b relève des primitives)."
P["TCOMP-248"] = ([YAB], YAB_REM)
P["TCOMP-249"] = ([], None)
P["TCOMP-250"] = ([B("autre", "Équation donnée, linéaire ou non (par exemple logistique y' = ay(b − y)) : seule la vérification par le calcul de la dérivée est demandée.", "4 ; 9", force="déduite")],
                  "Lecture déduite : le BO admet qu'une équation non linéaire « peut apparaître » sans connaissance exigible ; la vérification n'en demande aucune. L'ordre (y'' admis ou non) : ltc-6.")
PRIM_REF = B("fonctions", "Primitives lues sur les dérivées connues : xⁿ (n ∈ ℤ, n ≠ −1), 1/x (→ ln x sur ]0, +∞[), 1/√x, eˣ, e^{ax}, et f(ax + b) ; plus les formes 2uu', e^{u}u', u'/u.", "9", force="déduite", extra="BO 1re spé p.7-8")
PRIM_REM = "Lecture déduite : le BO dit « en reconnaissant la dérivée d'une fonction de référence » ; la liste est celle des dérivées connues en 1re spé et en Tle compl."
P["TCOMP-251"] = ([PRIM_REF], PRIM_REM)
P["TCOMP-252"] = ([B("fonctions", "Forme 2uu' (primitive u²) seulement ; pas de forme générale uⁿu'.", "9", detail={"exclus": ["uⁿu' (n ⩾ 2)"]})], None)
P["TCOMP-350"] = ([B("fonctions", "Forme e^{u}u' (primitive e^{u}).", "9")], None)
P["TCOMP-351"] = ([B("fonctions", "Forme u'/u (primitive ln u).", "9"), LNU], LNU_REM)
P["TCOMP-253"] = ([B("nombres", "a réel ; solutions x ↦ C e^{ax} ; une condition initiale fixe la solution.", "9")], None)
P["TCOMP-254"] = ([YAB], YAB_REM)
P["TCOMP-255"] = ([B("autre", "Solution générale = solutions de y' = ay plus la solution particulière constante.", "9"), YAB], YAB_REM)
P["TCOMP-256"] = ([], DEMO)
P["TCOMP-257"] = ([], DEMO)
P["TCOMP-258"] = ([B("autre", "Sur des exemples seulement.", "10")], ALGO)

# --- Fonctions convexes
P["TCOMP-259"] = ([], None)
P["TCOMP-260"] = ([B("figures", "Définition par la position de la courbe sous ses sécantes (cordes) sur un intervalle.", "10")], None)
P["TCOMP-261"] = ([B("figures", "Équivalence admise : courbe au-dessus de ses tangentes, pour f dérivable.", "10")], None)
P["TCOMP-262"] = ([B("autre", "Caractérisation admise : f convexe ⇔ f' croissante.", "10")], None)
P["TCOMP-352"] = ([B("autre", "Caractérisation admise : f convexe ⇔ f'' ⩾ 0.", "10")], None)
P["TCOMP-263"] = ([], "Le BO (p.10) nomme le point d'inflexion sans le définir.")
P["TCOMP-264"] = ([], None)
P["TCOMP-353"] = ([], None)
P["TCOMP-265"] = ([B("fonctions", "Fonction deux fois dérivable sur un intervalle (fonctions du programme).", "10")], None)

# --- Intégration
P["TCOMP-266"] = ([B("fonctions", "f continue et positive sur [a, b] ; intégrale = aire sous la courbe (en unités d'aire).", "10"),
                   B("format", "Notation ∫_a^b f(x) dx ; mise en relation avec Σ f(xᵢ)Δxᵢ.", "10")], None)
P["TCOMP-267"] = ([], None)
P["TCOMP-268"] = ([B("autre", "Valeur moyenne d'une fonction continue sur [a, b], abordée graphiquement et numériquement.", "10")], None)
P["TCOMP-269"] = ([B("faits", "Si m ⩽ f ⩽ M sur [a, b], la valeur moyenne est comprise entre m et M.", "10")], None)
P["TCOMP-270"] = ([B("autre", "Méthode des rectangles.", "10")], None)
P["TCOMP-271"] = ([B("autre", "Signe quelconque : présentation seulement.", "10")], None)
P["TCOMP-272"] = ([B("fonctions", "f continue sur [a, b] ; F(x) = ∫_a^x f(t) dt.", "10")], None)
PRIM_PROG = B("fonctions", "Primitives limitées à celles du programme (dérivées des fonctions de référence, f(ax + b), 2uu', e^{u}u', u'/u).", "9-10", force="déduite")
PRIM_PROG_REM = "Lecture déduite : le calcul d'intégrale passe par F(b) − F(a) ; seules les primitives que le programme sait déterminer sont disponibles."
P["TCOMP-273"] = ([PRIM_PROG], PRIM_PROG_REM)
P["TCOMP-274"] = ([], None)
P["TCOMP-354"] = ([], None)
P["TCOMP-275"] = ([], None)
P["TCOMP-355"] = ([], None)
P["TCOMP-276"] = ([PRIM_PROG], PRIM_PROG_REM)
P["TCOMP-277"] = ([PRIM_PROG], PRIM_PROG_REM)
P["TCOMP-278"] = ([B("fonctions", "Aire sous la courbe d'une fonction continue et positive (en unités d'aire).", "10"), PRIM_PROG], PRIM_PROG_REM)
P["TCOMP-279"] = ([B("fonctions", "Aire entre deux courbes : ∫_a^b (f − g) avec f ⩾ g sur [a, b].", "10", force="déduite"), PRIM_PROG],
                  "Lecture déduite : le BO dit seulement « entre deux courbes » ; la formule suit de la définition par l'aire. " + PRIM_PROG_REM)
P["TCOMP-280"] = ([], "Capacité d'interprétation en contexte d'une autre discipline : pas de borne propre.")
P["TCOMP-281"] = ([], "Capacité d'interprétation en contexte d'une autre discipline : pas de borne propre.")
P["TCOMP-282"] = ([B("fonctions", "f continue, positive et croissante seulement.", "10")], DEMO)
P["TCOMP-283"] = ([], ALGO)
P["TCOMP-356"] = ([], ALGO)
P["TCOMP-284"] = ([], ALGO)

# --- Lois discrètes
P["TCOMP-285"] = ([B("nombres", "Valeurs 1, 2, …, n équiprobables : P(X = k) = 1/n.", "11")], None)
P["TCOMP-357"] = ([B("faits", "E(X) = (n + 1)/2.", "11")], None)
P["TCOMP-286"] = ([B("nombres", "X à valeurs 0 et 1, P(X = 1) = p.", "11")], None)
P["TCOMP-358"] = ([B("faits", "E(X) = p.", "11")], None)
P["TCOMP-359"] = ([B("faits", "σ(X) = √(p(1 − p)).", "11")], None)
NREP = B("nombres", "Taille n quelconque (la 1re spé se limitait à n ⩽ 4).", "11", force="déduite", extra="BO 1re spé p.10")
NREP_REM = "Lecture déduite : le BO de Tle compl. ne borne plus n, alors que celui de 1re spé (p.10) écrivait « pour n ⩽ 4 »."
P["TCOMP-287"] = ([NREP], NREP_REM)
P["TCOMP-360"] = ([], None)
COEF_FACT = B("autre", "Pas de formule n!/(k!(n − k)!) : les coefficients s'obtiennent par dénombrement des chemins de l'arbre ou par le triangle de Pascal.", "11", force="déduite", detail={"exclus": ["formule factorielle"]})
COEF_REM = "Lecture déduite : le BO définit les coefficients binomiaux par le schéma de Bernoulli et ne donne comme outil que le triangle de Pascal ; la factorielle n'apparaît qu'en exemple d'algorithme de 1re spé."
P["TCOMP-288"] = ([B("autre", "Définition : nombre de façons d'obtenir k succès dans un schéma de Bernoulli de taille n (chemins de l'arbre).", "11"), COEF_FACT], COEF_REM)
P["TCOMP-361"] = ([B("faits", "Relation de Pascal (construction du triangle).", "11")], None)
P["TCOMP-362"] = ([B("faits", "Symétrie : (n k) = (n n − k).", "11")], None)
P["TCOMP-289"] = ([B("format", "Notation ℬ(n, p) ; X = nombre de succès du schéma de Bernoulli.", "11")], None)
P["TCOMP-290"] = ([B("faits", "P(X = k) = (n k) pᵏ (1 − p)ⁿ⁻ᵏ.", "11")], "Calcul effectif à la main ou à la calculatrice : ltc-2.")
P["TCOMP-291"] = ([B("faits", "E(X) = np, admise.", "11")], None)
P["TCOMP-363"] = ([B("faits", "σ(X) = √(np(1 − p)), admis.", "11")], None)
P["TCOMP-292"] = ([], None)
P["TCOMP-293"] = ([B("autre", "Rang du premier succès dans un schéma de Bernoulli (valeurs k ⩾ 1), ou loi discrète sans mémoire.", "7 ; 11")], None)
GEOM = B("faits", "P(X = k) = (1 − p)ᵏ⁻¹ p pour k ⩾ 1 (rang du premier succès).", "7 ; 11")
P["TCOMP-364"] = ([GEOM], None)
P["TCOMP-365"] = ([B("faits", "E(X) = 1/p, admise.", "11")], None)
P["TCOMP-366"] = ([], None)
SANS_MEM_G = B("faits", "Absence de mémoire : P_{X > m}(X > m + n) = P(X > n).", "7 ; 11")
P["TCOMP-294"] = ([SANS_MEM_G], None)
P["TCOMP-295"] = ([], None)
P["TCOMP-367"] = ([], None)
P["TCOMP-368"] = ([], None)
P["TCOMP-296"] = ([B("autre", "Par le triangle de Pascal.", "11"), COEF_FACT], COEF_REM)
P["TCOMP-297"] = ([B("autre", "Calcul à la calculatrice ou au logiciel ; événements P(X = k), P(X ⩽ k) et apparentés.", "11")], "Calcul à la main admis ou non : ltc-2.")
P["TCOMP-298"] = ([GEOM, B("faits", "P(X ⩽ k) = 1 − (1 − p)ᵏ, P(X > k) = (1 − p)ᵏ.", "11", force="déduite")],
                  "Lecture déduite : « calculer explicitement ces probabilités » ; P(X ⩽ k) découle de la somme géométrique de 1re spé.")
P["TCOMP-299"] = ([B("autre", "Intervalle I tel que P(X ∈ I) ⩽ α ou ⩾ 1 − α, X binomiale (calculatrice, logiciel ou algorithme) ; les thèmes donnent I centré en n/2 pour ℬ(n, 1/2) et I = [0, k].", "6-7 ; 11")], None)
P["TCOMP-300"] = ([B("autre", "Espérances des seules lois discrètes du programme : uniforme, Bernoulli, binomiale, géométrique.", "11")], None)
P["TCOMP-301"] = ([SANS_MEM_G], None)
P["TCOMP-302"] = ([B("autre", "Inversion du conditionnement par la formule de Bayes P_B(A) = P_A(B)P(A)/P(B), en plus des outils de 1re spé (arbres pondérés, tableaux croisés, probabilités totales).", "6", extra="BO 1re spé p.5 ; 10")],
                  "La formule de Bayes est écrite dans le thème « Inférence bayésienne » (« bien comprendre cette distinction est un objectif majeur ») ; le vocabulaire des tests (sensibilité, spécificité, valeurs prédictives) n'est qu'un problème possible : ltc-7.")
P["TCOMP-303"] = ([B("autre", "Répétition d'expériences aléatoires indépendantes.", "11"), NREP], NREP_REM)
P["TCOMP-304"] = ([], DEMO)
P["TCOMP-369"] = ([], DEMO)
P["TCOMP-305"] = ([], DEMO)
P["TCOMP-306"] = ([B("nombres", "n ⩽ 3.", "11", detail={"max": 3})], DEMO)
P["TCOMP-307"] = ([], DEMO)

# --- Lois à densité
P["TCOMP-308"] = ([B("autre", "À partir d'exemples.", "11")], None)
P["TCOMP-370"] = ([B("faits", "P(a ⩽ X ⩽ b) = aire sous la densité entre a et b.", "11")], None)
P["TCOMP-309"] = ([B("format", "F(x) = P(X ⩽ x).", "11")], None)
P["TCOMP-310"] = ([B("format", "Espérance écrite sous forme d'intégrale (∫ x f(x) dx).", "11")], "Intervalles non bornés : ltc-3.")
P["TCOMP-371"] = ([B("format", "Variance écrite sous forme d'intégrale.", "11")], "Intervalles non bornés : ltc-3.")
P["TCOMP-311"] = ([B("faits", "Densité 1 sur [0, 1], puis 1/(b − a) sur [a, b].", "11")], None)
P["TCOMP-372"] = ([B("faits", "F(x) = (x − a)/(b − a) sur [a, b].", "11")], None)
P["TCOMP-373"] = ([B("faits", "E(X) = (a + b)/2.", "11")], None)
P["TCOMP-374"] = ([B("faits", "V(X) = (b − a)²/12.", "11")], None)
P["TCOMP-312"] = ([B("faits", "Densité x ↦ λe^{−λx} sur [0, +∞[, λ > 0.", "11")], None)
P["TCOMP-375"] = ([B("faits", "F(x) = 1 − e^{−λx} pour x ⩾ 0.", "11")], None)
P["TCOMP-376"] = ([B("faits", "E(X) = 1/λ ; pas de variance de la loi exponentielle au programme.", "11", force="déduite")],
                  "Lecture déduite : le BO liste pour la loi exponentielle « espérance, propriété d'absence de mémoire », sans la variance qu'il cite pour la loi uniforme. Calcul de 1/λ : ltc-3.")
P["TCOMP-313"] = ([B("faits", "P_{X > t}(X > t + h) = P(X > h).", "7 ; 11")], None)
P["TCOMP-314"] = ([B("autre", "Fonction continue, positive, d'intégrale égale à 1 sur l'intervalle considéré.", "11")], "Intervalles non bornés (densité sur [0, +∞[) : ltc-3.")
P["TCOMP-315"] = ([B("autre", "Lois à densité du programme (uniforme, exponentielle) ou densités données par l'énoncé ; probabilité = intégrale de la densité.", "11")], "Intervalles non bornés : ltc-3.")
P["TCOMP-316"] = ([PRIM_PROG], PRIM_PROG_REM + " Intervalles non bornés : ltc-3.")
P["TCOMP-317"] = ([B("autre", "À partir d'une variable de loi uniforme sur [0, 1].", "11")], ALGO)
P["TCOMP-318"] = ([], ALGO)

# --- Statistique à deux variables
P["TCOMP-319"] = ([], None)
P["TCOMP-320"] = ([B("faits", "Point moyen G(x̄ ; ȳ).", "12")], None)
P["TCOMP-321"] = ([], None)
P["TCOMP-322"] = ([], "Le BO (p.12) cite le coefficient de corrélation dans les contenus sans capacité de calcul : ltc-4.")
P["TCOMP-323"] = ([B("autre", "Changement de variable ramenant à un ajustement affine, par exemple une relation exponentielle (z = ln y).", "11-12")], None)
P["TCOMP-324"] = ([B("autre", "Interpolations ou extrapolations, avec un regard critique.", "7 ; 12")], None)
P["TCOMP-325"] = ([], None)
P["TCOMP-326"] = ([B("faits", "Coordonnées (x̄ ; ȳ), moyennes des deux séries.", "12")], None)
P["TCOMP-327"] = ([B("autre", "À la calculatrice, au logiciel ou par calcul.", "12")], None)
P["TCOMP-328"] = ([B("autre", "Interpolations ou extrapolations, avec un regard critique.", "7 ; 12")], None)
P["TCOMP-329"] = ([], DEMO)
