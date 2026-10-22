"""Génère les bornes de la voie technologique (1_TECHNO, T_TECHNO) : JSON + MD + questions."""
import csv
import json
import sys

ROOT = sys.argv[1]
OUT = ROOT + "/docs/wip/passe-lycee/bornes/"

P1 = "BO 1re techno p."
PT = "BO Tle techno p."
P2 = "BO 2de p."


def B(aspect, borne, source, force="BO", detail=None):
    d = {"aspect": aspect, "borne": borne}
    if detail:
        d["detail"] = detail
    d["source"] = source
    d["force"] = force
    return d


COMPETENCE = "Point-compétence : puce large sans grain questionnable (évaluation par compétences), aucune borne propre."

# ---------------------------------------------------------------- 1re techno
GEN_1 = [
    B("fonctions",
      "Familles nouvelles de 1re techno : polynômes de degré 2 et 3 seulement ; restent connues les fonctions de référence de 2de (affines, carré, inverse, racine carrée, cube, valeur absolue).",
      P1 + "7 ; " + P2 + "10-11",
      detail={"liste": ["polynôme de degré 2", "polynôme de degré 3"]}),
    B("fonctions",
      "Ni exponentielle, ni logarithme, ni fonction trigonométrique (aucune n'apparaît au programme de 1re techno ; x ↦ aˣ et log arrivent en Tle techno, la base e n'existe pas dans la voie techno).",
      P1 + "7-9 ; " + PT + "8", force="déduite",
      detail={"exclus": ["exp", "ln", "log", "aˣ", "cos", "sin"]}),
    B("fonctions",
      "Dérivation limitée aux polynômes de degré ≤ 3 : dérivées de x², x³, d'une somme, de kf ; ni produit, ni quotient, ni composée ; la dérivée de 1/x n'est pas au programme de mathématiques de 1re (vue en spécialité physique-chimie et mathématiques en STI2D/STL, reprise en Tle).",
      P1 + "8 ; " + PT + "9"),
    B("format",
      "Second degré : le calcul des racines par le discriminant ne figure pas au programme ; on privilégie les racines évidentes et les interprétations graphiques ; en cas de besoin, l'équation du second degré se résout au solveur.",
      P1 + "8", detail={"exclus": ["discriminant", "formules -b/2a et racines"]}),
    B("format",
      "Limite : pas de définition formelle, approche intuitive à partir d'exemples ; vocabulaire et notation introduits avec le nombre dérivé.",
      P1 + "9"),
    B("format", "Suites : la notation u(n) précède la notation uₙ.", P1 + "7",
      detail={"notation_enonce": ["u(n)", "u_n"]}),
    B("format",
      "La variable n'est pas toujours x (t, u, etc.) ; graphiques reliant une grandeur y à une grandeur composée (x², 1/x…).",
      P1 + "8"),
    B("autre", "Variables aléatoires : aucun formalisme, manipulées en contexte (issues numériques).", P1 + "10"),
    B("autre",
      "Variable aléatoire : espérance seulement, ni variance ni écart type de X (absents du programme) ; le seul écart type rencontré est celui d'une série de fréquences observées.",
      P1 + "10", force="déduite"),
    B("autre",
      "Programmation : Python (ou tableur pour les situations algorithmiques) ; seule notion nouvelle, la liste, sans autre type de collection ; affectation notée ← en langage naturel.",
      P1 + "4-5"),
    B("autre",
      "« Algorithmique et programmation » : toutes les séries sauf STD2A ; « Activités géométriques » : série STD2A seulement.",
      P1 + "4"),
]

ALGO1 = B("autre", "Langage Python ou tableur.", P1 + "4")
GEOM_POS = B("nombres",
             "Suites géométriques à termes strictement positifs (premier terme et raison strictement positifs).",
             P1 + "7", detail={"premier_terme": "> 0", "raison": "> 0"})
FORME_FACT = B("format",
               "Polynôme de degré 2 donné sous forme factorisée (produit de facteurs du premier degré) ; pas de discriminant.",
               P1 + "8")
DEG3 = B("fonctions", "Polynômes de degré ≤ 3 seulement.", P1 + "8")
MOTIF = B("figures",
          "Motif élémentaire : triangle rectangle ou isocèle, parallélogramme ou rectangle ; la classification des types de frises ou de pavages n'est pas un attendu.",
          P1 + "5")

Q = "(voir questions-techno.json, {})"

