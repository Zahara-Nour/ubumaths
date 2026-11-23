"""Écrit les modèles du lot 1 « connaissances des suites » de la 1re techno dans
scripts/questions/1techno-1/.

Phase 0 validée par David le 2026-11-17 (journal docs/archive/wip/questions-1techno-progress.md, § 23).
Deux questions de cours (`options.courseQuestion`), notation u(n) (décision Q6) :
- M1 → 1TECHNO-039 (sens de variation d'une suite arithmétique) ;
- M2 → 1TECHNO-040 (sens de variation d'une suite géométrique), premier terme et raison
  strictement positifs partout (borne BO 1re techno p.7).
Le point 041 est couvert par le tag de 817d257f (modèle commun de questions-1gen), sans fichier ici.

Un point par modèle (ADR 0020) ; le rangement (nœud + tag) viendra par migration.
Case choix : vrai/faux et propositions fixes en `melanger: non` (rang de la bonne réponse) ;
case mélangée : la bonne réponse écrite en premier (index 0).

    python3 docs/wip/questions/lot-1techno-1.py scripts/questions/1techno-1
"""
import json
import os
import sys

DOSSIER = sys.argv[1]

VRAI_FAUX = '\n\n```choix\nmelanger: non\n- Vrai\n- Faux\n```'
PROPS_SENS = ['croissante', 'décroissante', 'constante', 'on ne peut pas savoir']


def spec(desc, vi, answers, status, variables=None):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in (variables or {}).items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def modele(title, point, description, variations, specs):
    return {'title': title, 'description': description,
            'grades': ['1_TECHNO'], 'level': 1, 'delay': 30, 'status': 'draft',
            'options': {'courseQuestion': True}, 'shared': {}, 'variations': variations,
            'testSpecs': specs, '_point': point}


def choix(enonce, bonne, autres, steps):
    """Case choix mélangée : la bonne réponse est écrite en premier (index 0)."""
    bloc = '\n\n```choix\n' + ''.join('- ' + l + '\n' for l in [bonne] + autres) + '```'
    return {'statement': enonce + bloc, 'variables': [],
            'blanks': [{'expectedAnswer': '0'}], 'correction': {'steps': steps}}


def choix_fixe(enonce, propositions, bonne, steps, variables=None):
    """Case choix dans l'ordre écrit : `bonne` = rang de la bonne réponse."""
    bloc = ('\n\n```choix\nmelanger: non\n' + ''.join('- ' + l + '\n' for l in propositions)
            + '```')
    return {'statement': enonce + bloc, 'variables': variables or [],
            'blanks': [{'expectedAnswer': str(bonne)}], 'correction': {'steps': steps}}


MODELES = []

# ---------------------------------------------------------------------------------------------
# M1 — 1TECHNO-039 : sens de variation d'une suite arithmétique
# ---------------------------------------------------------------------------------------------

ARITH = '$(u(n))$ est une suite arithmétique de raison $r{}$. Alors la suite $(u(n))$ est…'
MODELES.append(('M1-cours-sens-variation-suite-arithmetique', modele(
    'Cours : sens de variation d\'une suite arithmétique', '1TECHNO-039',
    'Signe de la raison et sens de variation, sans calcul',
    [choix_fixe(ARITH.format('>0'), PROPS_SENS, 0,
                ['$u(n+1)-u(n)=r$ et $r>0$ : chaque terme est plus grand que le précédent, la'
                 ' suite est croissante.']),
     choix_fixe(ARITH.format('<0'), PROPS_SENS, 1,
                ['$u(n+1)-u(n)=r$ et $r<0$ : chaque terme est plus petit que le précédent, la'
                 ' suite est décroissante.']),
     choix_fixe(ARITH.format('=0'), PROPS_SENS, 2,
                ['$u(n+1)-u(n)=r=0$ : tous les termes sont égaux, la suite est constante.']),
     choix('Le sens de variation d\'une suite arithmétique dépend…',
           'du signe de sa raison seulement',
           ['de son premier terme seulement', 'de son premier terme et de sa raison'],
           ['$u(n+1)-u(n)=r$ : seul le signe de la raison $r$ compte, quel que soit le premier'
            ' terme $u(0)$.']),
     choix_fixe('La suite arithmétique de premier terme $u(0)=-{{a}}$ et de raison $r={{r}}$ est'
                ' décroissante.', ['Vrai', 'Faux'], 1,
                ['{{solution:html}} : $u(n+1)-u(n)=r={{r}}>0$, la suite est **croissante**,'
                 ' même si son premier terme est négatif. Le signe de $u(0)$ ne compte pas.'],
                [var('a', '1..20'), var('r', '1..9')])],
    [spec('croissante', 0, '0', 'correct'), spec('Erreur : décroissante', 0, '1', 'incorrect'),
     spec('Erreur : on ne peut pas savoir', 0, '3', 'incorrect'),
     spec('décroissante', 1, '1', 'correct'), spec('Erreur : croissante', 1, '0', 'incorrect'),
     spec('constante', 2, '2', 'correct'), spec('Erreur : croissante', 2, '0', 'incorrect'),
     spec('raison seulement', 3, '0', 'correct'),
     spec('Erreur : premier terme et raison', 3, '2', 'incorrect'),
     spec('Faux', 4, '1', 'correct', {'a': 5, 'r': 3}),
     spec('Erreur : lire le signe de u(0)', 4, '0', 'incorrect', {'a': 5, 'r': 3})])))

