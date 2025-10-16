Debug electron
==============

Pour le debug du code navigateur, il faut
* à la racine, lancer `pnpm run build-electron-debug` qui lance vite avec la config electron et en mode watch (une modif d'un js dans src recompile le tout)
    
* dans le dossier electron lancer `npm run start-debug` ou bien `electron --inspect .`

Ensuite, lors d'une modif d'un js (ou css) de src, vite va recompiler, c'est plus rapide qu'avec webpack mais il faut quand même attendre qu'il ait terminé (en surveillant le terminal qui a lancé le pnpm run build-electron-debug) pour recharger la page avec F5 (ou ctrl+r) dans la fenêtre des devTools et voir le résultat sans avoir besoin de relancer electron.

On peut mettre des points d'arrêt dans la console js et recharger la page comme lors du dev de l'appli web.