PTS_1 = {
    "1TECHNO-003": ([B("autre", "Générateur de nombres aléatoires entre 0 et 1 ; loi de Bernoulli de paramètre p.", P1 + "5")], None),
    "1TECHNO-007": ([B("autre", "Programmation modulaire : découper une tâche complexe en tâches plus simples (fonctions).", P1 + "5")], None),
    "1TECHNO-008": ([B("autre", "Listes seulement ; génération en extension et en compréhension mise en lien avec la notion d'ensemble.", P1 + "5")], None),
    "1TECHNO-108": ([B("autre", "Listes seulement (pas d'autre type de collection).", P1 + "5")], None),
    "1TECHNO-009": ([B("autre", "Listes seulement ; les conditions d'une liste en compréhension travaillent la logique.", P1 + "5")], None),
    "1TECHNO-012": ([], COMPETENCE + " Traitement de fichiers de données réelles."),
    "1TECHNO-015": ([MOTIF], None),
    "1TECHNO-109": ([MOTIF], None),
    "1TECHNO-018": ([], COMPETENCE + " Création de figure (« dialogue entre observation, analyse et création artistique », BO 1re techno p.5)."),
    "1TECHNO-019": ([MOTIF], None),
    "1TECHNO-114": ([MOTIF], None),
    "1TECHNO-020": ([B("figures", "Repère orthonormal de l'espace.", P1 + "6")], None),
    "1TECHNO-023": ([B("faits", "Conservés : milieux, contacts, rapports de longueurs ; non conservés : longueurs, angles.", P1 + "6",
                       detail={"liste": ["milieux", "contacts", "rapports de longueurs"], "exclus": ["longueurs", "angles"]})], None),
    "1TECHNO-027": ([B("figures", "À partir de la perspective cavalière d'un quadrillage ou d'un cube.", P1 + "6")], None),
    "1TECHNO-141": ([], "La liste d'automatismes de Tle techno (p.7), qui référence ce point, dit « Déterminer l'équation réduite d'une droite à partir des coordonnées de deux de ses points » : plus que le coefficient directeur."),
    "1TECHNO-032": ([B("autre", "Modes de génération : relation fonctionnelle ou relation de récurrence ; le tableur sert à calculer des termes.", P1 + "7")], None),
    "1TECHNO-035": ([B("autre", "Suite arithmétique : modèle discret d'évolution absolue constante (croissance linéaire).", P1 + "7")], None),
    "1TECHNO-036": ([GEOM_POS], None),
    "1TECHNO-038": ([GEOM_POS], None),
    "1TECHNO-040": ([GEOM_POS], None),
    "1TECHNO-117": ([GEOM_POS], None),
    "1TECHNO-047": ([GEOM_POS], None),
    "1TECHNO-049": ([GEOM_POS], None),
    "1TECHNO-142": ([], COMPETENCE + " Modéliser."),
    "1TECHNO-042": ([B("autre", "Deux modèles seulement : variation linéaire (arithmétique) ou exponentielle (géométrique).", P1 + "7")], None),
    "1TECHNO-118": ([B("autre", "La définition par récurrence fonctionne en 1re ; on présente aussi des suites ni arithmétiques ni géométriques.", P1 + "7")], None),
    "1TECHNO-050": ([ALGO1], None),
    "1TECHNO-120": ([ALGO1,
                     B("format", "Somme calculée par algorithme (accumulateur) ; la formule de la somme des termes d'une suite arithmétique ou géométrique est de Tle.",
                       P1 + "7 ; " + PT + "7", force="déduite")],
                    "Lecture déduite : la somme finie de termes n'apparaît en 1re qu'en situation algorithmique ; la « somme des n premiers termes » et la notation Σ sont des contenus de Tle techno (p.7)."),
    "1TECHNO-051": ([ALGO1], None),
    "1TECHNO-121": ([ALGO1], None),
    "1TECHNO-052": ([ALGO1,
                     B("autre", "Seuil cherché par algorithme ou tableur ; la résolution de qⁿ > b par le logarithme est de Tle.",
                       P1 + "7 ; " + PT + "8", force="déduite")],
                    "Lecture déduite : le logarithme décimal et l'inéquation aⁿ < b d'inconnue n entière n'arrivent qu'en Tle techno (p.8)."),
    "1TECHNO-122": ([ALGO1], None),
    "1TECHNO-123": ([B("format", "Aucune formule attendue (pas de −b/2a) : l'axe de symétrie se détermine par exemple en résolvant f(x) = c.", P1 + "8")], None),
    "1TECHNO-124": ([B("format", "Aucune formule attendue : sommet obtenu par la symétrie (axe trouvé par exemple en résolvant f(x) = c).", P1 + "8")], None),
    "1TECHNO-058": ([FORME_FACT], "Voir " + "l1t-4 (racines non entières)."),
    "1TECHNO-126": ([FORME_FACT], "Voir l1t-4 (racines non entières)."),
    "1TECHNO-143": ([], COMPETENCE + " Modéliser."),
    "1TECHNO-061": ([B("fonctions", "Formes x ↦ ax², x ↦ ax² + c, x ↦ a(x − x₁)(x − x₂) seulement.", P1 + "8",
                       detail={"liste": ["ax^2", "ax^2+c", "a(x-x_1)(x-x_2)"]})], None),
    "1TECHNO-062": ([B("format", "Aucune formule attendue ; l'axe de symétrie se détermine par exemple en résolvant f(x) = c.", P1 + "8")], None),
    "1TECHNO-063": ([], "Voir l1t-4 (racines non entières)."),
    "1TECHNO-064": ([B("operandes", "Cas simples, au moins une racine connue.", P1 + "8")], "Voir l1t-4 (racines non entières)."),
    "1TECHNO-065": ([FORME_FACT], "Voir l1t-4 (racines non entières)."),
    "1TECHNO-066": ([FORME_FACT], "Point référencé par les automatismes : voir l1t-3 (activité mentale) et l1t-4 (racines non entières)."),
    "1TECHNO-067": ([ALGO1, B("autre", "Valeur approchée par balayage.", P1 + "8")], None),
    "1TECHNO-069": ([B("autre", "Position limite des sécantes, visualisée au logiciel de géométrie dynamique ; pas de définition formelle de la limite.", P1 + "9")], None),
    "1TECHNO-070": ([B("format", "Limite : approche intuitive, sans définition formelle ; vocabulaire et notation introduits à cette occasion.", P1 + "9")],
                    "Voir l1t-7 (calcul algébrique du taux de variation)."),
    "1TECHNO-128": ([], "Voir l1t-7 (calcul algébrique du taux de variation)."),
    "1TECHNO-075": ([B("autre", "Une fonction monotone a une dérivée de signe constant (démontrable) ; la réciproque est admise.", P1 + "9")],
                    "Voir l1t-2 (dérivée de degré 2 sans racine évidente)."),
    "1TECHNO-079": ([B("fonctions", "f′(a) calculé pour un polynôme de degré ≤ 3, ou donné, ou lu graphiquement.", P1 + "8", force="déduite")],
                    "Lecture déduite : les seules fonctions que l'élève sait dériver en 1re techno sont les polynômes de degré ≤ 3 ; pour une autre courbe, le nombre dérivé ne peut être que donné ou lu."),
    "1TECHNO-080": ([B("fonctions", "Polynômes de degré ≤ 3 : dérivées de x², x³, somme et kf ; ni produit ni quotient.", P1 + "8")], None),
    "1TECHNO-081": ([DEG3], "Voir l1t-2 (dérivée de degré 2 sans racine évidente)."),
    "1TECHNO-133": ([DEG3], "Voir l1t-2 (dérivée de degré 2 sans racine évidente)."),
    "1TECHNO-083": ([B("autre", "Ajustements au jugé, droite de Mayer, moindres carrés ; aucune connaissance théorique attendue.", P1 + "9")], None),
    "1TECHNO-087": ([B("autre", "Ajustements au jugé, droite de Mayer, moindres carrés (droite y = ax + b minimisant Σ(yᵢ − (axᵢ + b))²) ; aucune connaissance théorique attendue.", P1 + "9")], None),
    "1TECHNO-088": ([B("autre", "Esprit critique sur la pertinence de l'ajustement et les limites de l'extrapolation.", P1 + "9")], None),
    "1TECHNO-089": ([B("faits", "Définition : pour P(A) ≠ 0, B est indépendant de A si P_A(B) = P(B) ; la symétrie est démontrée pour A et B de probabilités non nulles.", P1 + "9-10")],
                    "Voir l1t-5 (critère produit)."),
    "1TECHNO-091": ([], "Voir l1t-5 (critère produit)."),
    "1TECHNO-134": ([], "Voir l1t-5 (critère produit)."),
    "1TECHNO-090": ([], "Contradiction : le BO de 2de (p.13) dit que le calcul d'une probabilité connaissant ses probabilités conditionnelles relatives à une partition « n'est pas un attendu » ; le BO de 1re techno inscrit la formule (p.10) ; le BO de Tle techno dit qu'on l'« introduit » en Tle (p.9). Voir l1t-1."),
    "1TECHNO-092": ([B("operandes", "Cas simples.", P1 + "10")], "Voir l1t-1 (partition en deux ?)."),
    "1TECHNO-094": ([B("nombres", "n ⩽ 4 épreuves de Bernoulli identiques et indépendantes.", P1 + "10", detail={"max": 4})], None),
    "1TECHNO-135": ([B("nombres", "n ⩽ 4 épreuves, probabilités calculées sur l'arbre.", P1 + "10", detail={"max": 4})],
                    "Le BO a une seule puce : « Représenter par un arbre […] avec n ⩽ 4 afin de calculer des probabilités »."),
    "1TECHNO-095": ([B("autre", "Sans formalisme : issues numériques, en contexte.", P1 + "10")], None),
    "1TECHNO-097": ([B("faits", "Loi de Bernoulli à valeurs 0 et 1, de paramètre p.", P1 + "10")], None),
    "1TECHNO-098": ([B("format", "Écritures {X = a} et {X ⩽ a}.", P1 + "10")], "Voir l1t-6 ({X > a}, {X ⩾ a})."),
    "1TECHNO-137": ([B("format", "P(X = a) et P(X ⩽ a).", P1 + "10")], "Voir l1t-6 ({X > a}, {X ⩾ a})."),
    "1TECHNO-101": ([B("nombres", "N de l'ordre de plusieurs centaines.", P1 + "10")], None),
    "1TECHNO-102": ([B("autre", "Sans théorie de la décision ni test : situation fréquente ou rare dans le cadre du modèle.", P1 + "10")], None),
    "1TECHNO-103": ([ALGO1], None),
    "1TECHNO-104": ([ALGO1, B("nombres", "N de l'ordre de plusieurs centaines.", P1 + "10")], None),
    "1TECHNO-105": ([ALGO1, B("nombres", "k ∈ {1 ; 2 ; 3} ; s = écart type de la série des fréquences observées.", P1 + "10",
                               detail={"liste": [1, 2, 3]})],
                    "Dans l'extraction du BO (p.10), cette ligne suit les situations algorithmiques sans tiret ; elle en fait partie (mise en page)."),
}
for c in ["1TECHNO-%03d" % i for i in range(14, 32)] + ["1TECHNO-109", "1TECHNO-110", "1TECHNO-111", "1TECHNO-112",
                                                        "1TECHNO-113", "1TECHNO-114", "1TECHNO-115", "1TECHNO-116"]:
    b, r = PTS_1.get(c, ([], None))
    extra = "Voir l1t-8 (STD2A : « d'autres notions si la situation le nécessite »)."
    if r and extra not in r:
        r = r + " " + extra
    elif not r:
        r = extra
    PTS_1[c] = (b, r)

