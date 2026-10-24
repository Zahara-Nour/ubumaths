import json, csv
ROOT = '/Users/david/Coding/js/ubumaths-wt-passe-lycee/docs/wip/passe-lycee/bornes/'
rows = {r['code']: r for r in csv.DictReader(open(ROOT + 'points-lycee.csv')) if r['grade'] == 'T_EXP'}
def S(p): return f"BO Tle exp. p.{p}"
def B(aspect, borne, p, force='BO', detail=None):
    b = {'aspect': aspect, 'borne': borne}
    if detail: b['detail'] = detail
    b['source'] = S(p); b['force'] = force
    return b
D = 'déduite'
LIB = "Aucune borne propre : le libellé du BO suffit (hérite des bornes générales)."
COMP = "Point-compétence (modéliser) : pas de grain questionnable propre, il se travaille dans les autres points ; aucune borne."
def DEMO(what): return f"Point « démonstration » : la borne est ce qui est démontré ({what}), rien de plus."
PB = "Problème possible du BO (« en aucun cas obligatoires », p.5)."

general = [
    B('nombres', "Ensemble ℂ des nombres complexes introduit dans ce programme (formes algébrique, trigonométrique, exponentielle). Les matrices sont des tableaux de nombres réels : aucune matrice à coefficients complexes.", '6, 10', detail={'ensemble': 'complexes ; matrices réelles'}),
    B('autre', "Aucune structure algébrique nommée ni exigée (corps, groupe, anneau) : ℂ, 𝕌, 𝕌n et ℤ sont étudiés comme exemples ; pas de polynôme formel.", '4-5'),
    B('fonctions', "« Polynôme » = fonction polynôme à coefficients réels ; on admet qu'un polynôme nul a tous ses coefficients nuls. Équation à coefficients complexes : seulement en problème possible (TEXP-364).", 7, detail={'ensemble': 'polynômes à coefficients réels'}),
    B('nombres', "Arithmétique : entiers relatifs (ℤ) ; division euclidienne d'un élément de ℤ par un élément de ℕ*.", 9, detail={'ensemble': 'entiers relatifs'}),
    B('autre', "Chaînes de Markov à deux ou trois états seulement (marche aléatoire, Ehrenfest, PageRank : problèmes possibles).", '10-11', detail={'liste': [2, 3]}),
    B('autre', "Les « Problèmes possibles » (points d'approfondissement de ce programme) ne sont pas obligatoires et ne figurent pas dans les capacités attendues.", 5),
]

P = {}
def pt(code, bornes, remarque=None):
    assert code in rows, code
    assert code not in P, code
    P[code] = (bornes, remarque)

# --- Nombres complexes : point de vue algébrique (p.6)
pt('TEXP-201', [B('nombres', "Ensemble ℂ, forme algébrique a + ib (a, b réels, i² = −1) ; aucune structure de corps à nommer.", '4, 6')])
pt('TEXP-354', [B('nombres', "Partie réelle et partie imaginaire d'un complexe écrit sous forme algébrique.", 6)])
pt('TEXP-202', [B('operandes', "Opérations dans ℂ : somme, produit, inverse d'un complexe non nul (donc quotient).", 6)],)
pt('TEXP-203', [B('faits', "Conjugué ; propriétés algébriques démontrées au BO : conjugué d'un produit, d'un inverse, d'une puissance entière.", 6, detail={'liste': ['conjugué d\'un produit', 'conjugué d\'un inverse', 'conjugué d\'une puissance entière']})])
pt('TEXP-204', [B('nombres', "Inverse d'un complexe non nul seulement.", 6)])
pt('TEXP-205', [B('faits', "Formule du binôme pour deux complexes et un exposant entier naturel, avec les coefficients binomiaux de Tle spé.", 6)])
pt('TEXP-206', [B('operandes', "Calculs algébriques : opérations, conjugaison, inverse, formule du binôme (contenus de la même section).", 6)])
pt('TEXP-207', [B('autre', "Équation du seul type az = b (inconnue complexe z).", 6, detail={'liste': ['az = b']})])
pt('TEXP-208', [B('autre', "Équation « simple » faisant intervenir z et z̄ ; le BO ne dit pas ce qu'est « simple ».", 6)],
   "Incertitude lte-1 : quelles équations en z et z̄ sont « simples ».")
