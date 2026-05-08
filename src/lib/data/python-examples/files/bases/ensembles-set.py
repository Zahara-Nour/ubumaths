# Un set (ensemble) ne contient que des éléments UNIQUES, non ordonnés
fruits = {"pomme", "banane", "kiwi", "pomme"}
print(fruits)              # 'pomme' n'apparaît qu'une fois

# Suppression rapide des doublons d'une liste
notes = [12, 15, 12, 9, 18, 15, 9]
uniques = set(notes)
print(f"Notes uniques : {sorted(uniques)}")

# Opérations ensemblistes (cf. cours de maths)
A = {1, 2, 3, 4, 5}
B = {4, 5, 6, 7, 8}

print(f"A ∪ B (union)        = {A | B}")
print(f"A ∩ B (intersection) = {A & B}")
print(f"A \\ B (différence)   = {A - B}")
print(f"A △ B (sym. diff.)   = {A ^ B}")

# Test d'appartenance ULTRA rapide (O(1))
print(f"3 dans A ? {3 in A}")
print(f"9 dans A ? {9 in A}")

# Cas pratique : mots distincts dans un texte
texte = "le chat dort sur le tapis et le chien dort sous la table"
mots_distincts = set(texte.split())
print(f"\n{len(texte.split())} mots, dont {len(mots_distincts)} distincts")
print("Vocabulaire :", sorted(mots_distincts))
