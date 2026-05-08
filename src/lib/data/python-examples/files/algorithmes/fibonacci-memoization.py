import time


# Version naïve : recalcule la même valeur des milliers de fois
def fibo_naif(n):
    if n < 2:
        return n
    return fibo_naif(n - 1) + fibo_naif(n - 2)


# Version mémoïsée : on mémorise les valeurs déjà calculées
def fibo_memo(n, cache=None):
    if cache is None:
        cache = {}
    if n in cache:
        return cache[n]
    if n < 2:
        return n
    cache[n] = fibo_memo(n - 1, cache) + fibo_memo(n - 2, cache)
    return cache[n]


# Version itérative : la plus rapide, O(n) sans récursion
def fibo_iter(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a


# Comparaison du temps d'exécution
print("F(30) avec les 3 versions :")

for nom, fonction in [("naïf", fibo_naif), ("mémoïsé", fibo_memo), ("itératif", fibo_iter)]:
    t0 = time.perf_counter()
    resultat = fonction(30)
    t1 = time.perf_counter()
    print(f"  {nom:10s} = {resultat:8d}   ({(t1 - t0) * 1000:.3f} ms)")

# La version naïve plante en pratique pour n > 35
# Mémoïsée et itérative gèrent F(1000) sans problème
print(f"\nF(100) mémoïsé = {fibo_memo(100)}")
print(f"F(500) itératif = {fibo_iter(500)}")
