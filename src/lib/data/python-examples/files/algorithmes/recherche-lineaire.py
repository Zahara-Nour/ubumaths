def recherche_lineaire(xs, cible):
    """Parcours séquentiel : O(n). Marche sur liste NON triée."""
    for i, valeur in enumerate(xs):
        if valeur == cible:
            return i
    return -1


# Exemple
nombres = [42, 17, 8, 23, 7, 91, 56, 4, 33]

for cible in [23, 100, 42]:
    idx = recherche_lineaire(nombres, cible)
    if idx >= 0:
        print(f"{cible} trouvé à l'indice {idx}")
    else:
        print(f"{cible} absent")

# Comparaison avec le mot-clé `in` de Python (qui fait pareil en interne)
print("\nAvec 'in' :", 91 in nombres)

# Variante : retourner toutes les positions
def toutes_positions(xs, cible):
    return [i for i, v in enumerate(xs) if v == cible]


texte = "abracadabra"
print(f"\nPositions de 'a' dans '{texte}' : {toutes_positions(list(texte), 'a')}")
