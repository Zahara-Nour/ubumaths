# Définir une fonction
def aire_rectangle(longueur, largeur):
    """Retourne l'aire d'un rectangle."""
    return longueur * largeur

print(aire_rectangle(5, 3))    # 15
print(aire_rectangle(2.5, 4))  # 10.0

# Retour multiple via un tuple
def min_max(valeurs):
    return min(valeurs), max(valeurs)

petit, grand = min_max([8, 3, 12, 5, 1, 9])
print(f"Min = {petit}, Max = {grand}")

# Fonctions sans return : retournent None
def saluer(prenom):
    print(f"Bonjour {prenom} !")

resultat = saluer("Alice")
print("Retour :", resultat)
