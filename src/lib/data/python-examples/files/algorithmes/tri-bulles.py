def tri_bulles(xs):
    """Tri à bulles : O(n²), pédagogique mais lent."""
    xs = list(xs)               # ne pas modifier l'original
    n = len(xs)
    nb_echanges = 0
    for i in range(n):
        # Optimisation : si aucun échange dans un passage, c'est trié
        echange_dans_passage = False
        for j in range(0, n - i - 1):
            if xs[j] > xs[j + 1]:
                xs[j], xs[j + 1] = xs[j + 1], xs[j]
                nb_echanges += 1
                echange_dans_passage = True
        if not echange_dans_passage:
            break
    return xs, nb_echanges


for cas in [
    [5, 2, 9, 1, 7, 3],
    [1, 2, 3, 4, 5],          # déjà trié
    [5, 4, 3, 2, 1],          # ordre inverse (pire cas)
    [3, 3, 1, 2, 1, 3],       # avec doublons
]:
    trie, nb_echanges = tri_bulles(cas)
    print(f"{cas} → {trie}  ({nb_echanges} échanges)")
