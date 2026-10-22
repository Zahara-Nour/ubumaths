# Construit docs/wip/passe-lycee/bornes/1spe.json
import csv, json
ROOT = '/Users/david/Coding/js/ubumaths-wt-passe-lycee/docs/wip/passe-lycee/bornes/'
G = '1_SPE'


def b(aspect, borne, page, detail=None, force='BO'):
    o = {'aspect': aspect, 'borne': borne}
    if detail:
        o['detail'] = detail
    o['source'] = f'BO 1re spé p.{page}'
    o['force'] = force
    return o


def d(aspect, borne, page, detail=None):
    return b(aspect, borne, page, detail, 'déduite')


APPRO = "Approfondissement possible du BO, « en aucun cas obligatoire » (BO 1re spé p.3)."

general = [
    b('fonctions', "Fonctions connues : celles de seconde (affines, valeur absolue, carré, inverse, racine carrée, cube), plus les polynômes du second degré, les fonctions x ↦ xⁿ (n ∈ ℤ) et la fonction exponentielle. Pas de logarithme, pas de fonctions sinus et cosinus étudiées comme fonctions (terminale).", '5-8',
      {'liste': ['affines', 'valeur absolue', 'carré', 'inverse', 'racine carrée', 'cube', 'polynôme du second degré', 'x ↦ xⁿ (n ∈ ℤ)', 'exponentielle'], 'exclus': ['logarithme', 'fonctions sinus et cosinus', 'fonctions puissances non entières']},
      'déduite'),
    b('fonctions', "Dérivées : fonctions carré, cube, inverse, racine carrée, x ↦ xⁿ (n ∈ ℤ), t ↦ e^{at} (a réel) ; opérations somme, produit, inverse, quotient. C'est la liste du BO ; la seule composée écrite est t ↦ e^{at} (au-delà, question l1s-1).", '7-8',
      {'liste': ['x²', 'x³', '1/x', '√x', 'xⁿ (n ∈ ℤ)', 'e^{at}', 'u + v', 'uv', '1/v', 'u/v']}),
    b('fonctions', "Les fonctions étudiées sont toutes régulières ; le nombre dérivé est introduit par la perception intuitive de la limite du taux de variation, sans définition formelle de la limite.", 7),
    b('autre', "Limites : aucune formalisation ; seulement une intuition sur des exemples (calculs numériques, algorithmes de seuil). Pas de calcul de limite de fonction : aucun contenu de limite de fonction n'est écrit au BO de 1re.", '5-7',
      {'exclus': ['définition formelle de la limite', 'limites de fonctions']}, 'déduite'),
    b('autre', "Suites : seules les suites arithmétiques et géométriques sont formalisées ; d'autres types simples peuvent être rencontrés sans aucune connaissance spécifique à leur sujet.", 5),
    b('autre', "Second degré : forme canonique déterminée dans des cas simples par complétion du carré (x² + 2ax = (x + a)² − a²) ; le calcul effectif de la forme canonique dans le cas général n'est pas un attendu.", 5),
    b('autre', "Trigonométrie : cercle trigonométrique, radian, cosinus et sinus d'un réel, valeurs remarquables. Pas d'équation ni d'inéquation trigonométrique, pas de formule d'addition.", 8,
      {'exclus': ['équations trigonométriques', "formules d'addition", 'fonctions sinus et cosinus']}, 'déduite'),
    b('fonctions', "Équations et inéquations avec l'exponentielle : seulement celles qui se ramènent à eᵘ = eᵛ ou eᵘ < eᵛ par la stricte croissance (u, v expressions connues) ; pas d'équation eˣ = k avec k > 0 quelconque, faute de logarithme (terminale).", 8, {'exclus': ['eˣ = k, k > 0 quelconque', 'logarithme']}, 'déduite'),
    b('figures', "Géométrie plane seulement ; en géométrie repérée, le plan est rapporté à un repère orthonormé. Pas de géométrie dans l'espace (terminale).", 9),
    b('autre', "Probabilités : univers finis et variables aléatoires réelles seulement ; répétition d'épreuves de Bernoulli limitée à n ⩽ 4 (pas de loi binomiale ni de coefficient binomial, qui sont de terminale).", 10,
      {'max': {'n_epreuves_bernoulli': 4}, 'exclus': ['loi binomiale', 'coefficients binomiaux', 'univers infini']}, 'déduite'),
    b('format', "Notations ensemblistes : ∅, ∈, ⊂, ∩, ∪, { … }, ensembles de nombres, intervalles ; complémentaire noté Ā ou E \\ A ; Card(A) ; couple, produit cartésien. Les symboles ∀ et ∃ ne sont pas exigibles.", '3-4',
      {'notation_enonce': ['∀', '∃'], 'notation_reponse': ['pas ∀ ni ∃ exigés']}),
    b('format', "Notation Δy/Δx pour un taux de variation et dy/dx pour une dérivée : peut être signalée et utilisée en liaison avec les autres disciplines, en adaptant les lettres au contexte (x = f(t), q = f(t)…).", 7),
    b('autre', "Algorithmique : langage naturel ou Python ; affectation notée « ← » en langage naturel ; seule notion nouvelle : la liste, sans aucun autre type de collection.", 4,
      {'exclus': ['dictionnaires', 'tuples', 'ensembles Python', 'autres collections']}),
]

remarque_deduite_fonctions = None

P = {}

# ---------- Vocabulaire ensembliste et logique (BO p.4)
P['1SPE-201'] = ([b('autre', "Expressions « condition nécessaire », « condition suffisante », en situation, sur des propositions du programme.", 4)], None)
P['1SPE-202'] = ([b('autre', "Statut d'une égalité : identité ou équation.", 4, {'liste': ['identité', 'équation']})], None)
P['1SPE-366'] = ([b('autre', "Statut d'une lettre : variable, inconnue ou paramètre.", 4, {'liste': ['variable', 'inconnue', 'paramètre']})], None)
P['1SPE-203'] = ([b('format', "Quantifications implicites, surtout dans les propositions conditionnelles ; symboles ∀ et ∃ non exigibles.", 4)], None)
P['1SPE-204'] = ([b('format', "Négation de propositions quantifiées, formulée en langage naturel (∀ et ∃ non exigibles).", 4, {'notation_reponse': ['langage naturel']}, 'déduite')],
                 "Lecture déduite (texte implicite) : les symboles ∀ et ∃ n'étant « pas exigibles » (BO p.4), la négation attendue est formulée en mots ; un modèle peut afficher les symboles dans l'énoncé sans les exiger dans la réponse.")
