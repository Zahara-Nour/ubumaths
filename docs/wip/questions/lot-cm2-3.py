"""Écrit les 5 modèles neufs du lot 3 du CM2 (calcul mental sur les entiers) dans scripts/questions/cm2-3/.

Phase 0 validée par David le 2026-10-30 (§ 8 du journal `docs/wip/questions-cm2-progress.md`).
Bornes : `cycle3.json`, CM2 (tables : facteurs de 0 à 10 ; ± 8, 9, 18, 19, …, 98, 99, autre
nombre de 10 à 9 999 ; ÷ 4 et ÷ 8 sans taille propre, quotient décimal admis). Les tables
d'addition et de multiplication (CM2-035, 148, 036) reprennent trois modèles du CM1 (migration) ;
ici, seulement les 5 modèles neufs. Un point par modèle ; le nœud et le tag sont posés par la
migration de rangement, après le `--publier` de David.

Décisions et pièges :
- ± 9, 19… : comme les modèles jumeaux du CM1 (`01729e6e`, `b6b1cae5`), ajouter (soustraire) la
  dizaine au-dessus, puis enlever (rajouter) 1 ou 2 ; chiffre des unités choisi pour qu'il y ait
  une retenue (addition : unités ≥ 2) ou un emprunt (soustraction : unités ≤ 7) ;
- autre nombre de 2 à 4 chiffres : nombre de chiffres tiré d'abord (sinon presque toujours 4) ;
- ÷ 4 = moitié de la moitié, ÷ 8 = trois moitiés (« Exemples de réussite CM2 2025 » p. 10) ;
  quotient décimal : dividende 4q + r (r de 1 à 3), ou 8q + r (r pair), quotient en ,25, ,5, ,75.
  Relecture de David (2026-10-30) : V2 et V3 trop dures de tête → V2 à dividende multiple de 40
  (÷ 4) ou de 80 (÷ 8), V3 à petit dividende (≤ 51 pour ÷ 4, ≤ 94 pour ÷ 8).

    python3 docs/wip/questions/lot-cm2-3.py scripts/questions/cm2-3
"""

import json
import os
import subprocess
import sys

DOSSIER = sys.argv[1]
ECOLE = {'constraints': {'spacesFromFourDigits': True}}


def spec(desc, vi, variables, answers, status):
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables.items()},
            'answers': answers if isinstance(answers, list) else [answers],
            'expected': {'status': status}}


