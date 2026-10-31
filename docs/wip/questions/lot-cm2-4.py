"""Écrit les 7 modèles du lot 4 du CM2 (calcul mental sur les décimaux) dans scripts/questions/cm2-4/.

Phase 0 validée par David le 2026-11-01 (§ 9 du journal `docs/wip/questions-cm2-progress.md`).
Bornes : `cycle3.json`, CM2 (040, 118, 041 : k unités d'un seul rang, k de 1 à 9, des millièmes
aux milliers, sans retenue ou avec une retenue ; 048 : une ou deux décimales ; 049 : résultat à
trois décimales au plus ; 051 : décimal d'au plus trois chiffres ; 052 : nombre < 20, d'au plus
trois chiffres, dernier chiffre pair). Un point par modèle ; le nœud et le tag sont posés par la
migration de rangement, après le `--publier` de David.

Décisions et pièges :
- les nombres sont tirés en entiers dans leur plus petite unité (millièmes, centièmes, dixièmes),
  puis affichés par `{{eval:…;d}}` : pas de calcul sur des décimaux déjà formatés ;
- rang du nombre ajouté : j = 0 (millièmes) à 6 (milliers), nom du rang par `{{if:}}` imbriqués ;
- moitié : x = A + B, A multiple de 2 unités du rang au-dessus (moitié évidente), B petit reste
  (13,6 = 12 + 1,6 ; 1,22 = 1,2 + 0,02) ; V3 dernier chiffre impair, deux chiffres au plus
  (3,9 = 3,8 + 0,1 → 1,9 + 0,05), décision de David du 2026-11-01 ;
- × 5 = × 10 puis moitié ; × 50 = × 100 puis moitié (« Exemples de réussite CM2 2025 » p. 10).

    python3 docs/wip/questions/lot-cm2-4.py scripts/questions/cm2-4
"""

