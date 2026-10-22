# Bornes des points de 1re, mathématiques de l'enseignement scientifique (grade 1_GEN). Source : BO 1re ES (bo/1gen.txt).
PROG = '1re ES'


def b(aspect, borne, p, force='BO', detail=None):
    d = {'aspect': aspect, 'borne': borne}
    if detail is not None:
        d['detail'] = detail
    d['source'] = f'BO {PROG} p.{p}'
    d['force'] = force
    return d


COMP = "Point-compétence ({}) : pas de grain questionnable propre ; un modèle s'y rattache seulement s'il fait {}, sous les bornes générales."

GENERAL = [
    b('autre', "« Seuls sont exigibles des élèves les contenus mathématiques de la colonne de droite, mobilisés dans les capacités attendues » : les « Situations et problèmes » (fonction affine par morceaux de l'impôt, point d'équilibre offre/demande, Monty Hall, modèle de Malthus…) sont des contextes possibles, pas des contenus.", 3),
    b('autre', "Les automatismes de seconde « doivent être entretenus » : ils restent dans le champ du module.", 3),
    b('fonctions', "Familles de fonctions du module : fonctions affines (remobilisées), polynômes de degré 2, fonctions exponentielles x ↦ aˣ ; les fonctions de seconde restent connues.", '5-7',
      detail={'liste': ['affine', 'polynôme de degré 2', 'x ↦ aˣ']}),
    b('fonctions', "Fonctions exponentielles x ↦ aˣ seulement pour a > 0 et x ⩾ 0.", 7, detail={'a': '> 0', 'x': '⩾ 0'}),
    b('autre', "Second degré : racines et signe seulement sous forme factorisée ; « le calcul des racines à l'aide du discriminant ne figure pas au programme » ; aucune formule (sommet, axe) n'est attendue.", 6),
    b('fonctions', "Pas de dérivée ni de logarithme : absents du BO du module.", '3-7'),
    b('format', "Suites : notation fonctionnelle u(n) d'abord, puis notation indicielle uₙ.", 5),
    b('autre', "Composante informatique (algorithmique, programmation, tableur) reposant sur « un nombre limité d'éléments de syntaxe » ; outils : calculatrice, tableur, logiciel de géométrie dynamique ou de programmation.", '2-3'),
]

P = {}


def pt(code, *bornes, rem=None):
    assert code not in P, code
    P[code] = (list(bornes), rem)


# ---------- Analyse de l'information chiffrée ----------
pt('1GEN-001', b('autre', "Deux caractères qualitatifs ; diagrammes en barres, diagrammes circulaires.", 4, detail={'liste': ['diagramme en barres', 'diagramme circulaire']}))
pt('1GEN-002', b('autre', "Deux caractères quantitatifs ; nuage de points.", 4))
AJ = b('autre', "Ajustements proposés : au jugé, droite de Mayer, moindres carrés ; « aucune connaissance théorique n'est attendue ».", 4, detail={'liste': ['au jugé', 'droite de Mayer', 'moindres carrés']})
pt('1GEN-003', AJ)
pt('1GEN-004')
pt('1GEN-005', b('autre', "À partir d'un ajustement affine.", 4))
pt('1GEN-006', b('autre', "Tableur ; tableau ou diagramme.", 4))
pt('1GEN-007', AJ)
pt('1GEN-045', AJ)
pt('1GEN-008')

# ---------- Automatismes ----------
pt('1GEN-062', b('autre', "Lecture graphique, fonction donnée par sa courbe.", 4),
   rem="⚠ libellé : la même puce du BO ajoute « ou son tableau de variations » ; cette partie n'est pas dans le libellé (non corrigé).")
pt('1GEN-063', b('autre', "Droite donnée par un point et son coefficient directeur.", 4))
pt('1GEN-064', b('autre', "Coordonnées de deux points de la droite.", 4))

# ---------- Phénomènes aléatoires ----------
IND = b('format', "Définition : A et B indépendants si P_B(A) = P(A), avec P(B) ≠ 0.", 5)
pt('1GEN-009', IND, rem="Caractérisation par P(A ∩ B) = P(A) × P(B) : question l1g-1.")
pt('1GEN-010', b('autre', "Épreuves de Bernoulli identiques et indépendantes ; pas de loi binomiale ni de coefficient binomial (absents du BO).", 5),
   rem="Nombre d'épreuves : les capacités disent n ⩽ 4, le contenu ne borne pas ; question l1g-2.")
BER = b('nombres', "n ⩽ 4 épreuves.", 5, detail={'n_max': 4})
pt('1GEN-011', BER, b('autre', "Arbre de probabilités.", 5))
pt('1GEN-046', BER, b('autre', "Calcul à l'aide de l'arbre.", 5))
pt('1GEN-012', IND, rem="Question l1g-1.")
pt('1GEN-047', IND, rem="Question l1g-1.")

