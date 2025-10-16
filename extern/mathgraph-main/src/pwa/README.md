# Version Progressive Web App de Mathgraph

Ce dossier contient les sources de la version pwa.

On utilise le plugin [vite-pwa](https://vite-pwa-org.netlify.app/) qui nous simplifie pas mal la tâche.
Ce plugin utilise [workbox](https://developer.chrome.com/docs/workbox?hl=fr) et on peut luis passer la plupart des options de workbox.
En définissant quelques options dans le vite.config.js ça génère le fichier qui défini le serviceWorker utilisé pour l'usage offline.

On choisi la stratégie par défaut (generateSW) car l'autre (injectManifest) demande de créer soi-même le fichier sw.js (pour les cas où on veut gérer plus finement ce qui doit être mis en cache en preload et ce qui peut être optionnel en offline).

On ne l'utilise pas pour générer notre `manifest.webmanifest` car on veut qu'il dépende de la langue (pour la phrase de description affichée à l'installation)

## Developpement et debug
Pour le dev local, cf dev.md (indispensable d'avoir une connexion https pour tester un service worker)

## Images du manifest

On les a généré avec `pwa-assets-generator --preset minimal-2023 path/to/logoMathGraphHauteDef.png` puis mises dans public/, avec les deux lignes ajoutées dans le `head` de la page.
