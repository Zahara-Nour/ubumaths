"""Réécrit 2-330 (tableau de signes d'un produit) et 2-446 (d'un quotient) avec le tableau à compléter.

Chantier `tableau-signes`, Q6 (David, 2026-11-02) ; phase 0 de la réécriture validée le 2026-11-03 :
- variations « dresser » : TOUT est caché (valeurs de x, signes, marques des trois lignes ; « rien »
  écrit `?rien` là où un facteur ne s'annule pas) ; étiquettes des lignes données ;
- variation k(ax + b) : trois lignes (constante k, facteur, produit) ;
- variations « lire » : lignes des facteurs données, ligne du produit / quotient à compléter ;
- plus aucune case sous le tableau, plus de `blanks` ; temps porté de 90 s à 180 s ;
- titre, catégorie, niveau, `grades`, variables, conditions, corrigés : inchangés.

Source : le contenu d'avant (identique à la prod, empreintes vérifiées le 2026-11-03), lu au commit
SOURCE. Sorties : les fichiers du dépôt (`scripts/questions/2de-signes-b/`, `status` brouillon comme
avant) et les instantanés du lot `tableau-signes-2de` d'`update-published-questions.ts`
(`scripts/questions/2de-tableau-signes-existants/<id8>.json`, `status` publié).

    python3 docs/archive/wip/tableau-signes/reecrire-330-446.py
"""
import json
import re
import subprocess

SOURCE = '2d2343108'
DOSSIER = 'scripts/questions/2de-signes-b'
INSTANTANES = 'scripts/questions/2de-tableau-signes-existants'
FICHIERS = {
    '01-tableau-de-signes-d-un-produit.json': 'f0163416-0610-49cc-bf2d-83db744dbf43',
    '02-tableau-de-signes-d-un-quotient.json': '9c7ab1c7-d3f3-4c78-96f4-c14e5a657574',
}
DELAI = 180
SANS_MARQUE = 'rien'

# ============================================================================
# TABLEAUX
# ============================================================================


def bloc_du_corrige(variation):
    """Le tableau complet du corrigé (dernière étape), sans les fences"""
    etape = variation['correction']['steps'][-1]
    assert etape.startswith('```variation\n') and etape.endswith('\n```'), etape[:40]
    return etape[len('```variation\n'):-len('\n```')]


def cacher(corps, lignes_cachees=None):
    """Préfixe d'un `?` les cellules à compléter.

    `lignes_cachees` = None : tout (domaine compris) ; sinon, les étiquettes des lignes `sign:` à
    compléter. Dans une ligne cachée, chaque point du domaine sans marque reçoit `?rien`.
    """
    tout = lignes_cachees is None
    lignes = corps.split('\n')
    domaine = []
    sortie = []
    ligne_courante = None  # (étiquette, points marqués, cachée)

    def fermer():
        if ligne_courante and ligne_courante[2]:
            for point in domaine:
                if point not in ligne_courante[1]:
                    sortie.append(f'  {point}: ?{SANS_MARQUE}')

    for ligne in lignes:
        if ligne.startswith('domain:'):
            valeurs = [v.strip() for v in ligne[len('domain:'):].split(',')]
            domaine = valeurs[1:-1]
            if tout:
                valeurs = [valeurs[0], *(f'?{v}' for v in domaine), valeurs[-1]]
            sortie.append('domain: ' + ', '.join(valeurs))
            continue
        if ligne.startswith('sign:'):
            fermer()
            etiquette = ligne[len('sign:'):].strip()
            ligne_courante = (etiquette, set(), tout or etiquette in lignes_cachees)
            sortie.append(ligne)
            continue
        m = re.match(r'^  (.+?): (.+)$', ligne)
        if m and ligne_courante:
            cle, valeur = m.groups()
            if ',' not in cle:
                ligne_courante[1].add(cle)
            sortie.append(f'  {cle}: ?{valeur}' if ligne_courante[2] else ligne)
            continue
        if ligne == '':
            fermer()
            ligne_courante = None
        sortie.append(ligne)
    fermer()
    return '\n'.join(sortie)


def fence(corps):
    return f'```variation\n{corps}\n```'


# ============================================================================
# SPECS — réponses dans l'ordre de lecture : domaine, puis chaque ligne colonne par colonne
# ============================================================================


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers, 'expected': {'status': status}}


def ligne(*cellules):
    return list(cellules)


R = SANS_MARQUE
PRODUIT_0 = {'a': 2, 'ra': -1, 'b': 2, 'c': -1, 'rb': 3, 'd': 3, 'ac': -2}  # (2x+2)(−x+3)
PRODUIT_1 = {'a': 1, 'ra': 4, 'b': -4, 'c': 3, 'rb': -2, 'd': 6, 'ac': 3}  # (x−4)(3x+6)
K = {'k': -3, 'a': 2, 'ra': 1, 'b': -2, 'ka': -6}  # −3(2x−2)
X_POS = {'c': 2, 'rb': 3, 'd': -6, 'ac': 2}  # x(2x−6)
X_NEG = {'c': -1, 'rb': -2, 'd': -2, 'ac': -1}  # x(−x−2)

