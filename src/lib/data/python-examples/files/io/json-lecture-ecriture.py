import json

# Données Python
eleves = [
    {"nom": "Alice", "moyenne": 14.5, "options": ["maths", "physique"]},
    {"nom": "Bob",   "moyenne": 11.0, "options": ["histoire"]},
    {"nom": "Carla", "moyenne": 17.2, "options": ["maths", "info", "anglais"]},
]

# Sérialisation en chaîne JSON (ensure_ascii=False pour les accents)
texte = json.dumps(eleves, indent=2, ensure_ascii=False)
print(texte)

# Écriture dans un fichier
with open("eleves.json", "w", encoding="utf-8") as f:
    json.dump(eleves, f, indent=2, ensure_ascii=False)

# Lecture
with open("eleves.json", encoding="utf-8") as f:
    rechargees = json.load(f)

# Vérification
print("\nMoyennes rechargées :")
for e in rechargees:
    print(f"  {e['nom']:6s} → {e['moyenne']}")

# Désérialiser une chaîne
brut = '{"x": 1, "y": [2, 3, 4]}'
data = json.loads(brut)
print("\nFromString :", data)