pt('TEXP-209', [B('faits', "Démontrer que le conjugué d'un produit est le produit des conjugués.", 6)], DEMO("conjugué d'un produit"))
pt('TEXP-355', [B('faits', "Démontrer que le conjugué de l'inverse d'un complexe non nul est l'inverse du conjugué.", 6)], DEMO("conjugué d'un inverse"))
pt('TEXP-356', [B('faits', "Démontrer la formule du conjugué d'une puissance entière.", 6)], DEMO("conjugué d'une puissance entière"))
pt('TEXP-210', [B('faits', "Démontrer la formule du binôme (dans ℂ).", 6)], DEMO("formule du binôme"))

# --- Point de vue géométrique (p.6)
pt('TEXP-211', [B('figures', "Plan euclidien identifié à ℂ : image de a + ib = point de coordonnées (a ; b).", '5-6')])
pt('TEXP-357', [B('figures', "Image du conjugué (symétrique de l'image de z par rapport à l'axe des réels).", 6, D)],
   "Lecture déduite (texte implicite) : le BO dit seulement « Image du conjugué » ; la symétrie par rapport à l'axe des abscisses en est la seule lecture géométrique.")
pt('TEXP-212', [], LIB)
pt('TEXP-358', [], LIB)
pt('TEXP-213', [B('nombres', "Module d'un nombre complexe (forme algébrique : |a + ib| = √(a² + b²)).", 6, D)],
   "Lecture déduite (texte implicite) : le BO nomme le module sans en donner l'expression ; √(a² + b²) découle de |z|² = z z̄ (même section).")
pt('TEXP-359', [B('figures', "Interprétation géométrique : |z| = OM, |z_B − z_A| = AB.", 6, D)],
   "Lecture déduite (texte implicite) : le BO écrit « Interprétation géométrique » sans détail ; la distance est la seule interprétation du module dans la section (« calculer des longueurs », p.8).")
pt('TEXP-214', [B('faits', "Relation |z|² = z z̄.", 6)])
pt('TEXP-215', [B('faits', "|zz'| = |z| |z'| (le module d'une puissance est une démonstration, TEXP-226).", 6)])
pt('TEXP-360', [B('faits', "Module de l'inverse d'un complexe non nul.", 6)])
pt('TEXP-216', [B('nombres', "𝕌 = complexes de module 1 ; aucune structure de groupe à nommer.", '4, 6')])
pt('TEXP-217', [B('faits', "Stabilité de 𝕌 par produit et passage à l'inverse seulement.", 6)])
pt('TEXP-218', [B('nombres', "Arguments d'un complexe non nul (pluriel : définis à 2π près).", 6, D)],
   "Lecture déduite (texte implicite) : « à 2π près » vient du pluriel « arguments » du BO. Valeurs exactes attendues : incertitude lte-2.")
pt('TEXP-361', [B('figures', "Interprétation géométrique : un argument de z est une mesure de l'angle orienté (u⃗, OM⃗).", 6, D)],
   "Lecture déduite (texte implicite) : le BO écrit « Interprétation géométrique » sans détail.")
pt('TEXP-219', [B('format', "Forme trigonométrique r(cos θ + i sin θ), r = |z| > 0, θ un argument.", 6, D)],
   "Lecture déduite (texte implicite) : le BO nomme la forme trigonométrique sans l'écrire ; la formule de Moivre (p.7) fixe l'écriture cos θ + i sin θ.")
pt('TEXP-220', [B('nombres', "Complexe donné sous forme algébrique, ou produit, inverse, puissance de tels complexes (propriétés du module de la section).", 6, D)],
   "Lecture déduite (texte implicite) : le BO dit « déterminer le module » ; les seules propriétés au programme sont module d'un produit, d'un inverse, d'une puissance.")