P['1SPE-205'] = ([], "Point-compétence (raisonner) : « les élèves produisent des raisonnements … par contraposée » (BO p.4) ; aucun grain questionnable propre, au mieux une question sur la contraposée d'une implication donnée (voir aussi la puce « formuler la réciproque d'une implication, la contraposée »).")

# ---------- Algorithmique > Notion de liste (BO p.4)
LISTE = "Listes seulement (pas d'autre type de collection) ; Python ou langage naturel."
P['1SPE-206'] = ([b('autre', "Génération en extension (énumération des éléments). " + LISTE, 4)], None)
P['1SPE-367'] = ([b('autre', "Génération par ajouts successifs. " + LISTE, 4)], None)
P['1SPE-207'] = ([b('autre', "Génération en compréhension, mise en lien avec la notion d'ensemble ; les conditions de la compréhension travaillent la logique. " + LISTE, 4)], None)
P['1SPE-208'] = ([b('autre', "Ajouter, supprimer des éléments, accéder par l'indice. " + LISTE, 4)], None)
P['1SPE-209'] = ([b('autre', "Parcours d'une liste. " + LISTE, 4)], None)
P['1SPE-210'] = ([b('autre', "Itération sur les éléments d'une liste. " + LISTE, 4)], None)

# ---------- Suites (BO p.5-6)
P['1SPE-211'] = ([b('autre', "Mode explicite uₙ = f(n), sur des exemples.", 6)], None)
P['1SPE-368'] = ([b('autre', "Relation de récurrence uₙ₊₁ = f(uₙ) (récurrence d'ordre 1), sur des exemples.", 6, {'liste': ['uₙ₊₁ = f(uₙ)']})],
                 None)
P['1SPE-369'] = ([b('autre', "Suite générée par un algorithme, sur des exemples (Python ou langage naturel).", 6)], None)
P['1SPE-370'] = ([b('autre', "Motifs géométriques ou combinatoires (nombres figurés, nombre d'éléments d'une configuration dépendant d'un entier naturel).", 5)], None)
P['1SPE-212'] = ([b('format', "Notations u(n), uₙ, (u(n)), (uₙ).", 6, {'liste': ['u(n)', 'uₙ', '(u(n))', '(uₙ)']})], None)
P['1SPE-213'] = ([b('autre', "Suite arithmétique : exemples et définition (uₙ₊₁ = uₙ + r).", 6)], None)
P['1SPE-371'] = ([b('autre', "Terme général d'une suite arithmétique.", 6)], None)
P['1SPE-214'] = ([b('autre', "Évolutions successives à accroissements constants.", 6)], None)
P['1SPE-372'] = ([b('fonctions', "Lien suite arithmétique ↔ fonction affine (points alignés).", 6)], None)
P['1SPE-215'] = ([b('autre', "Somme 1 + 2 + … + n seulement (démontrée au programme).", 6)], None)
P['1SPE-216'] = ([b('autre', "Suite géométrique : exemples et définition (uₙ₊₁ = q·uₙ).", 6)], None)
P['1SPE-373'] = ([b('autre', "Terme général d'une suite géométrique.", 6)], None)
P['1SPE-217'] = ([b('autre', "Évolutions successives à taux constant ; une évolution à taux fixe est modélisée par une suite géométrique, rapport de deux termes consécutifs.", 5)], None)
P['1SPE-374'] = ([b('fonctions', "Mise en parallèle évolution géométrique à temps discret / évolution exponentielle à temps continu.", 5)], None)
P['1SPE-218'] = ([b('autre', "Somme 1 + q + … + qⁿ seulement (démontrée au programme).", 6)], None)
P['1SPE-219'] = ([b('autre', "Sens de variation d'une suite (croissante, décroissante) ; méthodes non précisées par le BO.", 6)],
                 None)
P['1SPE-220'] = ([b('autre', "Sur des exemples, intuition de la limite (finie, infinie) ou de l'absence de limite ; toute formalisation exclue.", '5-6', {'exclus': ['définition formelle', 'calcul de limite par théorèmes']})], None)
P['1SPE-221'] = ([b('autre', "Registres langue naturelle, algébrique, graphique pour une suite, et passage de l'un à l'autre.", 6)],
                 "⚠ libellé : le BO (p.6) dit « registre graphique » sans préciser « nuage de points » ; la précision du libellé est naturelle (une suite se représente par des points isolés) mais ne figure pas au texte.")
P['1SPE-375'] = ([b('autre', "Passage de l'énoncé en langue naturelle à l'expression algébrique d'une suite.", 6)], None)
P['1SPE-435'] = ([], "Point-compétence (modéliser) : « Proposer, modéliser une situation permettant de générer une suite de nombres » (BO p.6) ; aucun grain questionnable propre.")
P['1SPE-222'] = ([b('autre', "Relation explicite pour une suite définie par un motif géométrique ou une question de dénombrement.", 6)], None)
P['1SPE-376'] = ([b('autre', "Relation de récurrence pour une suite définie par un motif géométrique ou une question de dénombrement.", 6)], None)
P['1SPE-223'] = ([b('autre', "Termes d'une suite définie explicitement.", 6)], None)
P['1SPE-377'] = ([b('autre', "Termes d'une suite définie par une récurrence uₙ₊₁ = f(uₙ).", '5-6', {'liste': ['uₙ₊₁ = f(uₙ)']}, 'déduite')],
                 "Lecture déduite (texte implicite) : le seul mode de récurrence écrit au BO est uₙ₊₁ = f(uₙ) (p.5 et p.6) ; une récurrence d'ordre 2 n'apparaît qu'à travers la suite de Fibonacci, en exemple d'algorithme (1SPE-239).")
P['1SPE-378'] = ([b('autre', "Termes d'une suite définie par un algorithme (Python ou langage naturel).", 6)], None)
SAG = "Suites arithmétiques et géométriques seulement."
P['1SPE-224'] = ([b('autre', "Terme général d'une suite arithmétique.", 6)], None)
P['1SPE-225'] = ([b('autre', "Terme général d'une suite géométrique.", 6)], None)
P['1SPE-226'] = ([b('autre', "Somme de termes consécutifs d'une suite arithmétique, ramenée à 1 + 2 + … + n.", 6, None, 'déduite')],
                 "Lecture déduite (texte implicite) : le BO ne donne que 1 + 2 + … + n (contenus et démonstrations p.6) ; la somme de termes consécutifs s'y ramène. La formule « nombre de termes × (premier + dernier) / 2 » n'est pas écrite.")
