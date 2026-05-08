from dataclasses import dataclass, field


@dataclass
class Livre:
    titre: str
    auteur: str
    annee: int
    pages: int = 0
    tags: list[str] = field(default_factory=list)


# Le @dataclass génère __init__, __repr__ et __eq__ automatiquement
l1 = Livre("Le Petit Prince", "Saint-Exupéry", 1943, 96)
l2 = Livre("Les Misérables", "Hugo", 1862, 1500, tags=["roman", "classique"])
l3 = Livre("Le Petit Prince", "Saint-Exupéry", 1943, 96)

print(l1)
print(l2)
print("l1 == l3 ?", l1 == l3)   # True
print("l1 == l2 ?", l1 == l2)   # False

# Inventaire
bibliotheque = [l1, l2, l3]
total_pages = sum(livre.pages for livre in bibliotheque)
print(f"\nTotal : {len(bibliotheque)} livres, {total_pages} pages")
