# Arbre binaire représenté par dictionnaires {valeur, gauche, droite}
arbre = {
    "v": 1,
    "g": {
        "v": 2,
        "g": {"v": 4, "g": None, "d": None},
        "d": {"v": 5, "g": None, "d": None},
    },
    "d": {
        "v": 3,
        "g": {"v": 6, "g": None, "d": None},
        "d": {"v": 7, "g": None, "d": None},
    },
}


def parcours_prefixe(noeud):
    """Racine, puis sous-arbre gauche, puis sous-arbre droit."""
    if noeud is None:
        return []
    return [noeud["v"]] + parcours_prefixe(noeud["g"]) + parcours_prefixe(noeud["d"])


def parcours_infixe(noeud):
    """Sous-arbre gauche, puis racine, puis sous-arbre droit."""
    if noeud is None:
        return []
    return parcours_infixe(noeud["g"]) + [noeud["v"]] + parcours_infixe(noeud["d"])


def parcours_postfixe(noeud):
    """Sous-arbre gauche, puis sous-arbre droit, puis racine."""
    if noeud is None:
        return []
    return parcours_postfixe(noeud["g"]) + parcours_postfixe(noeud["d"]) + [noeud["v"]]


def parcours_largeur(racine):
    """En largeur (BFS) : niveau par niveau, avec une file."""
    if racine is None:
        return []
    file = [racine]
    visites = []
    while file:
        noeud = file.pop(0)
        visites.append(noeud["v"])
        if noeud["g"]:
            file.append(noeud["g"])
        if noeud["d"]:
            file.append(noeud["d"])
    return visites


print("Préfixe  (R G D) :", parcours_prefixe(arbre))
print("Infixe   (G R D) :", parcours_infixe(arbre))
print("Postfixe (G D R) :", parcours_postfixe(arbre))
print("Largeur  (BFS)   :", parcours_largeur(arbre))
