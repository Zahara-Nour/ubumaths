# Table de multiplication
print("Table de multiplication 1..5 :\n")
print("   ", end="")
for j in range(1, 6):
    print(f"{j:4d}", end="")
print()

for i in range(1, 6):
    print(f"{i:2d}:", end="")
    for j in range(1, 6):
        print(f"{i * j:4d}", end="")
    print()

# Recherche d'un élément dans une matrice 2D
matrice = [
    [3, 7, 1, 9],
    [5, 2, 8, 6],
    [4, 0, 11, 12],
]

def chercher(matrice, cible):
    for i, ligne in enumerate(matrice):
        for j, valeur in enumerate(ligne):
            if valeur == cible:
                return (i, j)
    return None


for cible in [11, 7, 99]:
    pos = chercher(matrice, cible)
    print(f"\n{cible} : {pos if pos else 'absent'}")

# Triangles : afficher un triangle d'étoiles
print("\nTriangle :")
for i in range(1, 6):
    print(" " * (5 - i) + "*" * (2 * i - 1))
