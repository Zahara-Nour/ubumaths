// Cf https://eslint.org/docs/latest/use/configure/
// et https://eslint.org/docs/latest/use/configure/migration-guide

import importNewlines from 'eslint-plugin-import-newlines'
import globals from 'globals'
import neostandard from 'neostandard'

export default [
  {
    plugins: { importNewlines },
    rules: {
      // https://github.com/SeinopSys/eslint-plugin-import-newlines#readme
      'importNewlines/enforce': [
        'error',
        {
          items: 1000,
          forceSingleLine: true,
          semi: false
        }
      ]
    },
  },
  {
    // les fichiers à ignorer (https://eslint.org/docs/latest/use/configure/ignore#ignoring-files)
    // ATTENTION : `only global ignores patterns can match directories`
    // => ça doit être précisé ici dans le premier objet de la config
    ignores: [
      'src/pwa/public/aide',
      '**/node_modules/',
      '**/brython/scripts/',
      '**/build/',
      '**/documentation/',
      '**/outilsExternes/',
      '**/tmp/'
    ]
  },
  // la conf standard (cf https://github.com/neostandard/neostandard)
  ...neostandard(),
  // notre conf générique
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        MathJax: 'readonly',
        ...globals.browser
      }
    },
    rules: {
      // ça c'est parce qu'on a plein de `Do not use 'new' for side effects` :-/
      'no-new': 'off'
    }
  },
  // et les overrides, pour les tests
  {
    files: ['test/**/*.test.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.mocha,
        ...globals.chai
      }
    },
    rules: {
      'no-unused-expressions': 'off'
    }
  },
  // override preload en es5
  {
    files: ['src/mtgLoad.preload.js'],
    languageOptions: {
      // indispensable pour es5
      sourceType: 'script',
      ecmaVersion: 5
    },
    rules: {
      'no-var': 'off',
      'prefer-const': 'off'
    }
  }
]
