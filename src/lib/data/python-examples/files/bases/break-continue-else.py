# break : sortie immédiate de la boucle
for n in range(2, 100):
    if n % 7 == 0:
        print(f"Premier multiple de 7 dans [2, 100[ : {n}")
        break

# continue : passe à l'itération suivante
print("\nNombres impairs de 1 à 10 :")
for n in range(1, 11):
    if n % 2 == 0:
        continue
    print(n, end=" ")
print()

# Clause `else` sur une boucle (peu connue, utile)
# else est exécuté SI la boucle s'est terminée NORMALEMENT (sans break)

def est_premier(n):
    if n < 2:
        return False
    for d in range(2, int(n ** 0.5) + 1):
        if n % d == 0:
            return False    # break implicite via return
    return True             # boucle terminée sans diviseur trouvé


# Avec un vrai else sur for :
def chercher_diviseur_non_trivial(n):
    for d in range(2, int(n ** 0.5) + 1):
        if n % d == 0:
            print(f"  {n} = {d} × {n // d}")
            break
    else:
        # else atteint UNIQUEMENT si la boucle a fini sans break
        print(f"  {n} est premier")


for n in [11, 12, 17, 21, 29]:
    chercher_diviseur_non_trivial(n)