P['1SPE-227'] = ([b('autre', "Somme de termes consécutifs d'une suite géométrique, ramenée à 1 + q + … + qⁿ (q ≠ 1).", 6, None, 'déduite')],
                 "Lecture déduite (texte implicite) : le BO ne donne que 1 + q + … + qⁿ (p.6) ; la somme de termes consécutifs s'y ramène.")
P['1SPE-228'] = ([b('autre', "Sens de variation d'une suite arithmétique (signe de la raison).", 6, None, 'déduite')],
                 "Lecture déduite (texte implicite) : « déterminer le sens de variation » d'une suite arithmétique ; le critère du signe de r n'est pas écrit mais découle de la définition.")
P['1SPE-229'] = ([b('autre', "Sens de variation d'une suite géométrique (selon q et le signe du premier terme).", 6, None, 'déduite')],
                 "Lecture déduite (texte implicite) : le critère sur q n'est pas écrit au BO (p.6).")
P['1SPE-230'] = ([b('autre', "Phénomène discret à croissance linéaire → suite arithmétique.", 6)], None)
P['1SPE-379'] = ([b('autre', "Phénomène discret à croissance exponentielle → suite géométrique (capital, population, décroissance radioactive).", '5-6')], None)
P['1SPE-231'] = ([b('autre', "Conjecture seulement, dans des cas simples (calculs numériques, algorithme de seuil) ; aucune démonstration de limite.", '5-6')], None)
P['1SPE-232'] = ([b('autre', "Ce qui est démontré : l'expression du terme général d'une suite arithmétique ; pas plus.", 6)], None)
P['1SPE-233'] = ([b('autre', "Ce qui est démontré : l'expression du terme général d'une suite géométrique ; pas plus.", 6)], None)
P['1SPE-234'] = ([b('autre', "Ce qui est démontré : 1 + 2 + … + n = n(n + 1)/2 ; pas plus.", 6)], None)
P['1SPE-235'] = ([b('autre', "Ce qui est démontré : 1 + q + … + qⁿ = (1 − qⁿ⁺¹)/(1 − q) pour q ≠ 1 ; pas plus.", 6)], None)
P['1SPE-236'] = ([b('autre', "Algorithme de calcul de termes d'une suite.", 6)], APPRO)
P['1SPE-380'] = ([b('autre', "Algorithme de calcul de sommes de termes.", 6)], APPRO)
P['1SPE-237'] = ([b('autre', "Algorithme de seuil : premier rang à partir duquel uₙ dépasse (ou passe sous) une valeur ; pas de résolution algébrique de qⁿ > A (logarithme : terminale).", '5-6', {'exclus': ['logarithme']}, 'déduite')],
                 APPRO + " Lecture déduite (texte implicite) : sans logarithme au programme, le seuil d'une suite géométrique ne se trouve que par algorithme ou calculs successifs.")
P['1SPE-238'] = ([b('autre', "Algorithme de calcul de n!.", 6)], APPRO)
P['1SPE-239'] = ([b('autre', "Suites de Syracuse et de Fibonacci seulement.", 6, {'liste': ['Syracuse', 'Fibonacci']})], APPRO)
P['1SPE-240'] = ([b('autre', "Tour de Hanoï.", 6)], APPRO)
P['1SPE-241'] = ([b('autre', "Somme des n premiers carrés.", 6)], APPRO)
P['1SPE-381'] = ([b('autre', "Somme des n premiers cubes.", 6)], APPRO)
P['1SPE-242'] = ([b('autre', "Emprunt remboursé par annuités constantes.", 6)], APPRO)

# ---------- Second degré (BO p.5-6)
SD = "Fonctions polynômes du second degré."
P['1SPE-243'] = ([b('fonctions', "Forme développée réduite ax² + bx + c (a ≠ 0), nommée parmi les formes à choisir.", 6, None, 'déduite')],
                 "⚠ libellé : les contenus du BO (p.6) ne mentionnent pas « forme développée ; coefficients » ; seule la capacité « choisir une forme adaptée (développée réduite, canonique, factorisée) » nomme la forme développée. Lecture déduite (texte implicite) : forme ax² + bx + c, a ≠ 0.")
P['1SPE-244'] = ([b('fonctions', "Forme factorisée a(x − x₁)(x − x₂) ; racines lues sur la forme factorisée.", 6)], None)
P['1SPE-382'] = ([b('fonctions', "Signe d'un polynôme du second degré donné sous forme factorisée.", 6)], None)
P['1SPE-245'] = ([b('faits', "Somme des racines : x₁ + x₂ = −b/a.", 6)], None)
P['1SPE-383'] = ([b('faits', "Produit des racines : x₁x₂ = c/a.", 6)], None)
P['1SPE-246'] = ([b('fonctions', "Forme canonique a(x − α)² + β ; obtenue dans des cas simples par complétion du carré x² + 2ax = (x + a)² − a² ; cas général non attendu.", 5)],
                 "⚠ La frontière entre « cas simples » et « cas général » n'est pas écrite : question l1s-2.")
P['1SPE-247'] = ([b('fonctions', "Sommet de la parabole lu sur la forme canonique (α ; β), ou obtenu par l'extrémum en lien avec la dérivation.", '5-8', None, 'déduite')],
                 "⚠ libellé : « calcul des coordonnées du sommet d'une parabole » n'est pas écrit dans le programme de 1re spé (BO p.5-8). Lecture déduite (texte implicite) : le sommet s'obtient par la forme canonique (p.5) ou par l'étude de l'extrémum (p.8) ; la formule α = −b/(2a) n'est pas écrite.")
P['1SPE-384'] = ([b('fonctions', "Axe de symétrie x = α, lu sur la forme canonique.", 5, None, 'déduite')],
                 "⚠ libellé : « axe de symétrie d'une parabole » n'est pas écrit dans le programme de 1re spé (BO p.5-8). Lecture déduite (texte implicite) : il se lit sur la forme canonique, en lien avec la position du graphe de x ↦ f(x − m) (p.5).")
