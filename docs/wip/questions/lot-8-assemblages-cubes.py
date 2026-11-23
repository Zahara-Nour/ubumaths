"""Écrit les 5 modèles du lot 8 « Assemblages de cubes » de la 6e dans
scripts/questions/6-assemblages-cubes/.

Phase 0 validée par David le 2026-11-01 (§ 20 du journal `docs/wip/questions-6-progress.md`).
Bornes : `cycle3.json`, 6e (6-154 : assemblages de cubes identiques ; 6-155 : cubes d'arête 1 cm ;
6-181 : vues de dessus, de face, de gauche, de droite ; 6-208, 6-209 : « general »). Exemples de
réussite 6e p. 17 : tracer les vues, choisir l'assemblage qui a quatre vues données, dénombrer un
empilement. Un point par modèle ; nœud et tag posés par la migration de rangement.

Décisions et pièges :
- ```cubes : `hauteurs:` rangées séparées par `/`, la première AU FOND ; hauteurs 0 à 3 ici
  (téléphone : 1 cm par arête) ;
- assemblages montrés en perspective : hauteurs qui ne CROISSENT PAS du fond vers le devant, colonne
  par colonne (`fond >= devant`) : le dessus de chaque pile se voit, rien n'est caché derrière une
  pile plus haute (le compte et les vues se lisent sans ambiguïté) ;
- choix entre dessins (2 v4, 3 v1, 5 v2) : assemblages tirés d'un catalogue écrit ici (`k`), le
  script vérifie que les options se distinguent (vues comparées après retrait des bords vides) ;
- réponses des gestes : `dessiner:` → la vue, rangées de haut en bas, `1` = colorié ; `retrouver:` →
  les hauteurs, écriture du bloc ; les vues sont recalculées ici (`vue`) et les specs vérifient
  qu'elles s'accordent avec le juge ;
- jamais de variable `e` ni `i`.

    python3 docs/wip/questions/lot-8-assemblages-cubes.py scripts/questions
"""
import json
import os
import random
import subprocess
import sys

