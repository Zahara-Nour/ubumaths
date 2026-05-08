import math


class Point:
    """Un point dans le plan."""

    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __str__(self):
        return f"({self.x}, {self.y})"

    def distance(self, autre):
        dx = self.x - autre.x
        dy = self.y - autre.y
        return math.sqrt(dx ** 2 + dy ** 2)

    def translate(self, dx, dy):
        return Point(self.x + dx, self.y + dy)


# Utilisation
A = Point(0, 0)
B = Point(3, 4)

print("A =", A)
print("B =", B)
print(f"AB = {A.distance(B):.2f}")

C = B.translate(-1, 2)
print("C (B translaté) =", C)
