# Boucle for : itérer sur une séquence
for i in range(5):
    print(i, end=" ")
print()

# range(début, fin, pas)
for i in range(2, 11, 2):
    print(i, end=" ")
print()

# Itérer sur une liste
fruits = ["pomme", "banane", "kiwi"]
for f in fruits:
    print(f)

# enumerate : indice + valeur
for i, f in enumerate(fruits):
    print(f"{i}. {f}")

# Somme des entiers de 1 à 100
total = 0
for n in range(1, 101):
    total += n
print("Somme 1..100 =", total)
