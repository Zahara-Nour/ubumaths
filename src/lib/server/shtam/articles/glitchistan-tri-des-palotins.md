---
title: Caserne — ranger les Palotins par ordre de taille prend trois jours, Merdranpo reste coincé au milieu
date: 2027-01-14
author: cotice
lede: Le Capitaine Bordure avait choisi une méthode simple, comparer les voisins deux à deux et les échanger s'ils sont mal placés. Simple, oui. Rapide, non.
---

L'ordre était clair : « Rangez-vous du plus petit au plus grand ! » Cent Palotins dans la cour de la caserne, et le Capitaine Bordure au centre. Pour être sûr de ne rien oublier, il avait choisi une méthode « que même un Palotin peut suivre » : comparer deux voisins, les échanger si le plus grand est devant, puis passer aux deux suivants. Et recommencer depuis le début, jusqu'à ce que plus personne ne bouge.

Le premier passage a pris une heure. À la fin, le plus grand des Palotins était bien arrivé au bout de la rangée. Les autres, presque pas. « Encore une fois ! » Au deuxième passage, le deuxième plus grand a rejoint le premier. Le Capitaine a commencé à compter.

Après trois jours, la rangée était enfin en ordre. Les cuisiniers avaient servi neuf repas dans la cour. Merdranpo, de taille parfaitement moyenne, a passé tout ce temps au milieu de la rangée, à reculer d'une place, puis à avancer d'une place. « Je n'ai jamais autant bougé pour rester au même endroit », a-t-il confié au Shtam.

Le Capitaine envisage une nouvelle méthode pour la prochaine fois. Les Palotins, eux, envisagent de tous mesurer la même taille.

## Le vrai du faux

La méthode du Capitaine est un vrai **algorithme de tri**, le **tri à bulles** : les grands éléments « remontent » vers la fin comme des bulles.

- Pour trier ~n~ éléments, il peut falloir jusqu'à $\frac{n(n-1)}{2}$ comparaisons. Pour 100 Palotins : $\frac{100 \times 99}{2} = 4\,950$ comparaisons. Pour 10 000 éléments, près de 50 millions.
- Des algorithmes plus malins, comme le **tri fusion** (couper la rangée en deux, trier chaque moitié, puis les fusionner), demandent beaucoup moins de comparaisons : pour 100 Palotins, moins de 600.
- Mesurer le nombre d'opérations d'un algorithme, c'est étudier sa **complexité** : une notion centrale en informatique.
