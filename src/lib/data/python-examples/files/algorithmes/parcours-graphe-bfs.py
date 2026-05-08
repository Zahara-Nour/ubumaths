# Graphe représenté par une liste d'adjacence (dict de listes)
graphe = {
    "A": ["B", "C"],
    "B": ["A", "D", "E"],
    "C": ["A", "F"],
    "D": ["B"],
    "E": ["B", "F"],
    "F": ["C", "E"],
}


def bfs(graphe, depart):
    """Parcours en largeur. Retourne l'ordre des sommets visités."""
    visites = []
    deja_vus = {depart}
    file = [depart]

    while file:
        sommet = file.pop(0)   # défile (FIFO)
        visites.append(sommet)
        for voisin in graphe[sommet]:
            if voisin not in deja_vus:
                deja_vus.add(voisin)
                file.append(voisin)

    return visites


def plus_court_chemin(graphe, depart, arrivee):
    """Plus court chemin (en nb d'arêtes) avec BFS."""
    if depart == arrivee:
        return [depart]
    parents = {depart: None}
    file = [depart]

    while file:
        sommet = file.pop(0)
        for voisin in graphe[sommet]:
            if voisin not in parents:
                parents[voisin] = sommet
                if voisin == arrivee:
                    # Reconstruction du chemin
                    chemin = []
                    while voisin is not None:
                        chemin.append(voisin)
                        voisin = parents[voisin]
                    return chemin[::-1]
                file.append(voisin)

    return None  # pas de chemin


print("BFS depuis A :", bfs(graphe, "A"))
print("Plus court chemin A → F :", plus_court_chemin(graphe, "A", "F"))
print("Plus court chemin D → F :", plus_court_chemin(graphe, "D", "F"))
