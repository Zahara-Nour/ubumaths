phrase = "  Bonjour le Monde  "

# Nettoyer / changer la casse
print(repr(phrase.strip()))           # "Bonjour le Monde"
print(phrase.strip().lower())         # bonjour le monde
print(phrase.strip().upper())         # BONJOUR LE MONDE
print(phrase.strip().title())         # Bonjour Le Monde

# Recherche
texte = "Python est génial, Python est simple"
print(texte.count("Python"))          # 2
print(texte.find("génial"))           # indice de la 1re occurrence
print("simple" in texte)              # True

# Remplacement
print(texte.replace("Python", "JS"))

# Découpage / assemblage
mots = "rouge,vert,bleu,jaune".split(",")
print(mots)
joined = " - ".join(mots)
print(joined)

# Validation
for s in ["123", "abc", "abc123", "  "]:
    print(f"{s!r:10} isdigit={s.isdigit()} isalpha={s.isalpha()}")
