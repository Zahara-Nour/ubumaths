# Un générateur produit des valeurs UNE PAR UNE, sans tout
# stocker en mémoire. Utilise `yield` au lieu de `return`.

def compter(jusqua):
    """Générateur : produit 0, 1, 2, ..., jusqua-1."""
    n = 0
    while n < jusqua:
        yield n
        n += 1


# Un générateur s'utilise comme un itérable
for i in compter(5):
    print(i, end=" ")
print()

# Suite de Fibonacci infinie (impossible avec une liste !)
def fibonacci():
    a, b = 0, 1
    while True:
        yield a
        a, b = b, a + b


# Prendre seulement les 10 premiers
gen = fibonacci()
premiers = [next(gen) for _ in range(10)]
print("10 premiers Fibonacci :", premiers)

# Avantage mémoire : générateur vs liste
import sys
liste = list(range(10_000))
gen = (x for x in range(10_000))   # expression génératrice
print(f"\nliste : {sys.getsizeof(liste)} octets")
print(f"générateur : {sys.getsizeof(gen)} octets")

# Utilisation idiomatique : sum() / max() / any() / all() acceptent un générateur
total = sum(x ** 2 for x in range(1000))
print(f"\nSomme des 1000 premiers carrés : {total}")