pt('TEXP-221', [B('nombres', "Complexe non nul.", 6)], "Incertitude lte-2 : arguments exacts limités aux valeurs remarquables ou non.")
pt('TEXP-222', [B('figures', "Placer l'image d'un complexe dans le plan complexe.", 6)])
pt('TEXP-223', [B('figures', "Lire l'affixe d'un point du plan complexe.", 6)])
pt('TEXP-224', [B('faits', "Démontrer |z|² = z z̄.", 6)], DEMO("|z|² = z z̄"))
pt('TEXP-225', [B('faits', "Démontrer |zz'| = |z| |z'|.", 6)], DEMO("module d'un produit"))
pt('TEXP-226', [B('faits', "Démontrer la formule du module d'une puissance.", 6)], DEMO("module d'une puissance"))
pt('TEXP-227', [B('autre', "Suites complexes du seul type z_{n+1} = a z_n + b.", 6, detail={'liste': ['z_{n+1} = a z_n + b']})], PB + " Incertitude lte-9 : transformations z ↦ az + b.")
pt('TEXP-228', [B('faits', "Inégalité triangulaire pour deux complexes et son cas d'égalité.", 6)], PB)
pt('TEXP-229', [B('autre', "Étude expérimentale (logiciel) de l'ensemble de Mandelbrot et d'ensembles de Julia.", 6)], PB)

# --- Nombres complexes et trigonométrie (p.7)
pt('TEXP-230', [B('faits', "Formules d'addition : cos(a ± b), sin(a ± b), établies à partir du produit scalaire.", 7, D, detail={'liste': ['cos(a + b)', 'cos(a − b)', 'sin(a + b)', 'sin(a − b)']})],
   "Lecture déduite (texte implicite) : le BO écrit « formules d'addition » sans les lister ; ce sont les quatre formules de cos et sin d'une somme et d'une différence.")
pt('TEXP-231', [B('faits', "Formules de duplication : cos 2a, sin 2a, établies à partir du produit scalaire.", 7, D, detail={'liste': ['cos(2a)', 'sin(2a)']})],
   "Lecture déduite (texte implicite) : le BO écrit « formules de duplication » sans les lister.")
pt('TEXP-232', [B('format', "Notation e^{iθ} (θ réel).", 7)])
pt('TEXP-233', [B('faits', "Relation fonctionnelle e^{iθ} e^{iθ'} = e^{i(θ + θ')}.", 7, D)],
   "Lecture déduite (texte implicite) : le BO dit « relation fonctionnelle » sans l'écrire ; c'est l'analogue de exp(x + y) = exp(x) exp(y) (1re spé).")
pt('TEXP-234', [B('format', "Forme exponentielle r e^{iθ}, r = |z| > 0.", 7, D)],
   "Lecture déduite (texte implicite) : le BO nomme la forme exponentielle sans l'écrire.")
pt('TEXP-235', [B('faits', "cos θ = (e^{iθ} + e^{−iθ})/2.", 7)])
pt('TEXP-362', [B('faits', "sin θ = (e^{iθ} − e^{−iθ})/(2i).", 7)])
pt('TEXP-236', [B('faits', "cos(nθ) + i sin(nθ) = (cos θ + i sin θ)ⁿ.", 7)])
pt('TEXP-237', [B('format', "Passage de la forme algébrique à la forme trigonométrique ou exponentielle.", 7)], "Incertitude lte-2 : arguments exacts limités aux valeurs remarquables ou non.")
pt('TEXP-238', [B('format', "Passage de la forme trigonométrique ou exponentielle à la forme algébrique.", 7)], "Incertitude lte-2 : arguments exacts limités aux valeurs remarquables ou non.")
pt('TEXP-239', [B('format', "Choix entre forme algébrique, trigonométrique, exponentielle.", 7)])
pt('TEXP-240', [B('autre', "Transformer des expressions trigonométriques par les formules d'Euler, contextes divers (intégration, suites…).", 7)])
pt('TEXP-363', [B('autre', "Transformer des expressions trigonométriques par la formule de Moivre, contextes divers (intégration, suites…).", 7)])
pt('TEXP-241', [B('operandes', "Puissances de nombres complexes calculées par les formules d'Euler et de Moivre.", 7)])
pt('TEXP-242', [B('faits', "Démontrer une seule des formules d'addition, à partir du produit scalaire.", 7)], DEMO("une des formules d'addition"))

