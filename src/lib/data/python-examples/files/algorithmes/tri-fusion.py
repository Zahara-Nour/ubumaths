import random
import time


def fusion(gauche, droite):
    """Fusionne deux listes triées en une liste triée."""
    resultat = []
    i = j = 0
    while i < len(gauche) and j < len(droite):
        if gauche[i] <= droite[j]:
            resultat.append(gauche[i])
            i += 1
        else:
            resultat.append(droite[j])
            j += 1
    # Copier ce qui reste
    resultat.extend(gauche[i:])
    resultat.extend(droite[j:])
    return resultat


def tri_fusion(xs):
    """Tri fusion récursif : O(n log n) garanti."""
    if len(xs) <= 1:
        return xs
    milieu = len(xs) // 2
    gauche = tri_fusion(xs[:milieu])
    droite = tri_fusion(xs[milieu:])
    return fusion(gauche, droite)


# Tests
for cas in [
    [5, 2, 9, 1, 7, 3, 8, 4, 6],
    [1],
    [],
    [3, 3, 3, 1, 1, 2, 2],
]:
    print(f"{cas} → {tri_fusion(cas)}")

# Performance : comparaison avec sorted (qui utilise Timsort, encore plus rapide)
n = 5000
data = [random.randint(0, 1000) for _ in range(n)]

t0 = time.perf_counter()
tri_fusion(data)
t1 = time.perf_counter()

t2 = time.perf_counter()
sorted(data)
t3 = time.perf_counter()

print(f"\nSur {n} éléments :")
print(f"  tri_fusion : {(t1 - t0) * 1000:.2f} ms")
print(f"  sorted()   : {(t3 - t2) * 1000:.2f} ms (Timsort C optimisé)")