def modele(nom, title, description, domain, subdomain, level, variations, specs):
    # theme / domain / subdomain : anciennes colonnes, remplies pour create-questions ; le
    # rangement (nœud du point) est posé par la migration
    return nom, {'title': title, 'description': description, 'grades': ['CM2'],
                 'theme': 'Entiers', 'domain': domain, 'subdomain': subdomain,
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


MODELES = []

# Nombre de 2 à 4 chiffres : k chiffres, puis le nombre
NOMBRE_2_A_4 = [var('k', '2..4'), var('n', '{{eval:10^(k-1)}}..{{eval:10^k-1}}')]


# --- 1. CM2-149 : multiplication à trou (tables) -------------------------------------------

def a_trou(expression, connu):
    return variation(
        'Complète.\n\n$$' + expression + '$$',
        [var('a', '2..10'), var('b', '2..10'), var('p', 'eval:a*b')],
        '{{' + ('b' if connu == 'a' else 'a') + '}}',
        ['On cherche le nombre qui, multiplié par ${{' + connu + '}}$, donne ${{p}}$ : table de'
         ' ${{' + connu + '}}$.',
         '$${{a}}\\times {{b}}={{p}}$$',
         'Le nombre manquant est $' + col('{{' + ('b' if connu == 'a' else 'a') + '}}') + '$.'])


MODELES.append(modele(
    '01-multiplication-a-trou-tables', 'Compléter une multiplication à trou',
    'Tables de multiplication dans l\'autre sens : 7 × ? = 56, ? × 8 = 56',
    'Multiplier', 'A trou', 21,
    [a_trou('{{a}}\\times ?={{p}}', 'a'), a_trou('?\\times {{b}}={{p}}', 'b')],
    [spec('7 × ? = 56 : 8', 0, {'a': 7, 'b': 8}, '8', 'correct'),
     spec('Erreur : 7 × ? = 56 → 7', 0, {'a': 7, 'b': 8}, '7', 'incorrect'),
     spec('Erreur : 7 × ? = 56 → 49 (56 − 7)', 0, {'a': 7, 'b': 8}, '49', 'incorrect'),
     spec('borne : 10 × ? = 100', 0, {'a': 10, 'b': 10}, '10', 'correct'),
     spec('? × 8 = 56 : 7', 1, {'a': 7, 'b': 8}, '7', 'correct'),
     spec('Erreur : ? × 8 = 56 → 6', 1, {'a': 7, 'b': 8}, '6', 'incorrect'),
     spec('borne : ? × 2 = 4', 1, {'a': 2, 'b': 2}, '2', 'correct')]))


# --- 2. et 3. CM2-045, CM2-150 : ajouter, soustraire 8, 9, 18, 19, …, 98, 99 ----------------

def astucieux(signe, fins):
    """signe : '+' ou '-' ; fins : '9' ou '8' (chiffre des unités du nombre ajouté)."""
    plus = signe == '+'
    liste = '|'.join(str(10 * d + int(fins)) for d in range(10))
    variables = NOMBRE_2_A_4 + [
        var('b', liste), var('m', 'eval:b+10-mod(b,10)'), var('r', 'eval:10-mod(b,10)')]
    # retenue (addition) ou emprunt (soustraction) ; résultat positif
    conditions = (['mod(n,10)>=2'] if plus else ['mod(n,10)<=7', 'n>b'])
    verbe, inverse = ('Ajouter', 'enlever') if plus else ('Soustraire', 'rajouter')
    op1, op2 = ('+', '-') if plus else ('-', '+')
    return variation(
        'Calcule de manière astucieuse.\n\n$${{n}}' + signe + '{{b}}=?$$',
        variables, '{{eval:n' + signe + 'b}}',
        [verbe + ' ${{b}}$, c\'est ' + verbe.lower() + ' ${{m}}$, puis ' + inverse + ' ${{r}}$.',
         '**Étape 1.** ${{n}}' + op1 + '{{m}}=' + col('{{eval:n' + op1 + 'm}}') + '$.',
         '**Étape 2.** ${{eval:n' + op1 + 'm}}' + op2 + '{{r}}=' + col('{{solution}}', 1) + '$.',
         'Donc ${{n}}' + signe + '{{b}}={{solution}}$.'],
        conditions)


MODELES.append(modele(
    '02-ajouter-9-19-99', 'Ajouter $9$, $19$, …, $99$ ou $8$, $18$, …, $98$',
    'Ajouter la dizaine au-dessus, puis enlever 1 ou 2 : 157 + 39, 2 346 + 98',
    'Additionner', 'Somme astucieuse', 12,
    [astucieux('+', '9'), astucieux('+', '8')],
    [spec('157 + 39 = 196', 0, {'k': 3, 'n': 157, 'b': 39}, '196', 'correct'),
     spec('Erreur : 157 + 39 → 197 (+ 40 sans compenser)', 0, {'k': 3, 'n': 157, 'b': 39},
          '197', 'incorrect'),
     spec('Erreur : 157 + 39 → 198 (compensation à l\'envers)', 0,
          {'k': 3, 'n': 157, 'b': 39}, '198', 'incorrect'),
     spec('borne : 9 992 + 99 = 10 091', 0, {'k': 4, 'n': 9992, 'b': 99}, '10 091', 'correct'),
     spec('2 346 + 98 = 2 444', 1, {'k': 4, 'n': 2346, 'b': 98}, '2 444', 'correct'),
     spec('Erreur : 2 346 + 98 → 2 445 (− 1 au lieu de − 2)', 1,
          {'k': 4, 'n': 2346, 'b': 98}, '2 445', 'incorrect'),
     spec('borne : 12 + 8 = 20', 1, {'k': 2, 'n': 12, 'b': 8}, '20', 'correct')]))

MODELES.append(modele(
    '03-soustraire-9-19-99', 'Soustraire $9$, $19$, …, $99$ ou $8$, $18$, …, $98$',
    'Soustraire la dizaine au-dessus, puis rajouter 1 ou 2 : 157 − 39, 2 304 − 98',
    'Soustraire', 'Différence astucieuse', 5,
    [astucieux('-', '9'), astucieux('-', '8')],
    [spec('157 − 39 = 118', 0, {'k': 3, 'n': 157, 'b': 39}, '118', 'correct'),
     spec('Erreur : 157 − 39 → 117 (− 40 sans compenser)', 0, {'k': 3, 'n': 157, 'b': 39},
          '117', 'incorrect'),
     spec('Erreur : 157 − 39 → 116 (compensation à l\'envers)', 0,
          {'k': 3, 'n': 157, 'b': 39}, '116', 'incorrect'),
     spec('borne : 1 000 − 99 = 901', 0, {'k': 4, 'n': 1000, 'b': 99}, '901', 'correct'),
     spec('2 304 − 98 = 2 206', 1, {'k': 4, 'n': 2304, 'b': 98}, '2 206', 'correct'),
     spec('Erreur : 2 304 − 98 → 2 205 (− 1 au lieu de + 2)', 1,
          {'k': 4, 'n': 2304, 'b': 98}, '2 205', 'incorrect'),
     spec('borne : 10 − 8 = 2', 1, {'k': 2, 'n': 10, 'b': 8}, '2', 'correct')]))


# --- 4. et 5. CM2-050, CM2-151 : diviser par 4, par 8 ---------------------------------------

def moities(d, nom_q, plage_q, reste=None, rond=False):
    """Division de n par d (4 ou 8) en moitiés successives ; reste : plage du reste (quotient
    décimal) ou None (quotient entier) ; rond : quotient multiple de 10 (dividende à 4 chiffres
    multiple de 40 ou de 80, calculable de tête)."""
    vars_ = [var('k', plage_q), var('q', 'eval:10*k')] if rond else [var('q', plage_q)]
    if reste:
        vars_.append(var('r', reste))
        vars_.append(var('n', 'eval:' + str(d) + '*q+r'))
    else:
        vars_.append(var('n', 'eval:' + str(d) + '*q'))
    fois = 2 if d == 4 else 3
    etapes = ['Diviser par $' + str(d) + '$, c\'est prendre ' + (
        'la moitié de la moitié.' if d == 4 else 'trois fois la moitié.')]
    avant = 'n'
    for i in range(1, fois + 1):
        apres = '{{eval:n/' + str(2 ** i) + ';d}}'
        source = '{{n}}' if i == 1 else '{{eval:n/' + str(2 ** (i - 1)) + ';d}}'
        etapes.append('**Moitié ' + str(i) + '.** $' + source + '\\div 2='
                      + col(apres, 0 if i < fois else 1) + '$.')
    etapes.append('Donc ${{n}}\\div ' + str(d) + '={{solution}}$.')
    return variation('Calcule.\n\n$${{n}}\\div ' + str(d) + '=?$$', vars_,
                     '{{eval:n/' + str(d) + ';d}}', etapes)


MODELES.append(modele(
    '04-diviser-par-4', 'Diviser par $4$',
    'La moitié de la moitié : 128 ÷ 4, 2 480 ÷ 4, quotient décimal 18 ÷ 4 = 4,5',
    'Diviser', 'Quotient', 10,
    [moities(4, 'q', '25..249'), moities(4, 'k', '25..249', rond=True),
     moities(4, 'q', '1..12', '1..3')],
    [spec('128 ÷ 4 = 32', 0, {'q': 32}, '32', 'correct'),
     spec('Erreur : 128 ÷ 4 → 64 (une seule moitié)', 0, {'q': 32}, '64', 'incorrect'),
     spec('borne : 100 ÷ 4 = 25', 0, {'q': 25}, '25', 'correct'),
     spec('2 480 ÷ 4 = 620', 1, {'k': 62}, '620', 'correct'),
     spec('Erreur : 2 480 ÷ 4 → 62 (zéro oublié)', 1, {'k': 62}, '62', 'incorrect'),
     spec('borne : 1 000 ÷ 4 = 250', 1, {'k': 25}, '250', 'correct'),
     spec('18 ÷ 4 = 4,5', 2, {'q': 4, 'r': 2}, '4,5', 'correct'),
     spec('Erreur : 18 ÷ 4 → 4 (quotient tronqué)', 2, {'q': 4, 'r': 2}, '4', 'incorrect'),
     spec('17 ÷ 4 = 4,25', 2, {'q': 4, 'r': 1}, '4,25', 'correct'),
     spec('Erreur : 17 ÷ 4 → 4,1 (reste écrit après la virgule)', 2, {'q': 4, 'r': 1},
          '4,1', 'incorrect'),
     spec('borne : 51 ÷ 4 = 12,75', 2, {'q': 12, 'r': 3}, '12,75', 'correct')]))

MODELES.append(modele(
    '05-diviser-par-8', 'Diviser par $8$',
    'Trois moitiés successives : 128 ÷ 8, 2 480 ÷ 8, quotient décimal 36 ÷ 8 = 4,5',
    'Diviser', 'Quotient', 11,
    [moities(8, 'q', '13..124'), moities(8, 'k', '13..124', rond=True),
     moities(8, 'q', '1..11', '2|4|6')],
    [spec('128 ÷ 8 = 16', 0, {'q': 16}, '16', 'correct'),
     spec('Erreur : 128 ÷ 8 → 32 (deux moitiés seulement)', 0, {'q': 16}, '32', 'incorrect'),
     spec('borne : 104 ÷ 8 = 13', 0, {'q': 13}, '13', 'correct'),
     spec('2 480 ÷ 8 = 310', 1, {'k': 31}, '310', 'correct'),
     spec('Erreur : 2 480 ÷ 8 → 620 (deux moitiés seulement)', 1, {'k': 31}, '620',
          'incorrect'),
     spec('borne : 1 040 ÷ 8 = 130', 1, {'k': 13}, '130', 'correct'),
     spec('36 ÷ 8 = 4,5', 2, {'q': 4, 'r': 4}, '4,5', 'correct'),
     spec('Erreur : 36 ÷ 8 → 4 (quotient tronqué)', 2, {'q': 4, 'r': 4}, '4', 'incorrect'),
     spec('34 ÷ 8 = 4,25', 2, {'q': 4, 'r': 2}, '4,25', 'correct'),
     spec('borne : 94 ÷ 8 = 11,75', 2, {'q': 11, 'r': 6}, '11,75', 'correct')]))


os.makedirs(DOSSIER, exist_ok=True)
for nom, m in MODELES:
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(m, f, ensure_ascii=False, indent='\t')
        f.write('\n')
# Mis en forme comme le pre-commit, pour que le script redonne les fichiers commités
subprocess.run(['pnpm', 'exec', 'prettier', '--write', DOSSIER], check=True,
               stdout=subprocess.DEVNULL)
print(f'{len(MODELES)} modèles écrits dans {DOSSIER}')
