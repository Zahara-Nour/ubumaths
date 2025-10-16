import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { builtinModules as nodeBuiltins } from 'node:module'

import { defineConfig /*, splitVendorChunkPlugin */ } from 'vite'
// les plugins vite, cf https://vitejs.fr/guide/using-plugins.html
// cf https://github.com/vitejs/vite/blob/main/packages/plugin-legacy/README.md
import legacy from '@vitejs/plugin-legacy' // il faut aussi installer terser
import dynamicImport from 'vite-plugin-dynamic-import'
import circularDependency from 'vite-plugin-circular-dependency'
// https://www.npmjs.com/package/vite-plugin-singlefile pour la version locale
import { viteSingleFile } from 'vite-plugin-singlefile'

// https://vite-pwa-org.netlify.app/guide/ pour la version pwa
import { VitePWA } from 'vite-plugin-pwa'

// pour regénérer factory.js et mtgLoad.dependencies.js
import buildDependencies from './scripts/buildDependencies.js'
// pour finaliser le build (imposer le nom du loader et compression de mathgraphElements)
import postBuild from './scripts/postBuild.js'
// on avait tenté de le lancer seul en postBuild dans le writeBundle, pour l'avoir en mode --watch mais ça marche pas
// import compressMathgraphElements from './scripts/compressMathgraphElements.js'

import { dependencies, version } from './package.json'

import manifest from './src/pwa/public/manifest.webmanifest' with { type: 'json' }
const { icons, screenshots } = manifest

const preBuildPwa = () => {
  // on met à jour le start_url avec le n° de version
  // vu qu'il y a un id qui reste constant le système prendra ça pour la même application que celle déjà installée
  // mais dès qu'il y aura du réseau il ira faire une requête avec la nouvelle version
  // si elle n'est pas en cache, et ça récupèrera le nouveau sw.js avec la nouvelle liste de fichiers
  manifest.start_url = `index.html?v=${version}`
  const file = resolve(__dirname, 'src/pwa/public/manifest.webmanifest')
  writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n', { encoding: 'utf8', mode: 0o644 })
}

const srcDir = resolve(__dirname, 'src')

