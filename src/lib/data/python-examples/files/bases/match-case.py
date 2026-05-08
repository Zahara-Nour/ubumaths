# Le pattern matching (Python 3.10+) — alternative élégante à if/elif
def decrire(forme):
    match forme:
        case ("cercle", rayon):
            return f"Cercle de rayon {rayon}"
        case ("rectangle", l, h):
            return f"Rectangle {l}×{h}"
        case ("triangle", a, b, c):
            return f"Triangle de côtés {a}, {b}, {c}"
        case _:
            return "Forme inconnue"


print(decrire(("cercle", 5)))
print(decrire(("rectangle", 3, 4)))
print(decrire(("triangle", 3, 4, 5)))
print(decrire(("hexagone", 6)))

# Avec garde (condition) sur le case
def categoriser(note):
    match note:
        case n if n >= 18:
            return "Excellent"
        case n if n >= 14:
            return "Bien"
        case n if n >= 10:
            return "Acceptable"
        case n if n >= 0:
            return "Insuffisant"
        case _:
            return "Note invalide"


for note in [17, 12, 8, -1]:
    print(f"{note} → {categoriser(note)}")

# Décomposer un dict
def saluer(personne):
    match personne:
        case {"nom": nom, "age": age} if age >= 18:
            return f"Bonjour {nom} (majeur·e)"
        case {"nom": nom, "age": _}:
            return f"Bonjour {nom} (mineur·e)"
        case _:
            return "Hmm…"


print(saluer({"nom": "Alice", "age": 25}))
print(saluer({"nom": "Bob", "age": 15}))