import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
ECOLE = {'constraints': {'spacesFromFourDigits': True}}
RANGS = ['millième', 'centième', 'dixième', 'unité', 'dizaine', 'centaine', 'millier',
         'dizaine de mille']


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, domain, subdomain, level, variations, specs):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return nom, {'title': title, 'description': description, 'grades': ['CM2'],
                 'theme': 'Décimaux', 'domain': domain, 'subdomain': subdomain,
                 'level': level, 'delay': 30, 'status': 'draft', 'options': ECOLE,
                 'variations': variations, 'testSpecs': specs}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def variation(statement, variables, answer, steps, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = [{'expectedAnswer': answer}]
    v['correction'] = {'steps': steps}
    return v


def col(x, i=0):
    return '\\textcolor{{{color:primary.' + str(i) + '}}}{' + x + '}'


def rang(j, pluriel=False, decale=0):
    """Nom du rang d'indice j (+ decale), au pluriel si demandé, par {{if:}} imbriqués."""
    s = 's' if pluriel else ''
    noms = RANGS[decale:]
    texte = noms[-1].replace('dizaine', 'dizaine' + s) if pluriel else noms[-1]
    for i in range(len(noms) - 2, -1, -1):
        texte = '{{if:' + j + '==' + str(i) + '|' + noms[i] + s + '|' + texte + '}}'
    return texte


MODELES = []

# Nombre à 3 décimales (V1) : w de 0 à 49, millièmes non nuls ; N en millièmes
DECIMAL_3 = [var('w', '0..49'), var('d1', '0..9'), var('d2', '0..9'), var('d3', '1..9'),
             var('N', 'eval:1000*w+100*d1+10*d2+d3')]


def decimal_1(chiffres):
    """Nombre à une décimale, partie entière de `chiffres` chiffres ; N en millièmes."""
    return [var('h', chiffres), var('w', '{{eval:10^(h-1)}}..{{eval:10^h-1}}'),
            var('d1', '1..9'), var('N', 'eval:1000*w+100*d1')]


# --- 1. à 3. CM2-040, CM2-118, CM2-041 : ajouter, retirer k unités d'un rang ----------------

def un_rang(signe, nombre, rangs, retenue=False):
    """signe : '+' ou '-' ; nombre : variables de N ; rangs : plage de j ; retenue : une retenue."""
    plus = signe == '+'
    variables = nombre + [
        var('j', rangs), var('k', '1..9'),
        var('c', 'eval:mod(floor(N/10^j),10)'), var('c2', 'eval:mod(floor(N/10^(j+1)),10)'),
        var('R', 'eval:N' + signe + 'k*10^j')]
    if retenue:
        conditions = ['c+k>=10', 'c2<=8']
    else:
        conditions = ['c+k<=9'] if plus else ['c>=k']
    # le nombre a un chiffre au rang ajouté (pas « le chiffre des milliers de 12,3 est 0 »)
    conditions.append('N>=10^j')
    x, y = '{{eval:N/1000;d}}', '{{eval:k*10^j/1000;d}}'
    # « 2, c'est 2 unités » ne dit rien : la lecture du rang seulement à partir des dizaines
    # et après la virgule
    etapes = ['{{if:j==3||$' + y + '$, c\'est $' + col('{{k}}') + '$ ' + rang('j')
              + '{{if:k>1|s|}}. }}On regarde le chiffre des ' + rang('j', True) + ' de $' + x
              + '$ : c\'est ${{c}}$.']
    if retenue:
        etapes += [
            '${{c}}+' + col('{{k}}') + '={{eval:c+k}}$ : on écrit ${{eval:c+k-10}}$ au rang des '
            + rang('j', True) + ' et on retient $1$ ' + rang('j', decale=1) + '.',
            'Le chiffre des ' + rang('j', True, 1) + ' passe de ${{c2}}$ à ${{eval:c2+1}}$ ; '
            'les autres chiffres ne changent pas.']
    else:
        etapes.append(
            '${{c}}' + signe + col('{{k}}') + '={{eval:c' + signe + 'k}}$, sans '
            + ('retenue' if plus else 'emprunt') + ' ; les autres chiffres ne changent pas.')
    etapes.append('$$' + x + signe + y + '=' + col('{{solution}}', 1) + '$$')
    return variation('Calcule.\n\n$$' + x + signe + y + '=?$$', variables,
                     '{{eval:R/1000;d}}', etapes, conditions)


MODELES.append(modele(
    '01-ajouter-un-rang', 'Ajouter des unités d\'un seul rang',
    'Sans retenue : dixièmes, centièmes, millièmes (4,452 + 0,03) ; unités à milliers'
    ' (1 462,5 + 3 000)',
    'Additionner', 'Somme', 6,
    [un_rang('+', DECIMAL_3, '0..2'), un_rang('+', decimal_1('2..4'), '3..6')],
    [spec('4,452 + 0,03 = 4,482', 0, {'w': 4, 'd1': 4, 'd2': 5, 'd3': 2, 'j': 1, 'k': 3},
          '4,482', 'correct'),
     spec('Erreur : 4,452 + 0,03 → 4,455 (mauvais rang)', 0,
          {'w': 4, 'd1': 4, 'd2': 5, 'd3': 2, 'j': 1, 'k': 3}, '4,455', 'incorrect'),
     spec('Erreur : 4,452 + 0,03 → 4,752 (mauvais rang)', 0,
          {'w': 4, 'd1': 4, 'd2': 5, 'd3': 2, 'j': 1, 'k': 3}, '4,752', 'incorrect'),
     spec('0,457 + 0,002 = 0,459', 0, {'w': 0, 'd1': 4, 'd2': 5, 'd3': 7, 'j': 0, 'k': 2},
          '0,459', 'correct'),
     spec('1 462,5 + 3 000 = 4 462,5', 1, {'h': 4, 'w': 1462, 'd1': 5, 'j': 6, 'k': 3},
          '4 462,5', 'correct'),
     spec('Erreur : 1 462,5 + 3 000 → 1 465,5', 1,
          {'h': 4, 'w': 1462, 'd1': 5, 'j': 6, 'k': 3}, '1 465,5', 'incorrect'),
     spec('borne : 12,3 + 7 = 19,3', 1, {'h': 2, 'w': 12, 'd1': 3, 'j': 3, 'k': 7},
          '19,3', 'correct')]))

MODELES.append(modele(
    '02-retirer-un-rang', 'Retirer des unités d\'un seul rang',
    'Sans retenue : dixièmes, centièmes, millièmes (0,457 − 0,003) ; unités à milliers'
    ' (5 846,3 − 400)',
    'Soustraire', 'Différence', 6,
    [un_rang('-', DECIMAL_3, '0..2'), un_rang('-', decimal_1('3..4'), '3..6')],
    [spec('0,457 − 0,003 = 0,454', 0, {'w': 0, 'd1': 4, 'd2': 5, 'd3': 7, 'j': 0, 'k': 3},
          '0,454', 'correct'),
     spec('Erreur : 0,457 − 0,003 → 0,157 (mauvais rang)', 0,
          {'w': 0, 'd1': 4, 'd2': 5, 'd3': 7, 'j': 0, 'k': 3}, '0,157', 'incorrect'),
     spec('8,694 − 0,6 = 8,094', 0, {'w': 8, 'd1': 6, 'd2': 9, 'd3': 4, 'j': 2, 'k': 6},
          '8,094', 'correct'),
     spec('5 846,3 − 400 = 5 446,3', 1, {'h': 4, 'w': 5846, 'd1': 3, 'j': 5, 'k': 4},
          '5 446,3', 'correct'),
     spec('Erreur : 5 846,3 − 400 → 5 842,3 (mauvais rang)', 1,
          {'h': 4, 'w': 5846, 'd1': 3, 'j': 5, 'k': 4}, '5 842,3', 'incorrect'),
     spec('borne : 9 999,9 − 9 000 = 999,9', 1, {'h': 4, 'w': 9999, 'd1': 9, 'j': 6, 'k': 9},
          '999,9', 'correct')]))

MODELES.append(modele(
    '03-ajouter-un-rang-retenue', 'Ajouter des unités d\'un seul rang, avec une retenue',
    'Une retenue : 4,457 + 0,8 ; 0,457 + 0,007 ; 7 530,4 + 600',
    'Additionner', 'Somme', 7,
    [un_rang('+', DECIMAL_3, '0..2', True), un_rang('+', decimal_1('2..4'), '3..6', True)],
    [spec('4,457 + 0,8 = 5,257', 0, {'w': 4, 'd1': 4, 'd2': 5, 'd3': 7, 'j': 2, 'k': 8},
          '5,257', 'correct'),
     spec('Erreur : 4,457 + 0,8 → 4,257 (retenue oubliée)', 0,
          {'w': 4, 'd1': 4, 'd2': 5, 'd3': 7, 'j': 2, 'k': 8}, '4,257', 'incorrect'),
     spec('Erreur : 4,457 + 0,8 → 4,1257 (12 dixièmes écrits)', 0,
          {'w': 4, 'd1': 4, 'd2': 5, 'd3': 7, 'j': 2, 'k': 8}, '4,1257', 'incorrect'),
     spec('0,457 + 0,007 = 0,464', 0, {'w': 0, 'd1': 4, 'd2': 5, 'd3': 7, 'j': 0, 'k': 7},
          '0,464', 'correct'),
     spec('7 530,4 + 600 = 8 130,4', 1, {'h': 4, 'w': 7530, 'd1': 4, 'j': 5, 'k': 6},
          '8 130,4', 'correct'),
     spec('Erreur : 7 530,4 + 600 → 7 130,4 (retenue oubliée)', 1,
          {'h': 4, 'w': 7530, 'd1': 4, 'j': 5, 'k': 6}, '7 130,4', 'incorrect'),
     spec('borne : 9 530,4 + 6 000 = 15 530,4', 1, {'h': 4, 'w': 9530, 'd1': 4, 'j': 6, 'k': 6},
          '15 530,4', 'correct')]))


# --- 4. CM2-048 : double ---------------------------------------------------------------------

def double(nb_dec):
    """nb_dec : 1 (13,6) ou 2 (4,35) ; t = partie décimale en dixièmes ou centièmes."""
    u = 10 ** nb_dec
    if nb_dec == 1:
        variables = [var('w', '1..49'), var('t', '1..9')]
    else:
        variables = [var('w', '1..9'), var('t', '1..99'), ]
    conditions = None if nb_dec == 1 else ['mod(t,10)!=0']
    x = '{{eval:(' + str(u) + '*w+t)/' + str(u) + ';d}}'
    dec = '{{eval:t/' + str(u) + ';d}}'
    return variation(
        'Calcule le double de $' + x + '$.\n\nLe double de $' + x + '$ est $?$.',
        variables, '{{eval:2*(' + str(u) + '*w+t)/' + str(u) + ';d}}',
        ['On double la partie entière, puis la partie décimale : $' + x + '={{w}}+' + dec + '$.',
         'Double de ${{w}}$ : $' + col('{{eval:2*w}}') + '$. Double de $' + dec + '$ : $'
         + col('{{eval:2*t/' + str(u) + ';d}}') + '$.',
         '$${{eval:2*w}}+{{eval:2*t/' + str(u) + ';d}}=' + col('{{solution}}', 1) + '$$'],
        conditions)


MODELES.append(modele(
    '04-double-decimal', 'Calculer le double d\'un nombre décimal',
    'Une décimale (13,6 → 27,2) ; deux décimales (4,35 → 8,7)',
    'Multiplier', 'Produit particulier', 5,
    [double(1), double(2)],
    [spec('double de 13,6 = 27,2', 0, {'w': 13, 't': 6}, '27,2', 'correct'),
     spec('Erreur : double de 13,6 → 26,12 (dixièmes sans retenue)', 0, {'w': 13, 't': 6},
          '26,12', 'incorrect'),
     spec('Erreur : double de 13,6 → 26,6 (partie décimale oubliée)', 0, {'w': 13, 't': 6},
          '26,6', 'incorrect'),
     spec('borne : double de 49,9 = 99,8', 0, {'w': 49, 't': 9}, '99,8', 'correct'),
     spec('double de 4,35 = 8,7', 1, {'w': 4, 't': 35}, '8,7', 'correct'),
     spec('Erreur : double de 4,35 → 8,610', 1, {'w': 4, 't': 35}, '8,610', 'incorrect'),
     spec('double de 9,05 = 18,1', 1, {'w': 9, 't': 5}, '18,1', 'correct')]))


# --- 5. CM2-049 : moitié ---------------------------------------------------------------------

def moitie(u, plage, conditions):
    """n = x en unités de 1/u (pair, ou impair en V3) ; x = A + B, A multiple de 20 unités."""
    variables = [var('n', plage), var('A', 'eval:20*floor(n/20)'), var('B', 'eval:n-A')]
    if u == 10 and 'mod(n,2)==1' in conditions:
        # V3 : dernier chiffre impair → B = 1 dixième
        variables = [var('n', plage), var('A', 'eval:n-1'), var('B', 'eval:1')]
    x = '{{eval:n/' + str(u) + ';d}}'
    a, b = '{{eval:A/' + str(u) + ';d}}', '{{eval:B/' + str(u) + ';d}}'
    ma, mb = '{{eval:A/' + str(2 * u) + ';d}}', '{{eval:B/' + str(2 * u) + ';d}}'
    return variation(
        'Calcule la moitié de $' + x + '$.\n\nLa moitié de $' + x + '$ est $?$.',
        variables, '{{eval:n/' + str(2 * u) + ';d}}',
        ['On découpe $' + x + '$ en deux nombres dont la moitié est facile : $' + x + '=' + a
         + '+' + b + '$.',
         'Moitié de $' + a + '$ : $' + col(ma) + '$. Moitié de $' + b + '$ : $' + col(mb) + '$.',
         '$$' + ma + '+' + mb + '=' + col('{{solution}}', 1) + '$$',
         'Vérification : $' + '{{solution}}+{{solution}}=' + x + '$.'],
        conditions)


MODELES.append(modele(
    '05-moitie-decimal', 'Calculer la moitié d\'un nombre décimal',
    'Dixièmes pairs (13,6 → 6,8) ; centièmes pairs (1,22 → 0,61) ; dernier chiffre impair'
    ' (3,9 → 1,95)',
    'Additionner', 'Moitié', 2,
    [moitie(10, '21..499', ['mod(n,2)==0', 'mod(n,10)!=0', 'mod(n,20)!=0']),
     moitie(100, '102..998', ['mod(n,2)==0', 'mod(n,10)!=0', 'mod(n,20)!=0']),
     moitie(10, '3..99', ['mod(n,2)==1'])],
    [spec('moitié de 13,6 = 6,8', 0, {'n': 136}, '6,8', 'correct'),
     spec('Erreur : moitié de 13,6 → 6,3 (13 → 6, 6 → 3)', 0, {'n': 136}, '6,3', 'incorrect'),
     spec('Erreur : moitié de 13,6 → 7,3', 0, {'n': 136}, '7,3', 'incorrect'),
     spec('moitié de 12,4 = 6,2', 0, {'n': 124}, '6,2', 'correct'),
     spec('moitié de 1,22 = 0,61', 1, {'n': 122}, '0,61', 'correct'),
     spec('Erreur : moitié de 1,22 → 0,11', 1, {'n': 122}, '0,11', 'incorrect'),
     spec('moitié de 4,86 = 2,43', 1, {'n': 486}, '2,43', 'correct'),
     spec('moitié de 3,9 = 1,95', 2, {'n': 39}, '1,95', 'correct'),
     spec('Erreur : moitié de 3,9 → 1,9 (reste oublié)', 2, {'n': 39}, '1,9', 'incorrect'),
     spec('Erreur : moitié de 3,9 → 1,45', 2, {'n': 39}, '1,45', 'incorrect'),
     spec('moitié de 0,7 = 0,35', 2, {'n': 7}, '0,35', 'correct')]))


# --- 6. et 7. CM2-051, CM2-052 : × 5, × 50 ---------------------------------------------------

def fois(m, variables, conditions):
    """m : 5 ou 50 ; t / 10^q = le nombre décimal."""
    p = 10 if m == 5 else 100
    x = '{{eval:t/10^q;d}}'
    produit = '{{eval:' + str(p) + '*t/10^q;d}}'
    enonce = (x + '\\times 5') if m == 5 else ('50\\times ' + x)
    return variation(
        'Calcule.\n\n$$' + enonce + '=?$$', variables, '{{eval:' + str(m) + '*t/10^q;d}}',
        ['Multiplier par $' + str(m) + '$, c\'est multiplier par $' + str(p) + '$, puis prendre'
         ' la moitié.',
         '$$' + x + '\\times ' + str(p) + '=' + col(produit) + '$$',
         'Moitié de $' + produit + '$ : $' + col('{{solution}}', 1) + '$.'],
        conditions)


MODELES.append(modele(
    '06-multiplier-par-5', 'Multiplier un nombre décimal par $5$',
    'Multiplier par 10, puis prendre la moitié : 3,4 × 5 ; 1,46 × 5 ; 24,8 × 5',
    'Multiplier', 'Produit particulier', 6,
    [fois(5, [var('q', '1'), var('t', '11..99')], ['mod(t,10)!=0']),
     fois(5, [var('q', '1..2'), var('t', '101..999')], ['mod(t,10)!=0'])],
    [spec('3,4 × 5 = 17', 0, {'q': 1, 't': 34}, '17', 'correct'),
     spec('Erreur : 3,4 × 5 → 34 (× 10 sans la moitié)', 0, {'q': 1, 't': 34}, '34',
          'incorrect'),
     spec('Erreur : 3,4 × 5 → 15,20 (3 × 5 et 4 × 5 juxtaposés)', 0, {'q': 1, 't': 34},
          '15,20', 'incorrect'),
     spec('1,46 × 5 = 7,3', 1, {'q': 2, 't': 146}, '7,3', 'correct'),
     spec('Erreur : 1,46 × 5 → 73 (virgule oubliée)', 1, {'q': 2, 't': 146}, '73',
          'incorrect'),
     spec('Erreur : 1,46 × 5 → 14,6 (× 10 sans la moitié)', 1, {'q': 2, 't': 146}, '14,6',
          'incorrect'),
     spec('24,8 × 5 = 124', 1, {'q': 1, 't': 248}, '124', 'correct'),
     spec('borne : 99,9 × 5 = 499,5', 1, {'q': 1, 't': 999}, '499,5', 'correct')]))

MODELES.append(modele(
    '07-multiplier-par-50', 'Multiplier un nombre décimal par $50$',
    'Multiplier par 100, puis prendre la moitié : 50 × 12,4 ; 50 × 1,24',
    'Multiplier', 'Produit particulier', 7,
    [fois(50, [var('q', '1'), var('t', '11..198')], ['mod(t,2)==0', 'mod(t,10)!=0']),
     fois(50, [var('q', '2'), var('t', '12..998')], ['mod(t,2)==0', 'mod(t,10)!=0'])],
    [spec('50 × 12,4 = 620', 0, {'q': 1, 't': 124}, '620', 'correct'),
     spec('Erreur : 50 × 12,4 → 1 240 (× 100 sans la moitié)', 0, {'q': 1, 't': 124},
          '1 240', 'incorrect'),
     spec('Erreur : 50 × 12,4 → 62 (× 10 au lieu de × 100)', 0, {'q': 1, 't': 124}, '62',
          'incorrect'),
     spec('borne : 50 × 19,8 = 990', 0, {'q': 1, 't': 198}, '990', 'correct'),
     spec('50 × 1,24 = 62', 1, {'q': 2, 't': 124}, '62', 'correct'),
     spec('Erreur : 50 × 1,24 → 6,2', 1, {'q': 2, 't': 124}, '6,2', 'incorrect'),
     spec('50 × 0,86 = 43', 1, {'q': 2, 't': 86}, '43', 'correct'),
     spec('50 × 0,12 = 6', 1, {'q': 2, 't': 12}, '6', 'correct')]))


os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