# --- Équations polynomiales (p.7)
pt('TEXP-243', [B('autre', "Équation du second degré à coefficients réels de discriminant négatif : solutions complexes conjuguées.", '5, 7')])
pt('TEXP-244', [B('faits', "Factorisation de zⁿ − aⁿ par z − a.", 7)])
pt('TEXP-245', [B('faits', "P polynôme (coefficients réels) et P(a) = 0 : P se factorise par z − a.", 7)])
pt('TEXP-246', [B('faits', "Un polynôme de degré n a au plus n racines.", 7)])
pt('TEXP-247', [B('autre', "Degré 2 à coefficients réels seulement (coefficients complexes : TEXP-364).", 7, detail={'liste': ['az² + bz + c = 0, a, b, c réels']})])
pt('TEXP-248', [B('autre', "Degré 3 à coefficients réels, une racine connue.", 7)], "Incertitude lte-3 : racine « connue » = donnée par l'énoncé, ou à trouver.")
pt('TEXP-249', [B('autre', "Polynôme (coefficients réels) dont une racine est connue ; factorisation par z − a.", 7)], "Incertitude lte-3 : racine « connue » = donnée par l'énoncé, ou à trouver.")
pt('TEXP-250', [B('faits', "Démontrer la factorisation de zⁿ − aⁿ par z − a.", 7)], DEMO("factorisation de zⁿ − aⁿ"))
pt('TEXP-251', [B('faits', "Démontrer la factorisation de P(z) par z − a si P(a) = 0.", 7)], DEMO("factorisation par z − a"))
pt('TEXP-252', [B('faits', "Démontrer qu'une équation polynomiale a au plus autant de solutions que son degré.", 7)], DEMO("nombre de solutions ≤ degré"))
pt('TEXP-253', [B('autre', "Racines carrées d'un nombre complexe.", 7)], PB)
pt('TEXP-364', [B('autre', "Équation du second degré à coefficients complexes.", 7)], PB)
pt('TEXP-254', [B('faits', "Formules de Viète (somme et produit des racines lus sur le polynôme).", '5, 7')], PB)
pt('TEXP-255', [B('autre', "Résolution par radicaux de l'équation de degré 3 seulement.", 7)], PB)

# --- Utilisation des complexes en géométrie (p.8)
pt('TEXP-256', [B('figures', "|(c − a)/(b − a)| = AC/AB, A, B, C points d'affixes a, b, c, A ≠ B.", 8, D)],
   "Lecture déduite (texte implicite) : le BO dit « interprétation géométrique du module » sans l'écrire.")
pt('TEXP-365', [B('figures', "arg((c − a)/(b − a)) = (AB⃗, AC⃗) à 2π près, A ≠ B, A ≠ C.", 8, D)],
   "Lecture déduite (texte implicite) : le BO dit « interprétation géométrique d'un argument » sans l'écrire.")
pt('TEXP-257', [B('nombres', "𝕌n = { e^{2ikπ/n}, k = 0, …, n − 1 }.", 8, D)],
   "Lecture déduite (texte implicite) : le BO dit « description de l'ensemble 𝕌n » ; la description est celle qu'établit la démonstration TEXP-266.")
pt('TEXP-258', [B('figures', "Images des racines n-ièmes de l'unité : sommets d'un polygone régulier à n côtés inscrit dans le cercle unité.", 8, D)],
   "Lecture déduite (texte implicite) : le BO dit « représentation géométrique » ; le lien aux polygones réguliers est la capacité TEXP-265.")
