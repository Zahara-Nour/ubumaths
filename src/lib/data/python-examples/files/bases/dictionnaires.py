# Un dictionnaire associe des clés à des valeurs
eleve = {
    "nom": "Curie",
    "prenom": "Marie",
    "age": 17,
    "notes": [15, 18, 14],
}

print(eleve["nom"])
print("Moyenne :", sum(eleve["notes"]) / len(eleve["notes"]))

# Ajout / modification
eleve["classe"] = "1S"
eleve["age"] = 18

# Accès sécurisé
ville = eleve.get("ville", "Inconnue")
print("Ville :", ville)

# Itération
print("\nFiche :")
for cle, valeur in eleve.items():
    print(f"  {cle:8s} : {valeur}")

# Comptage avec un dict
texte = "abracadabra"
freq = {}
for c in texte:
    freq[c] = freq.get(c, 0) + 1
print("\nFréquences :", freq)
