"""Ajoute les variations validées à trois modèles publiés de 6e, exportés de prod dans
scripts/questions/idees-6e-cercles-publies/ (chantier idees-6e-cercles).

Phase 0 du 2026-11-28 (« je valide », journal docs/wip/idees-6e-cercles-progress.md) :
- F1 → b8939937 « Cercle, disque, rayon, diamètre, corde » (6-162) : l'objet nommé dans l'autre
  sens ; « le rayon » OA (longueur) / « un rayon » [OA] (segment) ; un diamètre est aussi une corde ;
- F2 → 48524505 « Cercle et disque : des ensembles de points » (6-163) : tracer l'ensemble des
  points à r cm de O ; nommer l'ensemble ; M placé sur une figure, comparer OM au rayon ;
- F3 → 2f3da9ce « Problèmes de distances à un point » (6-164) : couronne, deux disques, zone
  broutée par une chèvre attachée dans un enclos.

Les variations s'ajoutent À LA FIN (les réponses des élèves gardent l'indice de leur variation) ;
la migration de contenu est générée par scripts/questions/migration-contenu.ts. Seuls `variations`
et `testSpecs` changent. Une case choix ou figure ne porte pas d'erreurs prévues (questions.md) :
les erreurs typiques sont dans les specs (refusées) et dans le corrigé.

Le script repart du contenu de prod (variations et specs d'origine, comptées dans ORIGINE) : le
relancer réécrit l'ajout sans le doubler.

Usage : python3 docs/wip/questions/idees-6e-cercles-publies.py scripts/questions/idees-6e-cercles-publies
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

# id court → (variations, specs) d'origine en prod (export du 2026-11-28)
ORIGINE = {'b8939937': (4, 14), '48524505': (3, 9), '2f3da9ce': (3, 11)}


def spec(desc, vi, variables_, status, answers):
    return {'description': desc, 'variationIndex': vi, 'variables': variables_,
            'expected': {'status': status}, 'answers': answers}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def case(attendue):
    return {'expectedAnswer': attendue}


def variation(statement, variables, blanks, steps, hint, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if blanks is not None:
        v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    v['hint'] = hint
    return v


def couleur(contenu):
    return PRIMAIRE + '{' + contenu + '}'


def texte_couleur(contenu):
    return '$' + couleur('\\text{' + contenu + '}') + '$'


def selon(v, textes, k=0):
    """`{{if:v==0|…|{{if:v==1|…|…}}}}` : le texte numéro v."""
    if k == len(textes) - 1:
        return textes[k]
    return '{{if:' + v + '==' + str(k) + '|' + textes[k] + '|' + selon(v, textes, k + 1) + '}}'


def sel(v, valeurs):
    """Expression qui vaut valeurs[k] quand v == k (pour une variable `eval:`)."""
    return '+'.join(f'({x})*(1-min(abs({v}-{k}),1))' for k, x in enumerate(valeurs))


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def choix(options, plusieurs=False, melanger=True):
    tete = []
    if plusieurs:
        tete.append('plusieurs: oui')
    if not melanger:
        tete.append('melanger: non')
    return bloc('choix', *tete, *['- ' + o for o in options])


def ajouter(court, variations, specs):
    chemin = os.path.join(DOSSIER, court + '.json')
    with open(chemin, encoding='utf-8') as f:
        m = json.load(f)
    nv, ns = ORIGINE[court]
    m['variations'] = m['variations'][:nv] + variations
    m['testSpecs'] = m['testSpecs'][:ns] + specs
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=2)
        f.write('\n')


# =============================================================================================
# F1 — b8939937 (4 variations d'origine : indices 4, 5, 6 ajoutés). Figure de la variation 1.
# =============================================================================================

FIGURE_F1 = bloc(
    'figure', 'fenetre: -4 ; 4 ; -3.8 ; 3.8',
    'description: Un cercle de centre O ; trois segments tracés : [OA], [BC] qui passe par O, et [DE].',
    '---',
    'O = point(0, 0, etiquette="bas-droite")',
    'cercle(O, rayon=3)',
    'A = point(2.6, 1.5, etiquette="haut-droite")',
    'B = point(-2.12, 2.12, etiquette="haut-gauche")',
    'C = point(2.12, -2.12, etiquette="bas-droite")',
    'D = point(-2.82, -1.03, etiquette="gauche")',
    'E = point(0.52, -2.95, etiquette="bas")',
    'segment(O, A, couleur="bleu")',
    'segment(B, C, couleur="bleu")',
    'segment(D, E, couleur="bleu")',
)
DEFS_F1 = ('**Un rayon** joint le centre à un point du cercle ; **un diamètre** joint deux points '
           'du cercle en passant par le centre ; **une corde** joint deux points du cercle.')

# (e) l'autre sens : quel segment est un rayon / un diamètre / une corde qui n'est pas un diamètre
F1_E = variation(
    'Voici un cercle de centre $O$.\n\n' + FIGURE_F1 + '\n\nSur la figure, quel segment est '
    + selon('k', ['**un rayon**', '**un diamètre**', '**une corde** qui ne passe pas par le centre'])
    + ' ?\n\n' + choix(['$[OA]$', '$[BC]$', '$[DE]$'], melanger=False),
    [var('k', '0..2')],
    [case('{{k}}')],
    [DEFS_F1,
     selon('k', ['$[OA]$ part du centre $O$ : c\'est ' + texte_couleur('un rayon') + '.',
                 '$[BC]$ passe par le centre $O$ : c\'est ' + texte_couleur('un diamètre') + '.',
                 '$[DE]$ joint deux points du cercle sans passer par $O$ : c\'est '
                 + texte_couleur('une corde') + ' (et pas un diamètre).'])],
    'Regarde les deux bouts de chaque segment : sont-ils au centre, ou sur le cercle ? Le segment passe-t-il par $O$ ?',
)
SPECS_F1_E = [
    spec('Un rayon : [OA]', 4, {'k': '0'}, 'correct', ['0']),
    spec('Erreur : [BC] pris pour un rayon (il passe par O)', 4, {'k': '0'}, 'incorrect', ['1']),
    spec('Un diamètre : [BC]', 4, {'k': '1'}, 'correct', ['1']),
    spec('Erreur : la corde [DE] prise pour un diamètre', 4, {'k': '1'}, 'incorrect', ['2']),
    spec('Une corde qui ne passe pas par le centre : [DE]', 4, {'k': '2'}, 'correct', ['2']),
    spec('Erreur : le diamètre [BC], qui passe par le centre', 4, {'k': '2'}, 'incorrect', ['1']),
]

# (f) « le » rayon (longueur, sans crochets) ou « un » rayon (segment, avec crochets)
NOTATIONS_F1 = ['$OA$', '$[OA]$', '$BC$', '$[BC]$']
F1_F = variation(
    'Voici un cercle de centre $O$.\n\n' + FIGURE_F1 + '\n\nComplète : sur la figure, '
    + selon('k', NOTATIONS_F1) + ' est … du cercle.\n\n'
    + choix(['le rayon', 'un rayon', 'le diamètre', 'un diamètre'], melanger=False),
    [var('k', '0..3')],
    [case('{{k}}')],
    ['**Sans crochets**, $OA$ est une **longueur** : on dit **le** rayon (tous les rayons ont la '
     'même longueur). **Avec crochets**, $[OA]$ est un **segment** : on dit **un** rayon (il y en a '
     'une infinité).',
     selon('k', ['$OA$ est une longueur : ' + texte_couleur('le rayon') + '.',
                 '$[OA]$ est un segment : ' + texte_couleur('un rayon') + '.',
                 '$BC$ est une longueur : ' + texte_couleur('le diamètre') + '.',
                 '$[BC]$ est un segment : ' + texte_couleur('un diamètre') + '.'])],
    'Y a-t-il des crochets ? Un segment s\'écrit avec des crochets, une longueur sans.',
)
SPECS_F1_F = [
    spec('OA : le rayon', 5, {'k': '0'}, 'correct', ['0']),
    spec('Erreur : OA, « un rayon » (c\'est une longueur)', 5, {'k': '0'}, 'incorrect', ['1']),
    spec('[OA] : un rayon', 5, {'k': '1'}, 'correct', ['1']),
    spec('Erreur : [OA], « le rayon » (c\'est un segment)', 5, {'k': '1'}, 'incorrect', ['0']),
    spec('BC : le diamètre', 5, {'k': '2'}, 'correct', ['2']),
    spec('[BC] : un diamètre', 5, {'k': '3'}, 'correct', ['3']),
    spec('Erreur : [BC], « un rayon »', 5, {'k': '3'}, 'incorrect', ['1']),
]

# (g) plusieurs bonnes réponses : un diamètre est aussi une corde
F1_G = variation(
    'Voici un cercle de centre $O$.\n\n' + FIGURE_F1 + '\n\nQue représente le segment '
    + selon('k', ['$[OA]$', '$[BC]$', '$[DE]$']) + ' pour ce cercle ?\n\n'
    + choix(['un rayon', 'un diamètre', 'une corde'], plusieurs=True, melanger=False),
    [var('k', '0..2')],
    [case(selon('k', ['0', '1;2', '2']))],
    [DEFS_F1,
     selon('k', ['$[OA]$ joint le centre à un point du cercle : ' + texte_couleur('un rayon')
                 + '. Il ne joint pas deux points du cercle : ce n\'est pas une corde.',
                 '$[BC]$ joint deux points du cercle en passant par $O$ : c\'est '
                 + texte_couleur('un diamètre') + ', et donc aussi ' + texte_couleur('une corde')
                 + ' (une corde qui passe par le centre).',
                 '$[DE]$ joint deux points du cercle sans passer par $O$ : '
                 + texte_couleur('une corde') + ', mais pas un diamètre.'])],
    'Un diamètre joint deux points du cercle : est-ce aussi une corde ?',
)
SPECS_F1_G = [
    spec('[BC] : un diamètre et une corde', 6, {'k': '1'}, 'correct', ['1;2']),
    spec('[BC], un diamètre seulement : la moitié', 6, {'k': '1'}, 'unoptimal_form', ['1']),
    spec('Erreur : [BC], un rayon et un diamètre', 6, {'k': '1'}, 'incorrect', ['0;1']),
    spec('[OA] : un rayon', 6, {'k': '0'}, 'correct', ['0']),
    spec('Erreur : [OA], un rayon et une corde', 6, {'k': '0'}, 'incorrect', ['0;2']),
    spec('[DE] : une corde', 6, {'k': '2'}, 'correct', ['2']),
    spec('Erreur : [DE], une corde et un diamètre', 6, {'k': '2'}, 'incorrect', ['1;2']),
]
ajouter('b8939937', [F1_E, F1_F, F1_G], SPECS_F1_E + SPECS_F1_F + SPECS_F1_G)


# =============================================================================================
# F2 — 48524505 (3 variations d'origine : indices 3, 4, 5 ajoutés)
# =============================================================================================

# (d) tracer l'ensemble des points à r cm de O (règle graduée et compas, comme 2e15c33a v2)
F2_D = variation(
    'Trace l\'ensemble des points situés à ${{eval:x/10;d}}~\\unit{cm}$ du point $O$.\n\n'
    '```figure-a-completer\nfenetre: 0 ; 14 ; 0 ; 14\nverifier: cercle c = cercle(O, rayon={{eval:x/10;d}} cm)\n---\n'
    'O = point(7, 7)\n```',
    [var('x', '20..50')],
    None,
    ['Les points situés **exactement** à ${{eval:x/10;d}}~\\unit{cm}$ de $O$ forment le '
     + texte_couleur('cercle') + ' de centre $O$ et de rayon ${{eval:x/10;d}}~\\unit{cm}$.',
     'Poser le $0$ de la règle graduée sur $O$, ouvrir le compas jusqu\'à la graduation '
     '${{eval:x/10;d}}~\\unit{cm}$, piquer en $O$ et tracer le cercle.'],
    'Tous ces points sont à la même distance de $O$ : quelle figure forment-ils ?',
)
SPECS_F2_D = [
    spec('Cercle de rayon 3,5 cm', 3, {'x': '35'}, 'correct', ['regle(7;7;8;7;1)|cercle(7;7;10.5;7)']),
    spec('Cercle de rayon 2 cm', 3, {'x': '20'}, 'correct', ['regle(7;7;8;7;1)|cercle(7;7;9;7)']),
    spec('Erreur : rayon double (7 cm, le diamètre)', 3, {'x': '35'}, 'incorrect', ['regle(7;7;8;7;1)|cercle(7;7;14;7)']),
    spec('Erreur : compas ouvert sans la règle', 3, {'x': '35'}, 'incorrect', ['cercle(7;7;10.5;7)']),
]

# (e) nommer l'ensemble : « exactement à r cm » (cercle) ou « à r cm au plus » (disque)
F2_E = variation(
    'Quel est l\'ensemble des points situés ' + selon('k', ['**à ${{r}}~\\unit{cm}$ au plus**',
                                                         '**exactement à ${{r}}~\\unit{cm}$**'])
    + ' du point $O$ ?\n\n'
    + choix(['le disque de centre $O$ et de rayon ${{r}}~\\unit{cm}$',
             'le cercle de centre $O$ et de rayon ${{r}}~\\unit{cm}$',
             'le disque de centre $O$ et de rayon ${{eval:2*r}}~\\unit{cm}$',
             'le cercle de centre $O$ et de diamètre ${{r}}~\\unit{cm}$']),
    [var('k', '0..1'), var('r', '2..9')],
    [case('{{k}}')],
    ['**Le cercle** de centre $O$ et de rayon $r$ : les points **exactement** à la distance $r$ '
     'de $O$. **Le disque** : les points à la distance $r$ **au plus** de $O$, le cercle et tout '
     'l\'intérieur.',
     selon('k', ['« Au plus » : ' + texte_couleur('le disque') + ' de centre $O$ et de rayon ${{r}}~\\unit{cm}$.',
                 '« Exactement » : ' + texte_couleur('le cercle') + ' de centre $O$ et de rayon ${{r}}~\\unit{cm}$.']),
     'La distance au centre, ${{r}}~\\unit{cm}$, est le **rayon**, pas le diamètre.'],
    'Les points sont-ils tous à la même distance de $O$, ou à une distance plus petite que ${{r}}~\\unit{cm}$ comprise ?',
)
SPECS_F2_E = [
    spec('Au plus 3 cm : le disque', 4, {'k': '0', 'r': '3'}, 'correct', ['0']),
    spec('Erreur : au plus, le cercle', 4, {'k': '0', 'r': '3'}, 'incorrect', ['1']),
    spec('Erreur : au plus, le disque de rayon 6 cm', 4, {'k': '0', 'r': '3'}, 'incorrect', ['2']),
    spec('Exactement 5 cm : le cercle', 4, {'k': '1', 'r': '5'}, 'correct', ['1']),
    spec('Erreur : exactement, le disque', 4, {'k': '1', 'r': '5'}, 'incorrect', ['0']),
    spec('Erreur : exactement, le cercle de diamètre 5 cm', 4, {'k': '1', 'r': '5'}, 'incorrect', ['3']),
]

# (f) M placé sur la figure (dans le disque grisé, sur le cercle, hors du disque) : comparer OM à r
F2_F = variation(
    'Le disque grisé a pour centre $O$ et pour rayon ${{r}}~\\unit{cm}$.\n\n'
    + bloc('figure', 'fenetre: -5.5 ; 5.5 ; -5.5 ; 5.5',
           'description: Un disque grisé de centre O, un rayon tracé et coté, et un point M.',
           '---',
           'O = point(0, 0, etiquette="bas")',
           'cercle(O, rayon={{r}}, couleur="bleu", epaisseur=2, remplissage="gris", opacite_fond=0.3)',
           'R = point(O, longueur={{r}}, angle=0, visible=faux)',
           'segment(O, R, trait="tirets")',
           'texte({{eval:r/2;d}}, -0.45, "{{r}} cm")',
           'M = point(O, longueur={{eval:d;d}}, angle={{t}}, etiquette="haut", couleur="rouge")')
    + '\n\nQue peut-on dire de la distance $OM$ ?\n\n'
    + choix(['$OM$ est égal à ${{r}}~\\unit{cm}$', '$OM$ est plus petit que ${{r}}~\\unit{cm}$',
             '$OM$ est plus grand que ${{r}}~\\unit{cm}$'], melanger=False),
    [var('k', '0..2'), var('r', '2..4'), var('t', '100..160'),
     var('d', 'eval:' + sel('k', ['r', 'r/2', 'r+1']))],
    [case('{{k}}')],
    ['Les points **du cercle** sont exactement à ${{r}}~\\unit{cm}$ de $O$ ; ceux **de l\'intérieur** '
     'du disque, à moins de ${{r}}~\\unit{cm}$ ; ceux **hors du disque**, à plus de ${{r}}~\\unit{cm}$.',
     selon('k', ['$M$ est sur le cercle : $' + couleur('OM = {{r}}~\\unit{cm}') + '$.',
                 '$M$ est à l\'intérieur du disque, pas sur le cercle : $OM$ est '
                 + texte_couleur('plus petit que {{r}} cm') + '.',
                 '$M$ est hors du disque : $OM$ est ' + texte_couleur('plus grand que {{r}} cm') + '.'])],
    'Où est $M$ : sur le cercle, dans le disque, ou dehors ?',
)
SPECS_F2_F = [
    spec('M sur le cercle : égal', 5, {'k': '0', 'r': '3', 't': '120', 'd': '3'}, 'correct', ['0']),
    spec('Erreur : M sur le cercle, plus petit', 5, {'k': '0', 'r': '3', 't': '120', 'd': '3'}, 'incorrect', ['1']),
    spec('M dans le disque : plus petit', 5, {'k': '1', 'r': '4', 't': '130', 'd': '2'}, 'correct', ['1']),
    spec('Erreur : M dans le disque, égal (le disque pris pour le cercle)', 5, {'k': '1', 'r': '4', 't': '130', 'd': '2'}, 'incorrect', ['0']),
    spec('M hors du disque : plus grand', 5, {'k': '2', 'r': '2', 't': '150', 'd': '3'}, 'correct', ['2']),
    spec('Erreur : M hors du disque, plus petit', 5, {'k': '2', 'r': '2', 't': '150', 'd': '3'}, 'incorrect', ['1']),
]
ajouter('48524505', [F2_D, F2_E, F2_F], SPECS_F2_D + SPECS_F2_E + SPECS_F2_F)


# =============================================================================================
# F3 — 2f3da9ce (3 variations d'origine : indices 3, 4, 5 ajoutés)
# =============================================================================================

# (d) deux cercles de même centre O : M entre les deux, dans le petit, ou hors du grand
F3_D = variation(
    'Deux cercles ont pour centre $O$ : le petit a pour rayon ${{eval:a/10;d}}~\\unit{cm}$, le grand '
    '${{eval:b/10;d}}~\\unit{cm}$.\n\n'
    + bloc('figure', 'fenetre: -6 ; 6 ; -6 ; 6',
           'description: Deux cercles de centre O, un petit et un grand, et un point M.',
           '---',
           'O = point(0, 0, etiquette="bas")',
           'cercle(O, rayon={{eval:a/10;d}}, couleur="bleu", epaisseur=2)',
           'cercle(O, rayon={{eval:b/10;d}}, couleur="bleu", epaisseur=2)',
           'M = point(O, longueur={{eval:d;d}}, angle={{t}}, etiquette="haut", couleur="rouge")')
    + '\n\nQue peut-on dire de la distance $OM$ ?\n\n'
    + choix(['$OM$ est plus grand que ${{eval:a/10;d}}~\\unit{cm}$',
             '$OM$ est plus petit que ${{eval:a/10;d}}~\\unit{cm}$',
             '$OM$ est plus grand que ${{eval:b/10;d}}~\\unit{cm}$',
             '$OM$ est plus petit que ${{eval:b/10;d}}~\\unit{cm}$'], plusieurs=True, melanger=False),
    [var('k', '0..2'), var('a', '15..25'), var('b', '35..45'), var('t', '20..160'),
     var('d', 'eval:' + sel('k', ['(a+b)/20', 'a/20', 'b/10+1']))],
    [case(selon('k', ['0;3', '1;3', '0;2']))],
    ['On compare $OM$ à chacun des deux rayons : $M$ est-il dans le petit disque ? dans le grand ?',
     selon('k', ['$M$ est entre les deux cercles : hors du petit disque, $' + couleur('OM > {{eval:a/10;d}}~\\unit{cm}')
                 + '$ ; dans le grand, $' + couleur('OM < {{eval:b/10;d}}~\\unit{cm}') + '$.',
                 '$M$ est dans le petit disque : $' + couleur('OM < {{eval:a/10;d}}~\\unit{cm}')
                 + '$, et donc aussi $' + couleur('OM < {{eval:b/10;d}}~\\unit{cm}') + '$.',
                 '$M$ est hors du grand disque : $' + couleur('OM > {{eval:b/10;d}}~\\unit{cm}')
                 + '$, et donc aussi $' + couleur('OM > {{eval:a/10;d}}~\\unit{cm}') + '$.'])],
    'Regarde d\'abord le petit cercle : $M$ est-il dedans ou dehors ? Puis le grand.',
)
SPECS_F3_D = [
    spec('Entre les deux cercles', 3, {'k': '0', 'a': '20', 'b': '40', 't': '60', 'd': '3'}, 'correct', ['0;3']),
    spec('Erreur : la condition inversée sur le petit cercle', 3, {'k': '0', 'a': '20', 'b': '40', 't': '60', 'd': '3'}, 'incorrect', ['1;3']),
    spec('Une seule condition : la moitié', 3, {'k': '0', 'a': '20', 'b': '40', 't': '60', 'd': '3'}, 'unoptimal_form', ['3']),
    spec('Dans le petit disque', 3, {'k': '1', 'a': '24', 'b': '36', 't': '90', 'd': '1.2'}, 'correct', ['1;3']),
    spec('Hors du grand disque', 3, {'k': '2', 'a': '15', 'b': '45', 't': '140', 'd': '5.5'}, 'correct', ['0;2']),
    spec('Erreur : hors du grand, plus petit que le grand rayon', 3, {'k': '2', 'a': '15', 'b': '45', 't': '140', 'd': '5.5'}, 'incorrect', ['0;3']),
]

# (e) deux disques qui se chevauchent (centres A et B, AB = 4 cm) : M dans les deux, ou dans un seul
F3_E = variation(
    'Le disque bleu a pour centre $A$ et pour rayon ${{eval:a/10;d}}~\\unit{cm}$ ; le disque rouge a '
    'pour centre $B$ et pour rayon ${{eval:b/10;d}}~\\unit{cm}$.\n\n'
    + bloc('figure', 'fenetre: -4.5 ; 8 ; -4 ; 4',
           'description: Deux disques qui se chevauchent, un bleu de centre A et un rouge de centre B, et un point M.',
           '---',
           'A = point(0, 0, etiquette="bas")',
           'B = point(4, 0, etiquette="bas")',
           'cercle(A, rayon={{eval:a/10;d}}, couleur="bleu", epaisseur=2, remplissage="bleu", opacite_fond=0.15)',
           'cercle(B, rayon={{eval:b/10;d}}, couleur="rouge", epaisseur=2, remplissage="rouge", opacite_fond=0.15)',
           'M = point({{eval:x;d}}, 1, etiquette="haut", couleur="noir")')
    + '\n\nQue peut-on dire des distances $MA$ et $MB$ ?\n\n'
    + choix(['$MA$ est plus petit que ${{eval:a/10;d}}~\\unit{cm}$',
             '$MA$ est plus grand que ${{eval:a/10;d}}~\\unit{cm}$',
             '$MB$ est plus petit que ${{eval:b/10;d}}~\\unit{cm}$',
             '$MB$ est plus grand que ${{eval:b/10;d}}~\\unit{cm}$'], plusieurs=True, melanger=False),
    [var('k', '0..2'), var('a', '28..35'), var('b', '25..30'),
     var('x', 'eval:' + sel('k', ['(4-b/10+a/10)/2', '-a/20', '4+b/20']))],
    [case(selon('k', ['0;2', '0;3', '1;2']))],
    ['$M$ est dans le disque bleu si $MA$ est plus petit que son rayon, dans le disque rouge si '
     '$MB$ est plus petit que le sien.',
     selon('k', ['$M$ est dans la partie commune : dans les deux disques, $' + couleur('MA < {{eval:a/10;d}}~\\unit{cm}')
                 + '$ et $' + couleur('MB < {{eval:b/10;d}}~\\unit{cm}') + '$.',
                 '$M$ est dans le disque bleu seulement : $' + couleur('MA < {{eval:a/10;d}}~\\unit{cm}')
                 + '$ et $' + couleur('MB > {{eval:b/10;d}}~\\unit{cm}') + '$.',
                 '$M$ est dans le disque rouge seulement : $' + couleur('MA > {{eval:a/10;d}}~\\unit{cm}')
                 + '$ et $' + couleur('MB < {{eval:b/10;d}}~\\unit{cm}') + '$.'])],
    'Une phrase sur $MA$ (le disque bleu), une phrase sur $MB$ (le disque rouge) : $M$ est-il dans chacun ?',
)
SPECS_F3_E = [
    spec('Dans les deux disques', 4, {'k': '0', 'a': '30', 'b': '26', 'x': '2.2'}, 'correct', ['0;2']),
    spec('Une seule condition : la moitié', 4, {'k': '0', 'a': '30', 'b': '26', 'x': '2.2'}, 'unoptimal_form', ['0']),
    spec('Dans le bleu seulement', 4, {'k': '1', 'a': '32', 'b': '28', 'x': '-1.6'}, 'correct', ['0;3']),
    spec('Erreur : bleu seulement, dans les deux', 4, {'k': '1', 'a': '32', 'b': '28', 'x': '-1.6'}, 'incorrect', ['0;2']),
    spec('Dans le rouge seulement', 4, {'k': '2', 'a': '35', 'b': '30', 'x': '5.5'}, 'correct', ['1;2']),
    spec('Erreur : rouge seulement, conditions inversées', 4, {'k': '2', 'a': '35', 'b': '30', 'x': '5.5'}, 'incorrect', ['0;3']),
]

# (f) la chèvre dans l'enclos : piquet dans un coin, au milieu d'un côté, ou loin des murs
PIQUETS = [('0', '0', 'bas-gauche'), ('6', '0', 'bas'), ('6', '4', 'haut')]
F3_F = variation(
    'Un enclos rectangulaire mesure $12~\\unit{m}$ sur $8~\\unit{m}$. Une chèvre est attachée au '
    'piquet $P$ par une corde de ${{L}}~\\unit{m}$ ; elle ne peut pas sortir de l\'enclos.\n\n'
    + bloc('figure', 'fenetre: -1.5 ; 13.5 ; -1.5 ; 9.5',
           'description: Un enclos rectangulaire de 12 m sur 8 m et un piquet P.',
           '---',
           'E1 = point(0, 0, visible=faux)', 'E2 = point(12, 0, visible=faux)',
           'E3 = point(12, 8, visible=faux)', 'E4 = point(0, 8, visible=faux)',
           'polygone(E1, E2, E3, E4, couleur="marron", epaisseur=3)',
           'P = point(' + selon('k', [p[0] + ', ' + p[1] + ', etiquette="' + p[2] + '"' for p in PIQUETS])
           + ', couleur="rouge")',
           'texte(6, 8.6, "12 m")', 'texte(12.8, 4, "8 m")')
    + '\n\nQuelle est la forme de la zone où la chèvre peut brouter ?\n\n'
    + choix(['un quart de disque', 'un demi-disque', 'un disque entier', 'un rectangle'], melanger=False),
    [var('k', '0..2'), var('L', '2..3')],
    [case('{{k}}')],
    ['Sans les murs, la chèvre brouterait le **disque** de centre $P$ et de rayon ${{L}}~\\unit{m}$ : '
     'tous les points à ${{L}}~\\unit{m}$ au plus du piquet.',
     selon('k', ['Le piquet est dans un **coin** : les deux murs ne laissent qu\'un quart du disque, '
                 + texte_couleur('un quart de disque') + '.',
                 'Le piquet est au milieu d\'un **côté** : le mur coupe le disque en deux, il reste '
                 + texte_couleur('un demi-disque') + ' (la corde, ${{L}}~\\unit{m}$, n\'atteint pas les autres murs).',
                 'Le piquet est au milieu de l\'enclos, à $4~\\unit{m}$ au moins de chaque mur : la corde '
                 'n\'atteint aucun mur, c\'est ' + texte_couleur('un disque entier') + '.'])],
    'Trace en pensée le disque de centre $P$ : quelle partie reste dans l\'enclos ?',
)
SPECS_F3_F = [
    spec('Piquet dans un coin : quart de disque', 5, {'k': '0', 'L': '3'}, 'correct', ['0']),
    spec('Erreur : coin, un disque entier', 5, {'k': '0', 'L': '3'}, 'incorrect', ['2']),
    spec('Piquet au milieu d\'un côté : demi-disque', 5, {'k': '1', 'L': '2'}, 'correct', ['1']),
    spec('Erreur : milieu d\'un côté, quart de disque', 5, {'k': '1', 'L': '2'}, 'incorrect', ['0']),
    spec('Piquet au milieu : disque entier', 5, {'k': '2', 'L': '3'}, 'correct', ['2']),
    spec('Erreur : la forme de l\'enclos (rectangle)', 5, {'k': '2', 'L': '3'}, 'incorrect', ['3']),
]
ajouter('2f3da9ce', [F3_D, F3_E, F3_F], SPECS_F3_D + SPECS_F3_E + SPECS_F3_F)

print('Variations ajoutées : b8939937 +3, 48524505 +3, 2f3da9ce +3')