# ---------------------------------------------------------------- Tle techno
GEN_T = [
    B("fonctions",
      "Familles nouvelles : x ↦ aˣ et x ↦ k·aˣ (a > 0), logarithme décimal, fonction inverse (dérivée, variations, asymptotes) et combinaisons linéaires de la fonction inverse et de polynômes de degré ≤ 3.",
      PT + "8-9",
      detail={"liste": ["k·a^x (a>0)", "log", "1/x", "P(x) + k/x, deg P ≤ 3"]}),
    B("fonctions",
      "Pas de base e : ni exp ni ln ; seul le logarithme décimal, noté log, défini comme l'unique solution de 10ˣ = b (aucune autre fonction exponentielle ou logarithme n'est au programme de la voie techno).",
      PT + "7-8", force="déduite", detail={"exclus": ["exp", "e^x", "ln"]}),
    B("fonctions",
      "Dérivées : polynômes de degré ≤ 3 (1re) et fonction inverse seulement ; ni dérivée de aˣ ou de log, ni produit, ni quotient, ni composée (aucune n'est au programme).",
      PT + "8-9", force="déduite"),
    B("autre",
      "Ni primitive ni intégrale ; aucune limite hors du comportement de la fonction inverse aux bornes de son ensemble de définition (absentes du programme).",
      PT + "7-10", force="déduite"),
    B("autre", "Programmation : Python ou tableur.", PT + "5"),
    B("format",
      "Automatismes de Tle : nature des nombres plus complexe (entiers, fractions ou paramètres : x² − 9, x² − 4/9, 4x² − k²), enchaînement de plusieurs automatismes, changements de registre (signe de −2(x − 1)(x − 3) par l'image mentale de la courbe).",
      PT + "6"),
    B("autre",
      "Variables aléatoires discrètes finies : espérance seulement, ni variance ni écart type (absents du programme).",
      PT + "10", force="déduite"),
]

ALGOT = B("autre", "Langage Python ou tableur.", PT + "5")
GEOM_T = B("nombres", "Suites géométriques à termes positifs.", PT + "7")
TANG_CONIQUE = B("autre",
                 "Tangente définie comme position limite des sécantes ; aucune connaissance attendue sur les équations cartésiennes des tangentes à une conique (données dans les situations analytiques).",
                 PT + "5")
EXPO_SENS = B("fonctions", "a > 0 ; sens de variation selon les valeurs de a, en parallèle avec les suites géométriques.", PT + "8")
KAX = B("fonctions", "Forme x ↦ k·aˣ seulement (k réel, a > 0) ; sens selon le signe de k et les valeurs de a.", PT + "8")
PROP_EXP = B("faits", "Propriétés admises, par extension des propriétés des puissances entières.", PT + "8")
COMB_INV = B("fonctions", "Combinaisons linéaires de x ↦ 1/x et de polynômes de degré ≤ 3 seulement.", PT + "9")
CONTEXTE_INV = B("autre", "Contextes : prix unitaire, coût moyen.", PT + "9")
PARTITION = B("autre", "Partition de l'univers présentée sans formalisme ; formule mise en relation avec l'arbre.", PT + "10")
FRONTAL = B("figures", "Situations simples où un plan frontal est disponible.", PT + "6")

