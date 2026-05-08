# Une lambda est une fonction anonyme courte
carre = lambda x: x ** 2
print(carre(7))

# map : applique une fonction à chaque élément
nombres = [1, 2, 3, 4, 5]
carres = list(map(lambda x: x ** 2, nombres))
print("Carrés :", carres)

# filter : ne garde que les éléments qui passent le test
pairs = list(filter(lambda x: x % 2 == 0, nombres))
print("Pairs :", pairs)

# Combinaison : carrés des pairs
carres_pairs = list(map(lambda x: x ** 2, filter(lambda x: x % 2 == 0, nombres)))
print("Carrés des pairs :", carres_pairs)

# Tri par clé
eleves = [
    {"nom": "Alice", "moyenne": 14.5},
    {"nom": "Bob",   "moyenne": 11.0},
    {"nom": "Carla", "moyenne": 17.2},
]
classement = sorted(eleves, key=lambda e: e["moyenne"], reverse=True)
for rang, e in enumerate(classement, start=1):
    print(f"{rang}. {e['nom']} ({e['moyenne']})")