P['1SPE-248'] = ([b('faits', "Discriminant Δ = b² − 4ac.", 6)], None)
P['1SPE-385'] = ([b('fonctions', "Factorisation a(x − x₁)(x − x₂) quand Δ ⩾ 0 ; pas de factorisation quand Δ < 0.", 6, None, 'déduite')],
                 "Lecture déduite (texte implicite) : « factorisation éventuelle » (p.6) signifie que la factorisation dépend du signe de Δ ; aucun nombre complexe en 1re.")
P['1SPE-386'] = ([b('autre', "Équation ax² + bx + c = 0 (a ≠ 0), solutions réelles ; aucun nombre complexe.", 6, None, 'déduite')],
                 "Lecture déduite (texte implicite) : le BO ne parle que de solutions réelles ; les complexes ne sont qu'en maths expertes.")
P['1SPE-249'] = ([b('fonctions', "Signe de ax² + bx + c selon Δ et le signe de a.", 6)], None)
P['1SPE-250'] = ([b('autre', "Inéquation du second degré ramenée au signe d'un polynôme du second degré.", 6, None, 'déduite')],
                 "⚠ libellé : la « résolution d'une inéquation du second degré » n'est pas un contenu du BO (p.6), qui dit « Signe » ; l'inéquation n'apparaît que dans la capacité « choisir une forme adaptée … (équation, inéquation, optimisation, variations) ». Lecture déduite (texte implicite) : inéquation se ramenant au signe d'un trinôme.")
P['1SPE-251'] = ([b('fonctions', "Polynôme donné sous forme factorisée a(x − x₁)(x − x₂) seulement ; signe par tableau de signes.", '5-6')], None)
P['1SPE-252'] = ([b('fonctions', "Polynômes a(x − x₁)(x − x₂), a ≠ 0 quelconque, x₁ ≠ x₂ réels donnés.", 6)], None)
P['1SPE-253'] = ([b('autre', "Stratégies : racine évidente, racines détectées par leur somme et leur produit, identité remarquable, formules générales. Factorisation directe dans les cas qui s'y prêtent : racines apparentes, coefficient de x nul, racines entières trouvées mentalement.", '5-6',
                    {'liste': ['racine évidente', 'somme et produit', 'identité remarquable', 'formules générales']})], None)
P['1SPE-254'] = ([b('fonctions', "Trois formes : développée réduite, canonique, factorisée ; problèmes d'équation, d'inéquation, d'optimisation, de variations.", 6, {'liste': ['développée réduite', 'canonique', 'factorisée']})], None)
P['1SPE-255'] = ([b('autre', "Ce qui est démontré : la résolution de ax² + bx + c = 0 (discriminant, racines réelles) ; pas plus.", 6)], None)
P['1SPE-256'] = ([b('fonctions', "Polynôme du troisième degré dont une racine est connue (factorisation par x − x₀).", 6)], APPRO)
P['1SPE-387'] = ([b('autre', "Équation du troisième degré dont une racine est connue, ramenée au second degré.", 6)], APPRO)
P['1SPE-257'] = ([b('fonctions', "xⁿ − 1 par x − 1 et xⁿ − aⁿ par x − a seulement.", 6, {'liste': ['xⁿ − 1', 'xⁿ − aⁿ']})], APPRO)
P['1SPE-258'] = ([b('autre', "Deux réels de somme s et de produit p, racines de x² − sx + p.", 6)], APPRO)

# ---------- Dérivation (BO p.7-8)
P['1SPE-259'] = ([b('fonctions', "Taux de variation (f(b) − f(a))/(b − a) ; notation Δy/Δx possible.", 7)], None)
P['1SPE-388'] = ([b('figures', "Sécante à la courbe en un point donné ; sa pente est le taux de variation.", 7)], None)
P['1SPE-260'] = ([b('autre', "Nombre dérivé comme limite intuitive du taux de variation, sans définition formelle ; notation f′(a). Calcul algébrique du taux dans les cas qui s'y prêtent : second degré, fonction inverse.", 7, {'liste': ['second degré', 'inverse']})],
                 None)
P['1SPE-261'] = ([b('figures', "Tangente comme « limite des sécantes » ; pente f′(a).", 7)], None)
P['1SPE-389'] = ([b('faits', "Équation de la tangente y = f(a) + f′(a)(x − a).", 7)], None)
P['1SPE-262'] = ([b('fonctions', "Fonction affine tangente x ↦ f(a) + f′(a)(x − a).", 7)], None)
P['1SPE-390'] = ([b('autre', "Approximation f(a + h) ≈ f(a) + f′(a)h ; exemples du BO : a = 1 avec carré, inverse, racine carrée.", 7, {'liste': ['carré', 'inverse', 'racine carrée']})], None)
P['1SPE-263'] = ([b('autre', "Fonction dérivable sur un intervalle, fonction dérivée ; fonctions régulières seulement.", 7)], None)
P['1SPE-264'] = ([b('faits', "(x²)′ = 2x.", 7)], None)
P['1SPE-391'] = ([b('faits', "(x³)′ = 3x².", 7)], None)
P['1SPE-392'] = ([b('faits', "(1/x)′ = −1/x² sur ]−∞ ; 0[ et ]0 ; +∞[.", 7)], None)
P['1SPE-393'] = ([b('faits', "(√x)′ = 1/(2√x) sur ]0 ; +∞[.", 7)], None)
P['1SPE-265'] = ([b('faits', "(u + v)′ = u′ + v′ (et (ku)′ = ku′).", 7, None, 'déduite')],
                 "Lecture déduite (texte implicite) : le produit par une constante n'est pas nommé dans la liste « somme, produit, inverse, quotient » (p.7) ; il découle du produit par une fonction constante.")
