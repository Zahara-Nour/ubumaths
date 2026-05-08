# range(stop) : 0, 1, 2, ..., stop - 1
print(list(range(5)))

# range(start, stop)
print(list(range(2, 8)))

# range(start, stop, step) : avec un pas
print(list(range(0, 21, 5)))

# Pas négatif (décompte)
print(list(range(10, 0, -1)))

# range est PARESSEUX (lazy) : il ne stocke rien en mémoire
gigantesque = range(0, 10 ** 9)   # instantané, 0 octet utilisé
print(f"range(10⁹) existe, longueur = {len(gigantesque)}")

# Mais on peut itérer / tester l'appartenance / indexer
print(gigantesque[100_000])      # accès direct, sans construire la liste !
print(500_000 in gigantesque)    # test rapide

# Cas typique : itérer sans avoir besoin de l'indice
total = 0
for _ in range(100):
    total += 1
print("\nIncrémenté 100 fois :", total)

# Combiné avec enumerate, sum, list...
print("Carrés de 1 à 5 :", [n * n for n in range(1, 6)])
print("Somme 1..100   :", sum(range(1, 101)))
