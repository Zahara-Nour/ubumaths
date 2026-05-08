import csv

# Écriture d'un CSV
eleves = [
    {"nom": "Alice", "moyenne": 14.5, "classe": "1S"},
    {"nom": "Bob", "moyenne": 11.0, "classe": "1L"},
    {"nom": "Carla", "moyenne": 17.2, "classe": "1S"},
]

with open("eleves.csv", "w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=["nom", "moyenne", "classe"])
    writer.writeheader()
    writer.writerows(eleves)

print("Fichier écrit.\n")

# Lecture comme dict (utilise la 1re ligne comme en-têtes)
with open("eleves.csv", encoding="utf-8") as f:
    reader = csv.DictReader(f)
    for ligne in reader:
        print(f"  {ligne['nom']:6s} → {ligne['moyenne']} ({ligne['classe']})")

# Lecture sous forme de liste de listes
print("\nLecture brute :")
with open("eleves.csv", encoding="utf-8") as f:
    for i, ligne in enumerate(csv.reader(f)):
        print(f"  ligne {i} : {ligne}")

# Personnaliser le délimiteur
with open("data.tsv", "w", encoding="utf-8", newline="") as f:
    writer = csv.writer(f, delimiter="\t")
    writer.writerow(["nom", "valeur"])
    writer.writerow(["pi", 3.14159])
    writer.writerow(["e", 2.71828])

with open("data.tsv", encoding="utf-8") as f:
    print("\nFichier TSV :")
    print(f.read())