pt('TEXP-259', [B('nombres', "Cas n = 2, 3, 4 seulement.", 8, detail={'liste': [2, 3, 4]})])
pt('TEXP-260', [B('figures', "Démontrer un alignement dans une configuration du plan, par les complexes.", 8)], "Incertitude lte-9 : transformations z ↦ az + b.")
pt('TEXP-261', [B('figures', "Démontrer une orthogonalité dans une configuration du plan, par les complexes.", 8)], "Incertitude lte-9 : transformations z ↦ az + b.")
pt('TEXP-262', [B('figures', "Calculer des longueurs dans une configuration du plan, par les complexes.", 8)])
pt('TEXP-263', [B('figures', "Calculer des angles dans une configuration du plan, par les complexes.", 8)], "Incertitudes lte-2 (arguments exacts limités aux valeurs remarquables ou non) et lte-9 (transformations z ↦ az + b).")
pt('TEXP-264', [B('figures', "Déterminer des ensembles de points du plan par les complexes (le BO ne liste pas les ensembles).", 8)], "Incertitude lte-9 : transformations z ↦ az + b.")
pt('TEXP-265', [B('figures', "Configurations liées aux polygones réguliers.", 8)])
pt('TEXP-266', [B('faits', "Démontrer la description de 𝕌n.", 8)], DEMO("détermination de 𝕌n"))
pt('TEXP-267', [B('nombres', "Lignes trigonométriques de 2π/5.", 8)], PB)
pt('TEXP-366', [B('figures', "Construction du pentagone régulier à la règle et au compas.", 8)], PB)
pt('TEXP-268', [B('faits', "Somme des racines n-ièmes de l'unité.", 8)], PB)
pt('TEXP-269', [B('nombres', "Racines n-ièmes d'un nombre complexe.", 8)], PB)
pt('TEXP-270', [B('autre', "Transformation de Fourier discrète.", 8)], PB)

# --- Arithmétique (p.8-9)
pt('TEXP-271', [B('nombres', "Divisibilité dans ℤ (entiers relatifs).", 9)])
pt('TEXP-272', [B('nombres', "Dividende dans ℤ (négatif possible), diviseur dans ℕ* ; a = bq + r avec 0 ≤ r < b.", 9, D, detail={'ensemble': 'a ∈ ℤ, b ∈ ℕ*'})],
   "Lecture déduite (texte implicite) : le BO fixe les ensembles (ℤ, ℕ*) mais n'écrit pas la condition 0 ≤ r < b, qui définit la division euclidienne.")
pt('TEXP-273', [B('format', "Congruences dans ℤ, notation a ≡ b [n].", 9)])
pt('TEXP-274', [B('faits', "Compatibilité avec l'addition et la multiplication (donc les puissances) ; pas de division.", 9, D)],
   "Lecture déduite (texte implicite) : le BO dit « avec les opérations » ; seules somme et produit sont compatibles, l'inverse modulo n étant une capacité à part (TEXP-287).")
pt('TEXP-275', [B('nombres', "PGCD de deux entiers.", 9), B('autre', "Pas de PPCM.", 9, D)],
   "Lecture déduite (texte implicite) : le PPCM n'apparaît nulle part dans le BO de maths expertes ni dans ceux de 2de, 1re et Tle spé.")
pt('TEXP-276', [B('autre', "Algorithme d'Euclide (calcul du PGCD de deux entiers).", 9)])
pt('TEXP-277', [B('nombres', "Couples (deux entiers) premiers entre eux.", 9)])
pt('TEXP-278', [B('faits', "Théorème de Bézout (deux entiers).", 9)])
pt('TEXP-279', [B('faits', "Théorème de Gauss.", 9)])
pt('TEXP-280', [], LIB)
pt('TEXP-281', [B('faits', "L'ensemble des nombres premiers est infini.", 9)])
pt('TEXP-282', [B('faits', "Existence et unicité de la décomposition en produit de facteurs premiers.", 9)])
pt('TEXP-283', [], LIB)
pt('TEXP-284', [B('nombres', "Diviseurs d'un entier (divisibilité dans ℤ).", 9)])
pt('TEXP-285', [B('nombres', "PGCD de deux entiers.", 9), B('autre', "Pas de PPCM.", 9, D)],
   "Lecture déduite (texte implicite) : le PPCM n'apparaît nulle part dans le BO de maths expertes ni dans ceux de 2de, 1re et Tle spé.")
