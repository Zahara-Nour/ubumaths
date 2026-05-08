from sympy import symbols, solve, Eq, Matrix

# Système 2 inconnues
x, y = symbols("x y")

solutions = solve(
    [
        Eq(2 * x + 3 * y, 13),
        Eq(x - y, 1),
    ],
    [x, y],
)
print("Système :", solutions)

# Système 3 inconnues
a, b, c = symbols("a b c")
solutions = solve(
    [
        Eq(a + b + c, 6),
        Eq(2 * a - b + c, 3),
        Eq(a + 2 * b - c, 2),
    ],
    [a, b, c],
)
print("Système 3×3 :", solutions)

# Système avec paramètre (équations littérales)
m = symbols("m")
solutions = solve(
    [
        Eq(x + y, m),
        Eq(x - y, 2),
    ],
    [x, y],
)
print("Avec paramètre m :", solutions)

# Résolution matricielle équivalente : A·X = B
A = Matrix([[2, 3], [1, -1]])
B = Matrix([13, 1])
X = A.solve(B)
print(f"\nForme matricielle : x = {X[0]}, y = {X[1]}")
