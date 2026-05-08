import re
from collections import Counter

texte = """Le petit chat noir dort sur le tapis rouge.
Le chien blanc joue avec le chat noir. Le petit chien
court vite, mais le chat dort encore."""


# 1) Découpage simple par espaces (perd la ponctuation collée)
mots_simples = texte.lower().split()
print("split() :", mots_simples[:8], "...")

# 2) Avec regex : seulement les "mots" (séquences de lettres)
mots = re.findall(r"\b\w+\b", texte.lower())
print(f"\nNb total de mots : {len(mots)}")
print(f"Vocabulaire (mots distincts) : {len(set(mots))}")

# Top 5 des mots les plus fréquents
freq = Counter(mots)
print("\nTop 5 :")
for mot, n in freq.most_common(5):
    print(f"  {mot:8s} : {n}")

# 3) Phrases (split sur ponctuation)
phrases = re.split(r"[.!?]+\s*", texte.strip())
phrases = [p for p in phrases if p]
print(f"\n{len(phrases)} phrases :")
for i, p in enumerate(phrases, 1):
    print(f"  {i}. {p}")

# 4) Statistiques basiques
nb_caracteres = len(texte)
nb_mots = len(mots)
mots_distincts = len(set(mots))

print(f"\n— Statistiques —")
print(f"Caractères : {nb_caracteres}")
print(f"Mots       : {nb_mots}")
print(f"Mots uniques : {mots_distincts}")
print(f"Diversité lexicale (uniques/total) : {mots_distincts / nb_mots:.2%}")
