---
title: Un Palotin pousse le premier domino, le Royaume entier tombe, la Garde cherche le responsable du domino suivant
date: 2027-01-21
author: giron
lede: L'enquête remonte la chaîne, domino par domino. Chacun accuse celui d'avant. Les enquêteurs prévoient de conclure « à l'infini, au plus tard ».
---

L'incident a commencé dans une cour de Cracovenn. Un Palotin, qui s'ennuyait, a poussé un domino. Le domino est tombé sur le suivant, qui est tombé sur le suivant. La rangée traversait la ville, puis la Province, puis le Royaume. À la tombée de la nuit, tous les dominos du Royaume étaient couchés.

La Garde a ouvert une enquête. Le Palotin a aussitôt reconnu les faits : « J'ai poussé le premier. Mais je ne suis responsable que du premier. » Les enquêteurs ont alors interrogé le premier domino, qui a désigné le deuxième. « Moi, je suis tombé sur lui. Ce n'est pas pareil que de le pousser. »

Depuis, l'enquête remonte la chaîne. Chaque domino reconnaît être tombé, et affirme n'avoir fait que suivre le précédent. « Ils disent tous la même chose », soupire l'enquêteur en chef. « Si le domino d'avant tombe, alors je tombe. C'est leur seule défense. » Elle s'avère irréfutable.

Le Docteur Faustroll, consulté, a confirmé que les deux éléments suffisaient à expliquer la chute du Royaume entier : un premier domino poussé, et chaque domino qui fait tomber le suivant. Le Palotin a été condamné à remettre les dominos debout. Il en est au quatorzième.

## Le vrai du faux

C'est l'image du **raisonnement par récurrence**. Pour démontrer qu'une propriété est vraie pour **tous** les entiers ~n~, il suffit de deux étapes :

- **Initialisation** : la propriété est vraie pour le premier entier (le premier domino tombe).
- **Hérédité** : si elle est vraie pour un entier ~n~, alors elle est vraie pour ~n+1~ (chaque domino qui tombe fait tomber le suivant).

Ces deux étapes suffisent : la propriété est alors vraie pour **tous** les entiers, sans qu'on ait besoin de les vérifier un par un. Par exemple, on démontre ainsi que $1 + 2 + \ldots + n = \frac{n(n+1)}{2}$ pour tout entier ~n~.
