"""Écrit les 4 modèles du lot 5 « approfondissements : suites » de la 1re spé
dans scripts/questions/1spe-approfondissements-5/.

Phase 0 validée par David le 2026-11-04 (D3 et D4 du journal
« docs/wip/questions-1spe-demonstrations-progress.md », § 9), un point par modèle :

| # | Point    | Titre                                         | Catégorie, niveau                            | Sous-notion (rangement)                                |
| 1 | 1SPE-240 | Tour de Hanoï                                 | Suites › Apprivoiser › Approfondissements, 1 | Généralités sur les suites › explicite ou par récurrence |
| 2 | 1SPE-241 | Somme des n premiers carrés                   | Suites › Sommes › Approfondissements, 1      | Généralités sur les suites › sommes de termes (NEUVE)  |
| 3 | 1SPE-381 | Somme des n premiers cubes                    | Suites › Sommes › Approfondissements, 2      | Généralités sur les suites › sommes de termes (NEUVE)  |
| 4 | 1SPE-242 | Emprunt remboursé par annuités constantes     | Suites › Modélisation › Approfondissements, 1 | Modèles d'évolution › emprunt (NEUVE)                 |

Forme (D3, Q2) : exercices d'application à valeurs tirées, 3 variations ; formule donnée dans
l'énoncé pour 241 et 381 (le BO ne demande pas de la connaître) ; pas de formule de l'annuité
(D4 : sans logarithme, l'élève l'appliquerait à l'aveugle).

Approfondissements « en aucun cas obligatoires » (BO 1re spé p.3) : ces modèles APPLIQUENT le
résultat, ils ne le démontrent pas.

    python3 docs/wip/questions/lot-1spe-approfondissements-5.py scripts/questions/1spe-approfondissements-5
"""
import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]


def spec(desc, vi, answer, status, variables=None):
    expected = {'status': status}
    if status == 'bad_form':
        expected['constraintViolations'] = ['form']
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': [answer], 'expected': expected}