PTS_T = {
    "TTECHNO-002": ([TANG_CONIQUE], None),
    "TTECHNO-003": ([TANG_CONIQUE], None),
    "TTECHNO-012": ([FRONTAL], None),
    "TTECHNO-014": ([FRONTAL], None),
    "TTECHNO-072": ([FRONTAL], None),
    "TTECHNO-071": ([B("figures", "Parallélépipède rectangle, prisme, pyramide.", PT + "6",
                       detail={"liste": ["parallélépipède rectangle", "prisme", "pyramide"]})], None),
    "TTECHNO-015": ([B("autre", "Indice de base 100 : interpréter, calculer un indice, calculer le taux d'évolution entre deux valeurs.", PT + "7")],
                    "Contradiction : le BO dit que les automatismes propres à la Tle sont en italique (p.6) ; cette ligne n'est pas en italique (vérifié sur le rendu du PDF), alors que l'indice de base 100 n'apparaît ni au BO de 2de ni au BO de 1re techno. Sans effet sur une borne : le point est de Tle."),
    "TTECHNO-073": ([], "Même remarque que TTECHNO-015 (ligne non en italique)."),
    "TTECHNO-092": ([B("autre", "Exemples internes aux mathématiques ou issus des autres disciplines.", PT + "7")], None),
    "TTECHNO-074": ([B("format", "Notation Σ travaillée sur des exemples variés (sommes de carrés, de cubes, d'inverses…).", PT + "8")], None),
    "TTECHNO-018": ([B("nombres", "Deux nombres positifs.", PT + "7")], None),
    "TTECHNO-019": ([GEOM_T], "La 1re techno dit « à termes strictement positifs » (p.7), la Tle « à termes positifs » (p.7) : écart de mot sans effet pratique (un terme nul rend la suite nulle)."),
    "TTECHNO-021": ([GEOM_T], None),
    "TTECHNO-023": ([GEOM_T], None),
    "TTECHNO-025": ([GEOM_T], None),
    "TTECHNO-027": ([GEOM_T], None),
    "TTECHNO-029": ([GEOM_T, B("autre", "Exemple type : valeur acquise par des placements à intérêts composés à taux constant avec versements réguliers.", PT + "8")], None),
    "TTECHNO-030": ([B("autre", "Langage Python.", PT + "8")], None),
    "TTECHNO-075": ([B("autre", "Langage Python.", PT + "8")], None),
    "TTECHNO-076": ([B("autre", "Langage Python.", PT + "8")], None),
    "TTECHNO-031": ([B("nombres", "a > 0.", PT + "8")], None),
    "TTECHNO-032": ([EXPO_SENS], None),
    "TTECHNO-033": ([EXPO_SENS], None),
    "TTECHNO-034": ([PROP_EXP], None),
    "TTECHNO-078": ([PROP_EXP], None),
    "TTECHNO-079": ([PROP_EXP, B("nombres", "n entier relatif.", PT + "8")], None),
    "TTECHNO-037": ([PROP_EXP], None),
    "TTECHNO-081": ([PROP_EXP], None),
    "TTECHNO-036": ([KAX], None),
    "TTECHNO-080": ([KAX], None),
    "TTECHNO-038": ([B("autre", "Par l'exposant 1/n ; contextes : taux mensuel équivalent à un taux annuel, évolution moyenne d'une population sur une période.", PT + "8")], None),
    "TTECHNO-039": ([ALGOT], None),
    "TTECHNO-040": ([B("fonctions", "Logarithme décimal seulement, b > 0, notation log.", PT + "8")], None),
    "TTECHNO-082": ([B("nombres", "n entier naturel (le BO montre aussi la propriété « pour de petites valeurs de n » à partir du logarithme d'un produit).", PT + "8-9")],
                    "Voir ltt-1 (log(aˣ) = x·log(a) pour x réel)."),
    "TTECHNO-043": ([B("format", "Équations du type aˣ = b ou xᵃ = b, d'inconnue x réelle.", PT + "8")], "Voir ltt-1 (log(aˣ) = x·log(a) pour x réel)."),
    "TTECHNO-084": ([B("format", "Inéquations du type aˣ < b ou xᵃ < b, d'inconnue x réelle.", PT + "8")], "Voir ltt-1 (log(aˣ) = x·log(a) pour x réel)."),
    "TTECHNO-085": ([B("nombres", "Inconnue n entière naturelle (ex. nombre d'annuités).", PT + "8-9")], "Voir ltt-1."),
    "TTECHNO-044": ([], "Voir ltt-1 (log(aˣ) = x·log(a) pour x réel)."),
    "TTECHNO-045": ([B("format", "Approche intuitive, en lien avec l'ordre de grandeur des inverses de petits ou de grands nombres et l'allure de la courbe.", PT + "9")],
                    "Voir ltt-6 (notation lim)."),
    "TTECHNO-046": ([B("autre", "Dérivée de x ↦ 1/x obtenue en réinvestissant la définition du nombre dérivé (taux de variation).", PT + "9")], None),
    "TTECHNO-086": ([B("autre", "Aucune définition de l'asymptote : approche intuitive.", PT + "9")], "Voir ltt-6 (notation lim)."),
    "TTECHNO-049": ([COMB_INV, CONTEXTE_INV], "Voir ltt-4 (forme quotient, ex. coût moyen (x² + 2x + 100)/x)."),
    "TTECHNO-087": ([COMB_INV], "Voir ltt-4 (forme quotient)."),
    "TTECHNO-051": ([B("autre", "Ajustements au jugé, droite de Mayer, moindres carrés ; aucune connaissance théorique attendue.", PT + "9")], None),
    "TTECHNO-052": ([B("autre", "Changement de variable donné (ex. u², 1/t, 1/√n, log(y)).", PT + "9")], None),
    "TTECHNO-053": ([ALGOT], None),
    "TTECHNO-054": ([ALGOT, B("operandes", "Ensemble fini de couples (proposés par les élèves, balayage, tirage aléatoire).", PT + "10")],
                    "Le libellé dit « cette expression » : il renvoie à la somme Σᵢ(yᵢ − (axᵢ + b))² de TTECHNO-053."),
    "TTECHNO-055": ([PARTITION], "Voir ltt-5 (partition en plus de trois évènements) et l1t-1."),
    "TTECHNO-056": ([PARTITION], "Voir ltt-5 (partition en plus de trois évènements) et l1t-1."),
    "TTECHNO-058": ([B("faits", "Valeur de l'espérance admise.", PT + "10")], None),
    "TTECHNO-059": ([B("autre", "Coefficient défini comme le nombre de chemins réalisant {X = k} dans l'arbre ; formule de Pascal établie par un raisonnement sur les chemins.", PT + "10"),
                     B("format", "Pas d'expression par factorielles (absente du programme).", PT + "10", force="déduite")],
                    "Lecture déduite : le BO définit le coefficient par les chemins et le calcule au triangle de Pascal ; aucune factorielle n'apparaît."),
    "TTECHNO-061": ([B("nombres", "n ⩽ 10.", PT + "10", detail={"max": 10})], "Voir ltt-3 (n > 10)."),
    "TTECHNO-063": ([B("nombres", "Arbre dessiné pour n ⩽ 4 ; au-delà, l'arbre sert d'image mentale.", PT + "10", detail={"max": 4})], None),
    "TTECHNO-064": ([B("format", "Évènements {X = 0}, {X = 1}, {X = n}, {X = n − 1} et ceux qui s'en déduisent par réunion.", PT + "10")],
                    "Voir ltt-2 (évènement contraire, P(X ⩽ k) quelconque)."),
    "TTECHNO-065": ([B("nombres", "Nombre de chemins donné ou déterminé au triangle de Pascal.", PT + "10")], "Voir ltt-3 (n > 10)."),
    "TTECHNO-066": ([ALGOT], None),
    "TTECHNO-067": ([ALGOT], None),
    "TTECHNO-090": ([ALGOT], None),
    "TTECHNO-068": ([ALGOT], None),
    "TTECHNO-069": ([ALGOT], None),
    "TTECHNO-091": ([ALGOT], None),
}

