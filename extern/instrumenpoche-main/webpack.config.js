/* @author Association Sésamath
 * @licence AGPL-3.0-or-later
 */
/*
Compilation des js destinés à être chargés en cross domain, ou pour le dev local (lancé avec `pnpm start`)
 */
const fs = require('fs')
const path = require('path')

const minimist = require('minimist') // pour se faciliter le parsing des arguments

const TerserPlugin = require('terser-webpack-plugin')
const { minify } = require('terser')

// les options babel du package.json (pour noModule)
const babelOptions = require('./package').babel
// webstorm exécute ce fichier mais n'a pas de process.argv
const argv = process.argv || []
const args = minimist(argv.slice(2))
const host = args.host || 'localhost'
const port = args.port || 8081
const isDevServer = argv.includes('serve')
// passer --debug pour ne pas avoir de minification (ou lancer avec pnpm start)
const isProd = !args.debug && !isDevServer
// le suffixe qui en dépend
const jsSuffix = isProd ? 'min.js' : 'js'

// les différences de conf babel pour la version module (pour noModule on prend la conf du package.json)
// cf https://philipwalton.com/articles/deploying-es2015-code-in-production-today/
const babelOptionsModule = {
  ...babelOptions,
  // on change l'option presets
  presets: babelOptions.presets.map(preset => {
    // seulement l'entrée @babel/preset-env
    if (preset[0] === '@babel/preset-env') {
      return [
        '@babel/preset-env',
        // https://caniuse.com/#feat=es6-module liste les targets qui savent utiliser module, mais targets.esmodules fait ça
        // et attention, c'est bien module:false qu'il faut passer pour une compilation type=module (pour dire à babel de ne pas convertir les import de type module js)
        Object.assign({}, preset[1], { modules: false, targets: { esmodules: true } })
      ]
    }
    // le reste tel quel, même si y'en a probablement pas d'autres
    return preset
  })
}

// la conf que l'on va exporter (version es5, avec des overrides pour la version module plus bas)
const conf = {
  mode: isProd ? 'production' : 'development',
  // cf http://webpack.github.io/docs/configuration.html#entry
  entry: {
    // chaque entrée contiendra ses dépendances, cf https://webpack.github.io/docs/code-splitting.html
    // qui mène à https://github.com/webpack/webpack/tree/master/examples/multiple-commons-chunks
    iepLoad: ['./src/iepLoad.es5.js']
  },
  output: {
    // faut indiquer le dossier où webpack doit mettre ces fichiers
    path: path.resolve(__dirname, 'build'),
    // le préfixe à utiliser pour nos chargements (quand un module en charge un autre)
    // si iepLoad.js est chargé en cross domain il faut impérativement que cette valeur soit celle du domaine
    // où ce js sera chargé (pour qu'il puisse charger ses dépendances)
    // mais ici c'est inutile on a pas de chunks
    // publicPath: `https://instrumenpoche.sesamath.${isProd ? 'net' : 'dev'}/iep/js/`,

    // cf https://webpack.js.org/configuration/output/#outputfilename
    // [name] est remplacé par le nom de la propriété de entry
    // filename: ({ chunk }) => `[name]${chunk.name === 'iepLoad' ? '.es5' : ''}.${jsSuffix}`,
    filename: () => `[name].es5.${jsSuffix}`,

    // exporte le module mis dans entry (attention, si y'en a plusieurs c'est le dernier) dans cette variable globale
    library: '[name]',
    libraryTarget: 'window',
    libraryExport: 'default' // on veut que window.iepLoad soit une fct, pas window.iepLoad.default
    // ça c'est pour charger les chunks en cross-domain
    // crossOriginLoading: 'anonymous'
  },
  module: {
    rules: [
      // js
      { test: /src\/.+\.js$/, loader: 'babel-loader', options: babelOptions },
      // pour les css y'en a tellement peu qu'on l'extrait pas
      {
        test: /\.css$/,
        rules: [
          { loader: 'style-loader' },
          { loader: 'css-loader' }
        ]
      },
      // et le statique
      { test: /\.(jpe?g|png|gif)(\?\S*)?$/, loader: 'url-loader', options: { limit: 10000 } },
      { test: /\.svg(\?\S*)?$/, loader: 'url-loader', options: { mimetype: 'image/svg+xml', limit: 10000 } },
      { test: /\.ttf(\?\S*)?$/, loader: 'url-loader', options: { mimetype: 'application/octet-stream', limit: 10000 } },
      { test: /\.woff2?(\?\S*)?$/, loader: 'url-loader', options: { mimetype: 'application/font-woff', limit: 10000 } }
    ]
  },
  optimization: {
    // par défaut c'est true en dev et false en prod, modifier pour trouver l'origine d'un plantage de build en prod
    emitOnErrors: false
  },
  stats: {
    // indique l'heure de build, très utile en mode watch
    builtAt: true,
    // Nice colored output
    colors: true
  },
  // Create Sourcemaps for the bundle
  devtool: 'source-map' // même en prod
}

