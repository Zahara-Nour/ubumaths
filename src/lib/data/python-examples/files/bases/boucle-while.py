# Boucle while : tant que la condition est vraie
n = 1
while n < 100:
    n *= 2
print("Première puissance de 2 >= 100 :", n)

# break et continue
print("Nombres impairs < 10 :")
i = 0
while True:
    i += 1
    if i >= 10:
        break        # sortie de boucle
    if i % 2 == 0:
        continue     # passe à l'itération suivante
    print(i, end=" ")
print()

# Algorithme d'Euclide : PGCD
def pgcd(a, b):
    while b != 0:
        a, b = b, a % b
    return a

print("PGCD(48, 18) =", pgcd(48, 18))
