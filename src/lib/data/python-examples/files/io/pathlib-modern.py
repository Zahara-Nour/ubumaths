from pathlib import Path

# pathlib : manipulation moderne et orientée objet des chemins.
# Préférée à os.path pour la lisibilité.

# Chemin courant
ici = Path(".").resolve()
print("Répertoire courant :", ici)

# Construction par /
notes_dir = Path("notes")
notes_dir.mkdir(exist_ok=True)
fichier = notes_dir / "alice.txt"
print("Chemin construit :", fichier)

# Écriture/lecture rapide (sans gestion explicite de open/close)
fichier.write_text("note: 14.5\nclasse: 1S\n", encoding="utf-8")
contenu = fichier.read_text(encoding="utf-8")
print(f"\nContenu :\n{contenu}")

# Inspection du chemin
print(f"Nom complet     : {fichier.name}")
print(f"Sans extension  : {fichier.stem}")
print(f"Extension       : {fichier.suffix}")
print(f"Dossier parent  : {fichier.parent}")
print(f"Existe ?        : {fichier.exists()}")
print(f"Est un fichier ?: {fichier.is_file()}")

# Création de plusieurs fichiers et listing
for nom in ["bob.txt", "carla.txt", "david.md"]:
    (notes_dir / nom).write_text("...", encoding="utf-8")

print(f"\nContenu de '{notes_dir}' :")
for chemin in sorted(notes_dir.iterdir()):
    print(f"  {chemin.name} ({chemin.stat().st_size} octets)")

# Filtrage par motif (glob)
print("\nFichiers .txt :")
for f in notes_dir.glob("*.txt"):
    print(f"  {f}")