P['1SPE-394'] = ([b('faits', "(uv)′ = u′v + uv′.", 7)], None)
P['1SPE-395'] = ([b('faits', "(1/v)′ = −v′/v², v ne s'annulant pas.", 7)], None)
P['1SPE-396'] = ([b('faits', "(u/v)′ = (u′v − uv′)/v², v ne s'annulant pas.", 7)], None)
P['1SPE-266'] = ([b('faits', "(xⁿ)′ = nxⁿ⁻¹ pour n ∈ ℤ (x ≠ 0 si n < 0) ; exposants entiers seulement.", 7, {'exposants': 'entiers relatifs'})], None)
P['1SPE-267'] = ([b('fonctions', "Fonction valeur absolue en 0 seulement.", 7)], None)
P['1SPE-268'] = ([b('fonctions', "Taux de variation d'une fonction connue entre deux valeurs.", 7)], None)
P['1SPE-397'] = ([b('figures', "Pente d'une sécante.", 7)], None)
P['1SPE-269'] = ([b('autre', "Contextes : pente d'une tangente, vitesse instantanée, coût marginal, etc.", 7)], None)
P['1SPE-270'] = ([b('figures', "Lecture graphique du nombre dérivé par la pente de la tangente tracée.", 7)], None)
P['1SPE-271'] = ([b('figures', "Tracé de la tangente en un point, le nombre dérivé étant connu.", 7)], None)
P['1SPE-272'] = ([b('faits', "y = f(a) + f′(a)(x − a), f dérivée à l'aide des dérivées et opérations du programme.", 7)], None)
P['1SPE-273'] = ([b('autre', "f(a + h) ≈ f(a) + f′(a)h.", 7)], None)
P['1SPE-274'] = ([b('fonctions', "Cas simples ; dérivées et opérations du programme seulement (somme, produit, inverse, quotient, xⁿ pour n ∈ ℤ, √x, e^{at}).", '7-8')],
                 "⚠ Le BO nouveau ne contient aucune dérivée de composée hors t ↦ e^{at} : faut-il refuser √(ax + b), (ax + b)ⁿ ? Question l1s-1.")
P['1SPE-275'] = ([b('autre', "Ce qui est démontré : l'équation y = f(a) + f′(a)(x − a) de la tangente ; pas plus.", 8)], None)
P['1SPE-276'] = ([b('autre', "Ce qui est démontré : la fonction racine carrée n'est pas dérivable en 0 (taux de variation non borné) ; pas plus.", 8)], None)
P['1SPE-277'] = ([b('autre', "Ce qui est démontré : (x²)′ = 2x ; pas plus.", 8)], None)
P['1SPE-398'] = ([b('autre', "Ce qui est démontré : (1/x)′ = −1/x² ; pas plus.", 8)], None)
P['1SPE-278'] = ([b('autre', "Ce qui est démontré : (uv)′ = u′v + uv′ ; pas plus.", 8)], None)
P['1SPE-279'] = ([b('autre', "Liste (Python) des coefficients directeurs des sécantes pour un pas donné.", 8)], APPRO)

# ---------- Variations et courbes (BO p.8)
P['1SPE-280'] = ([b('fonctions', "Parité : f(−x) = f(x) (paire), f(−x) = −f(x) (impaire), sur un domaine symétrique.", 8, None, 'déduite')],
                 "Lecture déduite (texte implicite) : le BO écrit « représentation algébrique … de fonctions paires, impaires » (p.8) sans donner les égalités ; la condition de domaine symétrique est sous-entendue.")
P['1SPE-399'] = ([b('figures', "Traduction géométrique : symétrie par rapport à l'axe des ordonnées (paire), par rapport à l'origine (impaire).", 8)], None)
P['1SPE-281'] = ([b('autre', "Fonction dérivable sur un intervalle : sens de variation ↔ signe de la dérivée.", 8)], None)
P['1SPE-400'] = ([b('autre', "f constante sur un intervalle ⟺ f′ nulle sur cet intervalle.", 8)], None)
P['1SPE-282'] = ([b('autre', "En un extrémum (intérieur à l'intervalle), nombre dérivé nul, tangente horizontale.", 8)], None)
P['1SPE-283'] = ([b('fonctions', "Fonctions dérivables à l'aide des dérivées et opérations du programme ; variations par le signe de la dérivée.", 8, None, 'déduite')],
                 "Lecture déduite (texte implicite) : la capacité « étudier les variations d'une fonction » (p.8) ne liste pas les fonctions ; elles sont bornées par ce que l'élève sait dériver (bornes générales).")
P['1SPE-401'] = ([b('fonctions', "Extrémums d'une fonction dérivable sur un intervalle, à l'aide des variations.", 8)], None)
P['1SPE-284'] = ([], "Point-compétence (modéliser, résoudre un problème) : « Résoudre un problème d'optimisation » (BO p.8) ; les fonctions en jeu restent bornées par les bornes générales.")
P['1SPE-285'] = ([b('autre', "Inégalité établie par l'étude des variations d'une fonction (signe d'une différence).", 8)], None)
P['1SPE-286'] = ([b('autre', "Position relative de deux courbes par le signe de la différence f − g.", 8, None, 'déduite')],
                 "Lecture déduite (texte implicite) : la méthode (signe de f − g) n'est pas écrite ; elle est déjà celle de la seconde.")
P['1SPE-287'] = ([b('fonctions', "Polynôme du second degré : variations par la dérivée.", 8)], None)
P['1SPE-402'] = ([b('fonctions', "Polynôme du second degré : extrémum.", 8)], None)
P['1SPE-403'] = ([b('fonctions', "Polynôme du second degré : allure (parabole tournée vers le haut ou le bas) selon le signe du coefficient de x².", 8)], None)
P['1SPE-288'] = ([b('autre', "Méthode de Newton, cas favorables seulement.", 8)], APPRO)

# ---------- Exponentielle (BO p.8)
P['1SPE-289'] = ([b('fonctions', "exp : unique fonction dérivable sur ℝ telle que f′ = f et f(0) = 1, existence et unicité admises ; notation exp(x).", 8)], None)
P['1SPE-290'] = ([b('faits', "exp(x + y) = exp(x)exp(y).", 8)], None)
P['1SPE-404'] = ([b('faits', "exp(x)exp(−x) = 1.", 8)], None)
P['1SPE-291'] = ([b('format', "Nombre e = exp(1) ; notation eˣ.", 8)], None)
P['1SPE-292'] = ([b('faits', "eˣ > 0 pour tout réel x.", 8)], None)
P['1SPE-405'] = ([b('faits', "exp strictement croissante sur ℝ.", 8)], None)
P['1SPE-406'] = ([b('figures', "Courbe de la fonction exponentielle.", 8)], None)
P['1SPE-293'] = ([b('autre', "Lien avec les suites géométriques (évolution discrète / continue).", '7-8')], None)
P['1SPE-294'] = ([b('faits', "Propriétés algébriques de l'exponentielle (exp(x + y) = exp(x)exp(y), exp(x)exp(−x) = 1).", 8)],
                 "⚠ Le BO n'écrit que deux propriétés ; les conséquences eˣ⁻ʸ = eˣ/eʸ et (eˣ)ⁿ = eⁿˣ sont-elles dans le point ? Question l1s-5.")
