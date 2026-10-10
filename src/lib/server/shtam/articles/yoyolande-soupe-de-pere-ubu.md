---
title: La soupe de Père Ubu refroidit, son appétit non
date: 2026-12-28
author: giron
lede: Tout vient à point à qui sait attendre. Sauf la soupe de Père Ubu.
---

Tout a commencé par une langue brûlée. Mardi midi, Père Ubu a avalé d'un coup une cuillerée de soupe tout juste sortie du feu. Cornegidouille ! Il a aussitôt décrété que sa soupe serait désormais servie à la température exacte de la salle à manger : 20 degrés, « pas un de plus ».

Les cuisiniers ont plongé un thermomètre dans la marmite, qui sortait du feu à 100 degrés. En un quart d'heure, la soupe est descendue à 60. Puis 40, puis 30, puis 25. « Ça avance », s'est réjoui le Roi, la serviette déjà nouée. Puis 22,5. Puis 21,25. Puis 20,6. La soupe refroidissait de moins en moins vite.

À seize heures, le thermomètre affichait 20,001 degrés. Père Ubu, affamé, a refusé de toucher à son assiette. « J'ai dit 20. Un décret est un décret. » Les cuisiniers lui ont expliqué que l'écart était divisé par deux tous les quarts d'heure, et qu'il faudrait donc attendre longtemps. Très longtemps. Toujours, en fait.

Mère Ubu, de passage, a goûté la soupe à 20,001 degrés. Elle l'a trouvée parfaite, et l'a finie. Père Ubu attend la prochaine.

## Le vrai du faux

La soupe obéit à la **loi du refroidissement de Newton** : l'écart entre sa température et celle de la pièce diminue toujours dans la même proportion.

- Ici, l'écart de départ, $100 - 20 = 80$ degrés, est divisé par 2 chaque quart d'heure : 80, 40, 20, 10, 5… Après ~n~ quarts d'heure, la température vaut $20 + \frac{80}{2^n}$.
- L'écart $\frac{80}{2^n}$ devient aussi petit qu'on veut, mais il n'est **jamais nul**. Au bout de 4 heures, soit 16 quarts d'heure, il ne reste que $\frac{80}{2^{16}} \approx 0{,}001$ degré.
- Sur un graphique, la courbe de la température se rapproche de plus en plus de la droite « 20 degrés », sans jamais la toucher : cette droite est une **asymptote** de la courbe.
- En pratique, un thermomètre ordinaire finit par afficher 20 : il n'est pas assez précis pour voir la différence. Père Ubu aurait dû en choisir un moins bon.
