# Les principaux types de Python
age = 17                  # int
taille = 1.78             # float
prenom = "Alice"          # str
majeure = age >= 18       # bool
notes = [12, 15, 9, 18]   # list

print(prenom, "a", age, "ans")
print("Type de age :", type(age).__name__)
print("Type de taille :", type(taille).__name__)
print("Type de majeure :", type(majeure).__name__)

# Conversion explicite
age_str = str(age)
note_moyenne = sum(notes) / len(notes)
print(f"Moyenne : {note_moyenne:.2f}")