pt('TEXP-286', [B('autre', "Une congruence du seul type ax ≡ b [n] ; systèmes de congruences (lemme chinois) : problème possible TEXP-301.", 9, detail={'liste': ['ax ≡ b [n]']})])
pt('TEXP-287', [B('nombres', "Inverse de a modulo n, seulement lorsque a et n sont premiers entre eux.", 9)])
pt('TEXP-288', [B('autre', "Tests de divisibilité établis par les congruences (le BO ne les liste pas).", '8-9', D)],
   "Lecture déduite (texte implicite) : le BO présente les tests de divisibilité comme une application de l'étude des congruences (p.8).")
pt('TEXP-289', [B('autre', "Le BO ne liste pas les tests de divisibilité.", 9)])
pt('TEXP-290', [B('nombres', "« Certains nombres » : aucune liste au BO (Mersenne, Fermat, Carmichael : problèmes possibles).", 9)])
pt('TEXP-291', [B('autre', "Aucun chiffrement imposé pour l'attendu ; affine, Vigenère, Hill, RSA sont des problèmes possibles (TEXP-305, TEXP-370, TEXP-371, TEXP-308).", 9)])
pt('TEXP-292', [B('autre', "Équations diophantiennes « simples » ; le BO ne dit pas lesquelles.", '8-9')], "Incertitude lte-4 : quelles équations diophantiennes sont « simples ».")
pt('TEXP-293', [B('faits', "Démontrer que le PGCD de a et b s'écrit ax + by, (x, y) ∈ ℤ².", 9)], DEMO("écriture ax + by du PGCD"))
pt('TEXP-294', [B('faits', "Démontrer le théorème de Gauss.", 9)], DEMO("théorème de Gauss"))
pt('TEXP-295', [B('faits', "Démontrer que l'ensemble des nombres premiers est infini.", 9)], DEMO("infinité des nombres premiers"))
pt('TEXP-296', [B('autre', "Algorithme d'Euclide pour le PGCD de deux nombres.", 9)])
pt('TEXP-297', [B('autre', "Calcul d'un couple de Bézout par l'algorithme d'Euclide.", 9)])
pt('TEXP-298', [B('autre', "Crible d'Ératosthène.", 9)])
pt('TEXP-299', [B('autre', "Décomposition d'un entier en facteurs premiers.", 9)])
pt('TEXP-300', [B('fonctions', "Racines rationnelles d'un polynôme à coefficients entiers.", 9)], PB)
pt('TEXP-301', [B('autre', "Lemme chinois et applications à des situations concrètes.", 9)], PB)
pt('TEXP-302', [B('faits', "Démonstrations du petit théorème de Fermat.", 9)], PB)
pt('TEXP-303', [B('autre', "Codes barres.", 9)], PB)
pt('TEXP-367', [B('autre', "Code ISBN.", 9)], PB)
pt('TEXP-368', [B('autre', "Clé du RIB.", 9)], PB)
pt('TEXP-369', [B('autre', "Code Insee.", 9)], PB)
pt('TEXP-304', [B('autre', "Tests de primalité : notion de témoin, nombres de Carmichael.", 9)], PB)
pt('TEXP-305', [B('autre', "Chiffrement affine.", 9)], PB)
pt('TEXP-370', [B('autre', "Chiffrement de Vigenère.", 9)], PB)
pt('TEXP-371', [B('autre', "Chiffrement de Hill.", 9)], PB)
pt('TEXP-306', [B('nombres', "Nombres premiers de Mersenne.", 9)], PB)
pt('TEXP-372', [B('nombres', "Nombres premiers de Fermat.", 9)], PB)
pt('TEXP-307', [B('autre', "Exemples simples de codes correcteurs.", 9)], PB)
pt('TEXP-308', [B('autre', "Système cryptographique RSA.", 9)], PB)
pt('TEXP-309', [B('autre', "Triplets pythagoriciens.", 9)], PB)
pt('TEXP-310', [B('nombres', "Sommes de deux carrés, étudiées par les entiers de Gauss.", 9)], PB)
pt('TEXP-311', [B('autre', "Équation de Pell-Fermat.", 9)], PB)

# --- Graphes et matrices (p.10-11)
pt('TEXP-312', [B('figures', "Graphe, sommets, arêtes (vocabulaire du BO, graphe non orienté).", 10, D)],
   "Lecture déduite (texte implicite) : « arêtes » et « chaîne » sont le vocabulaire des graphes non orientés ; l'orientation n'apparaît au BO que pour les chaînes de Markov. Voir lte-5.")