// on passe une fct à defineConfig plutôt que l'objet de config
// car on veut récupérer le mode
export default defineConfig(async ({ command }) => {
  const isBuild = command === 'build' // ou serve au pnpm start
  // pas moyen de distinguer watch ou pas d'après les arguments passés à notre cb,
  // `vite build` et `vite build --watch` passent tous les deux
  // `{  "mode": "production","command": "build", "isSsrBuild": false, "isPreview": false }`
  // on regarde les arguments
  const isWatch = process.argv.includes('--watch') || process.argv.includes('-w')
  const isCli = process.env.CLI === '1'
  const isElectron = process.env.ELECTRON === '1'
  const isPortable = isCli || process.env.PORTABLE === '1'
  const isPwa = process.env.PWA === '1'
  const isDev = process.env.DEV === '1'

  await buildDependencies()
  const config = {
    root: __dirname,
    // ça c'est important, le mettre en relatif (./) va permettre de copier le dossier docroot n'importe où, mais ne permettra pas l'usage en cross-domain
    // pour charger un js en cross-domain, il faut préciser ici le chemin absolu où seront déployés les js (https://xxx)
    base: './', // https://vitejs.dev/config/shared-options.html#base
    build: {
      outDir: 'docroot', // https://vitejs.dev/config/build-options.html#build-outdir
      emptyOutDir: true, // https://vitejs.dev/config/build-options.html#build-emptyoutdir
      assetsDir: 'build', // relatif au précédent, cf https://vitejs.dev/config/build-options.html#build-assetsdir
      chunkSizeWarningLimit: 600,
      reportCompressedSize: false, // pas besoin que vite nous donne la taille du résultat gzippé, ça prend du temps pour une info annexe, https://vitejs.dev/config/build-options.html#build-reportcompressedsize

      // pour avoir un js dont le nom ne change pas, que l'on peut charger en cross-domain, il faut passer par le library mode
      // mais c'est pas compatible avec le plugin legacy :-/
      // buildLoader s'occupera de mettre le preloader avec le nom fixe.

      // cf https://github.aiurs.co/vitejs/vite/issues/2433#issuecomment-1422718248
      // pour limiter la conso de RAM
      rollupOptions: {
        // l'externalisation de jquery via la config marche pas, ça déclenche du
        // Failed to resolve module specifier "jquery". Relative references must start with either "/", "./", or "../".
        // sur tous les imports dynamiques de jquery
        // external: ['jquery'],
        // https://vitejs.dev/guide/build.html#customizing-the-build
        output: {
          // https://rollupjs.org/configuration-options/#output-globals
          // globals: {
          //   jquery: 'jQuery'
          // }
          // par défaut tous les js de node_modules se retrouvent dans un seul chunk __kernel__.xxx.js
          // cf https://rollupjs.org/configuration-options/#output-manualchunks
          manualChunks: (id) => {
            // id est le chemin absolu vers le fichier js (avec son extension)
            if (id.includes('node_modules')) {
              // on essaie de découper un peu, mais pas trop (la ligne suivante génère des empty chunks, explose la ram consommée et génère trop de petits chunks)
              // return id.replace(/.*node_modules\/([^/]+)(\/.*)/, 'vendor-$1')

              // IMPORTANT, il faut mettre jquery-ui à part, sinon ça plante dès le chargement de son chunk avec `jQuery is not defined`
              const chunks = /\/(jquery|jquery-ui|jquery-textrange|jstree|ace-builds)\//.exec(id)
              if (chunks) return 'vendor-' + chunks[1]
              // et le reste en vrac dans vendor.js
              return 'vendor'
            }

            // Une erreur `Cannot access 'xxx' before initialization` signifie un pb de ref circulaire au runtime

            // ceux-là doivent rester isolé, sinon on a des pbs de ref circulaires
            // (dans la version build seulement, car rollupOptions ne s'applique qu'au build)
            // lui peut pas aller dans la regex qui suit car il a un /
            // if (id.includes('/kernel/kernel')) return 'kernelMain'
            if (id.includes('outilsExternes/spectrum')) return 'external-spectrum'
            // attention à l'ordre, c'est le 1er match qui gagne
            const chunks = /(factory|objetsAdd|objets|outilsWithElectron|outilsWithoutElectron)/.exec(id)
            if (chunks) return chunks[1]
            // ajouter ça retire 12k à MtgApp.js et ajoute 326k de figures.js…
            // if (id.includes('figures')) {
            //   return 'figures'
            // }
          }
        },
        // https://rollupjs.org/configuration-options/#loglevel
        logLevel: 'error'

        // à priori pour réduire la RAM consommé, au prix d'un build plus lent
        // en pratique ça change rien à la vitesse sur le PC de Daniel (4 core 8 threads)
        // maxParallelFileOps: 2
      }, // rollupOptions
      sourcemap: true, // https://vitejs.dev/config/build-options.html#build-sourcemap
      // avant 2025-10 on précisait  target: 'modules', mais depuis vite7 on laisse la valeur par défaut (baseline-widely-available)
      // cf https://vitejs.dev/config/build-options.html#build-target
    }, // build

    // Finalement ça ne change rien au pb de jQuery is undefined au chargement du chunk qui contient jquery-ui
    // optimizeDeps: {
    //   exclude: ['jquery', 'jquery-ui']
    // },

    plugins: [
      dynamicImport(),
      // ça détecte les refs circulaires, mais il râle même sur les imports
      // circulaires dynamiques qui posent pas de pb au runtime
      // => on veut pas que ça plante le build dans ce cas
      circularDependency({ circleImportThrowErr: false })
      // avec ce plugin, certains node_modules sont intégrés dans d'autres chunks
      // MtgApp.js passe de 562k à 703k, objetsAdd de 191 à 194,
      // et vendor passe de 306 à 150 (et on peut supposer qu'il est moins souvent chargé)
      // mais ça peut aussi créer des refs circulaires (ça plante au chargement avec `Cannot access 'xx' before initialization`)
      // => on ne l'utilise pas
      // splitVendorChunkPlugin()
    ],
    // on a besoin de ça pour que le pnpm start serve les fichiers statiques qui sont déjà dans docroot
    // (les mettre dans un dossier public pour que chaque build les recopie dans docroot est assez idiot)
    // mais pour le build ça n'a pas de sens (il recopie chaque fichier sur lui-même) et ça plante si certains
    // sont en lecture seule, ce qui est le cas pour le symlink docroot/replication_calculatice
    // publicDir: 'docroot', // https://vitejs.dev/config/shared-options.html#publicdir
    resolve: {
      alias: { // cf https://vitejs.dev/config/shared-options.html#resolve-alias
        src: srcDir,
        test: resolve(__dirname, 'test')
        // alias jquery remplacé par le dedupe plus bas
        // jquery: resolve(__dirname, 'node_modules/jquery'),
        // 'jquery-ui': resolve(__dirname, 'node_modules/jquery-ui'),
      },
      // Les extension jquery (jstree par ex) font leur propre import jquery qu'elles augmentent sans l'exporter.
      // Il faut donc obliger tous les imports à prendre le même module js de jQuery, on passait par un alias et
      // on utilise désormais dedupe.
      // Car les plugins pourraient avoir la leur qui ne serait pas node_modules/jquery
      // (mais son propre node_modules/extensionJquery/node_modules/jquery)
      // https://vitejs.dev/config/shared-options.html#resolve-dedupe
      dedupe: [
        'jquery',
        'jquery-ui'
      ]
      // il faudrait voir si cette options permet de régler les pbs d'alias qu'on a eu précédemment
      // https://vitejs.dev/config/shared-options.html#resolve-preservesymlinks
      // , preserveSymlinks: true
    },
    server: {
      open: true,
      host: process.env?.HOST || 'localhost',
      port: process.env?.PORT || 8082,
      // on préfère planter si le 8081 est déjà occupé (car on doit déjà tourner à coté)
      // cf https://vitejs.dev/config/server-options.html#server-strictport
      strictPort: true
    }
  } // config

  // ***********
  // Cas build *
  // ***********
  if (isBuild) {
    // on ajoute ça pour qu'il ignore le index.html de la racine et parte de ce fichier
    // config.optimizeDeps = {
    //   entries: ['src/mtgLoad.global.js'],
    //   exclude: ['src/start/**']
    // => remplacé par config.build.rollupOptions.input ci-dessous
    // }
    if (!config.build.rollupOptions) config.build.rollupOptions = {}
    config.build.rollupOptions.input = 'src/mtgLoad.global.js'

    if (isElectron) {
      config.build.outDir = resolve(__dirname, 'electron', 'build')
      config.build.assetsDir = '.'
      config.build.rollupOptions.output.entryFileNames = 'mtgLoad.js'
    } else if (isPwa) {
      preBuildPwa()
      // https://vite.dev/config/shared-options.html#root
      config.root = 'src/pwa'
      // relatif à root
      config.publicDir = 'public'
      // plus besoin de ça
      delete config.build.rollupOptions.input
      // on vide docroot/pwa et on le recrée
      let buildDir = resolve(__dirname, 'dist/pwa')
      if (isDev) buildDir += '-dev'
      rmSync(buildDir, { recursive: true, force: true })
      mkdirSync(buildDir, { mode: 0o755 })
      config.build.outDir = buildDir // faut le préciser en absolu sinon c'est relatif à notre root

      // on veut récupérer les images de notre manifest pour les mettre dans includeAssets
      const includeAssets = icons.map((icon) => icon.src)
      if (Array.isArray(screenshots)) {
        includeAssets.push(...screenshots.map((screenshot) => screenshot.src))
      }

      const devOptions = {}
      if (isDev) {
        Object.assign(devOptions, {
          enabled: true,
          // faut aussi préciser ça pour ne pas tout mettre en cache (mais utiliser quand même la logique du serviceWorker)
          // cf https://vite-pwa-org.netlify.app/guide/development.html#generatesw-strategy
          navigateFallbackAllowlist: [/^index.html$/, /^manifest.webmanifest$/],
        })
      }

      config.plugins.push(
        VitePWA({
          // cf https://vite-pwa-org.netlify.app/guide/auto-update.html#automatic-reload
          // pour que ça fonctionne, il faut importer registerSW dans le index.js de la pwa
          registerType: 'prompt',
          // cf https://vite-pwa-org.netlify.app/guide/pwa-minimal-requirements.html#web-app-manifest
          // attention, c'est relatif à publicDir
          includeAssets,
          manifest: false,
          // enable sw on development, cf https://vite-pwa-org.netlify.app/guide/development.html
          devOptions,
          // cf https://developer.chrome.com/docs/workbox/modules/workbox-build?hl=fr#type-GenerateSWOptions pour les options de workbox possibles
          workbox: {
            cleanupOutdatedCaches: true, // Supprime les anciens caches
            // pour vérifier c'est `find src -type f |sed -e 's/.*\.//'|sort -u`
            // (à lancer aussi sur electron/fr pour l'aide)
            globPatterns: ['**/*.{js,css,htm,html,gif,ico,png,py,svg}'],
            // pour virer les anciennes versions du cache, tant qu'on reste en generateSW strategy
            // => it is not necessary to configure it, the plugin will activate it by default.
            // cf https://vite-pwa-org.netlify.app/guide/auto-update.html#cleanup-outdated-caches
            maximumFileSizeToCacheInBytes: 5_000_000, // 5Mo pour accepter brython/scripts/brython_stdlib.js
            runtimeCaching: [
              {
              // pour ces deux fichiers on veut une requête réseau (si on en a),
              // pour vérifier et màj si besoin (ça renvoie 304 si rien n'a changé)
                urlPattern: /^https:\/\/app[^.]*\.mathgraph32\.org\/(index\.html|manifest\.webmanifest|sw\.js|$)/,
                handler: 'NetworkFirst',
                options: {
                  networkTimeoutSeconds: 10, // Attendre un max de 10 secondes pour une réponse réseau
                  cacheName: 'runtime-html-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 3600 // 1 heure
                  }
                },
              },
              // pour mettre MathJax en cache aussi (fait au 1er chargement)
              {
                urlPattern: /^https:\/\/www\.mathgraph32\.org\/js\/MathJax3\//,
                handler: 'CacheFirst',
                options: {
                  cacheName: 'mtg-mathjax3-cache',
                  expiration: {
                    maxEntries: 10,
                    maxAgeSeconds: 60 * 60 * 24 * 365 // <== 365 days
                  },
                  cacheableResponse: {
                    statuses: [0, 200]
                  }
                }
              }
            ],
            sourcemap: true
          }
        })
      )
    } else if (isPortable) {
      // le plugin qui va bien pour tout mettre dans un seul js
      config.plugins.push(viteSingleFile())
      // faut virer ça sinon ça plante
      config.build.rollupOptions.output.manualChunks = undefined
      // et on change le dossier de sortie
      if (isCli) {
        // c'est un build pour nodeJs
        config.build.ssr = true
        // faut ignorer les imports node, inutile de les mettre dans le build
        config.ssr = {
          // faut incorporer les dépendances de node_modules (il le fait pas par défaut avec ssr:true)
          noExternal: [...Object.keys(dependencies)],
          // et ignorer tous les builtins node
          externals: nodeBuiltins
        }
        config.build.outDir = 'dist/cli'
        config.build.rollupOptions.input = 'scripts/convert.mjs'
        config.build.rollupOptions.output.entryFileNames = 'convert.mjs'
      } else {
        // version portable, on vide dist/portable et on le recrée
        const portableDir = resolve(__dirname, 'dist/portable')
        rmSync(portableDir, { recursive: true, force: true })
        mkdirSync(portableDir, { mode: 0o755 })
        config.build.outDir = 'dist/portable/build'
        config.build.rollupOptions.output.entryFileNames = 'mtgLoad.js'
      }
      // en mode ssr y'a pas de compression, inutile de générer le source.map
      // et pour portable c'est inutile également, ça va alourdir le zip pour pas grand chose
      config.build.sourcemap = false
      // pas besoin de copier le contenu de public/ dans build/
      // https://vite.dev/config/build-options.html#build-copypublicdir
      config.build.copyPublicDir = false
      // il faut aussi remplacer import.meta.url par './' sinon on se prend l'erreur
      // Cannot use 'import.meta' outside a module
      // et on peut pas utiliser de module avec du file://
      // cf https://rollupjs.org/plugin-development/#resolveimportmeta
      /* config.plugins.push({
          name: 'mtgLocalReplace',
          resolveImportMeta: (property) => (property === 'url') ? './' : null
        }) */
      // mais le plugin ci-dessus marche pas, le build plante avec
      // mtgLoad.js:99:112: ERROR: Unexpected "."
      // 99 |      texPromise = __vitePreload(() => Promise.resolve().then(() => loadMathJax$1),true?"__VITE_PRELOAD__":void 0,./)
      //    |                                                                                                                  ^
      // => on règle ça dans le postBuild
    } else {
      // le cas online "ordinaire"

      // le plugin legacy pour les vieux navigateurs, sauf en mode watch
      if (!isWatch) {
        config.plugins.push(
          // On laisse la conf par défaut
          legacy({ targets: ['defaults'] }) // c'est le defaults de browserlist
        )
      }

      // on a tenté cette option rollup
      // cf https://rollupjs.org/configuration-options/#output-experimentalminchunksize
      // mais ça change rien sinon réduire de manière marginale le nb de chunks
      // et créer un énorme mtgLoad.global.js
      // avec experimentalMinChunkSize: 20_000 on a 581 js de 0.1 à ?
      // avec experimentalMinChunkSize: 50_000 on a 579 js de 0.1 à ?
      // avec experimentalMinChunkSize: 200_000 on a 576 js de 0.1 à 784k
      // => on laisse tomber

      // on désactive le plugin précédent pour tenter le library mode
      // => ça déconne complètement :
      // - RollupError: Invalid value for option "output.manualChunks" - this option is not supported for "output.inlineDynamicImports".
      // - tout est en vrac à la racine de docroot
      // - jquery-ui est toujours importé en premier
      // config.build.lib = {
      //   entry: resolve(srcDir, 'mtgLoad.global.js'),
      //   name: 'mtgLoad',
      //   fileName: 'mtgLoad.global'
      // }
    }

    // on veut un post-build => on ajoute un "plugin" perso
    // pour lancer une commande en fin de build
    // * ça check les textes (que ce sont les mêmes clés pour les 3 langues)
    // * pour portable|online ça va mettre notre preloader
    //     (qui chargera le js compilé par vite qui peut changer de nom à chaque fois)
    //     ou insérer le bon js dans les html
    //     (qui change aussi de nom à chaque compil)
    // hook closeBundle de rollup https://rollupjs.org/plugin-development/#closebundle
    config.plugins.push({
      name: 'mtgPostBuild',
      // closeBundle n'est pas appelé en mode --watch
      closeBundle: () => postBuild()
      // mais avec writeBundle ça marche pas mieux… si on a besoin de mathgraphElements en mode watch faudra le relancer manuellement
      // writeBundle: () => compressMathgraphElements()
    })
  }

  return config
})