# ---------------------------------------------------------------- questions
QUESTIONS = [
    {
        "id": "l1t-1", "niveaux": ["1_TECHNO", "T_TECHNO"],
        "points": ["1TECHNO-090", "1TECHNO-092", "TTECHNO-055", "TTECHNO-056"],
        "titre": "Probabilités totales : quelle partition en 1re techno ?",
        "question": "Le BO de 1re techno met la formule des probabilités totales « dans les cas simples » ; le BO de Tle techno dit qu'on l'« introduit » en Tle, pour une partition de l'univers. Une question de 1re techno « Une usine a trois machines A, B, C (50 %, 30 %, 20 % de la production) ; taux de défaut 2 %, 3 %, 5 % ; probabilité qu'une pièce soit défectueuse ? » est-elle dans 1TECHNO-092 ?",
        "sources": "BO 2de p.13 : le calcul d'une probabilité connaissant ses probabilités conditionnelles relatives à une partition « n'est pas un attendu ». BO 1re techno p.10 : contenu « Formule des probabilités totales », capacité « Dans les cas simples, calculer une probabilité à l'aide de la formule des probabilités totales ». BO Tle techno p.9 : « on introduit : la formule des probabilités totales » ; p.10 : « pour une partition de l'univers », démontrée pour une partition en deux ou trois évènements.",
        "options": [["deux", "1re : partition {A, Ā} seulement (arbre à deux niveaux) ; trois évènements et plus en Tle"],
                    ["libre", "1re : toute partition finie, les « cas simples » ne limitant que la complexité de l'arbre"]],
        "reco": "deux",
        "pourquoi": "Les trois textes se lisent ensemble si la 1re se limite au cas le plus simple (A et son contraire) et que la Tle généralise à une partition, avec démonstration en deux ou trois évènements.",
        "consequence": "Avec « deux », l'exemple des trois machines est refusé en 1TECHNO-092 et rattaché à TTECHNO-056 ; un modèle « P(B) = P(A)·P_A(B) + P(Ā)·P_Ā(B) » reste en 1re.",
    },
    {
        "id": "l1t-2", "niveaux": ["1_TECHNO"],
        "points": ["1TECHNO-081", "1TECHNO-133", "1TECHNO-075"],
        "titre": "Variations d'un polynôme de degré 3 sans discriminant",
        "question": "Le discriminant n'est pas au programme. Pour f(x) = x³ − 3x² − 2x + 1, la dérivée 3x² − 6x − 2 n'a pas de racine évidente. Un modèle « Dresser le tableau de variations de f » est-il dans 1TECHNO-081 ?",
        "sources": "BO 1re techno p.8 : « le calcul des racines à l'aide du discriminant ne figure pas au programme » ; « on privilégie les situations où les racines sont évidentes ainsi que les interprétations graphiques. En cas de besoin, la résolution d'une équation du second degré peut se faire à l'aide d'un solveur » ; capacité « Déterminer le sens de variation et les extrémums d'une fonction polynôme de degré inférieur ou égal à 3 ».",
        "options": [["evidentes", "Dérivée factorisable sans discriminant : forme factorisée, racine évidente, ou racines données dans l'énoncé"],
                    ["solveur", "Toute dérivée : racines obtenues au solveur, valeurs approchées acceptées"]],
        "reco": "evidentes",
        "pourquoi": "Le BO privilégie les racines évidentes et ne cite le solveur qu'« en cas de besoin » ; un modèle généré peut toujours choisir des racines entières pour la dérivée, ou les donner.",
        "consequence": "Avec « evidentes », le modèle cité est refusé tel quel ; il devient acceptable si l'énoncé donne les racines de f′ ou si les coefficients sont tirés pour que f′ ait des racines entières (f(x) = x³ − 3x + 1, f′ = 3(x − 1)(x + 1)).",
    },
    {
        "id": "l1t-3", "niveaux": ["1_TECHNO", "T_TECHNO"],
        "points": ["1TECHNO-139", "1TECHNO-140", "1TECHNO-141", "1TECHNO-066", "TTECHNO-015", "TTECHNO-073", "TTECHNO-092"],
        "titre": "Automatismes : « privilégiant l'activité mentale » est-il une borne ?",
        "question": "Les automatismes « relèvent d'un entrainement régulier privilégiant l'activité mentale ». Un modèle rattaché à un point d'automatisme (ex. 1TECHNO-141, coefficient directeur entre A(1,37 ; −2,84) et B(5,12 ; 3,09)) qui exige la calculatrice est-il dans le point ?",
        "sources": "BO 1re techno p.6 et BO Tle techno p.6 : « Elles relèvent d'un entrainement régulier privilégiant l'activité mentale. […] Les modalités de mise en œuvre peuvent être variées ».",
        "options": [["mental", "Borne : nombres et calculs faisables de tête ; un modèle à calculatrice va dans le point thématique jumeau"],
                    ["modalite", "Modalité d'enseignement, pas une borne : le grain du savoir fixe seul l'inclusion"]],
        "reco": "modalite",
        "pourquoi": "« Privilégier » dit une préférence, pas une exclusion, et la phrase suivante ouvre les modalités ; la borne « seulement » doit reposer sur ce que le savoir contient.",
        "consequence": "Avec « modalite », le modèle à coordonnées décimales est accepté en 1TECHNO-141 ; avec « mental », il est refusé et ces points n'acceptent que des valeurs entières ou simples.",
    },
    {
        "id": "l1t-4", "niveaux": ["1_TECHNO"],
        "points": ["1TECHNO-058", "1TECHNO-063", "1TECHNO-064", "1TECHNO-065", "1TECHNO-066", "1TECHNO-126"],
        "titre": "Racines et coefficients non entiers du second degré en 1re techno",
        "question": "La Tle techno annonce pour ses automatismes « une complexification des variables didactiques comme la nature des nombres utilisés (entiers, fractions ou paramètres) dans la factorisation de x² − 9, x² − 4/9, 4x² − k² ». En 1re, un modèle « Étudier le signe de (2x − 1)(3x + 4) » (racines 1/2 et −4/3) ou « Factoriser 2x² − 3x + 1 sachant que 1 est racine » est-il dans les points ?",
        "sources": "BO Tle techno p.6 (ci-dessus). BO 1re techno p.8 : « on privilégie les situations où les racines sont évidentes » ; « Savoir factoriser, dans des cas simples, une expression du second degré connaissant au moins une de ses racines ».",
        "options": [["entiers", "1re : racines et coefficients entiers ; fractions et paramètres réservés à la Tle"],
                    ["simples", "1re : racines entières ou fractions simples (1/2, −4/3) ; paramètres littéraux exclus"],
                    ["libre", "Aucune borne sur la nature des nombres en 1re"]],
        "reco": "simples",
        "pourquoi": "La phrase de Tle porte sur les automatismes (activité mentale) et vise surtout les paramètres ; en 1re, une racine comme 1/2 de 2x − 1 reste « évidente » et la forme factorisée la donne directement.",
        "consequence": "Avec « simples », (2x − 1)(3x + 4) est accepté et (x − k)(x + 2) avec k littéral refusé ; avec « entiers », tout modèle à racine fractionnaire est refusé en 1re.",
    },
    {
        "id": "l1t-5", "niveaux": ["1_TECHNO"],
        "points": ["1TECHNO-089", "1TECHNO-091", "1TECHNO-134"],
        "titre": "Indépendance : le critère produit est-il permis ?",
        "question": "Le BO définit l'indépendance par P_A(B) = P(B) et n'écrit pas P(A ∩ B) = P(A) × P(B). Un modèle « P(A) = 0,4, P(B) = 0,5, P(A ∩ B) = 0,2 : A et B sont-ils indépendants ? » (réponse par le produit) est-il dans 1TECHNO-134 ?",
        "sources": "BO 1re techno p.9-10 : « deux évènements A et B sont dits indépendants si la probabilité conditionnelle de A sachant B est égale à la probabilité de A » ; « pour un évènement A de probabilité non nulle, B est indépendant de A si P_A(B) = P(B) ». BO 2de p.13 : multiplication des probabilités le long d'un chemin.",
        "options": [["produit-admis", "Critère produit admis (conséquence directe de P(A ∩ B) = P(A)·P_A(B), vu en 2de)"],
                    ["definition-seule", "Seulement la comparaison de P_A(B) (ou P_B(A)) avec P(B) (ou P(A))"]],
        "reco": "produit-admis",
        "pourquoi": "Avec P(A ∩ B) = P(A)·P_A(B) (2de), l'égalité P_A(B) = P(B) équivaut au produit ; le modèle cité se résout aussi par la définition (P_A(B) = 0,2/0,4 = 0,5).",
        "consequence": "Avec « produit-admis », le modèle est accepté et la correction peut utiliser le produit ; avec « definition-seule », la correction doit passer par P_A(B) et un modèle qui ne demande que de vérifier P(A ∩ B) = P(A)P(B) est refusé.",
    },
    {
        "id": "l1t-6", "niveaux": ["1_TECHNO"],
        "points": ["1TECHNO-098", "1TECHNO-137"],
        "titre": "Variable aléatoire : {X > a}, {X ⩾ a} en 1re techno ?",
        "question": "Le BO cite les écritures {X = a}, {X ⩽ a} et les probabilités P(X = a), P(X ⩽ a). Un modèle « Calculer P(X ⩾ 2) » ou « P(X > 1) » est-il dans 1TECHNO-137 ?",
        "sources": "BO 1re techno p.10 : « Interpréter en situation les écritures {X = a}, {X ⩽ a} où X désigne une variable aléatoire et calculer les probabilités correspondantes P(X = a), P(X ⩽ a) ». BO 2de p.6 : probabilité de l'évènement contraire (automatisme).",
        "options": [["complement", "Admis : {X > a} est le contraire de {X ⩽ a}, et {X ⩾ a}, {X < a} s'y ramènent ; seules les écritures d'intervalle {a ⩽ X ⩽ b} restent hors point"],
                    ["deux-ecritures", "Seulement {X = a} et {X ⩽ a}"]],
        "reco": "complement",
        "pourquoi": "L'évènement contraire est un automatisme de 2de ; sur une loi donnée par un tableau, P(X ⩾ 2) est une somme de P(X = a) au même titre que P(X ⩽ a).",
        "consequence": "Avec « complement », P(X ⩾ 2) est accepté en 1TECHNO-137 ; avec « deux-ecritures », il est refusé et le modèle doit écrire P(X ⩽ 1).",
    },
    {
        "id": "l1t-7", "niveaux": ["1_TECHNO"],
        "points": ["1TECHNO-070", "1TECHNO-128"],
        "titre": "Nombre dérivé : calcul algébrique de la limite du taux de variation ?",
        "question": "Le titre du BO est « approche graphique de la notion de nombre dérivé » et la limite reste intuitive. Un modèle « f(x) = x² ; simplifier (f(3 + h) − f(3))/h puis en déduire f′(3) » est-il dans 1TECHNO-070 ?",
        "sources": "BO 1re techno p.8 : « Point de vue local : approche graphique de la notion de nombre dérivé » ; « Nombre dérivé en un point défini comme limite du taux de variation en ce point ». BO 1re techno p.9 : « ne pas donner la définition formelle de la notion de limite et s'en tenir à une approche intuitive à partir d'exemples. Le vocabulaire et la notation correspondants sont introduits ». BO Tle techno p.9 : « Le calcul de la dérivée de la fonction x ↦ 1/x permet de réinvestir la définition du nombre dérivé à partir du calcul du taux de variation ».",
        "options": [["algebrique", "Admis sur des polynômes simples : taux de variation simplifié, puis h → 0 de façon intuitive"],
                    ["graphique", "Seulement graphique ou numérique (sécantes, tableau de taux pour h petit) ; aucun calcul algébrique de limite"]],
        "reco": "algebrique",
        "pourquoi": "Le BO de Tle parle de « réinvestir » ce calcul en Tle, ce qui suppose qu'il a été fait en 1re ; la limite reste intuitive, sans définition formelle.",
        "consequence": "Avec « algebrique », le modèle cité est accepté (taux 6 + h, limite 6) ; avec « graphique », il est refusé et seuls les modèles de lecture ou d'estimation numérique restent.",
    },
    {
        "id": "l1t-8", "niveaux": ["1_TECHNO"],
        "points": ["1TECHNO-014 à 1TECHNO-031, 1TECHNO-109 à 1TECHNO-116 (Activités géométriques, STD2A)"],
        "titre": "STD2A : « d'autres notions si la situation le nécessite »",
        "question": "Le BO de la partie STD2A permet d'« aborder d'autres notions si la situation étudiée le nécessite ». Un modèle de pavage qui demande de reconnaître une homothétie ou de classer une frise parmi les sept types est-il dans un point STD2A ?",
        "sources": "BO 1re techno p.5 : « Les professeurs peuvent aborder d'autres notions si la situation étudiée le nécessite » ; « La classification des types de frises ou de pavages n'est pas un attendu du programme ».",
        "options": [["strict", "Inclusion stricte : seules les notions listées ; une autre notion relève de son propre point (ou d'aucun)"],
                    ["ouvert", "La phrase ouvre les bornes des points STD2A à toute notion requise par la situation"]],
        "reco": "strict",
        "pourquoi": "La phrase autorise le professeur, elle ne crée pas d'attendu ; la classification est exclue en toutes lettres.",
        "consequence": "Avec « strict », les deux modèles cités sont refusés ; un modèle d'angle au centre d'un polygone régulier (360°/n) reste accepté en 1TECHNO-111.",
    },
    {
        "id": "ltt-1", "niveaux": ["T_TECHNO"],
        "points": ["TTECHNO-043", "TTECHNO-084", "TTECHNO-082", "TTECHNO-044"],
        "titre": "log(aˣ) = x·log(a) pour x réel ?",
        "question": "La propriété est donnée « pour n entier naturel » ; or résoudre aˣ = b d'inconnue x réelle demande log(aˣ) = x·log(a) pour x réel. Un modèle « Écrire log(5^{0,5}) en fonction de log 5 » ou « Résoudre 1,03ˣ = 2 » est-il dans les points ?",
        "sources": "BO Tle techno p.8 : « log(aⁿ) = n log(a) […] pour n entier naturel, a et b réels strictement positifs » ; « Utiliser le logarithme décimal pour résoudre une équation du type aˣ = b ou xᵃ = b d'inconnue x réelle ». BO Tle techno p.9 : « pour de petites valeurs de n, log(aⁿ) = n log(a) ».",
        "options": [["reel-dans-resolution", "x réel admis dans les résolutions (aˣ = b, aˣ < b, xᵃ = b) ; les transformations pures (TTECHNO-082, 044) restent à n entier naturel"],
                    ["reel-partout", "log(aˣ) = x·log(a) admis pour tout x réel, transformations comprises"],
                    ["naturel-seul", "Jamais pour x non entier : les résolutions se limitent à ce que le BO permet de justifier"]],
        "reco": "reel-dans-resolution",
        "pourquoi": "La capacité de résolution n'a pas de sens sans la propriété pour x réel ; mais le BO n'énonce la propriété algébrique qu'en entier naturel, ce qui borne les exercices de transformation.",
        "consequence": "Avec la reco, « Résoudre 1,03ˣ = 2 » est accepté en TTECHNO-043 et « log(5^{0,5}) » refusé en TTECHNO-082 ; avec « naturel-seul », même 1,03ˣ = 2 serait refusé, ce qui viderait la capacité.",
    },
    {
        "id": "ltt-2", "niveaux": ["T_TECHNO"],
        "points": ["TTECHNO-064"],
        "titre": "Loi binomiale : contraire et P(X ⩽ k) quelconque",
        "question": "Le BO limite aux évènements {X = 0}, {X = 1}, {X = n}, {X = n − 1} « et ceux qui s'en déduisent par réunion ». Un modèle « X ~ B(20 ; 0,1), calculer P(X ⩾ 2) » (= 1 − P(X = 0) − P(X = 1)) ou « P(X ⩽ 5) » à la calculatrice est-il dans TTECHNO-064 ?",
        "sources": "BO Tle techno p.10 : « calculer les probabilités des évènements {X = 0}, {X = 1}, {X = n}, {X = n − 1} et de ceux qui s'en déduisent par réunion ». BO 2de p.6 : probabilité de l'évènement contraire (automatisme).",
        "options": [["reunion-contraire", "Réunions de ces évènements et leurs contraires (P(X ⩾ 2), P(X ⩽ n − 2)) ; pas de P(X ⩽ k) général à la calculatrice"],
                    ["reunion-stricte", "Seulement les réunions (P(X ⩽ 1), P(X ⩾ n − 1))"],
                    ["calculatrice", "Tout P(X ⩽ k), la calculatrice faisant le calcul"]],
        "reco": "reunion-contraire",
        "pourquoi": "Le contraire est un automatisme acquis ; P(X ⩾ 1) = 1 − P(X = 0) est l'usage le plus courant. Le BO ne parle jamais de calcul de probabilité cumulée à la calculatrice.",
        "consequence": "Avec la reco, P(X ⩾ 2) est accepté et P(X ⩽ 5) pour n = 20 refusé ; avec « calculatrice », les deux sont acceptés.",
    },
    {
        "id": "ltt-3", "niveaux": ["T_TECHNO"],
        "points": ["TTECHNO-061", "TTECHNO-065"],
        "titre": "Coefficients binomiaux au-delà de n = 10",
        "question": "La capacité dit « à l'aide du triangle de Pascal pour n ⩽ 10 », le commentaire dit que pour n plus grand le nombre de chemins « est donné ou déterminé à l'aide du triangle de Pascal ». Un modèle « X ~ B(12 ; 0,3), calculer P(X = 3) » sans donner le coefficient est-il dans TTECHNO-065 ?",
        "sources": "BO Tle techno p.10 : capacité « Calculer des coefficients binomiaux à l'aide du triangle de Pascal pour n ⩽ 10 » ; commentaire « Pour des valeurs de n plus grandes, l'arbre sert d'image mentale et le nombre de chemins associés à l'évènement est donné ou déterminé à l'aide du triangle de Pascal ».",
        "options": [["dix", "L'élève calcule un coefficient seulement si n ⩽ 10 ; au-delà, l'énoncé le donne"],
                    ["pascal", "Au-delà de 10 aussi, coefficient au triangle de Pascal (ou fourni)"],
                    ["calculatrice", "Coefficient obtenu à la calculatrice pour tout n"]],
        "reco": "dix",
        "pourquoi": "La capacité fixe la borne n ⩽ 10 ; le commentaire décrit le cas de l'arbre (n > 4), et le triangle de Pascal au-delà de 10 lignes n'est pas une tâche raisonnable. La calculatrice n'est pas citée.",
        "consequence": "Avec « dix », le modèle cité est refusé sauf si l'énoncé donne (12 choose 3) = 220.",
    },
    {
        "id": "ltt-4", "niveaux": ["T_TECHNO"],
        "points": ["TTECHNO-049", "TTECHNO-087"],
        "titre": "Combinaisons linéaires avec l'inverse : forme quotient admise ?",
        "question": "Le BO dit « combinaisons linéaires de la fonction inverse et de fonctions polynomiales de degré au maximum 3 », et cite le coût moyen. Un modèle « Coût moyen C_M(x) = (x² + 2x + 100)/x, étudier ses variations » (égal à x + 2 + 100/x) est-il dans TTECHNO-049 ?",
        "sources": "BO Tle techno p.9 : capacité citée ; commentaire « La fonction inverse permet d'aborder des situations contextualisées de prix unitaire ou de cout moyen ».",
        "options": [["equivalente", "Toute expression égale à P(x) + k/x (deg P ⩽ 3), y compris (P(x))/x ; pas de 1/(x − a) ni de quotient général"],
                    ["forme-somme", "Seulement les expressions écrites sous la forme P(x) + k/x"]],
        "reco": "equivalente",
        "pourquoi": "Le coût moyen, cité par le BO, s'écrit naturellement C(x)/x ; la fonction reste une combinaison linéaire, seule l'écriture change.",
        "consequence": "Avec « equivalente », le modèle du coût moyen est accepté, f(x) = 1/(x − 2) ou (x + 1)/(x − 3) refusés ; avec « forme-somme », le modèle doit donner x + 2 + 100/x.",
    },
    {
        "id": "ltt-5", "niveaux": ["T_TECHNO"],
        "points": ["TTECHNO-055", "TTECHNO-056"],
        "titre": "Probabilités totales en Tle : partition en plus de trois évènements ?",
        "question": "La formule est « démontrée dans le cas d'une partition de l'univers en deux ou trois évènements ». Un modèle à quatre fournisseurs (partition en quatre) est-il dans TTECHNO-056 ?",
        "sources": "BO Tle techno p.10 : « Formule des probabilités totales pour une partition de l'univers » ; « Elle est démontrée dans le cas d'une partition de l'univers en deux ou trois évènements, la notion de partition d'un ensemble étant présentée sans formalisme ».",
        "options": [["finie", "Toute partition finie (la limite à deux ou trois porte sur la démonstration)"],
                    ["deux-trois", "Partition en deux ou trois évènements seulement"]],
        "reco": "finie",
        "pourquoi": "Le contenu dit « pour une partition de l'univers » sans limite ; la restriction est écrite pour la démonstration.",
        "consequence": "Avec « finie », le modèle à quatre fournisseurs est accepté ; avec « deux-trois », il est refusé.",
    },
    {
        "id": "ltt-6", "niveaux": ["T_TECHNO"],
        "points": ["TTECHNO-045", "TTECHNO-086"],
        "titre": "Fonction inverse aux bornes : notation lim ?",
        "question": "Le comportement aux bornes et les asymptotes restent intuitifs. Un modèle « Compléter : lim_{x→+∞} 1/x = … » ou « Donner lim_{x→0⁺} (3 + 2/x) » est-il dans TTECHNO-045 ?",
        "sources": "BO Tle techno p.9 : « Comportement de la fonction inverse aux bornes de son ensemble de définition », mis en lien avec « l'ordre de grandeur d'inverses de petits ou grands nombres » et « l'allure de la courbe » ; « Aucune définition de l'asymptote n'est attendue ; on s'en tient à une approche intuitive ». BO 1re techno p.9 : vocabulaire et notation de la limite introduits avec le nombre dérivé.",
        "options": [["notation", "Notation lim admise pour 1/x et ses combinaisons simples (k/x, a + k/x), sans opérations générales sur les limites"],
                    ["mots", "En mots ou sur la courbe seulement (« 1/x devient très grand ») ; pas de notation lim"]],
        "reco": "notation",
        "pourquoi": "La notation a été introduite en 1re ; le BO borne la notion (approche intuitive), pas l'écriture. Les opérations sur les limites ne sont nulle part au programme.",
        "consequence": "Avec « notation », les deux exemples sont acceptés, mais lim (x³ − 2x)/(x² + 1) en +∞ reste refusée ; avec « mots », seules les questions de lecture de courbe ou d'ordre de grandeur restent.",
    },
]
for q in QUESTIONS:
    q["cycle"] = "lycée"
    q["info"] = False

