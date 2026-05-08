# L'opérateur `in` teste l'appartenance — fonctionne sur :
# listes, tuples, sets, strings, dicts (sur les CLÉS), range...

# Dans une liste
fruits = ["pomme", "kiwi", "banane"]
print("kiwi dans fruits ?", "kiwi" in fruits)
print("orange dans fruits ?", "orange" in fruits)

# Dans une chaîne (sous-chaîne)
texte = "Bonjour, monde"
print("'monde' dans texte ?", "monde" in texte)
print("'Monde' dans texte ?", "Monde" in texte)   # casse

# Dans un dict (sur les clés !)
ages = {"Alice": 17, "Bob": 16}
print("'Alice' dans ages ?", "Alice" in ages)
print("17 dans ages ?", 17 in ages)              # False (17 est une valeur)
print("17 dans ages.values() ?", 17 in ages.values())

# Dans un range (lazy : ne crée pas de liste)
print("50 dans range(100) ?", 50 in range(100))

# Avec `not in` (négation)
liste_noire = ["spam", "pub"]
mot = "kiwi"
if mot not in liste_noire:
    print(f"\n'{mot}' est autorisé.")

# Comparaisons chaînées (très Pythonic)
age = 25
if 18 <= age < 65:
    print("Adulte actif")