def modele(nom, title, description, domain, level, variations, specs):
    return nom, {'title': title, 'description': description, 'grades': ['1_SPE'],
                 'theme': 'Suites', 'domain': domain, 'subdomain': 'Approfondissements',
                 'level': level, 'delay': 90, 'status': 'draft',
                 'shared': {},
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def ev(x):
    return '{{eval:' + x + '}}'


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def choix(lignes):
    return '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in lignes) + '```'


def case(statement, variables, attendu, steps):
    """Variation à une case ouverte (`?` dans une formule de l'énoncé)."""
    return {'statement': statement, 'variables': variables,
            'blanks': [attendu if isinstance(attendu, dict) else {'expectedAnswer': attendu}],
            'correction': {'steps': steps}}


def justification(statement, variables, bonne, autres, steps):
    """Variation à une case choix : la première proposition est la bonne (index 0)."""
    return {'statement': statement + choix([bonne] + autres), 'variables': variables,
            'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}


def specs_choix(vi, juste, erreurs, variables=None):
    out = [spec(juste, vi, '0', 'correct', variables)]
    for k, erreur in enumerate(erreurs, start=1):
        out.append(spec('Erreur : ' + erreur, vi, str(k), 'incorrect', variables))
    return out


MODELES = []

# --- 1. 1SPE-240 : Tour de Hanoï, hₙ = 2ⁿ − 1 -------------------------------------------------

INTRO_240 = ('**Tour de Hanoï.** On dispose de $n$ disques de tailles différentes, empilés du plus'
             ' grand au plus petit sur le premier de trois piquets. On veut déplacer toute la pile'
             ' sur le troisième piquet, un disque à la fois, sans jamais poser un disque sur un'
             ' disque plus petit. On note $h_n$ le nombre minimal de déplacements ; $h_1=1$.\n\n'
             'Pour déplacer $n+1$ disques, on déplace les $n$ disques du haut sur le piquet du'
             ' milieu ($h_n$ déplacements), puis le grand disque sur le troisième piquet'
             ' ($1$ déplacement), puis les $n$ disques par-dessus ($h_n$ déplacements). Ainsi,'
             ' pour tout $n\\geqslant 1$ :\n\n$$h_{n+1}=2h_n+1$$\n\n')

V240_RELATION = case(
    INTRO_240 + 'On sait que $h_{' + ev('k') + '}=' + ev('2^k-1') + '$. Complète.\n\n'
    '$h_{' + ev('k+1') + '}=?$',
    [var('k', '3..7')], ev('2^(k+1)-1'),
    ['$h_{' + ev('k+1') + '}=2\\times h_{' + ev('k') + '}+1=2\\times' + ev('2^k-1') + '+1$.',
     'Donc $h_{' + ev('k+1') + '}=' + col(ev('2^(k+1)-1')) + '$.',
     'Ne pas oublier le $+1$ : c\'est le déplacement du grand disque.'])
V240_RAISON = case(
    INTRO_240 + 'On pose $v_n=h_n+1$ pour tout $n\\geqslant 1$. Alors'
    ' $v_{n+1}=h_{n+1}+1=2h_n+2$. Complète.\n\n$v_{n+1}=?\\times v_n$',
    [], '2',
    ['$v_{n+1}=2h_n+2=2(h_n+1)=2v_n$.',
     'La suite $(v_n)$ est donc géométrique de raison $' + col('2') + '$, de premier terme'
     ' $v_1=h_1+1=2$.'])
V240_TERME = case(
    INTRO_240 + 'On pose $v_n=h_n+1$ : la suite $(v_n)$ est géométrique de raison $2$, de premier'
    ' terme $v_1=2$. Combien de déplacements faut-il au minimum pour $' + ev('n') + '$ disques ?'
    '\n\n$h_{' + ev('n') + '}=?$',
    [var('n', '5..10')], ev('2^n-1'),
    ['Pour tout $n\\geqslant 1$, $v_n=v_1\\times 2^{n-1}=2\\times 2^{n-1}=2^n$.',
     'Donc $h_n=v_n-1=2^n-1$ et $h_{' + ev('n') + '}=2^{' + ev('n') + '}-1='
     + col(ev('2^n-1')) + '$.',
     'Attention : $v_n=2^n$, mais $h_n=v_n-1$.'])

VARS_240 = {'k': 4, 'n': 6}
MODELES.append(modele(
    '01-tour-de-hanoi', 'Tour de Hanoï',
    'Nombre minimal de déplacements hₙ de la tour de Hanoï (hₙ₊₁ = 2hₙ + 1, h₁ = 1) : terme'
    ' suivant par la relation, raison de la suite auxiliaire vₙ = hₙ + 1, hₙ = 2ⁿ − 1',
    'Apprivoiser', 1,
    [V240_RELATION, V240_RAISON, V240_TERME],
    [spec('h₅ = 31', 0, '31', 'correct', VARS_240),
     spec('Erreur : 30 (oubli du +1)', 0, '30', 'incorrect', VARS_240),
     spec('Erreur : 16 (h₄ + 1)', 0, '16', 'incorrect', VARS_240),
     spec('Erreur : 32 (2⁵)', 0, '32', 'incorrect', VARS_240),
     spec('2', 1, '2', 'correct'),
     spec('Erreur : 1', 1, '1', 'incorrect'),
     spec('Erreur : 3', 1, '3', 'incorrect'),
     spec('h₆ = 63', 2, '63', 'correct', VARS_240),
     spec('2⁶ − 1 non calculé : forme à simplifier', 2, '2^6-1', 'bad_form', VARS_240),
     spec('Erreur : 64 (vₙ au lieu de hₙ)', 2, '64', 'incorrect', VARS_240),
     spec('Erreur : 31 (2ⁿ⁻¹ − 1)', 2, '31', 'incorrect', VARS_240),
     spec('Erreur : 32 (2ⁿ⁻¹)', 2, '32', 'incorrect', VARS_240)]))

# --- 2. 1SPE-241 : 1² + 2² + ⋯ + n² = n(n + 1)(2n + 1)/6 --------------------------------------

FORMULE_241 = ('On admet que, pour tout entier naturel $n$ non nul :\n\n'
               '$$S_n=1^2+2^2+\\cdots+n^2=\\dfrac{n(n+1)(2n+1)}{6}$$\n\n')
CARRES = 'n*(n+1)*(2*n+1)/6'

V241_VALEUR = case(
    FORMULE_241 + 'Calcule $1^2+2^2+\\cdots+' + ev('n') + '^2$.\n\n$S_{' + ev('n') + '}=?$',
    [var('n', '5..20')], ev(CARRES),
    ['On remplace $n$ par $' + ev('n') + '$ : $S_{' + ev('n') + '}=\\dfrac{' + ev('n')
     + '\\times' + ev('n+1') + '\\times' + ev('2*n+1') + '}{6}$.',
     'Donc $S_{' + ev('n') + '}=' + col(ev(CARRES)) + '$.'])
V241_TRANCHE = case(
    FORMULE_241 + 'Calcule $' + ev('a') + '^2+' + ev('a+1') + '^2+\\cdots+' + ev('b')
    + '^2$.\n\n$?$',
    [var('a', '4..8'), var('b', '12..20')],
    ev('b*(b+1)*(2*b+1)/6-(a-1)*a*(2*a-1)/6'),
    ['La somme demandée est $S_{' + ev('b') + '}$ privée des termes $1^2$, …, $' + ev('a-1')
     + '^2$, c\'est-à-dire $S_{' + ev('b') + '}-S_{' + ev('a-1') + '}$.',
     '$S_{' + ev('b') + '}=' + ev('b*(b+1)*(2*b+1)/6') + '$ et $S_{' + ev('a-1') + '}='
     + ev('(a-1)*a*(2*a-1)/6') + '$.',
     'Donc la somme vaut $' + col(ev('b*(b+1)*(2*b+1)/6-(a-1)*a*(2*a-1)/6')) + '$.',
     'Attention : on retire $S_{' + ev('a-1') + '}$, pas $S_{' + ev('a') + '}$ : le terme $'
     + ev('a') + '^2$ fait partie de la somme.'])
V241_DIFFERENCE = case(
    FORMULE_241 + 'Que vaut $S_{n+1}-S_n$ ? Complète.\n\n$S_{n+1}-S_n=?$',
    [], {'expectedAnswer': '(n+1)^2', 'requiredForm': {'pattern': 'u'}},
    ['$S_{n+1}=1^2+2^2+\\cdots+n^2+(n+1)^2$ : c\'est $S_n$ plus un terme.',
     'Donc $S_{n+1}-S_n=' + col('(n+1)^2') + '$, sans utiliser la formule.'])

VARS_241 = {'n': 10, 'a': 5, 'b': 12}
MODELES.append(modele(
    '02-somme-des-carres', 'Somme des n premiers carrés',
    'Formule 1² + 2² + ⋯ + n² = n(n + 1)(2n + 1)/6 donnée : somme pour n tiré, somme de a² à b²'
    ' (différence de deux sommes), Sₙ₊₁ − Sₙ',
    'Sommes', 1,
    [V241_VALEUR, V241_TRANCHE, V241_DIFFERENCE],
    [spec('S₁₀ = 385', 0, '385', 'correct', VARS_241),
     spec('Erreur : 55 (somme des entiers)', 0, '55', 'incorrect', VARS_241),
     spec('Erreur : 100 (10²)', 0, '100', 'incorrect', VARS_241),
     spec('Erreur : 3025 (somme des cubes)', 0, '3025', 'incorrect', VARS_241),
     spec('5² + ⋯ + 12² = 620', 1, '620', 'correct', VARS_241),
     spec('Erreur : 595 (S₁₂ − S₅)', 1, '595', 'incorrect', VARS_241),
     spec('Erreur : 650 (S₁₂)', 1, '650', 'incorrect', VARS_241),
     spec('(n + 1)²', 2, '(n+1)^2', 'correct'),
     spec('Écriture n² + 2n + 1', 2, 'n^2+2n+1', 'correct'),
     spec('Erreur : n²', 2, 'n^2', 'incorrect'),
     spec('Erreur : n + 1', 2, 'n+1', 'incorrect'),
     spec('Erreur : (n + 1)³', 2, '(n+1)^3', 'incorrect')]))

# --- 3. 1SPE-381 : 1³ + 2³ + ⋯ + n³ = (n(n + 1)/2)² ------------------------------------------

FORMULE_381 = ('On admet que, pour tout entier naturel $n$ non nul :\n\n'
               '$$T_n=1^3+2^3+\\cdots+n^3=\\left(\\dfrac{n(n+1)}{2}\\right)^2$$\n\n')
CUBES = '(n*(n+1)/2)^2'

V381_VALEUR = case(
    FORMULE_381 + 'Calcule $1^3+2^3+\\cdots+' + ev('n') + '^3$.\n\n$T_{' + ev('n') + '}=?$',
    [var('n', '4..15')], ev(CUBES),
    ['On remplace $n$ par $' + ev('n') + '$ : $\\dfrac{' + ev('n') + '\\times' + ev('n+1')
     + '}{2}=' + ev('n*(n+1)/2') + '$.',
     'Donc $T_{' + ev('n') + '}=' + ev('n*(n+1)/2') + '^2=' + col(ev(CUBES)) + '$.',
     'Ne pas oublier le carré.'])
V381_LIEN = case(
    FORMULE_381 + 'Comme $1+2+\\cdots+n=\\dfrac{n(n+1)}{2}$, la somme des cubes est le carré d\'une'
    ' somme d\'entiers. Complète.\n\n$1^3+2^3+\\cdots+' + ev('n') + '^3=\\left(?\\right)^2$',
    [var('n', '6..15')], ev('n*(n+1)/2'),
    ['$1^3+2^3+\\cdots+n^3=\\left(1+2+\\cdots+n\\right)^2$.',
     'Ici $1+2+\\cdots+' + ev('n') + '=\\dfrac{' + ev('n') + '\\times' + ev('n+1') + '}{2}='
     + col(ev('n*(n+1)/2')) + '$.'])
V381_TRANCHE = case(
    FORMULE_381 + 'Calcule $' + ev('a') + '^3+' + ev('a+1') + '^3+\\cdots+' + ev('b')
    + '^3$.\n\n$?$',
    [var('a', '3..6'), var('b', '8..12')],
    ev('(b*(b+1)/2)^2-((a-1)*a/2)^2'),
    ['La somme demandée est $T_{' + ev('b') + '}-T_{' + ev('a-1') + '}$ : on retire les termes'
     ' $1^3$, …, $' + ev('a-1') + '^3$.',
     '$T_{' + ev('b') + '}=' + ev('(b*(b+1)/2)^2') + '$ et $T_{' + ev('a-1') + '}='
     + ev('((a-1)*a/2)^2') + '$.',
     'Donc la somme vaut $' + col(ev('(b*(b+1)/2)^2-((a-1)*a/2)^2')) + '$.',
     'Attention : on retire $T_{' + ev('a-1') + '}$, pas $T_{' + ev('a') + '}$.'])

VARS_381 = {'n': 5, 'a': 3, 'b': 10}
VARS_381_LIEN = {'n': 10}
MODELES.append(modele(
    '03-somme-des-cubes', 'Somme des n premiers cubes',
    'Formule 1³ + 2³ + ⋯ + n³ = (n(n + 1)/2)² donnée : somme pour n tiré, carré de la somme'
    ' 1 + 2 + ⋯ + n, somme de a³ à b³ (différence de deux sommes)',
    'Sommes', 2,
    [V381_VALEUR, V381_LIEN, V381_TRANCHE],
    [spec('T₅ = 225', 0, '225', 'correct', VARS_381),
     spec('Erreur : 15 (oubli du carré)', 0, '15', 'incorrect', VARS_381),
     spec('Erreur : 125 (5³)', 0, '125', 'incorrect', VARS_381),
     spec('Erreur : 55 (somme des carrés)', 0, '55', 'incorrect', VARS_381),
     spec('55 pour n = 10', 1, '55', 'correct', VARS_381_LIEN),
     spec('Erreur : 3025 (la somme elle-même)', 1, '3025', 'incorrect', VARS_381_LIEN),
     spec('Erreur : 110 (n(n + 1))', 1, '110', 'incorrect', VARS_381_LIEN),
     spec('3³ + ⋯ + 10³ = 3016', 2, '3016', 'correct', VARS_381),
     spec('Erreur : 2989 (T₁₀ − T₃)', 2, '2989', 'incorrect', VARS_381),
     spec('Erreur : 3025 (T₁₀)', 2, '3025', 'incorrect', VARS_381)]))

# --- 4. 1SPE-242 : emprunt remboursé par annuités constantes ------------------------------------

V_EMPRUNT = [var('C', '4000|8000|12000|16000|20000'), var('t', '2..5'), var('a', 'eval:C/4')]
INTRO_242 = ('On emprunte $' + ev('C') + '~\\unit{€}$ au taux annuel de $' + ev('t')
             + '\\,\\%$. Chaque année, le capital restant dû augmente des intérêts, puis on'
             ' rembourse une **annuité** constante de $' + ev('a') + '~\\unit{€}$.\n\n'
             'On note $R_k$ le capital restant dû au bout de $k$ années ; $R_0=' + ev('C')
             + '$.\n\n')

V242_PREMIERE = case(
    INTRO_242 + 'Quel est le capital restant dû au bout d\'un an ?\n\n$R_1=?$ €',
    V_EMPRUNT, ev('C*(1+t/100)-a'),
    ['Au bout d\'un an, les intérêts s\'ajoutent : $' + ev('C') + '\\times' + ev('1+t/100;d')
     + '=' + ev('C*(1+t/100)') + '$.',
     'Puis on rembourse l\'annuité : $R_1=' + ev('C*(1+t/100)') + '-' + ev('a') + '='
     + col(ev('C*(1+t/100)-a')) + '$.',
     'Les intérêts portent sur le capital AVANT le remboursement de l\'annuité.'])
V242_RELATION = case(
    INTRO_242 + 'Complète la relation de récurrence, vraie pour tout entier naturel $k$.\n\n'
    '$R_{k+1}=?\\times R_k-' + ev('a') + '$',
    V_EMPRUNT, ev('1+t/100;d'),
    ['Ajouter $' + ev('t') + '\\,\\%$ d\'intérêts revient à multiplier par $1+\\dfrac{' + ev('t')
     + '}{100}=' + col(ev('1+t/100;d')) + '$.',
     'Puis on retranche l\'annuité : $R_{k+1}=' + ev('1+t/100;d') + '\\times R_k-' + ev('a')
     + '$.',
     'La suite $(R_k)$ n\'est ni arithmétique ni géométrique : on multiplie PUIS on soustrait.'])
V242_AUXILIAIRE = justification(
    'On emprunte un capital $C$ au taux annuel $t$ (écrit en nombre décimal, par exemple'
    ' $t=0{,}03$ pour $3\\,\\%$), remboursé par une annuité constante $a$. Le capital restant dû'
    ' vérifie $R_0=C$ et, pour tout entier naturel $k$, $R_{k+1}=(1+t)R_k-a$.\n\n'
    'On pose $v_k=R_k-\\dfrac{a}{t}$. Alors\n\n'
    '$$v_{k+1}=(1+t)R_k-a-\\dfrac{a}{t}=(1+t)R_k-(1+t)\\dfrac{a}{t}$$\n\n'
    'Quelle est la nature de la suite $(v_k)$ ?',
    [],
    'Géométrique, de raison $1+t$.',
    ['Géométrique, de raison $t$.',
     'Arithmétique, de raison $-a$.',
     'Arithmétique, de raison $-\\dfrac{a}{t}$.'],
    ['$a+\\dfrac{a}{t}=\\dfrac{at+a}{t}=(1+t)\\dfrac{a}{t}$, d\'où la deuxième écriture.',
     'On factorise par $1+t$ : $v_{k+1}=(1+t)\\left(R_k-\\dfrac{a}{t}\\right)=(1+t)v_k$.',
     'La suite $(v_k)$ est donc ' + '**géométrique de raison $1+t$**' + '. C\'est $(R_k)$, pas'
     ' $(v_k)$, qui mêle multiplication et soustraction.'])

VARS_242 = {'C': 8000, 't': 3, 'a': 2000}
MODELES.append(modele(
    '04-emprunt-annuites-constantes', 'Emprunt remboursé par annuités constantes',
    'Capital restant dû Rₖ d\'un emprunt (Rₖ₊₁ = (1 + t)Rₖ − a) : R₁, coefficient de la relation'
    ' de récurrence, nature de la suite auxiliaire vₖ = Rₖ − a/t (case choix)',
    'Modélisation', 1,
    [V242_PREMIERE, V242_RELATION, V242_AUXILIAIRE],
    [spec('R₁ = 6240', 0, '6240', 'correct', VARS_242),
     spec('Erreur : 6180 (intérêts sur le capital après annuité)', 0, '6180', 'incorrect',
          VARS_242),
     spec('Erreur : 6000 (oubli des intérêts)', 0, '6000', 'incorrect', VARS_242),
     spec('Erreur : 8240 (oubli de l\'annuité)', 0, '8240', 'incorrect', VARS_242),
     spec('1,03', 1, '1{,}03', 'correct', VARS_242),
     spec('Écriture 1.03', 1, '1.03', 'correct', VARS_242),
     spec('Erreur : 0,03', 1, '0{,}03', 'incorrect', VARS_242),
     spec('Erreur : 3', 1, '3', 'incorrect', VARS_242),
     spec('Erreur : 1,3', 1, '1{,}3', 'incorrect', VARS_242)]
    + specs_choix(2, 'géométrique de raison 1 + t',
                  ['raison t', 'arithmétique −a', 'arithmétique −a/t'])))

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