# ---------------------------------------------------------------------------------------------
# M2 — 1TECHNO-040 : sens de variation d'une suite géométrique (termes > 0)
# ---------------------------------------------------------------------------------------------

GEO = ('$(u(n))$ est une suite géométrique de premier terme $u(0)>0$ et de raison ${}$.'
       ' Alors la suite $(u(n))$ est…')
DIFF = '$u(n+1)-u(n)=u(n)\\times q-u(n)=u(n)\\times(q-1)$, avec $u(n)>0$ : '
MODELES.append(('M2-cours-sens-variation-suite-geometrique', modele(
    'Cours : sens de variation d\'une suite géométrique', '1TECHNO-040',
    'Raison comparée à 1 et sens de variation, termes strictement positifs',
    [choix_fixe(GEO.format('q>1'), PROPS_SENS, 0,
                [DIFF + '$q-1>0$, donc chaque terme est plus grand que le précédent : la suite'
                 ' est croissante.']),
     choix_fixe(GEO.format('q') .replace('raison $q$', 'raison $q$ telle que $0<q<1$'),
                PROPS_SENS, 1,
                [DIFF + '$q-1<0$, donc chaque terme est plus petit que le précédent : la suite'
                 ' est décroissante.']),
     choix_fixe(GEO.format('q=1'), PROPS_SENS, 2,
                ['$u(n+1)=u(n)\\times 1=u(n)$ : tous les termes sont égaux, la suite est'
                 ' constante.']),
     choix('Pour une suite géométrique de premier terme et de raison strictement positifs, le'
           ' sens de variation se lit…',
           'en comparant la raison $q$ à $1$',
           ['en comparant la raison $q$ à $0$', 'sur le signe du premier terme $u(0)$'],
           [DIFF + 'le signe de $q-1$ décide. Croissante si $q>1$, décroissante si $0<q<1$,'
            ' constante si $q=1$.'])],
    [spec('croissante', 0, '0', 'correct'), spec('Erreur : décroissante', 0, '1', 'incorrect'),
     spec('décroissante', 1, '1', 'correct'),
     spec('Erreur : croissante (q > 0)', 1, '0', 'incorrect'),
     spec('constante', 2, '2', 'correct'), spec('Erreur : croissante', 2, '0', 'incorrect'),
     spec('comparer q à 1', 3, '0', 'correct'),
     spec('Erreur : comparer q à 0', 3, '1', 'incorrect')])))

# ---------------------------------------------------------------------------------------------
# Écriture
# ---------------------------------------------------------------------------------------------

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    m = dict(m)
    m.pop('_point')
    chemin = os.path.join(DOSSIER, nom + '.json')
    ancien_id = None
    if os.path.exists(chemin):
        with open(chemin, encoding='utf-8') as f:
            ancien_id = json.load(f).get('id')
    if ancien_id:
        m = {'id': ancien_id, **m}
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent=1)
        f.write('\n')
print(len(MODELES), 'modèles écrits dans', DOSSIER)
for nom, m in MODELES:
    print(' ', m['_point'], nom)