P['1SPE-295'] = ([b('faits', "(e^{at})′ = a·e^{at}, a réel.", 8)], None)
P['1SPE-296'] = ([b('figures', "t ↦ e^{−kt} pour une valeur numérique k > 0.", 8, {'min': {'k': '> 0'}})], None)
P['1SPE-407'] = ([b('figures', "t ↦ e^{kt} pour une valeur numérique k > 0.", 8, {'min': {'k': '> 0'}})], None)
P['1SPE-297'] = ([b('autre', "Croissance ou décroissance exponentielle (capital à taux fixe, décroissance radioactive, dilution).", '7-8')], None)
P['1SPE-298'] = ([b('autre', "Méthode d'Euler pour construire l'exponentielle.", 8)], APPRO)
P['1SPE-299'] = ([b('autre', "Valeur approchée de e par la suite ((1 + 1/n)ⁿ).", 8)], APPRO)
P['1SPE-300'] = ([b('autre', "Ce qui est démontré : l'unicité d'une fonction dérivable sur ℝ telle que f′ = f et f(0) = 1 ; pas plus.", 8)], APPRO)
P['1SPE-301'] = ([b('autre', "Ce qui est démontré : exp(x + y) = exp(x)exp(y) ; pas plus.", 8)], APPRO + " Même énoncé que 1SPE-290 (connaissance), ici à démontrer.")
P['1SPE-302'] = ([b('autre', "Ce qui est démontré : exp strictement positive et croissante ; pas plus.", 8)], APPRO)

# ---------- Trigonométrie (BO p.8)
P['1SPE-303'] = ([b('figures', "Cercle trigonométrique (cercle de centre O, de rayon 1, orienté), en repère orthonormé.", 8, None, 'déduite')],
                 "Lecture déduite (texte implicite) : la définition du cercle trigonométrique n'est pas écrite au BO (p.8).")
P['1SPE-408'] = ([b('faits', "Longueur d'arc sur le cercle trigonométrique (rayon 1).", 8)], None)
P['1SPE-409'] = ([b('unites', "Radian ; conversion degrés ↔ radians.", 8, None, 'déduite')],
                 "Lecture déduite (texte implicite) : la conversion degrés ↔ radians n'est pas écrite, mais le lien avec le triangle rectangle (angles en degrés au collège) la suppose.")
P['1SPE-304'] = ([b('nombres', "Image sur le cercle de tout nombre réel par enroulement de la droite.", 8)], None)
P['1SPE-305'] = ([b('autre', "cos x et sin x d'un réel x ; lien avec cosinus et sinus dans le triangle rectangle.", 8)], None)
P['1SPE-410'] = ([b('nombres', "Valeurs remarquables de cos et sin.", 8)],
                 "⚠ Le BO ne liste pas les valeurs remarquables ni les angles associés : question l1s-3.")
P['1SPE-306'] = ([b('nombres', "Point image d'un réel sur le cercle trigonométrique.", 8)],
                 "⚠ Les réels à placer ne sont pas bornés par le BO ; voir question l1s-3 (valeurs remarquables et angles associés).")
P['1SPE-307'] = ([b('nombres', "Lecture du cercle ; valeurs remarquables de x et angles associés à x.", 8)],
                 "⚠ Quels angles associés (−x, π − x, π + x, π/2 − x…) et sous quelle forme (valeurs numériques ou formules littérales) : question l1s-3.")
P['1SPE-308'] = ([b('autre', "Ce qui est démontré : cos(π/4) = sin(π/4) = √2/2 ; pas plus.", 8)], None)
P['1SPE-411'] = ([b('autre', "Ce qui est démontré : cos(π/3) = 1/2, sin(π/3) = √3/2 ; pas plus.", 8)], None)
P['1SPE-309'] = ([b('autre', "Approximation de π par la méthode d'Archimède.", 8)], APPRO)

# ---------- Produit scalaire (BO p.9)
PS = "Vecteurs du plan."
P['1SPE-310'] = ([b('figures', "Produit scalaire par la projection orthogonale.", 9)], None)
P['1SPE-412'] = ([b('faits', "u·v = ‖u‖‖v‖cos(u, v).", 9)], None)
P['1SPE-311'] = ([b('faits', "u et v orthogonaux ⟺ u·v = 0.", 9)], None)
P['1SPE-312'] = ([b('faits', "Bilinéarité du produit scalaire.", 9)], None)
P['1SPE-413'] = ([b('faits', "Symétrie u·v = v·u.", 9)], None)
P['1SPE-313'] = ([b('faits', "En base orthonormée : u·v = xx′ + yy′.", 9)], None)
P['1SPE-414'] = ([b('faits', "En base orthonormée : ‖u‖ = √(x² + y²).", 9)], None)
P['1SPE-415'] = ([b('faits', "En base orthonormée : xx′ + yy′ = 0.", 9)], None)
P['1SPE-314'] = ([b('faits', "Coordonnées x = u·i, y = u·j dans une base orthonormée (i, j).", 9)], None)
P['1SPE-315'] = ([b('faits', "‖u + v‖² = ‖u‖² + 2u·v + ‖v‖².", 9)], None)
P['1SPE-416'] = ([b('faits', "‖u − v‖² = ‖u‖² − 2u·v + ‖v‖².", 9)], None)
P['1SPE-316'] = ([b('faits', "Formule d'Al-Kashi.", 9)], None)
P['1SPE-317'] = ([b('faits', "Transformation de MA·MB (par le milieu I de [AB] : MA·MB = MI² − AB²/4).", 9, None, 'déduite')],
                 "Lecture déduite (texte implicite) : le BO (p.9) ne donne pas la forme transformée ; MI² − IA² est la transformation classique, en lien avec la démonstration 1SPE-323.")
P['1SPE-318'] = ([b('figures', "Orthogonalité démontrée par un produit scalaire nul, dans le plan.", 9)], None)
P['1SPE-319'] = ([b('figures', "Angle obtenu par cos(u, v) = u·v / (‖u‖‖v‖), dans le plan.", 9, None, 'déduite')],
                 "Lecture déduite (texte implicite) : la formule n'est pas écrite ; elle découle de la formule avec le cosinus.")
