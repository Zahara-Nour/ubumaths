def dichotomie(f, a, b, tolerance=1e-9, max_iter=100):
    """Trouve une racine de f sur [a, b] par dichotomie.

    Pré-condition : f doit changer de signe entre a et b (TVI).
    """
    fa, fb = f(a), f(b)
    if fa * fb > 0:
        raise ValueError(f"f({a}) et f({b}) doivent être de signes opposés")

    for i in range(max_iter):
        m = (a + b) / 2
        fm = f(m)                          # une seule évaluation par itération
        if abs(fm) < tolerance or (b - a) / 2 < tolerance:
            return m, i + 1
        if fa * fm < 0:
            b, fb = m, fm
        else:
            a, fa = m, fm
    return (a + b) / 2, max_iter


# Trouver √2 : racine de f(x) = x² - 2 sur [1, 2]
import math

racine, iters = dichotomie(lambda x: x ** 2 - 2, 1, 2)
print(f"√2 par dichotomie : {racine}  ({iters} itérations)")
print(f"Vérification math.sqrt(2)  : {math.sqrt(2)}")

# Trouver une solution de cos(x) = x sur [0, 1]
racine, iters = dichotomie(lambda x: math.cos(x) - x, 0, 1)
print(f"\nSolution de cos(x) = x : {racine}  ({iters} itérations)")
print(f"Vérification : cos({racine}) = {math.cos(racine)}")

# Trouver π : racine de sin(x) sur [3, 4]
racine, iters = dichotomie(math.sin, 3, 4)
print(f"\nπ par dichotomie sur sin : {racine}  ({iters} itérations)")
print(f"Valeur de math.pi         : {math.pi}")
