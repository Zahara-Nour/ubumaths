"""Outils communs aux deux scripts du chantier idees-3e-trigonometrie
(idees-3e-trigonometrie-publies.py et idees-3e-trigonometrie-neufs.py).

Les noms des sommets sont tirés : la variable `s` choisit un jeu de lettres, et chaque lettre
s'écrit `{{if:s==0|A|}}{{if:s==1|R|}}{{if:s==2|E|}}`, comme dans les modèles publiés 57c73be1 et
dbd5debf. Une variable ne peut pas valoir une lettre (le résolveur lit `A` comme une variable) :
le choix se fait donc dans le texte. Quand l'indice de la lettre est lui-même calculé (F2), on
tire un code `k = n*s + indice` et la lettre s'écrit `{{if:k==0|A|}}{{if:k==1|B|}}…`.
"""
import re

PRIMAIRE = '\\textcolor{{{color:primary.0}}}'
DEG = '^{\\circ}'


def couleur(contenu):
    return PRIMAIRE + '{' + contenu + '}'


def var(nom, expression):
    return {'name': nom, 'expression': expression}


def erreur(answer, message, label):
    return {'answer': answer, 'message': message, 'label': label}


def case(attendue, erreurs=None, **reglages):
    c = {'expectedAnswer': attendue, **reglages}
    if erreurs:
        c['expectedErrors'] = erreurs
    return c


def variation(statement, variables, blanks, steps, hint, conditions=None):
    v = {'statement': statement, 'variables': variables}
    if conditions:
        v['conditions'] = conditions
    v['blanks'] = blanks
    v['correction'] = {'steps': steps}
    v['hint'] = hint
    return v


def spec(desc, vi, variables_, status, answers, message=None):
    expected = {'status': status}
    if message is not None:
        expected['expectedErrorMessage'] = message
    return {'description': desc, 'variationIndex': vi,
            'variables': {k: str(v) for k, v in variables_.items()},
            'expected': expected, 'answers': answers}


def lettre(jeux, i, sv='s'):
    """Lettre d'indice i, selon le jeu tiré par la variable sv."""
    return ''.join(f'{{{{if:{sv}=={k}|{jeu[i]}|}}}}' for k, jeu in enumerate(jeux))


def lettre_code(plat, kv):
    """Lettre d'une liste à plat, selon la variable de code kv (n*s + indice)."""
    return ''.join(f'{{{{if:{kv}=={k}|{c}|}}}}' for k, c in enumerate(plat))


def tous_distincts(valeurs):
    return [f'{a} != {b}' for i, a in enumerate(valeurs) for b in valeurs[i + 1:]]


def arrondi_net(expr, facteur):
    """Garde : la valeur n'est pas à la limite de deux arrondis (pas de doute pour l'élève)."""
    return f'abs({facteur}*({expr}) - round({facteur}*({expr}))) < 0.4'


# Résolution des messages pour les specs : {{if:x==n|a|b}} (sans imbrication) et {{x}}.
_SI = re.compile(r'\{\{if:(\w+)==(-?\d+)\|([^{}|]*)\|([^{}|]*)\}\}')
_VAR = re.compile(r'\{\{(\w+)\}\}')


def resoudre(texte, v):
    while True:
        nouveau = _SI.sub(lambda m: m.group(3) if str(v[m.group(1)]) == m.group(2)
                          else m.group(4), texte)
        if nouveau == texte:
            break
        texte = nouveau
    return _VAR.sub(lambda m: str(v[m.group(1)]), texte)
