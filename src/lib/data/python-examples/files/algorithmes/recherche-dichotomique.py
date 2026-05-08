def recherche_dichotomique(xs, cible):
    """Trouve l'indice de cible dans xs (trié), -1 sinon. O(log n)."""
    gauche, droite = 0, len(xs) - 1
    while gauche <= droite:
        milieu = (gauche + droite) // 2
        if xs[milieu] == cible:
            return milieu
        if xs[milieu] < cible:
            gauche = milieu + 1
        else:
            droite = milieu - 1
    return -1


# Liste triée
nombres = [1, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43]

for cible in [13, 1, 43, 4, 100]:
    idx = recherche_dichotomique(nombres, cible)
    if idx >= 0:
        print(f"{cible} trouvé à l'indice {idx}")
    else:
        print(f"{cible} absent")

# Comparaison du nombre d'étapes
import math

n = len(nombres)
print(f"\nListe de {n} éléments :")
print(f"  recherche linéaire (pire cas) : {n} comparaisons")
print(f"  recherche dichotomique        : ~{math.ceil(math.log2(n))} comparaisons")
