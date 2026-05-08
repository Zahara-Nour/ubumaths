# Une expression génératrice = compréhension de liste avec () au lieu de []
# Elle est PARESSEUSE : ne calcule rien tant qu'on ne consomme pas.

# Comparaison directe
liste = [x ** 2 for x in range(10)]    # liste créée immédiatement
gen = (x ** 2 for x in range(10))      # générateur paresseux

print("liste :", liste)
print("gen   :", gen)                   # juste un objet générateur

# Consommer le générateur
print("via for :", end=" ")
for v in gen:
    print(v, end=" ")
print()
# Attention : un générateur est CONSOMMÉ une fois itéré
print("gen restant :", list(gen))      # vide

# Optimisation : sum/min/max/any/all acceptent un générateur
# → pas de liste intermédiaire, gain mémoire pour grandes données
n = 10 ** 6
total = sum(x for x in range(n) if x % 7 == 0)
print(f"\nSomme des multiples de 7 < 10⁶ : {total}")

# any / all avec court-circuit
nombres = [4, 8, 12, 17, 20, 24]
print("\nA un nombre impair ?", any(x % 2 != 0 for x in nombres))
print("Tous pairs ?", all(x % 2 == 0 for x in nombres))

# Lecture ligne par ligne d'un fichier (pattern courant)
# avec open("gros.txt") as f:
#     premiers_a = (ligne for ligne in f if ligne.startswith("a"))
