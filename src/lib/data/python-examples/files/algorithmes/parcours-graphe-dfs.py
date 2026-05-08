graphe = {
    "A": ["B", "C"],
    "B": ["A", "D", "E"],
    "C": ["A", "F"],
    "D": ["B"],
    "E": ["B", "F"],
    "F": ["C", "E"],
}


def dfs_recursif(graphe, sommet, deja_vus=None):
    """Parcours en profondeur, version récursive."""
    if deja_vus is None:
        deja_vus = []
    deja_vus.append(sommet)
    for voisin in graphe[sommet]:
        if voisin not in deja_vus:
            dfs_recursif(graphe, voisin, deja_vus)
    return deja_vus


def dfs_iteratif(graphe, depart):
    """Même résultat, version itérative avec une pile."""
    visites = []
    deja_vus = {depart}
    pile = [depart]
    while pile:
        sommet = pile.pop()  # dépile (LIFO)
        visites.append(sommet)
        # On empile en sens inverse pour parcourir dans l'ordre du dict
        for voisin in reversed(graphe[sommet]):
            if voisin not in deja_vus:
                deja_vus.add(voisin)
                pile.append(voisin)
    return visites


print("DFS récursif depuis A :", dfs_recursif(graphe, "A"))
print("DFS itératif depuis A :", dfs_iteratif(graphe, "A"))

# Détection de cycle simple
def a_un_cycle(graphe):
    deja_vus = set()
    pile_courante = set()

    def visite(sommet):
        deja_vus.add(sommet)
        pile_courante.add(sommet)
        for voisin in graphe[sommet]:
            if voisin not in deja_vus:
                if visite(voisin):
                    return True
            elif voisin in pile_courante:
                return True   # back-edge → cycle
        pile_courante.remove(sommet)
        return False

    return any(visite(s) for s in graphe if s not in deja_vus)


print("\nLe graphe a-t-il un cycle ?", a_un_cycle(graphe))
