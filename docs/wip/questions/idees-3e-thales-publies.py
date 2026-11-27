"""Ajoute les variations validées aux 2 modèles publiés exportés de prod dans
scripts/questions/idees-3e-thales-publies/ (chantier idees-3e-thales).

Phase 0 validée par David le 2026-11-27 (« je valide tes recos » ; journal
docs/archive/wip/idees-3e-thales/idees-3e-thales-progress.md, § Décisions) : fiches V1 et V2, Q1 = oui. Les variations
s'ajoutent À LA FIN (les réponses des élèves gardent l'indice de leur variation) ; la migration de
contenu est générée par scripts/questions/migration-contenu.ts.

Le script repart toujours de l'export de prod commité (EXPORT, lu par `git show`) : le relancer
réécrit les ajouts et les corrections sans les doubler.

Décisions et pièges du lot :
- Noms des sommets tirés comme dans les variations publiées (`s`, trois jeux de lettres), figures
  reprises des variations publiées (emboîtés : v0 ; papillon : v2 de f55d07b0, v1 de 37c13d51).
- f55d07b0 (V1) : v5 BC et v6 AC en papillon, côtés du grand triangle. Erreurs prévues arrondies
  au centième (l'élève écrit 2,67 pour 8/3) : rapport renversé, même différence ajoutée, division
  oubliée. Les quatre valeurs sont distinctes (conditions).
- 37c13d51 (V2, Q1) : le Oui / Non devient un choix à quatre réponses, mélangées, qui jugent la
  conclusion ET la propriété. Ordre d'origine : 0 parallèles (réciproque), 1 pas parallèles
  (contraposée), 2 parallèles (théorème), 3 pas parallèles (réciproque) ; 0 et 1 gardent le sens
  de l'ancien Oui / Non, les réponses déjà données (indices d'origine) restent justes. Une case
  choix ne porte pas d'erreurs prévues : le pourquoi des choix 2 et 3 va dans le corrigé.
- 37c13d51 v2 (emboîtés) et v3 (papillon) : MB et NC donnés, AM et AN à calculer d'abord ; NC au
  moins 1 cm.

Usage : python3 docs/wip/questions/idees-3e-thales-publies.py scripts/questions/idees-3e-thales-publies
"""
import copy
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from idees_3e_thales_outils import (  # noqa: E402
    case, couleur, erreur, lettre, resoudre, spec, tous_distincts, var)

DOSSIER = sys.argv[1]
EXPORT = 'fbdc2a782a'   # commit de l'export de prod (2026-11-27)

JEUX = [('A', 'M', 'B', 'N', 'C'), ('R', 'U', 'S', 'V', 'T'), ('E', 'K', 'F', 'L', 'G')]
A, M, B, N, C = (lettre(JEUX, i) for i in range(5))
AM, AB, AN, AC, MN, BC, MB, NC = A + M, A + B, A + N, A + C, M + N, B + C, M + B, N + C


def charger_export(court):
    chemin = os.path.relpath(os.path.join(DOSSIER, court + '.json'))
    brut = subprocess.check_output(['git', 'show', f'{EXPORT}:{chemin}'])
    return json.loads(brut)