# ---------- Modélisation quadratique ----------
pt('1GEN-022', b('fonctions', "Polynômes de degré 2 ; allure de la courbe (parabole).", 6))
pt('1GEN-052', b('autre', "Aucune formule attendue (pas x = −b/(2a)) ; l'axe se détermine par exemple en résolvant f(x) = c.", 6))
pt('1GEN-053', b('autre', "Sommet en lien avec la symétrie ; aucune formule attendue.", 6))
pt('1GEN-054')
FF = b('format', "Polynôme donné sous forme factorisée (produit de facteurs du premier degré) ; pas de discriminant.", 6)
pt('1GEN-023', FF)
pt('1GEN-055', FF)
pt('1GEN-024', b('fonctions', "Formes x ↦ ax², x ↦ ax² + c, x ↦ a(x − x₁)(x − x₂) seulement.", 6, detail={'liste': ['ax²', 'ax² + c', 'a(x − x₁)(x − x₂)']}))
pt('1GEN-025', b('fonctions', "x ↦ ax² + bx + c ; aucune formule attendue ; axe de symétrie par exemple en résolvant f(x) = c.", 6))
pt('1GEN-026', FF)
pt('1GEN-027', FF)

# ---------- Variation exponentielle ----------
GEO = b('nombres', "Suites géométriques à termes strictement positifs (raison positive).", 6)
GEO_LIB = "⚠ libellé : le BO place ce contenu sous « Suites géométriques à termes strictement positifs » ; le libellé ne le redit pas (la borne s'applique)."
pt('1GEN-028', GEO, b('format', "Définition par relation de récurrence.", 6))
pt('1GEN-029', GEO, rem=GEO_LIB)
pt('1GEN-030', GEO, rem=GEO_LIB)
pt('1GEN-031', GEO, rem=GEO_LIB)
pt('1GEN-032', b('fonctions', "x ↦ aˣ, a > 0, x ⩾ 0.", 7))
pt('1GEN-033', b('autre', "Propriétés algébriques admises, par extension des propriétés des puissances entières.", '6-7'))
pt('1GEN-034')
pt('1GEN-035')
pt('1GEN-036', b('format', "Exposant 1/n.", 7))
pt('1GEN-037', b('autre', "Taux moyen correspondant à n évolutions successives, à l'aide de l'exposant 1/n.", 7, force='déduite'),
   rem="Lecture déduite (texte implicite) : le BO place « Cas particulier de l'exposant 1/n » juste avant ce contenu, sans écrire le lien ; aucun logarithme n'est au programme.")
MODEXP = b('fonctions', "Modèles : suites géométriques à termes strictement positifs, fonctions x ↦ aˣ.", '6-7')
pt('1GEN-038', MODEXP, b('autre', "Phénomène discret ou continu, croissance ou décroissance.", 7))
pt('1GEN-056', MODEXP, rem="Point en partie compétence (modéliser) : un modèle s'y rattache s'il fait choisir ou écrire le modèle exponentiel d'une situation.")
pt('1GEN-039', GEO, b('format', "Suite définie par une relation fonctionnelle.", 7))
pt('1GEN-057', GEO, b('format', "Suite définie par une relation de récurrence.", 7))
pt('1GEN-040', rem="Méthode : voir 1GEN-037 (exposant 1/n).")
pt('1GEN-041', GEO)
pt('1GEN-058', GEO)
pt('1GEN-042')
pt('1GEN-059')
pt('1GEN-043')
SE = b('autre', "Croissance ou décroissance exponentielle ; pas de logarithme (absent du programme).", '3-7')
pt('1GEN-044', SE, b('autre', "Par le calcul.", 7))
pt('1GEN-060', SE, b('autre', "À l'aide d'une représentation graphique.", 7))
pt('1GEN-061', SE, b('autre', "En utilisant un outil numérique.", 7))

# ---------- Variation linéaire ----------
pt('1GEN-013', b('format', "Définition par la relation de récurrence.", 5))
pt('1GEN-014')
pt('1GEN-015', b('autre', "Sens de variation, en parallèle possible avec celui des fonctions affines.", 5))
pt('1GEN-016')
MODLIN = b('fonctions', "Modèles : suites arithmétiques, fonctions affines (taux d'accroissement constant).", 5)
pt('1GEN-017', MODLIN, b('autre', "Phénomène discret ou continu de croissance linéaire.", 6))
pt('1GEN-048', MODLIN, rem="Point en partie compétence (modéliser) : un modèle s'y rattache s'il fait choisir ou écrire le modèle linéaire d'une situation.")
pt('1GEN-018', b('format', "Suite définie par une relation fonctionnelle.", 6))
pt('1GEN-049', b('format', "Suite définie par une relation de récurrence.", 6))
pt('1GEN-019')
pt('1GEN-050')
AFF = b('fonctions', "Fonctions affines, remobilisées de seconde (« travail succinct ») : représentation graphique, sens de variation, lien entre taux d'accroissement et coefficient directeur.", '5-6')
pt('1GEN-020', AFF)
pt('1GEN-051', AFF)
pt('1GEN-021', b('autre', "Croissance linéaire.", 6))