// on vide le dossier de build, on fait ça à la main ici (clean-webpack-plugin semble s'arrêter à webpack3
// et de toute façon on va copier iepLoad dans build ici, donc avant que webpack ne digère la conf qu'on exporte)
try {
  const buildDir = path.resolve(__dirname, 'build')
  if (fs.existsSync(buildDir)) {
    fs.readdirSync(buildDir).forEach(file => fs.unlinkSync(path.resolve(buildDir, file)))
    console.log(buildDir, 'vidé')
  } else {
    fs.mkdirSync(buildDir)
    console.log(buildDir, 'créé')
  }
} catch (error) {
  console.error(error)
  console.log('La suppression des anciens fichiers de build a planté mais on continue la compilation')
}
// on copie le preLoad en y ajoutant le timestamp dans son source
const srcFile = path.resolve(__dirname, 'src', 'iepLoad.js')
const dstFile = path.resolve(__dirname, 'build', 'iepLoad.js')
const srcContent = fs.readFileSync(srcFile, { encoding: 'utf8' }) // faut préciser encoding pour récupérer une string
const iepLoadContent = srcContent.replace(/var timestamp = '[^']*'/, `var timestamp = '${Math.round(Date.now() / 1000)}'`)
fs.writeFileSync(dstFile, iepLoadContent)
console.log('iepLoad.js copié dans build (avec timestamp ajouté)')

// on ajoute la minification pour la prod
if (isProd) {
  // on minifie
  conf.optimization.minimize = true
  conf.optimization.minimizer = [new TerserPlugin({
    // https://webpack.js.org/plugins/terser-webpack-plugin/
    // https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
    parallel: true,
    // par défaut il laisse N fois les commentaires identiques (avec @licence) dans le fichier minifié
    // on ne veut pas extraire les commentaires dans un fichier .LICENSE séparé,
    // seulement n'en garder qu'un, d'où le output.comments ci-dessous
    extractComments: false,
    // sourceMap: true, // Must be set to true if using source-maps
    // pour terserOptions cf https://github.com/terser-js/terser#minify-options
    terserOptions: {
      output: {
        // les seuls qu'on garde dans le fichier minifié
        // https://github.com/webpack-contrib/terser-webpack-plugin#preserve-comments
        // Attention, la chaîne passée à la regex démarre après "/*" (ou //)
        comments: /^\**!/
      },
      // https://github.com/webpack-contrib/terser-webpack-plugin#warningsfilter
      // avec 'verbose' c'est vraiment très verbeux, avec plein de warning qui n'en sont pas vraiment
      // (par ex il vire une variable utilisée une seule fois sur la ligne suivante,
      // mais c'est souvent fait exprès et bienvenu pour la lisibilité)
      // warnings: 'verbose'
      warnings: true
    }
  })]

  // et on minimise notre dstFile
  const dstFileMin = dstFile.replace(/js$/, jsSuffix)
  const dstFileMinBase = path.basename(dstFileMin)
  // cf https://github.com/terser/terser#api-reference
  minify(iepLoadContent, {
    output: {
      comments: false
    },
    // cf https://github.com/terser/terser#source-map-options
    sourceMap: {
      filename: dstFileMinBase,
      url: dstFileMinBase + '.map'
    }
  }).then(({ code, map }) => {
    fs.writeFileSync(dstFileMin, code)
    fs.writeFileSync(dstFileMin + '.map', map)
    console.log('iepLoad.js minifié dans build')
  }).catch(console.error)
}

// faut cloner à chaque niveau modifé pour pas répercuter les affectations sur conf
// on pourrait utiliser le module webpack-merge pour ça mais un module de plus pour si peu…
const moduleConf = {
  ...conf,
  entry: {
    // on veut pas compiler de nouveau les entrées es5, seulement cette version en module
    iepLoad: ['./src/iepLoad.module.js']
  },
  output: {
    ...conf.output,
    filename: `[name].module.${jsSuffix}`
  },
  module: {
    ...conf.module,
    rules: conf.module.rules.map(rule => {
      // on ne modifie que les regles avec babel-loader
      if (rule.loader === 'babel-loader') return { ...rule, options: babelOptionsModule }
      return rule
    })
  }
} // moduleConf

if (isDevServer) {
  // on ajoute notre script de dev
  moduleConf.entry.dev = ['./devServer/index.js']
  // les options devServer
  moduleConf.devServer = {
    // pour que localhost:8080 serve devServer/index.html
    contentBase: path.join(__dirname, 'devServer'),
    disableHostCheck: true, // au cas où host ne serait pas dans les dns
    hot: true,
    host,
    inline: true,
    open: true,
    port
  }
  console.log('mode devServer avec ', moduleConf.devServer)
  // pas la peine de faire 2 compils en live avec devServer, on utilise que la version module
  module.exports = moduleConf
} else {
  // https://webpack.js.org/configuration/configuration-types/#exporting-multiple-configurations
  module.exports = [conf, moduleConf]
}
