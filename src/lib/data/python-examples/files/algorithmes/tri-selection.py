def tri_selection(xs):
    """Tri par sélection du minimum : O(n²) dans tous les cas."""
    xs = list(xs)
    n = len(xs)
    for i in range(n - 1):
        # Trouver l'indice du minimum dans xs[i:]
        idx_min = i
        for j in range(i + 1, n):
            if xs[j] < xs[idx_min]:
                idx_min = j
        # Échanger avec la position i
        if idx_min != i:
            xs[i], xs[idx_min] = xs[idx_min], xs[i]
    return xs


for cas in [
    [5, 2, 9, 1, 7, 3],
    [1, 2, 3, 4, 5],
    [5, 4, 3, 2, 1],
]:
    print(f"{cas} → {tri_selection(cas)}")

# Comptage du nombre d'opérations (comparaisons + échanges)
def tri_selection_compte(xs):
    xs = list(xs)
    n = len(xs)
    comparaisons = echanges = 0
    for i in range(n - 1):
        idx_min = i
        for j in range(i + 1, n):
            comparaisons += 1
            if xs[j] < xs[idx_min]:
                idx_min = j
        if idx_min != i:
            xs[i], xs[idx_min] = xs[idx_min], xs[i]
            echanges += 1
    return xs, comparaisons, echanges


for n in [10, 50, 100]:
    import random
    cas = list(range(n))
    random.shuffle(cas)
    _, c, e = tri_selection_compte(cas)
    print(f"n = {n:3d} → {c} comparaisons, {e} échanges  (n²/2 ≈ {n * n // 2})")
