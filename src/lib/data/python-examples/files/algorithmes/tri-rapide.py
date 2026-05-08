def tri_rapide(xs):
    """Quicksort : O(n log n) en moyenne, O(n²) dans le pire cas.
    Version 'pédagogique' avec listes en compréhension (pas en place).
    """
    if len(xs) <= 1:
        return xs
    pivot = xs[len(xs) // 2]
    plus_petits = [x for x in xs if x < pivot]
    egaux = [x for x in xs if x == pivot]
    plus_grands = [x for x in xs if x > pivot]
    return tri_rapide(plus_petits) + egaux + tri_rapide(plus_grands)


for cas in [
    [5, 2, 9, 1, 7, 3, 8, 4],
    [],
    [1],
    [3, 3, 1, 2, 1, 3, 2],
]:
    print(f"{cas} → {tri_rapide(cas)}")

# Le choix du pivot influence les performances.
# Avec un pivot "milieu", le pire cas est rare en pratique.
import random
data = [random.randint(0, 100) for _ in range(20)]
print(f"\nListe aléatoire : {data}")
print(f"Triée           : {tri_rapide(data)}")