# (2x+2)(−x+3) : −1, 3
P0_F1 = ligne('-', 'z', '+', R, '+')
P0_F2 = ligne('+', R, '+', 'z', '-')
P0_A = ligne('-', 'z', '+', 'z', '-')
# (x−4)(3x+6) : −2, 4
P1_F1 = ligne('-', R, '-', 'z', '+')
P1_F2 = ligne('-', 'z', '+', R, '+')
P1_A = ligne('+', 'z', '-', 'z', '+')

SPECS_PRODUIT = [
    spec('(2x+2)(−x+3) : −1, 3 ; −0++ / +R+0− / −0+0−', 0, PRODUIT_0,
         ['-1', '3', *P0_F1, *P0_F2, *P0_A], 'correct'),
    spec('Zéro écrit « 0 » au lieu du jeton z', 0, PRODUIT_0,
         ['-1', '3', '-', '0', '+', R, '+', '+', R, '+', '0', '-', '-', '0', '+', '0', '-'],
         'correct'),
    spec('Erreur : valeurs 1 et −3 (signe de −b/a)', 0, PRODUIT_0,
         ['1', '-3', *P0_F1, *P0_F2, *P0_A], 'incorrect'),
    spec('Erreur : + − + (signe de a seul)', 0, PRODUIT_0,
         ['-1', '3', *P0_F1, *P0_F2, '+', 'z', '-', 'z', '+'], 'incorrect'),
    spec('Erreur : 0 de chaque facteur sous les deux valeurs', 0, PRODUIT_0,
         ['-1', '3', '-', 'z', '+', 'z', '+', '+', 'z', '+', 'z', '-', *P0_A], 'incorrect'),
    spec('Erreur : signes de −x+3 inversés (− R + 0 +)', 0, PRODUIT_0,
         ['-1', '3', *P0_F1, '-', R, '+', 'z', '+', *P0_A], 'incorrect'),
    spec('(x−4)(3x+6) : −2, 4', 1, PRODUIT_1,
         ['-2', '4', *P1_F1, *P1_F2, *P1_A], 'correct'),
    spec('Erreur : ordre 4, −2', 1, PRODUIT_1,
         ['4', '-2', *P1_F1, *P1_F2, *P1_A], 'incorrect'),
    spec('Lire : − 0 + 0 −', 2, PRODUIT_0, P0_A, 'correct'),
    spec('Erreur : + 0 − 0 +', 2, PRODUIT_0, ['+', 'z', '-', 'z', '+'], 'incorrect'),
    spec('Erreur : pas de 0 sous −1', 2, PRODUIT_0, ['-', R, '+', 'z', '-'], 'incorrect'),
    spec('−3(2x−2) : 1 ; − R − / − 0 + / + 0 −', 3, K,
         ['1', '-', R, '-', '-', 'z', '+', '+', 'z', '-'], 'correct'),
    spec('Erreur : constante oubliée (− 0 +)', 3, K,
         ['1', '-', R, '-', '-', 'z', '+', '-', 'z', '+'], 'incorrect'),
    spec('Erreur : 0 sous 1 dans la ligne de la constante', 3, K,
         ['1', '-', 'z', '-', '-', 'z', '+', '+', 'z', '-'], 'incorrect'),
    spec('x(2x−6) : 0, 3', 4, X_POS,
         ['0', '3', '-', 'z', '+', R, '+', '-', R, '-', 'z', '+', '+', 'z', '-', 'z', '+'],
         'correct'),
    spec('Erreur : oubli du zéro 0', 4, X_POS,
         ['3', '3', '-', 'z', '+', R, '+', '-', R, '-', 'z', '+', '+', 'z', '-', 'z', '+'],
         'incorrect'),
    spec('x(−x−2) : −2, 0', 5, X_NEG,
         ['-2', '0', '-', R, '-', 'z', '+', '+', 'z', '-', R, '-', '-', 'z', '+', 'z', '-'],
         'correct'),
]

QUOTIENT_0 = PRODUIT_0  # (2x+2)/(−x+3)
QUOTIENT_1 = PRODUIT_1  # (x−4)/(3x+6)
Q0_B = ligne('-', 'z', '+', '||', '-')
Q1_B = ligne('+', '||', '-', 'z', '+')

