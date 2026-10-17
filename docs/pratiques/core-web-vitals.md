# Core Web Vitals : mesurer, relever, diagnostiquer

> Écrit le 2026-10-11, après le premier diagnostic : FCP p75 de l'accueil à 3,4 s pour un TTFB de
> 0,5 s, que personne n'avait vu (corrigé par #1073).

## Les vraies mesures existent déjà

`@vercel/speed-insights` est branché dans `src/routes/+layout.svelte` : Vercel enregistre le
LCP, l'INP, le CLS, le FCP et le TTFB des **vrais visiteurs**, page par page. C'est la source qui
fait foi — un Lighthouse sur le Mac mini mesure une machine rapide sur un bon réseau, pas un
élève sur la Wi-Fi du collège.

```bash
vercel metrics vercel.speed_insights.lcp_ms --prod -s 28d -a p75 --group-by route --json
vercel metrics vercel.speed_insights.lcp_ms --prod -s 28d -a count --group-by route   # taille d'échantillon
vercel metrics schema vercel.speed_insights.lcp_ms                                    # dimensions disponibles
```

⚠️ **L'échantillon est petit** (~150 mesures par mois en octobre 2026, à 95 % des ordinateurs
sous Chrome). Un p75 sur moins de 10 mesures ne permet pas de conclure ; le chiffre « mobile »
d'octobre reposait sur 7 mesures.

## Le relevé mensuel

`.github/workflows/web-vitals.yml`, le 1er du mois : `scripts/releve-web-vitals.ts` relève
28 jours, classe chaque indicateur selon les seuils de Google (🟢 / 🟠 / 🔴) et publie une issue
« Core Web Vitals — relevé AAAA-MM » (la précédente est refermée). Une page est **à regarder**
si elle a au moins 10 mesures et un indicateur au rouge.

Il demande le secret `VERCEL_TOKEN` (jeton Vercel limité à l'équipe du projet). Pourquoi pas une
routine Claude en cloud : l'environnement cloud n'a pas de secrets, il ne peut pas interroger
Vercel.

## Diagnostiquer une page au rouge

1. **Lire la répartition** : p50 / p75 / p90, par appareil et navigateur. Un p50 bon et un p75
   mauvais = une queue de distribution (premières visites, réseaux lents), pas un cas général.
2. **Séparer serveur et navigateur** : TTFB élevé → serveur (démarrage à froid, appels Supabase
   en série, redirections — le TTFB de web-vitals les inclut) ; TTFB bas mais FCP haut →
   navigateur (CSS bloquantes, polices, JS préchargé qui vole la bande passante).
3. **Agent `vercel:performance-optimizer`** en lecture seule pour le diagnostic, puis l'agent
   `performance-optimizer` du projet pour le correctif (SvelteKit, Safari TDZ, requêtes).
4. **Mesurer avant/après en labo** : build de production servi localement derrière un proxy
   HTTP/2 + brotli (sans lui, HTTP/1.1 et 6 connexions faussent tout), réseau lent simulé
   (1,5 Mb/s, RTT 150 ms) et moyen (4 Mb/s, RTT 80 ms, CPU ×4), cache vide, 3 passes, médiane.
   Les scripts de #1073 n'ont pas été conservés : les réécrire au besoin (Playwright/CDP).
5. **Confirmer en prod** : une à deux semaines de Speed Insights après le déploiement.

## Ce qui a déjà été fait

- **#1073** : préchargement réservé au CSS, cache des fichiers de `static/`, CSS MathLive chargé
  par Vite dans les seuls composants de maths (cf.
  [architecture-generale.md](../systeme/architecture-generale.md#premier-affichage--préchargement-et-css)).
- **Fluid Compute** est actif ; les fonctions tournent à Paris (`cdg1`, imposé par
  `svelte.config.js` — le `iad1` des réglages du projet n'est qu'un défaut remplacé).
- **Restent ouverts** : démarrages à froid de la connexion (plan Hobby, pas de préchauffage),
  layout racine qui importe d'emblée barre latérale, panneaux et skeletons.
