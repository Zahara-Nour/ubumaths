from sympy import Matrix, symbols, eye, simplify

# Création
A = Matrix([[1, 2], [3, 4]])
B = Matrix([[5, 6], [7, 8]])

print("A =", A)
print("B =", B)

# Opérations de base
print("\nA + B =", A + B)
print("A * B =", A * B)
print("3 * A =", 3 * A)

# Transposée, déterminant, inverse, rang
print(f"\ntranspose(A) = {A.T}")
print(f"det(A) = {A.det()}")
print(f"A⁻¹ = {A.inv()}")
print(f"rang(A) = {A.rank()}")
print(f"A · A⁻¹ = {simplify(A * A.inv())}  (= I)")

# Identité
I = eye(3)
print(f"\nMatrice identité 3×3 :\n{I}")

# Résolution d'un système : A·X = B
A = Matrix([[2, 3], [1, -1]])
b = Matrix([13, 1])
X = A.solve(b)
print(f"\n2x + 3y = 13")
print(f" x −  y =  1")
print(f"→ x = {X[0]}, y = {X[1]}")

# Valeurs propres et vecteurs propres
M = Matrix([[2, 1], [1, 2]])
print(f"\nValeurs propres de {M.tolist()} : {M.eigenvals()}")
print(f"Vecteurs propres : {M.eigenvects()}")
