import numpy as np
import matplotlib.pyplot as plt

# Tracer une fonction et sa tangente en un point
def f(x):
    return x ** 3 - 3 * x


def f_prime(x):
    return 3 * x ** 2 - 3


x = np.linspace(-2.5, 2.5, 400)
y = f(x)

# Points où tracer les tangentes
points = [-1.5, -0.5, 0.5, 1.5]

plt.figure(figsize=(9, 6))
plt.plot(x, y, color="steelblue", linewidth=2, label="f(x) = x³ − 3x")

# Pour chaque point, tracer la tangente : y = f(a) + f'(a)(x - a)
for a in points:
    f_a = f(a)
    fp_a = f_prime(a)
    x_tan = np.linspace(a - 0.7, a + 0.7, 50)
    y_tan = f_a + fp_a * (x_tan - a)
    plt.plot(x_tan, y_tan, "--", color="firebrick")
    plt.plot(a, f_a, "o", color="firebrick", markersize=8)
    plt.annotate(
        f"x = {a}\nf'(x) = {fp_a:.1f}",
        xy=(a, f_a), xytext=(a, f_a + 1.5),
        fontsize=9, ha="center",
    )

plt.title("f(x) = x³ − 3x et ses tangentes")
plt.xlabel("x")
plt.ylabel("y")
plt.axhline(0, color="black", linewidth=0.5)
plt.axvline(0, color="black", linewidth=0.5)
plt.grid(True, alpha=0.3)
plt.legend()
plt.tight_layout()
plt.show()