ORDER = ["id", "cycle", "niveaux", "points", "titre", "question", "sources", "options", "reco", "pourquoi", "consequence", "info"]
QUESTIONS = [{k: q[k] for k in ORDER} for q in QUESTIONS]


# ---------------------------------------------------------------- génération
def load(grade):
    rows = [r for r in csv.DictReader(open(ROOT + "/docs/wip/passe-lycee/bornes/points-lycee.csv")) if r["grade"] == grade]
    return rows


def build(grade, general, pts):
    rows = load(grade)
    codes = {r["code"] for r in rows}
    unknown = set(pts) - codes
    assert not unknown, unknown
    out = {}
    for r in rows:
        bornes, rem = pts.get(r["code"], ([], None))
        for b in bornes:
            if b["force"] == "déduite":
                assert rem and ("déduite" in rem.lower() or "Lecture" in rem), r["code"]
        p = {"libelle": r["libelle"], "rubrique": r["rubrique"], "bornes": bornes}
        if rem:
            p["remarque"] = rem
        out[r["code"]] = p
    return {grade: {"general": general, "points": out}}, rows


def fmt_b(b):
    f = {"BO": "BO", "déduite": "déduite"}[b["force"]]
    return f"{b['borne']} — _{b['source']}_ ({f})"


def md(grade, data, rows, titre, intro, utile, contradictions):
    g = data[grade]
    pts = g["points"]
    n = len(pts)
    avec = sum(1 for p in pts.values() if p["bornes"])
    L = [f"# Bornes des points de {titre}", "", intro.format(n=n), "",
         "## Sources et façon de citer", "",
         "| Abréviation | Document | Page citée |",
         "| --- | --- | --- |",
         "| **BO 1re techno** | Programme de mathématiques de la classe de première de la voie technologique (BO n° 14 du 2026-04-02, `docs/ref/programmes/`, extrait dans `bo/1techno.txt`) | page du PDF |",
         "| **BO Tle techno** | Programme de mathématiques de la classe terminale de la voie technologique (même BO, `bo/ttechno.txt`) | page du PDF |",
         "| **BO 2de** | Programme de seconde générale et technologique (`bo/2de.txt`), pour ce qui est hérité | page du PDF |",
         "",
         "Aucun document d'accompagnement n'est disponible pour ces programmes : aucun n'est cité.",
         "",
         "**Force** : `BO` = écrit dans le programme ; `déduite` = ma lecture d'un texte implicite, le plus souvent une **absence** (ce que la liste des contenus ne contient pas), toujours expliquée dans la remarque ⚠ du point ou dans le texte de la borne générale.",
         "",
         "## Ce qui est le plus utile pour la vérification « seulement »", ""]
    L += [f"- {u}" for u in utile]
    L += ["", "## Contradictions et tensions entre passages", ""]
    L += [f"{i}. {c}" for i, c in enumerate(contradictions, 1)]
    L += ["", "## Questions ouvertes", "",
          "Les incertitudes sont dans `questions-techno.json` (sans décision) :", ""]
    for q in QUESTIONS:
        if grade in q["niveaux"]:
            L.append(f"- **{q['id']}** — {q['titre']} (reco : `{q['reco']}`).")
    L += ["", f"## {titre[0].upper() + titre[1:]} ({n} points, {avec} avec une borne propre)", "",
          "### Bornes générales (héritées par tous les points du niveau)", ""]
    L += [f"- {fmt_b(b)}" for b in g["general"]]
    rub = None
    for r in rows:
        p = pts[r["code"]]
        if r["rubrique"] != rub:
            rub = r["rubrique"]
            L += ["", f"### {rub}", ""]
        lib = p["libelle"]
        if not p["bornes"]:
            tail = "_point-compétence, aucune borne_" if p.get("remarque", "").startswith("Point-compétence") else "_hérite des bornes générales_"
            L.append(f"- **{r['code']}** — {lib} — {tail}")
        else:
            L.append(f"- **{r['code']}** — {lib}")
            L += [f"  - {fmt_b(b)}" for b in p["bornes"]]
        if p.get("remarque"):
            L.append(f"  - ⚠ {p['remarque']}")
    return "\n".join(L) + "\n"


