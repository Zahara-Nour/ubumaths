# Vérifications manuelles à faire par David

> **Pourquoi ce fichier** : David fait les vérifications à l'œil (navigateur, prod) bien après le
> merge. Chaque session qui livre quelque chose qu'aucun test ne voit (rendu à l'écran, clavier
> MathLive, prod) ajoute ici une ligne, au moment du merge. David coche, puis la ligne part.
>
> **Où** : « dev » = une branche à jour sur un serveur local ; « prod » = chiph.re, après un
> `pnpm deploy:prod`. Une ligne « prod » reste en attente tant que la PR n'est pas déployée.

| Fait | Ajouté le  | Où   | PR    | Quoi vérifier                                                                                                                                                                                                                                                                                            |
| ---- | ---------- | ---- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ☐    | 2026-10-13 | dev  | #1253 | Atelier, `.résoudre \|2x+1\|=5` : étapes lisibles (« Deux nombres ont pour valeur absolue 5 : 5 et −5 », deux branches du premier degré à plat, `S = {−3 ; 2}`) ; puis `.résoudre \|x\|=-2` (« Une valeur absolue est positive ou nulle », `S = ∅`).                                                     |
| ☐    | 2026-10-13 | prod | #1262 | Dans une question dont la réponse est une valeur absolue (ou `\ln\|x\|`), taper avec la **touche « valeur absolue » du clavier virtuel** MathLive (elle envoie `\left\vert…\right\vert`) : la réponse juste doit être comptée juste (avant : comptée fausse). Puis `2\|x\|` au clavier physique (#1252). |
| ☐    | 2026-10-13 | prod | #1215 | Inéquation `-\dfrac23x+1<5` : la correction conclut `x > -6` (avant : `x < -6`, faux).                                                                                                                                                                                                                   |
| ☐    | 2026-10-13 | prod | #1212 | Une correction générée (ex. limites, dérivée) : les maths des explications s'affichent en formules, pas en `$…$` ni en LaTeX brut.                                                                                                                                                                       |
| ☐    | 2026-10-13 | prod | #1201 | (Déjà en prod, v0.26.0.) Un nombre complexe en réponse ou correction s'écrit `a + ib` (`2 + 3i`, `x + iy`), jamais `iy + x`.                                                                                                                                                                             |
