"""Fonctions communes aux scripts du chantier idees-1re-trigo (modèles neufs, variations de
modèles publiés). Importé par idees-1re-trigo-neufs.py et idees-1re-trigo-publies.py.
"""

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'

# Messages tels que la résolution les réécrit : la spec compare le message résolu.
# Relevés par question:specs (rempli après le premier passage).
REECRIT = {
    'Ce réel dépasse $2\\pi$ : retire encore un tour.':
        'Ce réel dépasse $2 \\pi$ : retire encore un tour.',
}


def spec(desc, vi, variables_, status, answers, message=None, violations=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = REECRIT.get(message, message)
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


# Intervalles écrits comme dans les modèles publiés
I_PRINC = '\\left]-\\pi\\,;\\pi\\right]'
I_02PI = '\\left[0\\,;2\\pi\\right['

# =============================================================================================
# Messages des erreurs prévues (partagés)
# =============================================================================================

# Ramener dans un intervalle
ERR_NEGATIF_02PI = ('Le réel demandé est dans $\\left[0\\,;2\\pi\\right[$ : il ne peut pas être '
                    'négatif. Ajoute encore un tour.')
ERR_DEPASSE_2PI = 'Ce réel dépasse $2\\pi$ : retire encore un tour.'
ERR_SYMETRIQUE = ('Ce réel est celui du point symétrique : ajouter ou retirer des tours ne change '
                  'pas le point, changer de signe le change.')
ERR_SIGNE_OUBLIE = 'N\'oublie pas le signe moins du réel de départ.'
ERR_DEPASSE_PI = 'Ce réel est plus grand que $\\pi$ : retire encore un tour.'
ERR_SOUS_MOINS_PI = 'Tu as retiré un tour de trop : ce réel est plus petit que $-\\pi$.'

# cos² + sin² = 1
ERR_SIGNE_SIN = 'Attention au signe : regarde sur quel demi-cercle se trouve $x$.'
ERR_RACINE_OUBLIEE = 'Tu as calculé le carré : il reste à prendre la racine carrée.'
ERR_SANS_CARRES = 'Ce sont les carrés qui s\'ajoutent : $\\cos^2x+\\sin^2x=1$.'