UTILE_1 = [
    "**Fonctions** : seules familles nouvelles, les polynômes de degré 2 et 3 ; **ni exponentielle, ni logarithme, ni trigonométrie** (la voie générale les a dès la 1re).",
    "**Second degré** : **pas de discriminant**, ni formule −b/2a ; racines lues sur une **forme factorisée** ou évidentes ; parabole associée seulement aux formes ax², ax² + c, a(x − x₁)(x − x₂).",
    "**Dérivation** : polynômes de degré ≤ 3 seulement (x², x³, somme, kf) ; **ni produit, ni quotient, ni composée, ni 1/x, ni √x** ; limite intuitive.",
    "**Suites** : géométriques **à termes strictement positifs** ; notation u(n) avant uₙ ; **pas de formule de somme** (Tle) ni de logarithme pour un seuil (algorithme ou tableur).",
    "**Probabilités** : répétition de Bernoulli **n ⩽ 4** ; variable aléatoire **sans formalisme**, espérance seulement (pas de variance) ; probabilités totales « dans les cas simples ».",
    "**Statistiques à deux variables** : ajustement affine (jugé, Mayer, moindres carrés), **aucune connaissance théorique** (pas de formule de covariance attendue).",
    "**Séries** : algorithmique pour toutes sauf STD2A ; géométrie (frises, pavages, perspective cavalière, sections) pour STD2A seulement.",
]
CONTRA_1 = [
    "**Probabilités totales** : non attendues en 2de (BO 2de p.13), au programme de 1re techno « dans les cas simples » (p.10), « introduites » en Tle techno (BO Tle techno p.9). → l1t-1.",
    "**Variations d'un polynôme de degré 3** : capacité au programme (p.8) alors que le discriminant est exclu (p.8) ; le solveur n'est cité qu'« en cas de besoin ». → l1t-2.",
    "**STD2A** : « Les professeurs peuvent aborder d'autres notions si la situation étudiée le nécessite » (p.5), en tension avec l'inclusion stricte. → l1t-8.",
    "**Approche graphique du nombre dérivé** (p.8) et, en Tle (p.9), « réinvestir la définition du nombre dérivé à partir du calcul du taux de variation » : le calcul algébrique en 1re n'est pas écrit mais supposé. → l1t-7.",
]
UTILE_T = [
    "**Pas de base e** : ni exp ni ln ; les exponentielles sont x ↦ aˣ et k·aˣ (a > 0), le seul logarithme est **log décimal**.",
    "**Dérivées** : polynômes de degré ≤ 3 et fonction inverse seulement ; **ni dérivée de aˣ ou de log, ni produit, ni quotient** ; fonctions étudiées = combinaisons linéaires de 1/x et d'un polynôme de degré ≤ 3.",
    "**Ni primitive ni intégrale** ; aucune limite hors du comportement de 1/x aux bornes ; asymptote sans définition.",
    "**Logarithme** : équations et inéquations aˣ = b, xᵃ = b, aⁿ < b seulement ; propriétés log(ab), log(a/b), log(aⁿ) pour n entier naturel.",
    "**Suites** : sommes des n premiers termes (arithmétique, géométrique à termes positifs), notation Σ ; moyennes arithmétique et géométrique de deux nombres.",
    "**Loi binomiale** : coefficients par le triangle de Pascal (**n ⩽ 10**), pas de factorielle ; arbre dessiné pour n ⩽ 4 ; probabilités de {X = 0}, {X = 1}, {X = n}, {X = n − 1} et leurs réunions ; espérance admise, pas de variance.",
    "**Ajustements** : changement de variable **donné** (u², 1/t, 1/√n, log y) se ramenant à un ajustement affine.",
    "**Automatismes de Tle** : fractions et paramètres admis (x² − 4/9, 4x² − k²), enchaînements, changements de registre.",
]
CONTRA_T = [
    "**log(aⁿ) = n·log(a)** n'est énoncée que pour n entier naturel (p.8), mais la résolution de aˣ = b d'inconnue réelle (p.8) suppose la propriété pour x réel. → ltt-1.",
    "**Coefficients binomiaux** : capacité « pour n ⩽ 10 » ; commentaire « pour des valeurs de n plus grandes, […] donné ou déterminé à l'aide du triangle de Pascal » (p.10). → ltt-3.",
    "**Automatismes en italique** (p.6) : l'indice de base 100 n'est pas en italique (vérifié sur le rendu du PDF) alors qu'il n'est ni au BO de 2de ni au BO de 1re techno. Sans effet sur une borne.",
    "**Probabilités totales** : la Tle dit les « introduire » (p.9) alors que la 1re techno les a déjà (p.10). → l1t-1.",
    "**Suites géométriques** : « à termes strictement positifs » en 1re (p.7), « à termes positifs » en Tle (p.7). Sans effet pratique.",
]

