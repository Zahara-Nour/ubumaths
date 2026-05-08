# Compréhension de liste : version filtrée + transformée
nombres = range(1, 21)
carres_pairs = [n ** 2 for n in nombres if n % 2 == 0]
print(carres_pairs)

# Compréhension de dict : transforme un itérable en dict
mots = ["chat", "chien", "souris", "lapin"]
longueurs = {mot: len(mot) for mot in mots}
print(longueurs)

# Inverser un dict (clé ↔ valeur)
fr_en = {"chat": "cat", "chien": "dog", "souris": "mouse"}
en_fr = {v: k for k, v in fr_en.items()}
print(en_fr)

# Compréhension de set : pour les valeurs uniques
phrase = "le chat est sur le tapis"
voyelles = {c for c in phrase if c in "aeiouy"}
print("Voyelles utilisées :", voyelles)

# Compréhension imbriquée : matrice transposée
matrice = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
transposee = [[ligne[i] for ligne in matrice] for i in range(3)]
for ligne in transposee:
    print(ligne)

# Aplatir une liste de listes
lignes = [[1, 2], [3, 4, 5], [6]]
plat = [x for ligne in lignes for x in ligne]
print("\nAplati :", plat)
