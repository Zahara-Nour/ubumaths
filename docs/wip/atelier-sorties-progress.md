# Ce qu'une session dans le navigateur a trouve

Trois defauts vus a l'ecran le 2026-09-16, qu'aucun de mes tests ne voyait.

## 1. Des sequences de terminal affichees a l'eleve

`.deriver f` rendait, litteralement, les codes de couleur d'un terminal autour
de son resultat — y compris sur la ligne « LaTeX: ».

⚠️ **Invisible en node.** Le meme appel rend `d/dx(x^2) = 2x` cote serveur et
la version coloree dans Chromium : `chalk` detecte le support des couleurs selon
l'environnement. **Un test serveur ne pouvait pas voir ce defaut** — meme
famille que le `structuredClone` sur un proxy `$state`, mesure sain en node et
casse en navigateur.

Le test qui le garde est donc un **test client**, et il le dit.

Effet de bord decouvert au passage : mon filtre de la ligne « LaTeX: » ne la
reconnaissait plus, puisqu'elle commence par une sequence de couleur. Le
depouillement se fait maintenant **avant** tout filtrage.

## 2. `.deriver f` rendait 0 — faux, et silencieux

Le moteur lit `f` comme une variable libre et la derive par rapport a `x` :
zero. Avec un message de **succes**.

L'action « Deriver » du panneau, elle, donnait bien `2x-3` — parce qu'elle
substitue. **Deux chemins, deux reponses, dont une fausse.**

C'est le §6 bis, par un chemin que je n'avais pas couvert : la commande **tapee
a la main**. L'argument d'une commande recoit desormais les expressions, comme
les actions.

⚠️ On ne remplace qu'un nom **isole** ou **appele** (`f` ou `f(x)`) : sans ca, le
`f` d'un mot quelconque serait reecrit.

## 3. Un objet garde, sain en apparence, inexploitable — **non corrige**

`f'(x)` tape a la main rend `f'(x)` : le moteur n'a rien calcule, mais
« Garder… » est propose, et l'objet cree porte le statut **`ok`** alors qu'il ne
peut rien produire.

La cause est la meme que pour le nommage de la derivee : **l'apostrophe n'est
pas un caractere d'identifiant**, donc `f'` n'est pas vu comme une reference
manquante et l'objet passe pour sain.

Je ne le corrige pas ici : elargir le modele de noms touche `referencesOf`,
`hasObjectNameShape` et la lecture des dependances. **Declencheur : le jour ou
l'on voudra vraiment des objets nommes `f'`** — c'est le meme chantier.

## Ce que cette session d'usage a coute et rapporte

Deux bugs graves trouves en cinq minutes d'ecran, dont un **resultat faux
annonce comme un succes**. Aucun de mes 400 tests ne les voyait : le premier
parce qu'il n'existe qu'en navigateur, le second parce que je testais les deux
chemins separement — l'action ET la commande — sans jamais comparer **leurs
reponses**.