def ecrire(court, m, ajoutees, corrigees):
    with open(os.path.join(DOSSIER, court + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
    print(f'{court} : {len(m["variations"])} variations (+{ajoutees}, {corrigees} corrigées), '
          f'{len(m["testSpecs"])} specs')


def figure_de(statement):
    debut = statement.index('```figure')
    fin = statement.index('```', debut + 3) + 3
    return statement[debut:fin]


def cent(expr):
    return '{{eval:round(100*(' + expr + '))/100;d}}'


def specs_erreurs(vi, v, juste, erreurs, desc):
    out = [spec(desc + ' : ' + juste, vi, v, 'correct', [juste])]
    for rep, msg, nom in erreurs:
        out.append(spec(desc + ' : ' + nom, vi, v, 'incorrect', [rep], resoudre(msg, v)))
    return out


# =============================================================================================
# f55d07b0 — 3-060, calculer une longueur. V1 : v5 BC, v6 AC, en papillon.
# =============================================================================================

F55 = charger_export('f55d07b0')
NV_F55, NS_F55 = len(F55['variations']), len(F55['testSpecs'])
FIG_PAPILLON = figure_de(F55['variations'][2]['statement'])   # rapport am/ab
DEBUT_PAPILLON = ('Les droites $(' + B + M + ')$ et $(' + C + N + ')$ sont sécantes en $' + A
                  + '$, et les droites $(' + MN + ')$ et $(' + BC + ')$ sont parallèles. ')
THALES = ('Les droites $(' + B + M + ')$ et $(' + C + N + ')$ sont sécantes en $' + A + '$, et '
          'les droites $(' + MN + ')$ et $(' + BC + ')$ sont parallèles. D\'après le '
          '**théorème de Thalès** :')
EGALITE = ('$$\\dfrac{' + AM + '}{' + AB + '} = \\dfrac{' + AN + '}{' + AC + '} = \\dfrac{' + MN
           + '}{' + BC + '}$$')
E_DIFF = ('Dans une configuration de Thalès, les longueurs sont proportionnelles : on les '
          'multiplie par un même rapport, on n\'ajoute pas la même différence.')
HINT_V1 = ('Écris l\'égalité des trois rapports de Thalès (petit triangle en haut, grand '
           'triangle en bas), puis garde les deux rapports qui contiennent la longueur cherchée '
           'et deux longueurs connues.')


def v1_grand_cote(petit, grand, nom_petit):
    """Papillon : on donne AM, AB et un côté du petit triangle ; on cherche son homologue."""
    p = nom_petit
    juste = f'{p}*ab/am'
    erreurs = [
        (f'{p}*am/ab', 'Tu as renversé le rapport : ' + grand + ' est un côté du grand '
         'triangle, il est plus long que ' + petit + '.', 'Rapport renversé'),
        (f'{p}+ab-am', E_DIFF, 'Même différence ajoutée'),
        (f'{p}*ab', 'Tu as oublié de diviser par ' + AM + ' : on multiplie ' + petit + ' par '
         + AB + ', puis on divise par ' + AM + '.', 'Division oubliée'),
    ]
    valeurs = [juste] + [e[0] for e in erreurs]
    v = {
        'statement': DEBUT_PAPILLON + 'On donne $' + AM + ' = {{am}}~\\unit{cm}$, $' + AB
        + ' = {{ab}}~\\unit{cm}$ et $' + petit + ' = {{' + p + '}}~\\unit{cm}$. Calcule $'
        + grand + '$.\n\n' + FIG_PAPILLON + '\n\n$' + grand + ' = ?~\\unit{cm}$',
        'variables': [var('s', '0..2'), var('o', '0..1'), var('ab', '4..12'),
                      var('am', '2..11'), var(p, '2..10')],
        'conditions': ['am < ab', f'round(100*({juste})) == 100*({juste})']
        + tous_distincts([f'round(100*({x}))' for x in valeurs]),
        'blanks': [case('{{eval:' + juste + ';d}}',
                        [erreur(cent(x), msg, lab) for x, msg, lab in erreurs])],
        'correction': {'steps': [
            THALES, EGALITE,
            'On garde les deux rapports utiles et on remplace par les longueurs connues :',
            '$$\\dfrac{' + AM + '}{' + AB + '} = \\dfrac{' + petit + '}{' + grand + '} \\quad'
            '\\text{donc}\\quad \\dfrac{ {{am}} }{ {{ab}} } = \\dfrac{ {{' + p + '}} }{' + grand
            + '}$$',
            '$$' + grand + ' = \\dfrac{ {{' + p + '}} \\times {{ab}} }{ {{am}} } = '
            + couleur('{{eval:' + juste + ';d}}~\\unit{cm}') + '$$',
        ]},
        'hint': HINT_V1,
    }
    return v, erreurs


V5, E_V5 = v1_grand_cote(MN, BC, 'mn')
V6, E_V6 = v1_grand_cote(AN, AC, 'an')


def specs_v1(vi, erreurs, ab, am, p, nom):
    v = {'s': 0, 'o': 0, 'ab': ab, 'am': am, nom: p}
    juste = p * ab / am
    out = []
    reps = {f'{nom}*ab/am': juste, f'{nom}*am/ab': p * am / ab, f'{nom}+ab-am': p + ab - am,
            f'{nom}*ab': p * ab}
    out.append(spec(f'v{vi} papillon : {fr(juste).replace("{,}", ",")}', vi, v, 'correct', [fr(juste)]))
    for x, msg, lab in erreurs:
        out.append(spec(f'v{vi} : {lab}', vi, v, 'incorrect', [fr(reps[x])], resoudre(msg, v)))
    return out


def fr(x):
    """Réponse d'élève : arrondi au centième, virgule `{,}`."""
    t = f'{round(x, 2):.2f}'.rstrip('0').rstrip('.')
    return t.replace('.', '{,}')


SPECS_F55 = (specs_v1(NV_F55, E_V5, 6, 4, 3, 'mn')        # BC = 4,5 ; 2 ; 5 ; 18
             + specs_v1(NV_F55 + 1, E_V6, 5, 2, 3, 'an')  # AC = 7,5 ; 1,2 ; 6 ; 15
             + [spec(f'v{NV_F55} jeu R, S, T : 3 × 10 ÷ 4 = 7,5', NV_F55,
                     {'s': 1, 'o': 1, 'ab': 10, 'am': 4, 'mn': 3}, 'correct', ['7{,}5'])])

F55['description'] = (F55['description'] + ' ; côté du grand triangle (BC, AC) calculé depuis '
                      'le petit en papillon')
F55['variations'] = F55['variations'] + [V5, V6]
F55['testSpecs'] = F55['testSpecs'] + SPECS_F55
ecrire('f55d07b0', F55, 2, 0)


# =============================================================================================
# 37c13d51 — 3-055, réciproque et contraposée. Q1 : v0 et v1 au choix à quatre réponses.
# V2 : v2 emboîtés et v3 papillon, MB et NC donnés.
# =============================================================================================

R37 = charger_export('37c13d51')
NV_R37 = len(R37['variations'])
CHOIX = ('```choix\n'
         '- Elles sont parallèles, d\'après la réciproque du théorème de Thalès.\n'
         '- Elles ne sont pas parallèles, d\'après la contraposée du théorème de Thalès.\n'
         '- Elles sont parallèles, d\'après le théorème de Thalès.\n'
         '- Elles ne sont pas parallèles, d\'après la réciproque du théorème de Thalès.\n'
         '```')
QUESTION_ANCIENNE = 'sont-elles parallèles ?'
QUESTION = ('sont-elles parallèles ? Choisis la conclusion et la propriété qui la justifie.')
POURQUOI = ('On ne cite pas le **théorème de Thalès** : il suppose les droites parallèles, et '
            'c\'est justement ce qu\'on cherche. La **réciproque** prouve que des droites sont '
            'parallèles ; la **contraposée** prouve qu\'elles ne le sont pas.')
HINT_R = ('Compare les rapports $\\dfrac{' + AM + '}{' + AB + '}$ et $\\dfrac{' + AN + '}{' + AC
          + '}$ par les produits en croix. Pour conclure, demande-toi quelle propriété démontre '
          'que des droites sont parallèles, et laquelle démontre qu\'elles ne le sont pas.')
HINT_R_CALCUL = ('Calcule d\'abord $' + AM + '$ et $' + AN + '$ à partir des longueurs données. '
                 + HINT_R)


def au_choix(v, hint):
    """Remplace le Oui / Non par le choix à quatre réponses, ajoute le pourquoi et le coup de
    pouce. La réponse attendue reste `{{w}}`."""
    v = copy.deepcopy(v)
    st = v['statement']
    assert st.count(QUESTION_ANCIENNE) == 1
    st = st.replace(QUESTION_ANCIENNE, QUESTION)
    st, n = re.subn(r'```choix\n.*?```', lambda _: CHOIX, st, flags=re.S)
    assert n == 1
    v['statement'] = st
    assert v['blanks'] == [{'expectedAnswer': '{{w}}'}]
    v['correction']['steps'] = v['correction']['steps'] + [POURQUOI]
    v['hint'] = hint
    return v


V0 = au_choix(R37['variations'][0], HINT_R)
V1 = au_choix(R37['variations'][1], HINT_R)


def avec_calcul(base, emboites):
    """MB et NC donnés au lieu de AM et AN."""
    v = au_choix(base, HINT_R_CALCUL)
    st = v['statement']
    debut = st.index('On donne')
    fin = st.index('Les droites $(')
    if emboites:
        donnees = ('On donne $' + AB + ' = {{ab}}~\\unit{cm}$, $' + MB + ' = {{mb}}~\\unit{cm}$, '
                   '$' + AC + ' = {{ac}}~\\unit{cm}$ et $' + NC + ' = {{eval:nc;d}}~\\unit{cm}$. ')
        calcul = ('On calcule d\'abord $' + AM + '$ et $' + AN + '$ : $$' + AM + ' = ' + AB
                  + ' - ' + MB + ' = {{ab}} - {{mb}} = {{am}}~\\unit{cm} \\qquad ' + AN + ' = '
                  + AC + ' - ' + NC + ' = {{ac}} - {{eval:nc;d}} = {{eval:an;d}}~\\unit{cm}$$')
        extra = [var('mb', 'eval:ab-am'), var('nc', 'eval:ac-an;d')]
    else:
        donnees = ('On donne $' + MB + ' = {{mb}}~\\unit{cm}$, $' + AB + ' = {{ab}}~\\unit{cm}$, '
                   '$' + NC + ' = {{eval:nc;d}}~\\unit{cm}$ et $' + AC + ' = {{ac}}~\\unit{cm}$. ')
        calcul = ('On calcule d\'abord $' + AM + '$ et $' + AN + '$ : $$' + AM + ' = ' + MB
                  + ' - ' + AB + ' = {{mb}} - {{ab}} = {{am}}~\\unit{cm} \\qquad ' + AN + ' = '
                  + NC + ' - ' + AC + ' = {{eval:nc;d}} - {{ac}} = {{eval:an;d}}~\\unit{cm}$$')
        extra = [var('mb', 'eval:am+ab'), var('nc', 'eval:an+ac;d')]
    v['statement'] = st[:debut] + donnees + st[fin:]
    v['variables'] = v['variables'] + extra
    if emboites:
        v['conditions'] = v['conditions'] + ['ac - an >= 1']
    v['correction']['steps'] = [calcul] + v['correction']['steps']
    return v


V2 = avec_calcul(R37['variations'][0], True)
V3 = avec_calcul(R37['variations'][1], False)


def vars_r(w, h, ab, am, ac, emboites=None):
    an = ac * am / ab + w * h / 10
    an = round(an, 1)
    v = {'s': 0, 'o': 0, 'w': w, 'ab': ab, 'am': am, 'ac': ac, 'h': h, 'an': f'{an:g}'}
    if emboites is True:
        v.update({'mb': ab - am, 'nc': f'{round(ac - an, 1):g}'})
    elif emboites is False:
        v.update({'mb': ab + am, 'nc': f'{round(ac + an, 1):g}'})
    return v


SPECS_R37 = list(R37['testSpecs'])
EG0, DIF0 = vars_r(0, 1, 5, 3, 10), vars_r(1, 2, 5, 3, 10)        # 3/5 = 6/10 ; 6,2/10
SPECS_R37 += [
    spec('v0 rapports égaux : « parallèles d\'après le théorème » faux', 0, EG0, 'incorrect',
         ['2']),
    spec('v0 rapports différents : « pas parallèles d\'après la réciproque » faux', 0, DIF0,
         'incorrect', ['3']),
    spec('v1 papillon différents : « pas parallèles d\'après la réciproque » faux', 1,
         vars_r(1, -1, 4, 3, 8), 'incorrect', ['3']),
]
for vi, emb in ((NV_R37, True), (NV_R37 + 1, False)):
    nom = 'emboîtés' if emb else 'papillon'
    eg = vars_r(0, 1, 5, 3, 10, emb)       # AM = 3, AN = 6
    dif = vars_r(1, 2, 5, 3, 10, emb)      # AN = 6,2
    SPECS_R37 += [
        spec(f'v{vi} {nom}, rapports égaux (MB = {eg["mb"]}, NC = {eg["nc"]}) : réciproque', vi,
             eg, 'correct', ['0']),
        spec(f'v{vi} {nom}, rapports égaux : théorème au lieu de la réciproque', vi, eg,
             'incorrect', ['2']),
        spec(f'v{vi} {nom}, rapports égaux : « pas parallèles » faux', vi, eg, 'incorrect',
             ['1']),
        spec(f'v{vi} {nom}, rapports différents (NC = {dif["nc"]}) : contraposée', vi, dif,
             'correct', ['1']),
        spec(f'v{vi} {nom}, rapports différents : réciproque au lieu de la contraposée', vi,
             dif, 'incorrect', ['3']),
        spec(f'v{vi} {nom}, rapports différents : « parallèles » faux', vi, dif, 'incorrect',
             ['0']),
    ]

R37['description'] = ('Dire si deux droites sont parallèles et choisir la propriété qui le '
                      'justifie (réciproque ou contraposée du théorème de Thalès) : triangles '
                      'emboîtés, papillon ; rapports égaux ou proches ; AM et AN à calculer '
                      'd\'abord quand MB et NC sont donnés')
R37['variations'] = [V0, V1] + R37['variations'][2:] + [V2, V3]
R37['testSpecs'] = SPECS_R37
ecrire('37c13d51', R37, 2, 2)
