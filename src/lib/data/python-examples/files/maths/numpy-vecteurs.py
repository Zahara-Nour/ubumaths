import numpy as np

# Création de tableaux
v = np.array([1, 2, 3])
w = np.array([4, 5, 6])

# Opérations vectorielles (élément par élément)
print("v + w :", v + w)
print("v * w :", v * w)
print("2 * v :", 2 * v)

# Produit scalaire
print("v · w :", np.dot(v, w))
print("Norme de v :", np.linalg.norm(v))

# Génération
zeros = np.zeros(5)
ones = np.ones((2, 3))
ramp = np.arange(0, 10, 2)
linsp = np.linspace(0, 1, 5)

print("\nzeros :", zeros)
print("ones  :\n", ones)
print("arange :", ramp)
print("linspace :", linsp)

# Statistiques
data = np.array([12, 15, 9, 18, 11, 14, 10])
print(f"\nMoy = {data.mean():.2f}")
print(f"Écart-type = {data.std():.2f}")
print(f"Min/Max = {data.min()}/{data.max()}")

# Matrices et produit matriciel
A = np.array([[1, 2], [3, 4]])
B = np.array([[5, 6], [7, 8]])
print("\nA @ B =\n", A @ B)
