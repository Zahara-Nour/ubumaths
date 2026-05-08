from sympy import symbols, solve, expand, factor, simplify, Eq, sin, cos

x = symbols("x")

# Résolution d'une équation du 2nd degré
eq = Eq(x ** 2 - 5 * x + 6, 0)
print("Équation :", eq)
print("Solutions :", solve(eq, x))

# Factorisation et développement
expr = (x - 2) * (x + 3) * (x - 5)
print("\nDéveloppé :", expand(expr))
print("Factorisé :", factor(expand(expr)))

# Système linéaire
a, b = symbols("a b")
solutions = solve(
    [
        Eq(2 * a + b, 7),
        Eq(a - b, 2),
    ],
    [a, b],
)
print("\nSystème → ", solutions)

# Simplification d'expression trigonométrique
identite = sin(x) ** 2 + cos(x) ** 2
print("\nsin²x + cos²x =", simplify(identite))
