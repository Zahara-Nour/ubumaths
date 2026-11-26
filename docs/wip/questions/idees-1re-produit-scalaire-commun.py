"""Fonctions communes aux scripts du chantier idees-1re-produit-scalaire (modèles neufs, variations
de modèles publiés). Importé par idees-1re-produit-scalaire-neufs.py et
idees-1re-produit-scalaire-publies.py.
"""
import re

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

# Messages tels que la résolution les réécrit : la spec compare le message résolu.
# Relevés par question:specs (rempli après le premier passage).
REECRIT = {
    "$ED=AD-AE$ : ce n'est pas toute la longueur $AD$.":
        "$ED = AD - AE$ : ce n'est pas toute la longueur $AD$.",
    '$AB=\\sqrt{x^2+y^2}$, pas $|x|+|y|$.':
        '$AB=\\sqrt{x^2+y^2}$, pas $\\left| x \\right| + \\left| y \\right|$.',
}


def resolu(message):
    """Forme réécrite d'un message à la résolution : (AB) et [BC] entre $ deviennent
    \\left( AB \\right) et \\left[ BC \\right] (relevé par question:specs, 2026-11-26)."""
    if message in REECRIT:
        return REECRIT[message]
    morceaux = message.split('$')
    for i in range(1, len(morceaux), 2):
        m = re.sub(r'\(([A-Z]{1,3})\)', r'\\left( \1 \\right)', morceaux[i])
        morceaux[i] = re.sub(r'\[([A-Z]{1,3})\]', r'\\left[ \1 \\right]', m)
    return '$'.join(morceaux)


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = resolu(message)
    if status in ('unoptimal_form', 'bad_form'):
        expected['constraintViolations'] = violations or ['form']
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, extra=None):
    c = {'expectedAnswer': attendue}
    if extra:
        c.update(extra)
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    return {'statement': statement, 'variables': variables, 'conditions': conditions or [],
            'blanks': blanks, 'correction': {'steps': steps}, 'hint': hint}


def bloc(nom, *lignes):
    return '```' + nom + '\n' + '\n'.join(lignes) + '\n```'


def si(cond, oui):
    return '{{if:' + cond + '|' + oui + '}}'


def choisir(nom, valeurs):
    """Texte qui vaut valeurs[i] quand la variable `nom` vaut i."""
    return ''.join('{{if:' + nom + '==' + str(i) + '|' + v + '}}' for i, v in enumerate(valeurs))


def vec(ab):
    return '\\overrightarrow{' + ab + '}'


def ps(ab, cd):
    return vec(ab) + '\\cdot' + vec(cd)


def r2(expr):
    """Coordonnée de figure arrondie au centième, écrite en décimal."""
    return '{{eval:round(100*(' + expr + '))/100;d}}'


REPERE = 'Le plan est muni d\'un repère orthonormé.'
