# Création et accès
notes = [12, 15, 9, 18, 11]
print("Première :", notes[0])
print("Dernière :", notes[-1])
print("Longueur :", len(notes))

# Slicing : notes[début:fin:pas]
print("Trois premières :", notes[:3])
print("Inversées :", notes[::-1])

# Modification
notes.append(16)        # ajout en fin
notes.insert(0, 20)     # insertion au début
notes.remove(9)         # supprime la 1re occurrence
print("Après modifs :", notes)

# Tri
notes_triees = sorted(notes)         # nouvelle liste triée
notes.sort(reverse=True)             # tri en place décroissant
print("Triée croissante :", notes_triees)
print("Triée décroissante :", notes)

# Compréhension de liste
carres = [x ** 2 for x in range(1, 6)]
notes_paires = [x for x in notes if x % 2 == 0]
print("Carrés :", carres)
print("Notes paires :", notes_paires)