P['1SPE-320'] = ([b('figures', "Longueur dans le plan (Al-Kashi, développement de ‖u ± v‖²).", 9)], None)
P['1SPE-321'] = ([b('autre', "Quatre méthodes : projection orthogonale, coordonnées, normes et angle, normes seules.", 9, {'liste': ['projection orthogonale', 'coordonnées', 'normes et angle', 'normes']})], None)
P['1SPE-436'] = ([], "Point-compétence (résoudre un problème géométrique) : « Utiliser le produit scalaire pour résoudre un problème géométrique » (BO p.9) ; aucun grain questionnable propre, plan seulement.")
P['1SPE-322'] = ([b('autre', "Ce qui est démontré : la formule d'Al-Kashi, par le produit scalaire ; pas plus.", 9)], None)
P['1SPE-323'] = ([b('autre', "Ce qui est démontré : l'ensemble des points M tels que MA·MB = 0 est le cercle de diamètre [AB] ; pas plus.", 9)], None)
P['1SPE-324'] = ([b('faits', "Loi des sinus.", 9)], APPRO)
P['1SPE-325'] = ([b('figures', "Concourance des hauteurs d'un triangle.", 9)], APPRO)
P['1SPE-326'] = ([b('figures', "Concourance des médianes au centre de gravité.", 9)], APPRO)

# ---------- Géométrie repérée (BO p.9)
RON = "Repère orthonormé du plan."
P['1SPE-327'] = ([b('figures', "Vecteur normal à une droite du plan, en repère orthonormé.", 9)], None)
P['1SPE-417'] = ([b('faits', "(a ; b) normal à la droite ax + by + c = 0.", 9)], None)
P['1SPE-328'] = ([b('figures', "Projeté orthogonal d'un point sur une droite du plan.", 9)], None)
P['1SPE-329'] = ([b('faits', "Équation de cercle (x − a)² + (y − b)² = r² en repère orthonormé.", 9, None, 'déduite')],
                 "Lecture déduite (texte implicite) : le BO dit « équation de cercle » sans la forme ; la forme centre-rayon découle de la capacité « cercle donné par son centre et son rayon ».")
P['1SPE-330'] = ([b('figures', "Droite donnée par un point et un vecteur normal ; équation ax + by + c = 0.", 9)], None)
P['1SPE-331'] = ([b('figures', "Coordonnées du projeté orthogonal d'un point sur une droite, en repère orthonormé.", 9)], None)
P['1SPE-332'] = ([b('figures', "Cercle donné par son centre et son rayon.", 9)], None)
P['1SPE-418'] = ([b('figures', "Utilisation de l'équation d'un cercle donné par son centre et son rayon (appartenance d'un point…).", 9)], None)
P['1SPE-333'] = ([b('autre', "Reconnaître qu'une équation x² + y² + αx + βy + γ = 0 est celle d'un cercle (par complétion des carrés).", 9, None, 'déduite')],
                 "Lecture déduite (texte implicite) : la forme développée de l'équation n'est pas écrite au BO (p.9) ; la reconnaissance passe par la complétion du carré vue en second degré.")
P['1SPE-419'] = ([b('autre', "Centre et rayon à partir d'une équation de cercle.", 9)], None)
P['1SPE-437'] = ([], "Point-compétence (choisir un cadre) : « Utiliser un repère pour étudier une configuration » (BO p.9) ; aucun grain questionnable propre, plan en repère orthonormé.")
P['1SPE-334'] = ([b('figures', "Points équidistants de l'axe des abscisses et d'un point donné (parabole).", 9)], APPRO)
P['1SPE-335'] = ([b('figures', "Cercle et droite parallèle à un axe seulement.", 9)], APPRO)
P['1SPE-420'] = ([b('figures', "Parabole y = ax² + bx + c et droite parallèle à un axe seulement.", 9)], APPRO)

# ---------- Probabilités conditionnelles et indépendance (BO p.10)
P['1SPE-336'] = ([b('faits', "A et B indépendants : P_B(A) = P(A) (P(B) ≠ 0), soit P(A ∩ B) = P(A)P(B).", 10)], None)
P['1SPE-337'] = ([b('autre', "Partition de l'univers (système complet d'évènements), univers fini.", 10)], None)
P['1SPE-421'] = ([b('faits', "Formule des probabilités totales relative à une partition de l'univers.", 10)], None)
P['1SPE-338'] = ([b('autre', "Succession de deux épreuves indépendantes seulement.", 10)], None)
P['1SPE-422'] = ([b('autre', "Deux épreuves indépendantes, représentation par un arbre.", 10)], None)
P['1SPE-423'] = ([b('autre', "Deux épreuves indépendantes, représentation par un tableau.", 10)], None)
P['1SPE-339'] = ([b('operandes', "n ⩽ 4 épreuves de Bernoulli indépendantes et identiques.", 10, {'max': {'n': 4}})], None)
P['1SPE-340'] = ([b('autre', "Cas simples de la formule des probabilités totales.", 10)],
                 "⚠ « Cas simples » n'est pas défini (taille de la partition) : question l1s-4.")
P['1SPE-341'] = ([b('autre', "Utiliser l'indépendance de deux évènements (pas plus de deux).", 10)], None)
P['1SPE-424'] = ([b('autre', "Justifier l'indépendance de deux évènements (P(A ∩ B) = P(A)P(B) ou P_B(A) = P(A)).", 10)], None)
P['1SPE-342'] = ([b('autre', "Arbre pour deux épreuves indépendantes.", 10)], None)
P['1SPE-425'] = ([b('autre', "Tableau pour deux épreuves indépendantes.", 10)], None)
P['1SPE-343'] = ([b('operandes', "Arbre de n ⩽ 4 épreuves de Bernoulli indépendantes et identiques.", 10, {'max': {'n': 4}})], None)
P['1SPE-426'] = ([b('operandes', "Probabilités lues sur l'arbre de n ⩽ 4 épreuves de Bernoulli.", 10, {'max': {'n': 4}}),
                  d('autre', "Pas de loi binomiale ni de coefficient binomial.", 10, {'exclus': ['loi binomiale', 'coefficients binomiaux']})],
                 "Lecture déduite (texte implicite) : le BO de 1re limite à n ⩽ 4 et passe par l'arbre (p.10) ; la loi binomiale et les coefficients binomiaux n'y figurent pas (programme de terminale).")