pt('TEXP-313', [B('figures', "Graphe complet, comme exemple.", 10)])
pt('TEXP-373', [B('format', "Vocabulaire du BO seulement : sommets adjacents, degré, ordre, chaîne, longueur d'une chaîne, graphe connexe.", 10)])
pt('TEXP-314', [B('format', "Vocabulaire du BO seulement : sommets adjacents, degré, ordre, chaîne, longueur d'une chaîne, graphe connexe.", 10)])
pt('TEXP-374', [B('format', "Vocabulaire du BO seulement : sommets adjacents, degré, ordre, chaîne, longueur d'une chaîne, graphe connexe.", 10)])
pt('TEXP-315', [B('format', "Chaîne et longueur d'une chaîne ; ni cycle ni chaîne eulérienne (graphes eulériens : problème possible TEXP-348).", '10-11', D)],
   "Lecture déduite (texte implicite) : le mot « cycle » n'est pas au BO ; les graphes eulériens sont un problème possible.")
pt('TEXP-316', [B('format', "Vocabulaire du BO seulement : sommets adjacents, degré, ordre, chaîne, longueur d'une chaîne, graphe connexe.", 10)])
pt('TEXP-317', [B('nombres', "Matrice = tableau de nombres réels.", 10, detail={'ensemble': 'réels'})])
pt('TEXP-318', [B('format', "Matrice carrée, colonne, ligne (vocabulaire du BO).", 10)])
pt('TEXP-375', [B('format', "Matrice carrée, colonne, ligne (vocabulaire du BO).", 10)])
pt('TEXP-376', [B('format', "Matrice carrée, colonne, ligne (vocabulaire du BO).", 10)])
pt('TEXP-319', [B('operandes', "Opérations : somme, produit par un réel, produit de matrices ; ni transposée ni déterminant.", 10, D)],
   "Lecture déduite (texte implicite) : le BO écrit « Opérations » sans liste ; la transposée et le déterminant n'apparaissent nulle part au BO. Voir lte-7 pour le déterminant d'ordre 2.")
pt('TEXP-320', [B('nombres', "Inverse d'une matrice carrée.", 10)], "Incertitudes lte-6 (ordre des matrices) et lte-7 (formule du déterminant d'ordre 2).")
pt('TEXP-321', [B('operandes', "Puissances d'une matrice carrée ; calculs donnés en exemple pour les ordres 2 et 3.", 10, detail={'liste': [2, 3]})], "Incertitude lte-6 : ordre des matrices.")
pt('TEXP-322', [B('figures', "Matrice d'adjacence d'un graphe.", 10)], "Incertitudes lte-5 (graphes orientés) et lte-6 (ordre des matrices).")
pt('TEXP-323', [B('figures', "Transformations géométriques du plan représentées par une matrice ; le BO ne les liste pas.", 10)], "Incertitude lte-8 : quelles transformations.")
pt('TEXP-324', [B('autre', "Écriture matricielle d'un système linéaire.", 10)], "Incertitude lte-6 : taille des systèmes.")
pt('TEXP-325', [B('autre', "Écriture matricielle d'une suite récurrente.", 10)])
pt('TEXP-326', [B('operandes', "Matrices carrées d'ordre 2 ou 3 seulement.", 10, detail={'liste': [2, 3]})])
pt('TEXP-327', [B('autre', "Récurrence du seul type U_{n+1} = AU_n + C.", 10, detail={'liste': ['U_{n+1} = AU_n + C']})])
pt('TEXP-328', [B('autre', "Chaîne de Markov à deux ou trois états ; graphe orienté pondéré associé.", 10, detail={'liste': [2, 3]})])
pt('TEXP-329', [B('autre', "Deux ou trois états.", 10, detail={'liste': [2, 3]})])
pt('TEXP-330', [B('format', "Distribution initiale = matrice ligne π0.", 10)])
pt('TEXP-331', [B('autre', "Matrice de transition d'une chaîne à deux ou trois états, graphe pondéré associé.", 10, detail={'liste': [2, 3]})])
pt('TEXP-332', [B('autre', "Interprétation du coefficient (i, j) de Pⁿ, chaîne à deux ou trois états.", 10, detail={'liste': [2, 3]})])
pt('TEXP-333', [B('format', "Distribution après n transitions = matrice ligne π0Pⁿ (convention ligne).", 10)])
pt('TEXP-334', [B('autre', "Distributions invariantes d'une chaîne à deux ou trois états ; l'étude asymptotique est un problème possible (TEXP-350).", '10-11', detail={'liste': [2, 3]})])
pt('TEXP-335', [], COMP)
pt('TEXP-336', [], COMP)
pt('TEXP-337', [B('autre', "Chaîne de Markov à deux ou trois états.", 11, detail={'liste': [2, 3]})])
pt('TEXP-338', [B('nombres', "Inverse d'une matrice carrée.", 11)], "Incertitudes lte-6 (ordre des matrices) et lte-7 (formule du déterminant d'ordre 2).")
pt('TEXP-339', [B('operandes', "Puissances d'une matrice carrée.", 11)], "Incertitude lte-6 : ordre des matrices.")
pt('TEXP-340', [B('autre', "Système linéaire résolu par le calcul matriciel, notamment l'inverse.", 11)], "Incertitude lte-6 : taille des systèmes.")
pt('TEXP-341', [B('autre', "Suite récurrente linéaire, étudiée par le calcul matriciel (type U_{n+1} = AU_n + C des contenus).", '10-11', D)],
   "Lecture déduite (texte implicite) : la capacité ne nomme pas le type de suite ; le seul type des contenus (p.10) est U_{n+1} = AU_n + C.")
