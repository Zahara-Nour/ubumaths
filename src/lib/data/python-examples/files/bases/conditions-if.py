# Structure if / elif / else
note = 14

if note >= 16:
    mention = "Très bien"
elif note >= 14:
    mention = "Bien"
elif note >= 12:
    mention = "Assez bien"
elif note >= 10:
    mention = "Passable"
else:
    mention = "Insuffisant"

print(f"Note {note} → {mention}")

# Condition booléenne combinée
age = 17
permis = False

if age >= 18 and permis:
    print("Peut conduire")
elif age >= 18 and not permis:
    print("Majeur mais sans permis")
else:
    print("Mineur")

# Expression conditionnelle (ternaire)
parite = "pair" if note % 2 == 0 else "impair"
print(f"{note} est {parite}")
