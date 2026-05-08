import time
import random

# Comparaison empirique de complexités algorithmiques sur des
# tailles d'entrée différentes.

def somme_naive(n):
    """O(n) — boucle explicite."""
    total = 0
    for i in range(n):
        total += i
    return total


def somme_formule(n):
    """O(1) — formule de Gauss : Σ(0..n-1) = n(n-1)/2."""
    return n * (n - 1) // 2


def chercher_doublon_naif(xs):
    """O(n²) — comparaison de toutes les paires."""
    for i in range(len(xs)):
        for j in range(i + 1, len(xs)):
            if xs[i] == xs[j]:
                return True
    return False


def chercher_doublon_set(xs):
    """O(n) — un set + un parcours."""
    vus = set()
    for x in xs:
        if x in vus:
            return True
        vus.add(x)
    return False


# Mesures
print("Somme 0..n-1 :")
print(f"{'n':>10} | {'naive (ms)':>15} | {'formule (ms)':>15}")
for n in [10_000, 100_000, 1_000_000]:
    t0 = time.perf_counter()
    somme_naive(n)
    t1 = time.perf_counter()
    t2 = time.perf_counter()
    somme_formule(n)
    t3 = time.perf_counter()
    print(f"{n:10d} | {(t1 - t0) * 1000:15.2f} | {(t3 - t2) * 1000:15.4f}")

print("\nDétection de doublon :")
print(f"{'n':>10} | {'O(n²) (ms)':>15} | {'O(n) (ms)':>15}")
for n in [100, 1000, 5000]:
    xs = [random.randint(0, 10 * n) for _ in range(n)]
    t0 = time.perf_counter()
    chercher_doublon_naif(xs)
    t1 = time.perf_counter()
    t2 = time.perf_counter()
    chercher_doublon_set(xs)
    t3 = time.perf_counter()
    print(f"{n:10d} | {(t1 - t0) * 1000:15.2f} | {(t3 - t2) * 1000:15.2f}")

print("\nLeçon : pour grandes tailles, l'algorithme compte plus que la machine.")
