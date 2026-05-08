def crible_eratosthene(n):
    """Retourne la liste des nombres premiers ≤ n. O(n log log n)."""
    est_premier = [True] * (n + 1)
    est_premier[0] = est_premier[1] = False

    for i in range(2, int(n ** 0.5) + 1):
        if est_premier[i]:
            # Tous les multiples de i (i*i, i*i+i, ...) sont composés
            for j in range(i * i, n + 1, i):
                est_premier[j] = False

    return [i for i, p in enumerate(est_premier) if p]


# Premiers ≤ 100
premiers = crible_eratosthene(100)
print(f"Nombres premiers ≤ 100 ({len(premiers)} valeurs) :")
print(premiers)

# Combien de premiers existe-t-il jusqu'à différents seuils ?
print("\nDensité des nombres premiers :")
print("Limite      | Nombre de premiers | Théorique (n/ln n)")
print("-" * 55)
import math
for n in [100, 1000, 10_000, 100_000]:
    nb = len(crible_eratosthene(n))
    th = round(n / math.log(n))
    print(f"  {n:7d}  |     {nb:6d}         |     {th:6d}")

# Le théorème des nombres premiers : π(n) ~ n / ln(n)