P['1SPE-344'] = ([b('autre', "Monte-Carlo : aire sous la parabole.", 10)], APPRO)
P['1SPE-427'] = ([b('autre', "Monte-Carlo : estimation de π.", 10)], APPRO)
P['1SPE-345'] = ([b('autre', "Plusieurs épreuves indépendantes (au-delà de deux), sur des exemples.", 10)], APPRO)
P['1SPE-346'] = ([b('autre', "Marches aléatoires, sur des exemples.", 10)], APPRO)

# ---------- Variables aléatoires réelles (BO p.10-11)
P['1SPE-347'] = ([b('autre', "Variable aléatoire réelle sur un univers fini, fonction de l'univers dans ℝ.", 10)], None)
P['1SPE-348'] = ([b('autre', "Loi d'une variable aléatoire à valeurs en nombre fini.", 10)], None)
P['1SPE-349'] = ([b('faits', "Espérance E(X) = Σ xᵢ P(X = xᵢ).", 10)], None)
P['1SPE-350'] = ([b('faits', "Variance V(X) = E((X − E(X))²), écart type σ(X) = √V(X).", 10)], None)
P['1SPE-351'] = ([b('faits', "Linéarité de l'espérance.", 10)],
                 "⚠ Le BO dit « linéarité de l'espérance » sans préciser : E(aX + b) seulement, ou aussi E(X + Y) (sommes de variables aléatoires : terminale) ? Question l1s-6.")
P['1SPE-352'] = ([b('faits', "V(X) = E(X²) − E(X)².", 10)], None)
NOT = {'liste': ['{X = a}', '{X ⩽ a}', 'P(X = a)', 'P(X ⩽ a)']}
P['1SPE-353'] = ([b('format', "Notations {X = a}, {X ⩽ a}, P(X = a), P(X ⩽ a), interprétées en situation.", 11, NOT)], None)
P['1SPE-428'] = ([b('format', "Notations {X = a}, {X ⩽ a}, P(X = a), P(X ⩽ a).", 11, NOT)], None)
P['1SPE-429'] = ([b('format', "De la langue naturelle aux notations {X = a}, {X ⩽ a}, P(X = a), P(X ⩽ a).", 11, NOT)], None)
P['1SPE-430'] = ([b('format', "Des notations {X = a}, {X ⩽ a}, P(X = a), P(X ⩽ a) à la langue naturelle.", 11, NOT)], None)
P['1SPE-354'] = ([b('autre', "Modélisation d'une situation par une variable aléatoire réelle (univers fini).", 11)],
                 "⚠ libellé : le BO (p.11) dit « Modéliser une situation à l'aide d'une variable aléatoire » ; « définir … et donner ses valeurs possibles » est une reformulation qui n'est pas au texte.")
P['1SPE-355'] = ([b('autre', "Loi de probabilité d'une variable aléatoire à valeurs en nombre fini.", 11)], None)
P['1SPE-356'] = ([b('autre', "Espérance d'une variable aléatoire à valeurs en nombre fini.", 11)], None)
P['1SPE-357'] = ([b('autre', "Variance et écart type d'une variable aléatoire à valeurs en nombre fini.", 11)], None)
P['1SPE-358'] = ([b('autre', "Espérance dans une résolution de problème (mise pour un jeu équitable, etc.).", 11)], None)
P['1SPE-359'] = ([b('autre', "Algorithme renvoyant l'espérance.", 11)], APPRO)
P['1SPE-431'] = ([b('autre', "Algorithme renvoyant la variance ou l'écart type.", 11)], APPRO)
P['1SPE-360'] = ([b('autre', "Fréquence d'apparition des lettres d'un texte, en français, en anglais.", 11)], APPRO)
P['1SPE-361'] = ([b('fonctions', "Fonction x ↦ E((X − x)²), du second degré.", 11)], APPRO)

# ---------- Expérimentations (BO p.11)
P['1SPE-362'] = ([b('autre', "Simulation avec Python ou un tableur.", 11, {'liste': ['Python', 'tableur']})], None)
P['1SPE-363'] = ([b('autre', "Fonction Python renvoyant la moyenne d'un échantillon de taille n.", 11)], None)
P['1SPE-364'] = ([b('autre', "Sur des exemples, distance entre la moyenne d'un échantillon simulé de taille n et l'espérance.", 11)],
                 "⚠ libellé : le BO (p.11) dit « Étudier sur des exemples la distance … », le libellé dit « calculer l'écart ».")
P['1SPE-365'] = ([b('autre', "N échantillons de taille n simulés (Python ou tableur) ; proportion des cas où |m − μ| ⩽ 2σ/√n.", 11)], None)

# ---------- Automatismes > Fonctions et représentations (BO p.4-5)
P['1SPE-432'] = ([b('figures', "Lecture graphique du signe d'une fonction sur sa courbe.", 5)],
                 "⚠ libellé : la puce du BO (p.5) est « Déterminer graphiquement le signe d'une fonction ou son tableau de variations » ; le libellé n'en garde que le signe.")
P['1SPE-433'] = ([b('figures', "Droite donnée par un point et son coefficient directeur, tracée dans un repère.", 5)],
                 "⚠ libellé : la puce du BO (p.5) est « Tracer une droite donnée par son équation réduite ou par un point et son coefficient directeur » ; le libellé n'en garde que la seconde partie.")
P['1SPE-434'] = ([b('autre', "Coefficient directeur (yB − yA)/(xB − xA) à partir des coordonnées de deux points (xA ≠ xB).", 5)], None)

rows = [r for r in csv.DictReader(open(ROOT + 'points-lycee.csv')) if r['grade'] == G]
rows.sort(key=lambda r: int(r['ordre']))
codes = {r['code'] for r in rows}
assert set(P) == codes, (sorted(codes - set(P)), sorted(set(P) - codes))
points = {}
for r in rows:
    bornes, rem = P[r['code']]
    o = {'libelle': r['libelle'], 'rubrique': r['rubrique'], 'bornes': bornes}
    if rem:
        o['remarque'] = rem
    points[r['code']] = o
out = {G: {'general': general, 'points': points}}
json.dump(out, open(ROOT + '1spe.json', 'w'), ensure_ascii=False, indent='\t')
open(ROOT + '1spe.json', 'a').write('\n')
print('ok', len(points))
