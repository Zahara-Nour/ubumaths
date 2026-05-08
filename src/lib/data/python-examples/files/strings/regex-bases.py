import re

texte = """Contact : alice@example.com et bob.dupont@univ-paris.fr
Téléphones : 06 12 34 56 78, +33 7 98 76 54 32
Code postal : 75015 Paris ; 13001 Marseille
"""

# search : trouve la PREMIÈRE correspondance
m = re.search(r"\d{5}", texte)
print(f"Premier code postal : {m.group()} (position {m.start()})")

# findall : toutes les correspondances
codes = re.findall(r"\d{5}", texte)
print(f"Tous les codes : {codes}")

# Adresses email simples
emails = re.findall(r"[\w.-]+@[\w.-]+\.\w+", texte)
print(f"Emails : {emails}")

# Numéros de téléphone français (très simplifié)
tels = re.findall(r"(?:\+33\s?|0)[1-9](?:\s?\d{2}){4}", texte)
print(f"Téléphones : {tels}")

# Groupes de capture
m = re.search(r"(\w+)@(\w[\w.-]*)", texte)
if m:
    print(f"\nNom utilisateur : '{m.group(1)}'")
    print(f"Domaine        : '{m.group(2)}'")

# Substitution : masquer les emails
masques = re.sub(r"[\w.-]+@[\w.-]+\.\w+", "[EMAIL]", texte)
print("\nTexte masqué :")
print(masques)

# Métacaractères courants : \d (chiffre), \w (lettre/chiffre), \s (espace)
# *, +, ? : 0+, 1+, 0 ou 1
# {n}, {n,m} : exactement n / entre n et m
# ^, $ : début / fin de ligne
# [...] : classe de caractères