pt('TEXP-342', [B('autre', "Nombre de chemins de longueur donnée entre deux sommets, par les puissances de la matrice d'adjacence.", 11)], "Incertitudes lte-5 (graphes orientés) et lte-6 (ordre des matrices).")
pt('TEXP-343', [B('autre', "Chaîne de Markov à deux ou trois états : calcul de probabilités.", 11, detail={'liste': [2, 3]})])
pt('TEXP-344', [B('autre', "Chaîne de Markov à deux ou trois états : probabilité invariante.", 11, detail={'liste': [2, 3]})])
pt('TEXP-345', [B('faits', "Démontrer que le nombre de chemins de longueur n se lit sur la puissance n-ième de la matrice d'adjacence.", 11)], DEMO("nombre de chemins et matrice d'adjacence"))
pt('TEXP-346', [B('faits', "Démontrer l'expression de la probabilité de passer de l'état i à l'état j en n transitions.", 11)], DEMO("probabilité de transition en n étapes"))
pt('TEXP-347', [B('faits', "Démontrer l'expression de la matrice ligne de la distribution après n transitions.", 11)], DEMO("distribution π0Pⁿ"))
pt('TEXP-348', [B('figures', "Graphes eulériens.", 11)], PB)
pt('TEXP-349', [B('fonctions', "Interpolation polynomiale.", 11)], PB)
pt('TEXP-350', [B('autre', "Marche aléatoire sur un graphe, étude asymptotique.", 11)], PB)
pt('TEXP-351', [B('autre', "Modèle de diffusion d'Ehrenfest.", 11)], PB)
pt('TEXP-352', [B('autre', "Modèle « proie-prédateur » discrétisé : deux suites récurrentes couplées.", 11)], PB)
pt('TEXP-353', [B('autre', "Algorithme PageRank.", 11)], PB)

missing = set(rows) - set(P)
assert not missing, sorted(missing)
out = {'T_EXP': {'general': general, 'points': {}}}
for code in sorted(rows, key=lambda c: int(rows[c]['ordre'])):
    b, rem = P[code]
    e = {'libelle': rows[code]['libelle'], 'rubrique': rows[code]['rubrique'], 'bornes': b}
    if rem: e['remarque'] = rem
    out['T_EXP']['points'][code] = e
json.dump(out, open(ROOT + 'texp.json', 'w'), ensure_ascii=False, indent='\t')
open(ROOT + 'texp.json', 'a').write('\n')
print(len(P))