if __name__ == "__main__":
    d1, r1 = build("1_TECHNO", GEN_1, PTS_1)
    dT, rT = build("T_TECHNO", GEN_T, PTS_T)
    json.dump(d1, open(OUT + "1techno.json", "w"), ensure_ascii=False, indent=2)
    json.dump(dT, open(OUT + "ttechno.json", "w"), ensure_ascii=False, indent=2)
    json.dump(QUESTIONS, open(OUT + "questions-techno.json", "w"), ensure_ascii=False, indent=2)
    intro1 = ("Objectif : pour chaque point actif de 1re technologique (`points-lycee.csv`, grade `1_TECHNO`), dire jusqu'où vont les questions générées (« seulement »). "
              "{n} points. Programme du BO n° 14 du 2026-04-02 ; héritage : la seconde (BO 2de), dont rien n'est recopié sauf ce qui change.")
    introT = ("Objectif : pour chaque point actif de terminale technologique (`points-lycee.csv`, grade `T_TECHNO`), dire jusqu'où vont les questions générées (« seulement »). "
              "{n} points. Programme du BO n° 14 du 2026-04-02 ; héritage : la 1re techno (`1techno.md`), dont rien n'est recopié sauf ce qui change.")
    open(OUT + "1techno.md", "w").write(md("1_TECHNO", d1, r1, "première technologique", intro1, UTILE_1, CONTRA_1))
    open(OUT + "ttechno.md", "w").write(md("T_TECHNO", dT, rT, "terminale technologique", introT, UTILE_T, CONTRA_T))
