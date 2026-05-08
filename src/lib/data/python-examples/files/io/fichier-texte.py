# Écriture dans un fichier (le 'with' ferme automatiquement)
with open("notes.txt", "w", encoding="utf-8") as f:
    f.write("Alice : 14\n")
    f.write("Bob   : 11\n")
    f.write("Carla : 17\n")

print("Fichier écrit.")

# Lecture en bloc
with open("notes.txt", encoding="utf-8") as f:
    contenu = f.read()
print("--- contenu complet ---")
print(contenu)

# Lecture ligne par ligne
print("--- ligne par ligne ---")
with open("notes.txt", encoding="utf-8") as f:
    for ligne in f:
        print(repr(ligne.rstrip()))

# Ajout (append)
with open("notes.txt", "a", encoding="utf-8") as f:
    f.write("David : 13\n")

# Vérif
with open("notes.txt", encoding="utf-8") as f:
    print("\nNombre de lignes :", sum(1 for _ in f))
