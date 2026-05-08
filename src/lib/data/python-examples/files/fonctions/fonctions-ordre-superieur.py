# Une fonction d'ordre supérieur : prend une fonction en argument
# OU retourne une fonction.

# Cas 1 : fonction passée en argument
def appliquer(fonction, valeurs):
    return [fonction(v) for v in valeurs]


def carre(x):
    return x ** 2


def cube(x):
    return x ** 3


print(appliquer(carre, [1, 2, 3, 4]))
print(appliquer(cube, [1, 2, 3, 4]))

# Cas 2 : retourner une fonction
def composer(f, g):
    """Retourne la fonction h(x) = f(g(x))."""
    return lambda x: f(g(x))


h = composer(carre, cube)        # h(x) = (x³)² = x⁶
print(f"\nh(2) = {h(2)} (attendu 64)")

# Programmation fonctionnelle classique avec map / filter / reduce
from functools import reduce

nombres = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

doubles = list(map(lambda x: x * 2, nombres))
pairs = list(filter(lambda x: x % 2 == 0, nombres))
produit = reduce(lambda a, b: a * b, nombres)

print(f"\nDoubles : {doubles}")
print(f"Pairs   : {pairs}")
print(f"Produit (10!) : {produit}")