SPECS_QUOTIENT = [
    spec('(2x+2)/(−x+3) : −1, 3 ; B : − 0 + || −', 0, QUOTIENT_0,
         ['-1', '3', *P0_F1, *P0_F2, *Q0_B], 'correct'),
    spec('Erreur : zéro et valeur interdite échangés', 0, QUOTIENT_0,
         ['-1', '3', *P0_F1, *P0_F2, '-', '||', '+', 'z', '-'], 'incorrect'),
    spec('Erreur : 0 sous la valeur interdite', 0, QUOTIENT_0,
         ['-1', '3', *P0_F1, *P0_F2, '-', 'z', '+', 'z', '-'], 'incorrect'),
    spec('Erreur : double barre dans la ligne du dénominateur', 0, QUOTIENT_0,
         ['-1', '3', *P0_F1, '+', R, '+', '||', '-', *Q0_B], 'incorrect'),
    spec('(x−4)/(3x+6) : −2, 4 ; B : + || − 0 +', 1, QUOTIENT_1,
         ['-2', '4', *P1_F1, *P1_F2, *Q1_B], 'correct'),
    spec('Erreur : ordre 4, −2', 1, QUOTIENT_1,
         ['4', '-2', *P1_F1, *P1_F2, *Q1_B], 'incorrect'),
    spec('Lire : − 0 + || −', 2, QUOTIENT_0, Q0_B, 'correct'),
    spec('Erreur : 0 sous la valeur interdite', 2, QUOTIENT_0, ['-', 'z', '+', 'z', '-'],
         'incorrect'),
    spec('Lire (ordre inverse) : + || − 0 +', 3, QUOTIENT_1, Q1_B, 'correct'),
    spec('Erreur : signes inversés', 3, QUOTIENT_1, ['-', '||', '+', 'z', '-'], 'incorrect'),
]

# ============================================================================
# ÉNONCÉS
# ============================================================================

COMPLETE = 'Complète le tableau de signes de ${}$.'
LIRE_PRODUIT = 'Voici les signes des deux facteurs de ${}$. Complète la ligne de $A(x)$.'
LIRE_QUOTIENT = ('Voici les signes du numérateur et du dénominateur de ${}$. '
                 'Complète la ligne de $B(x)$.')


def formule(variation):
    """La formule de la première ligne de l'énoncé d'avant (« … de $A(x)=…$. »)"""
    m = re.search(r'de \$([AB]\(x\)=.+?)\$\.', variation['statement'])
    assert m, variation['statement'][:80]
    return m.group(1)


def reecrire(variation, mode):
    corps = bloc_du_corrige(variation)
    f = formule(variation)
    if mode == 'dresser':
        statement = COMPLETE.format(f) + '\n\n' + fence(cacher(corps))
    else:
        etiquette = f[:4]  # A(x) ou B(x)
        gabarit = LIRE_PRODUIT if etiquette == 'A(x)' else LIRE_QUOTIENT
        statement = gabarit.format(f) + '\n\n' + fence(cacher(corps, {etiquette}))
    nouvelle = {'statement': statement, 'variables': variation['variables']}
    if 'conditions' in variation:
        nouvelle['conditions'] = variation['conditions']
    nouvelle['correction'] = variation['correction']
    return nouvelle


MODES = {
    '01-tableau-de-signes-d-un-produit.json':
        ['dresser', 'dresser', 'lire', 'dresser', 'dresser', 'dresser'],
    '02-tableau-de-signes-d-un-quotient.json': ['dresser', 'dresser', 'lire', 'lire'],
}
SPECS = {
    '01-tableau-de-signes-d-un-produit.json': SPECS_PRODUIT,
    '02-tableau-de-signes-d-un-quotient.json': SPECS_QUOTIENT,
}
DESCRIPTIONS = {
    '01-tableau-de-signes-d-un-produit.json':
        "Compléter le tableau de signes de (ax + b)(cx + d), de k(ax + b), de x(cx + d) : valeurs "
        "qui annulent, signes et zéros de chaque ligne ; lire la ligne du produit (pièges : racine "
        "−b/a écrite b/a, ordre des valeurs, 0 du mauvais facteur, constante négative oubliée, "
        "règle des signes)",
    '02-tableau-de-signes-d-un-quotient.json':
        "Compléter le tableau de signes de (ax + b)/(cx + d) : valeur qui annule, valeur interdite, "
        "signes, 0 et double barre ; lire la ligne du quotient (pièges : 0 sous la valeur interdite, "
        "valeur interdite et zéro échangés, double barre dans la ligne du dénominateur)",
}

INSTANTANE_CLES = ['id', 'title', 'description', 'grades', 'theme', 'domain', 'subdomain',
                   'level', 'delay', 'status', 'shared', 'variations', 'testSpecs']


def ecrire(chemin, m):
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')


def main():
    import os
    os.makedirs(INSTANTANES, exist_ok=True)
    for nom, id_ in FICHIERS.items():
        brut = subprocess.check_output(['git', 'show', f'{SOURCE}:{DOSSIER}/{nom}'], text=True)
        m = json.loads(brut)
        assert len(m['variations']) == len(MODES[nom]), nom
        m['variations'] = [reecrire(v, mode) for v, mode in zip(m['variations'], MODES[nom])]
        m['testSpecs'] = SPECS[nom]
        m['description'] = DESCRIPTIONS[nom]
        m['delay'] = DELAI
        ecrire(f'{DOSSIER}/{nom}', m)
        instantane = {**m, 'id': id_, 'status': 'published'}
        ecrire(f'{INSTANTANES}/{id_[:8]}.json', {k: instantane[k] for k in INSTANTANE_CLES})
        print(f'{nom} → {id_[:8]} : {len(m["variations"])} variations, {len(m["testSpecs"])} specs')


main()
