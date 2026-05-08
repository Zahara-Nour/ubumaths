import random

# random.random() : flottant uniforme dans [0, 1[
print("Flottant aléatoire :", random.random())

# random.randint(a, b) : entier aléatoire dans [a, b] inclus
print("Lancer de dé :", random.randint(1, 6))

# random.choice : un élément au hasard d'une séquence
fruits = ["pomme", "banane", "kiwi", "mangue"]
print("Fruit du jour :", random.choice(fruits))

# random.sample : tirage SANS remise
print("3 fruits différents :", random.sample(fruits, 3))

# random.choices : tirage AVEC remise (avec poids optionnels)
print("5 lancers de pile/face :", random.choices(["pile", "face"], k=5))

# random.shuffle : mélange en place
deck = list(range(1, 11))
random.shuffle(deck)
print("Cartes mélangées :", deck)

# Reproductibilité : seed fige le générateur
random.seed(42)
print("\nAvec seed=42, toujours :", random.randint(1, 100))
random.seed(42)
print("Reproduit la même valeur :", random.randint(1, 100))