RACINE = sys.argv[1]
DOSSIER = os.path.join(RACINE, '6-assemblages-cubes')


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, theme, domain, subdomain, level, variations, specs,
           delay=60):
    return nom, {'title': title, 'description': description, 'grades': ['6'], 'theme': theme,
                 'domain': domain, 'subdomain': subdomain, 'level': level, 'delay': delay,
                 'status': 'draft', 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answers, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    if answers is not None:
        v['blanks'] = [{'expectedAnswer': a} for a in answers]
    v['correction'] = {'steps': steps}
    return v


def col(x, k=0):
    return '\\textcolor{{{color:primary.' + str(k) + '}}}{' + x + '}'


def pick(nom, valeurs):
    """`{{if:k==1|v1|{{if:k==2|v2|…vN}}}}` : la valeur n° k (de 1 à N) d'une liste."""
    expr = valeurs[-1]
    for n in range(len(valeurs) - 1, 0, -1):
        expr = '{{if:' + nom + '==' + str(n) + '|' + valeurs[n - 1] + '|' + expr + '}}'
    return expr


# --- Calcul des vues (même convention que `utils/cubes-gestes.ts`) ----------------------------

def ecrire(h):
    return ' / '.join(' '.join(str(x) for x in rangee) for rangee in h)


def lire(texte):
    return [[int(x) for x in r.split()] for r in texte.split('/')]


def rogner(grille):
    """Retire les rangées et colonnes vides au bord (grille de 0 et 1, ou de hauteurs)."""
    lignes = [r for r in range(len(grille)) if any(grille[r])]
    cols = [c for c in range(len(grille[0])) if any(grille[r][c] for r in range(len(grille)))]
    if not lignes:
        return []
    return [[grille[r][c] for c in range(cols[0], cols[-1] + 1)]
            for r in range(lignes[0], lignes[-1] + 1)]


def colonnes_vers_vue(hauteurs):
    """Hauteurs de gauche à droite → quadrillage, rangées de haut en bas."""
    top = max(hauteurs)
    return [[1 if x > z else 0 for x in hauteurs] for z in range(top - 1, -1, -1)]


def vue(h, quelle):
    h = rogner(h)
    if quelle == 'dessus':
        g = [[1 if x > 0 else 0 for x in rangee] for rangee in h]
    elif quelle == 'face':
        g = colonnes_vers_vue([max(h[r][c] for r in range(len(h))) for c in range(len(h[0]))])
    elif quelle == 'droite':  # le devant à gauche
        g = colonnes_vers_vue([max(h[r]) for r in range(len(h) - 1, -1, -1)])
    elif quelle == 'gauche':  # le devant à droite
        g = colonnes_vers_vue([max(h[r]) for r in range(len(h))])
    else:
        raise ValueError(quelle)
    return rogner(g)


def vue_txt(h, quelle):
    return '/'.join(''.join(str(x) for x in r) for r in vue(h, quelle))


def monotone(h):
    """Fond >= devant, colonne par colonne : tout dessus de pile se voit en perspective."""
    return all(h[r][c] >= h[r + 1][c] for r in range(len(h) - 1) for c in range(len(h[0])))


def total(h):
    return sum(sum(r) for r in h)


def bloc(h_expr, *lignes, retrait=''):
    corps = ['```cubes', 'hauteurs: ' + h_expr] + list(lignes) + ['```']
    return '\n'.join(retrait + x for x in corps)


def option(h_expr, *lignes):
    corps = bloc(h_expr, *lignes, retrait='  ')
    return '- ' + corps[2:]


def choix(options, reglages=()):
    return '````choix\n' + ''.join(r + '\n' for r in reglages) + '\n'.join(options) + '\n````'


MODELES = []
SOLIDES = ('Géométrie', 'Solides', 'Assemblages de cubes')
VOLUMES = ('Grandeurs', 'Volumes', 'Assemblages de cubes')

# Assemblage 2 × 3 tiré au hasard : a b c au fond, d f g devant, fond >= devant
# (les piles de devant sont tirées sous celles du fond : pas de tirage rejeté)
A23 = [var('a', '1..3'), var('b', '1..3'), var('c', '1..3'),
       var('d', '1..{{a}}'), var('f', '1..{{b}}'), var('g', '1..{{c}}')]
A23_COND = []
H23 = '{{a}} {{b}} {{c}} / {{d}} {{f}} {{g}}'
S23 = '{{eval:a+b+c+d+f+g}}'
COMPTE23 = ('Rangée du fond : ${{a}} + {{b}} + {{c}} = {{eval:a+b+c}}$. Rangée de devant : ${{d}} +'
            ' {{f}} + {{g}} = {{eval:d+f+g}}$.')
PILES = ('**On compte pile par pile.** Un cube est toujours posé sur le sol ou sur un autre cube :'
         ' sous le dessus d\'une pile, il y a tous les cubes de la pile, même ceux qu\'on ne voit pas.')
EX23 = {'a': 3, 'b': 2, 'c': 2, 'd': 1, 'f': 2, 'g': 1}
H_EX23 = [[3, 2, 2], [1, 2, 1]]

# --- Catalogues (tirés une fois, graine fixe, vérifiés) ---------------------------------------

ESCALIERS = [  # 6-209 v3 : empilements en escalier ou en pyramide, 3 × 3
    [[3, 2, 1], [2, 2, 1], [1, 1, 1]],
    [[3, 3, 3], [2, 2, 2], [1, 1, 1]],
    [[3, 2, 1], [2, 1, 0], [1, 0, 0]],
    [[1, 2, 3], [1, 2, 2], [1, 1, 1]],
    [[2, 3, 2], [1, 2, 1], [1, 1, 1]],
    [[3, 3, 2], [2, 2, 1], [1, 1, 0]],
]
for h in ESCALIERS:
    assert monotone(h), h


def tirer_monotone(alea, lignes, cols, hmin, hmax):
    while True:
        h = [[alea.randint(hmin, hmax) for _ in range(cols)] for _ in range(lignes)]
        if monotone(h) and all(any(r) for r in h):
            return h


def voisins(h):
    """Assemblages à un cube près (retiré, ajouté ou déplacé), encore montrables (monotones)."""
    cases = [(r, c) for r in range(len(h)) for c in range(len(h[0]))]
    out = []
    for (r, c) in cases:
        for delta in (-1, 1):
            g = [row[:] for row in h]
            g[r][c] += delta
            if 0 <= g[r][c] <= 3 and monotone(g) and total(g) > 0:
                out.append(('retire' if delta < 0 else 'ajoute', g))
    for (r1, c1) in cases:
        for (r2, c2) in cases:
            if (r1, c1) == (r2, c2):
                continue
            g = [row[:] for row in h]
            g[r1][c1] -= 1
            g[r2][c2] += 1
            if g[r1][c1] >= 0 and g[r2][c2] <= 3 and monotone(g):
                out.append(('deplace', g))
    return out


def catalogue_vues(alea, n):
    """6-181 v4 : (H, H2) ; options vue de face de H, vue de dessus de H, vue de droite de H,
    vue de face de H2 (un cube de plus ou de moins) : quatre dessins distincts."""
    out = []
    while len(out) < n:
        h = tirer_monotone(alea, 2, 3, 1, 3)
        cand = [g for (_, g) in voisins(h) if vue(g, 'face') != vue(h, 'face')]
        if not cand:
            continue
        h2 = alea.choice(cand)
        vues = [vue(h, 'face'), vue(h, 'dessus'), vue(h, 'droite'), vue(h2, 'face')]
        if all(vues[x] != vues[y] for x in range(4) for y in range(x + 1, 4)) \
                and (h, h2) not in out:
            out.append((h, h2))
    return out


def catalogue_retrouver(alea, n):
    """6-208 v1 : (H, L1, L2) ; L1 un cube retiré, L2 un cube déplacé ; chaque leurre a au moins
    une vue (face, dessus, droite) différente de celles de H."""
    vues3 = ('face', 'dessus', 'droite')
    out = []
    while len(out) < n:
        h = tirer_monotone(alea, 2, 3, 1, 3) if len(out) % 2 == 0 \
            else tirer_monotone(alea, 3, 3, 0, 3)
        signature = [vue(h, q) for q in vues3]
        vs = voisins(h)
        l1s = [g for (k, g) in vs if k == 'retire' and [vue(g, q) for q in vues3] != signature]
        l2s = [g for (k, g) in vs if k == 'deplace' and [vue(g, q) for q in vues3] != signature]
        if not l1s or not l2s:
            continue
        l1, l2 = alea.choice(l1s), alea.choice(l2s)
        if rogner(l1) != rogner(l2) and rogner(l1) != rogner(h) and rogner(l2) != rogner(h):
            out.append((h, l1, l2))
    return out


def catalogue_meme_volume(alea, n):
    """6-154 v2 : (haut, etale) de même volume ; l'un sur 2 × 2 haut de 2 ou 3, l'autre sur
    3 × 4 au plus, d'un étage (ou deux pour les grands nombres)."""
    out = []
    while len(out) < n:
        haut = tirer_monotone(alea, 2, 2, 2, 3)
        v = total(haut)
        lignes, cols = (2, 4) if v <= 8 else (3, 4)
        cases = lignes * cols
        etages = 1 if v <= cases else 2
        if v > cases * etages:
            continue
        # étalé : on remplit du fond vers le devant, de gauche à droite (reste monotone)
        h = [[0] * cols for _ in range(lignes)]
        reste = v
        for z in range(etages):
            for r in range(lignes):
                for c in range(cols):
                    if reste and h[r][c] == z:
                        h[r][c] += 1
                        reste -= 1
        etale = rogner(h)
        if monotone(etale) and max(max(r) for r in etale) < max(max(r) for r in haut) \
                and (haut, etale) not in out:
            out.append((haut, etale))
    return out


ALEA = random.Random(2026_11_01)
VUES4 = catalogue_vues(ALEA, 8)
RETROUVER = catalogue_retrouver(ALEA, 8)
MEME_VOLUME = catalogue_meme_volume(ALEA, 6)

# --- 1. 6-209 : compter les cubes d'un assemblage ------------------------------------------

COMBIEN = 'Combien de cubes y a-t-il dans cet assemblage ?\n\n'
RANGEE = [var('a', '1..3'), var('b', '1..3'), var('c', '1..3'), var('d', '1..3'),
          var('g', '1..3')]
K_ESC = var('k', '1..' + str(len(ESCALIERS)))
H_ESC = var('H', pick('k', [ecrire(h) for h in ESCALIERS]))
N_ESC = var('N', pick('k', [str(total(h)) for h in ESCALIERS]))
DETAIL_ESC = var('T', pick('k', [
    ' ; '.join(nom + ' : $' + ' + '.join(str(x) for x in r) + ' = ' + str(sum(r)) + '$'
               for nom, r in zip(('Rangée du fond', 'rangée du milieu', 'rangée de devant'), h))
    for h in ESCALIERS]))


def ex_esc(idx):
    h = ESCALIERS[idx]
    v = {'k': idx + 1, 'H': ecrire(h), 'N': total(h)}
    v['T'] = ' ; '.join(nom + ' : $' + ' + '.join(str(x) for x in r) + ' = ' + str(sum(r)) + '$'
                        for nom, r in zip(('Rangée du fond', 'rangée du milieu',
                                           'rangée de devant'), h))
    return v


MODELES.append(modele(
    '01-compter-les-cubes-d-un-assemblage', 'Compter les cubes d\'un assemblage',
    'Dénombrer les cubes d\'un assemblage dessiné en perspective : une seule rangée de piles, deux'
    ' rangées (cubes cachés sous d\'autres), un empilement en escalier ou en pyramide',
    *SOLIDES, 1,
    [variation(COMBIEN + bloc('{{a}} {{b}} {{c}} {{d}} {{g}}') + '\n\n$$?$$', RANGEE,
               ['{{eval:a+b+c+d+g}}'],
               ['On compte les cubes de chaque pile, de gauche à droite.',
                '${{a}} + {{b}} + {{c}} + {{d}} + {{g}} = ' + col('{{eval:a+b+c+d+g}}')
                + '$ cubes.']),
     variation(COMBIEN + bloc(H23) + '\n\n$$?$$', A23, [S23],
               [PILES, COMPTE23,
                'En tout : ${{eval:a+b+c}} + {{eval:d+f+g}} = ' + col(S23) + '$ cubes.'],
               A23_COND),
     variation(COMBIEN + bloc('{{H}}') + '\n\n$$?$$', [K_ESC, H_ESC, N_ESC, DETAIL_ESC],
               ['{{N}}'],
               [PILES, '{{T}}.', 'En tout : $' + col('{{N}}') + '$ cubes.'])],
    [spec('Une rangée : 2 + 3 + 1 + 1 + 2 = 9', 0, {'a': 2, 'b': 3, 'c': 1, 'd': 1, 'g': 2}, '9',
          'correct'),
     spec('Erreur : 5 (une pile = un cube)', 0, {'a': 2, 'b': 3, 'c': 1, 'd': 1, 'g': 2}, '5',
          'incorrect'),
     spec('Deux rangées : 11', 1, EX23, str(total(H_EX23)), 'correct'),
     spec('Erreur : 6 (les piles seulement)', 1, EX23, '6', 'incorrect'),
     spec('Erreur : 10 (un cube caché oublié)', 1, EX23, '10', 'incorrect'),
     spec('Escalier 3 × 3 : 14', 2, ex_esc(0), '14', 'correct'),
     spec('Erreur : 9 (un étage)', 2, ex_esc(0), '9', 'incorrect'),
     spec('Escalier en coin : 10', 2, ex_esc(2), '10', 'correct')],
    delay=45))

# --- 2. 6-181 : dessiner une vue d'un assemblage --------------------------------------------

DESSINE = 'Colorie la vue {QUELLE} de cet assemblage de cubes.\n\n'
QUELLE = {'face': 'de face', 'dessus': 'de dessus', 'droite': 'de droite', 'gauche': 'de gauche'}
A23_LIBRE = [var('a', '1..3'), var('b', '1..3'), var('c', '1..3'),
             var('d', '1..3'), var('f', '0..3'), var('g', '1..3')]
A33 = [var('a', '1..2'), var('b', '1..2'), var('c', '1..2'),
       var('d', '0..{{a}}'), var('f', '0..{{b}}'), var('g', '0..{{c}}'),
       var('m', '0..{{d}}'), var('n', '0..{{f}}'), var('p', '0..{{g}}')]
A33_COND = ['m*n*p==0', 'm+n+p>=1']
H33 = '{{a}} {{b}} {{c}} / {{d}} {{f}} {{g}} / {{m}} {{n}} {{p}}'
A32 = [var('a', '1..3'), var('b', '1..3'), var('c', '1..{{a}}'), var('d', '1..{{b}}'),
       var('f', '1..{{c}}'), var('g', '1..{{d}}'), var('s', '0..1')]
A32_COND = ['max(a,b)!=max(f,g)']
H32 = '{{a}} {{b}} / {{c}} {{d}} / {{f}} {{g}}'
COTE = '{{if:s==0|droite|gauche}}'

VUE_FACE = ('**Vue de face.** On regarde l\'assemblage de devant : chaque colonne montre sa pile la'
            ' plus haute, les piles de derrière se cachent derrière celles de devant.')
VUE_DESSUS = ('**Vue de dessus.** On regarde l\'assemblage d\'en haut : un carré par pile, quelle'
              ' que soit sa hauteur ; la rangée du fond est en haut du dessin.')
VUE_COTE = ('**Vue de {{if:s==0|droite|gauche}}.** On regarde l\'assemblage par la {{if:s==0|droite'
            '|gauche}} : chaque rangée (du devant au fond) montre sa pile la plus haute ; le devant'
            ' est {{if:s==0|à gauche|à droite}} du dessin.')

LAQUELLE = 'Quel dessin est la vue de face de cet assemblage de cubes ?\n\n'
K4 = var('k', '1..' + str(len(VUES4)))
H4 = var('H', pick('k', [ecrire(h) for h, _ in VUES4]))
H4B = var('V', pick('k', [ecrire(h2) for _, h2 in VUES4]))


def ex_vues4(idx):
    h, h2 = VUES4[idx]
    return {'k': idx + 1, 'H': ecrire(h), 'V': ecrire(h2)}


EX33 = {'a': 2, 'b': 2, 'c': 1, 'd': 2, 'f': 1, 'g': 0, 'm': 1, 'n': 0, 'p': 0}
H_EX33 = [[2, 2, 1], [2, 1, 0], [1, 0, 0]]
EX32 = {'a': 3, 'b': 2, 'c': 2, 'd': 2, 'f': 1, 'g': 1, 's': 0}
H_EX32 = [[3, 2], [2, 2], [1, 1]]
EX23L = {'a': 1, 'b': 3, 'c': 2, 'd': 2, 'f': 0, 'g': 1}
H_EX23L = [[1, 3, 2], [2, 0, 1]]

MODELES.append(modele(
    '02-dessiner-une-vue-d-un-assemblage', 'Dessiner une vue d\'un assemblage de cubes',
    'Colorier sur un quadrillage la vue de face, de dessus, de droite ou de gauche d\'un assemblage'
    ' de cubes dessiné en perspective ; dans l\'autre sens, reconnaître sa vue de face',
    *SOLIDES, 2,
    [variation(DESSINE.replace('{QUELLE}', 'de face') + bloc(H23, 'dessiner: face'), A23_LIBRE,
               None, [VUE_FACE]),
     variation(DESSINE.replace('{QUELLE}', 'de dessus') + bloc(H33, 'dessiner: dessus'), A33,
               None, [VUE_DESSUS], A33_COND),
     variation(DESSINE.replace('{QUELLE}', COTE.replace('droite', 'de droite')
                               .replace('gauche', 'de gauche'))
               + bloc(H32, 'dessiner: ' + COTE), A32, None, [VUE_COTE], A32_COND),
     variation(LAQUELLE + bloc('{{H}}') + '\n\n'
               + choix([option('{{H}}', 'vue: face'), option('{{H}}', 'vue: dessus'),
                        option('{{H}}', 'vue: droite'), option('{{V}}', 'vue: face')]),
               [K4, H4, H4B], ['0'],
               [VUE_FACE, 'Les autres dessins : la vue de dessus, la vue de droite, et la vue de'
                ' face d\'un assemblage qui a un cube de plus ou de moins.'])],
    [spec('Face, piles 1 3 2 (devant 2 0 1) : ' + vue_txt(H_EX23L, 'face'), 0, EX23L,
          vue_txt(H_EX23L, 'face'), 'correct'),
     spec('Face, dessin décalé dans le quadrillage : juste', 0, EX23L,
          '00000/' + '/'.join('0' + r + '0' for r in vue_txt(H_EX23L, 'face').split('/')) + '/00000',
          'correct'),
     spec('Erreur : la rangée de devant dessinée (2 0 1)', 0, EX23L,
          '/'.join(''.join(str(x) for x in r) for r in colonnes_vers_vue([2, 0, 1])),
          'incorrect'),
     spec('Rien colorié : vide', 0, EX23L, '', 'empty'),
     spec('Dessus : ' + vue_txt(H_EX33, 'dessus'), 1, EX33, vue_txt(H_EX33, 'dessus'), 'correct'),
     spec('Erreur dessus : toutes les cases', 1, EX33, '111/111/111', 'incorrect'),
     spec('Erreur dessus : la vue de face', 1, EX33, vue_txt(H_EX33, 'face'), 'incorrect'),
     spec('Droite : ' + vue_txt(H_EX32, 'droite'), 2, EX32, vue_txt(H_EX32, 'droite'), 'correct'),
     spec('Erreur : vue de gauche à la place de la droite', 2, EX32, vue_txt(H_EX32, 'gauche'),
          'incorrect'),
     spec('Gauche : ' + vue_txt(H_EX32, 'gauche'), 2, dict(EX32, s=1), vue_txt(H_EX32, 'gauche'),
          'correct'),
     spec('Choix : la vue de face', 3, ex_vues4(0), '0', 'correct'),
     spec('Erreur choix : la vue de dessus', 3, ex_vues4(0), '1', 'incorrect'),
     spec('Erreur choix : la face d\'un autre assemblage', 3, ex_vues4(0), '3', 'incorrect')]))

# --- 3. 6-208 : retrouver un assemblage d'après ses vues ------------------------------------

K3 = var('k', '1..' + str(len(RETROUVER)))
H3 = var('H', pick('k', [ecrire(h) for h, _, _ in RETROUVER]))
L1 = var('L', pick('k', [ecrire(l1) for _, l1, _ in RETROUVER]))
L2 = var('M', pick('k', [ecrire(l2) for _, _, l2 in RETROUVER]))


def ex_retrouver(idx):
    h, l1, l2 = RETROUVER[idx]
    return {'k': idx + 1, 'H': ecrire(h), 'L': ecrire(l1), 'M': ecrire(l2)}


TROIS_VUES = ('Voici trois vues d\'un assemblage de cubes.\n\n**Vue de face**\n\n'
              + bloc('{{H}}', 'vue: face') + '\n\n**Vue de dessus**\n\n' + bloc('{{H}}', 'vue: dessus')
              + '\n\n**Vue de droite**\n\n' + bloc('{{H}}', 'vue: droite')
              + '\n\nQuel est cet assemblage ?\n\n')
R23 = [var('a', '1..3'), var('b', '1..3'), var('c', '1..3'),
       var('d', '1..3'), var('f', '1..3'), var('g', '1..3')]
R33 = [var('a', '1..3'), var('b', '1..3'), var('c', '1..3'), var('d', '1..3'),
       var('f', '1..3'), var('g', '1..3'), var('m', '1..3'), var('n', '1..3'), var('p', '0..3')]
METHODE_RETROUVER = ('**Méthode.** La vue de dessus donne la place des piles. La vue de face donne,'
                     ' colonne par colonne, la hauteur de la pile la plus haute{DROITE}. On écrit'
                     ' d\'abord ces piles-là, puis on complète les autres sans les dépasser.')
EX_R23 = {'a': 2, 'b': 1, 'c': 3, 'd': 1, 'f': 1, 'g': 2}
H_R23 = [[2, 1, 3], [1, 1, 2]]
EX_R33 = {'a': 3, 'b': 1, 'c': 2, 'd': 1, 'f': 2, 'g': 1, 'm': 2, 'n': 1, 'p': 0}
H_R33 = [[3, 1, 2], [1, 2, 1], [2, 1, 0]]


def autre_solution(h, vues):
    """Un autre assemblage qui a la même vue de dessus et les mêmes vues listées."""
    for r in range(len(h)):
        for c in range(len(h[0])):
            for nv in range(1, 4):
                if h[r][c] > 0 and nv != h[r][c]:
                    g = [row[:] for row in h]
                    g[r][c] = nv
                    if all(vue(g, q) == vue(h, q) for q in ('dessus',) + vues):
                        return g
    raise ValueError('aucune autre solution')


MODELES.append(modele(
    '03-retrouver-un-assemblage-d-apres-ses-vues', 'Retrouver un assemblage de cubes d\'après ses vues',
    'Choisir, parmi trois assemblages en perspective, celui qui a les vues données ; puis écrire la'
    ' hauteur de chaque pile d\'un assemblage dont on connaît la vue de dessus et la vue de face (et'
    ' de droite)',
    *SOLIDES, 3,
    [variation(TROIS_VUES + choix([option('{{H}}'), option('{{L}}'), option('{{M}}')]),
               [K3, H3, L1, L2], ['0'],
               ['On compare chaque assemblage aux trois vues : il doit les avoir toutes les trois.',
                'Les deux autres ont un cube de moins ou un cube déplacé : une de leurs vues au'
                ' moins n\'est pas celle de l\'énoncé.']),
     variation('Écris dans chaque case de la vue de dessus le nombre de cubes de la pile, pour'
               ' que l\'assemblage ait cette vue de face.\n\n' + bloc(H23, 'retrouver: face'), R23,
               None, [METHODE_RETROUVER.replace('{DROITE}', '')]),
     variation('Écris dans chaque case de la vue de dessus le nombre de cubes de la pile, pour'
               ' que l\'assemblage ait cette vue de face et cette vue de droite.\n\n'
               + bloc(H33, 'retrouver: face, droite'), R33, None,
               [METHODE_RETROUVER.replace('{DROITE}', ' ; la vue de droite, rangée par rangée')])],
    [spec('Choix : le bon assemblage', 0, ex_retrouver(0), '0', 'correct'),
     spec('Erreur : un cube de moins', 0, ex_retrouver(0), '1', 'incorrect'),
     spec('Erreur : un cube déplacé', 0, ex_retrouver(1), '2', 'incorrect'),
     spec('Face : l\'assemblage du bloc', 1, EX_R23, ecrire(H_R23), 'correct'),
     spec('Face : une autre réponse juste', 1, EX_R23, ecrire(autre_solution(H_R23, ('face',))),
          'correct'),
     spec('Erreur : une colonne trop haute', 1, EX_R23, '2 1 3 / 1 2 3', 'incorrect'),
     spec('Erreur : case vide', 1, EX_R23, '2 1 3 / 1 - 2', 'incorrect'),
     spec('Face et droite : l\'assemblage du bloc', 2, EX_R33, ecrire(H_R33), 'correct'),
     spec('Face et droite : une autre réponse juste', 2, EX_R33,
          ecrire(autre_solution(H_R33, ('face', 'droite'))), 'correct'),
     spec('Erreur : vue de droite fausse', 2, EX_R33, '3 1 2 / 1 2 1 / 1 1 0', 'incorrect')],
    delay=90))

# --- 4. 6-155 : volume d'un assemblage de cubes ---------------------------------------------

ARETE = 'Chaque cube a une arête de $1~\\unit{cm}$. Quel est le volume de cet assemblage ?\n\n'
CASE_CM3 = '\n\n$$?~\\text{cm}^3$$'
UN_CM3 = 'Un cube d\'arête $1~\\unit{cm}$ a un volume de $1~\\unit{cm^3}$.'
RANGEE_PAVE = '{{if:l==2|{{h}} {{h}}|{{if:l==3|{{h}} {{h}} {{h}}|{{h}} {{h}} {{h}} {{h}}}}}}'
PAVE = [var('l', '2..4'), var('p', '2..3'), var('h', '1..3'), var('R', RANGEE_PAVE),
        var('H', '{{if:p==2|{{R}} / {{R}}|{{R}} / {{R}} / {{R}}}}')]
# v3 : pavé l × p × h, la rangée de devant abaissée d'un cube (t = 0) ou le coin de devant à
# droite retiré (t = 1)
DEVANT = ('{{if:t==0|' + RANGEE_PAVE.replace('{{h}}', '{{eval:h-1}}') + '|'
          + '{{if:l==3|{{h}} {{h}} 0|{{h}} {{h}} {{h}} 0}}}}')
MARCHE = [var('l', '3..4'), var('p', '2..3'), var('h', '2..3'), var('t', '0..1'),
          var('R', RANGEE_PAVE), var('D', DEVANT),
          var('H', '{{if:p==2|{{R}} / {{D}}|{{R}} / {{R}} / {{D}}}}'),
          var('M', '{{if:t==0|{{l}}|{{h}}}}')]


def ex_pave(l, p, h):
    rangee = ' '.join([str(h)] * l)
    return {'l': l, 'p': p, 'h': h, 'R': rangee, 'H': ' / '.join([rangee] * p)}


def ex_marche(l, p, h, t):
    rangee = ' '.join([str(h)] * l)
    devant = ' '.join([str(h - 1)] * l) if t == 0 else ' '.join([str(h)] * (l - 1) + ['0'])
    return {'l': l, 'p': p, 'h': h, 't': t, 'R': rangee, 'D': devant,
            'H': ' / '.join([rangee] * (p - 1) + [devant]), 'M': l if t == 0 else h}


MODELES.append(modele(
    '04-volume-d-un-assemblage-de-cubes', 'Volume d\'un assemblage de cubes',
    'Volume en cm³ d\'un assemblage de cubes d\'arête 1 cm : compter les cubes, un pavé plein'
    ' compté étage par étage, un pavé auquel il manque une marche ou un coin',
    *VOLUMES, 1,
    [variation(ARETE + bloc(H23) + CASE_CM3, A23, [S23],
               [PILES, COMPTE23, 'En tout ${{eval:a+b+c}} + {{eval:d+f+g}} = ' + S23
                + '$ cubes. ' + UN_CM3,
                'Le volume de l\'assemblage est $' + col(S23 + '~\\unit{cm^3}') + '$.'],
               A23_COND),
     variation(ARETE + bloc('{{H}}') + CASE_CM3, PAVE, ['{{eval:l*p*h}}'],
               ['**Étage par étage.** Un étage a ${{p}}$ rangées de ${{l}}$ cubes : ${{l}} \\times'
                ' {{p}} = {{eval:l*p}}$ cubes.',
                '{{if:h==1|Il n\'y a qu\'un étage : ${{eval:l*p}}$ cubes.|Il y a ${{h}}$ étages :'
                ' ${{eval:l*p}} \\times {{h}} = {{eval:l*p*h}}$ cubes.}}',
                UN_CM3 + ' Le volume est $' + col('{{eval:l*p*h}}~\\unit{cm^3}') + '$.']),
     variation(ARETE + bloc('{{H}}') + CASE_CM3, MARCHE, ['{{eval:l*p*h-M}}'],
               ['**Le pavé complet.** Il aurait ${{l}} \\times {{p}} \\times {{h}} = {{eval:l*p*h}}$'
                ' cubes.',
                '{{if:t==0|Il manque, devant en haut, une rangée de ${{l}}$ cubes|Il manque la pile'
                ' de devant à droite, de ${{h}}$ cubes}} : ${{eval:l*p*h}} - {{M}} ='
                ' {{eval:l*p*h-M}}$ cubes.',
                UN_CM3 + ' Le volume est $' + col('{{eval:l*p*h-M}}~\\unit{cm^3}') + '$.'])],
    [spec('Deux rangées : 11 cm³', 0, EX23, '11', 'correct'),
     spec('Erreur : 6 (les piles seulement)', 0, EX23, '6', 'incorrect'),
     spec('Pavé 3 × 2 × 2 : 12 cm³', 1, ex_pave(3, 2, 2), '12', 'correct'),
     spec('Erreur : 7 (3 + 2 + 2)', 1, ex_pave(3, 2, 2), '7', 'incorrect'),
     spec('Erreur : 6 (un étage)', 1, ex_pave(3, 2, 2), '6', 'incorrect'),
     spec('Pavé 4 × 3 × 1 : 12', 1, ex_pave(4, 3, 1), '12', 'correct'),
     spec('Marche : 4 × 2 × 3 - 4 = 20', 2, ex_marche(4, 2, 3, 0), '20', 'correct'),
     spec('Erreur : 24 (le pavé complet)', 2, ex_marche(4, 2, 3, 0), '24', 'incorrect'),
     spec('Coin : 3 × 3 × 2 - 2 = 16', 2, ex_marche(3, 3, 2, 1), '16', 'correct')]))

# --- 5. 6-154 : comparer les volumes de deux assemblages ------------------------------------

B23 = [var('m', '1..3'), var('n', '1..3'), var('p', '1..3'),
       var('q', '1..{{m}}'), var('r', '1..{{n}}'), var('s', '1..{{p}}')]
B23_COND = []
HB23 = '{{m}} {{n}} {{p}} / {{q}} {{r}} {{s}}'
SB23 = '{{eval:m+n+p+q+r+s}}'
DEUX = ('Les cubes sont tous identiques.\n\n**Assemblage A**\n\n{A}\n\n**Assemblage B**\n\n{B}\n\n')
QUI = ('Lequel a le plus grand volume ?\n\n'
       + '```choix\nmelanger: non\n- L\'assemblage A\n- L\'assemblage B\n- Ils ont le même'
       ' volume.\n```')
COMPTE_A = ('A : ${{a}} + {{b}} + {{c}} + {{d}} + {{f}} + {{g}} = ' + S23 + '$ cubes.')
COMPTE_B = ('B : ${{m}} + {{n}} + {{p}} + {{q}} + {{r}} + {{s}} = ' + SB23 + '$ cubes.')
VOLUME_CUBES = ('**Les cubes sont identiques** : l\'assemblage qui a le plus de cubes a le plus grand'
                ' volume, quelle que soit sa forme.')
K5 = var('k', '1..' + str(len(MEME_VOLUME)))
J5 = var('j', '0..1')  # j = 1 : l'assemblage étalé est A
HAUT = pick('k', [ecrire(h) for h, _ in MEME_VOLUME])
ETALE = pick('k', [ecrire(g) for _, g in MEME_VOLUME])
V5 = var('N', pick('k', [str(total(h)) for h, _ in MEME_VOLUME]))
HA5 = var('A', '{{if:j==0|' + HAUT + '|' + ETALE + '}}')
HB5 = var('B', '{{if:j==0|' + ETALE + '|' + HAUT + '}}')


def ex_meme(idx, j):
    h, g = MEME_VOLUME[idx]
    a, b = (h, g) if j == 0 else (g, h)
    return {'k': idx + 1, 'j': j, 'N': total(h), 'A': ecrire(a), 'B': ecrire(b)}


EXB = {'m': 2, 'n': 2, 'p': 1, 'q': 2, 'r': 1, 's': 1}  # 9 cubes ; A (EX23) en a 11

MODELES.append(modele(
    '05-comparer-les-volumes-de-deux-assemblages', 'Comparer les volumes de deux assemblages de cubes',
    'Comparer les volumes de deux assemblages de cubes identiques en comptant les cubes : des'
    ' nombres différents, le même volume sous deux formes (l\'un haut, l\'autre étalé), le nombre'
    ' de cubes à ajouter',
    *VOLUMES, 2,
    [variation(DEUX.replace('{A}', bloc(H23)).replace('{B}', bloc(HB23)) + QUI, A23 + B23,
               ['{{if:a+b+c+d+f+g>m+n+p+q+r+s|0|1}}'],
               [VOLUME_CUBES, COMPTE_A, COMPTE_B,
                '{{if:a+b+c+d+f+g>m+n+p+q+r+s|$' + col('A') + '$ a le plus grand volume.|$'
                + col('B') + '$ a le plus grand volume.}}'],
               A23_COND + B23_COND + ['a+b+c+d+f+g!=m+n+p+q+r+s']),
     variation(DEUX.replace('{A}', bloc('{{A}}')).replace('{B}', bloc('{{B}}')) + QUI,
               [K5, J5, V5, HA5, HB5], ['2'],
               [VOLUME_CUBES,
                'A et B ont chacun ${{N}}$ cubes : ils ont $' + col('\\text{le même volume}')
                + '$, même si l\'un est plus haut que l\'autre.']),
     variation(DEUX.replace('{A}', bloc(H23)).replace('{B}', bloc(HB23))
               + 'Combien de cubes faut-il ajouter à l\'assemblage A pour qu\'il ait le même volume'
               ' que l\'assemblage B ?\n\n$$?$$', A23 + B23, ['{{eval:(m+n+p+q+r+s)-(a+b+c+d+f+g)}}'],
               [COMPTE_A, COMPTE_B,
                '$' + SB23 + ' - ' + S23 + ' = ' + col('{{eval:(m+n+p+q+r+s)-(a+b+c+d+f+g)}}')
                + '$ {{if:(m+n+p+q+r+s)-(a+b+c+d+f+g)==1|cube|cubes}} à ajouter.'],
               A23_COND + B23_COND + ['m+n+p+q+r+s>a+b+c+d+f+g'])],
    [spec('A (11) plus grand que B (9)', 0, dict(EX23, **EXB), '0', 'correct'),
     spec('Erreur : B', 0, dict(EX23, **EXB), '1', 'incorrect'),
     spec('Erreur : même volume', 0, dict(EX23, **EXB), '2', 'incorrect'),
     spec('Même volume, haut d\'abord', 1, ex_meme(0, 0), '2', 'correct'),
     spec('Erreur : le plus haut (A)', 1, ex_meme(0, 0), '0', 'incorrect'),
     spec('Même volume, étalé d\'abord', 1, ex_meme(1, 1), '2', 'correct'),
     spec('Erreur : le plus étalé (A)', 1, ex_meme(1, 1), '0', 'incorrect'),
     spec('À ajouter : 11 - 9 = 2', 2, {'a': 2, 'b': 2, 'c': 1, 'd': 2, 'f': 1, 'g': 1,
                                         'm': 3, 'n': 2, 'p': 2, 'q': 1, 'r': 2, 's': 1}, '2',
          'correct'),
     spec('Erreur : 11 (le volume de B)', 2, {'a': 2, 'b': 2, 'c': 1, 'd': 2, 'f': 1, 'g': 1,
                                              'm': 3, 'n': 2, 'p': 2, 'q': 1, 'r': 2, 's': 1},
          '11', 'incorrect')]))

# --- Vérifications des catalogues ----------------------------------------------------------

for h, h2 in VUES4:
    vs = [vue(h, 'face'), vue(h, 'dessus'), vue(h, 'droite'), vue(h2, 'face')]
    assert all(vs[x] != vs[y] for x in range(4) for y in range(x + 1, 4)), (h, h2)
    assert monotone(h) and monotone(h2)
for h, l1, l2 in RETROUVER:
    sig = [vue(h, q) for q in ('face', 'dessus', 'droite')]
    for leurre in (l1, l2):
        assert monotone(leurre) and [vue(leurre, q) for q in ('face', 'dessus', 'droite')] != sig
for h, g in MEME_VOLUME:
    assert total(h) == total(g) and monotone(h) and monotone(g)

os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as fh:
        json.dump(m, fh, ensure_ascii=False, indent='\t')
        fh.write('\n')
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
