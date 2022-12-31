export default {
  customVirtualKeyboardLayers: {
    college: {
      styles: '',
      rows: [
        [
          // {
          //   class: 'keycap tex',
          //   latex: '\\lt',
          // },
          {
            class: 'keycap tex',
            label: '<i>a</i>',
          },
          {
            class: 'keycap tex',
            label: '<i>x</i>',
          },
          {
            class: 'separator w5',
          },
          {
            class: 'keycap',
            latex: '7',
          },
          {
            class: 'keycap',
            latex: '8',
          },
          {
            class: 'keycap',
            latex: '9',
          },
          {
            class: 'keycap',
            latex: '\\div ',
          },
          {
            class: 'separator w5',
          },
          {
            class: 'keycap tex',
            insert: '$$#@^{2}$$',
            latex: '$${#0}^{2}$$',
          },
          {
            class: 'keycap tex',
            insert: '$$#@^{#0}$$',
            latex:'x^\\placeholder'
          },
          {
            class: 'keycap tex small',
            insert: '$$\\sqrt{#0}$$',
            latex: '\\sqrt{#0}',
          },
        ],
        [
          // {
          //   class: 'keycap tex',
          //   latex: '\\gt',
          // },
          {
            class: 'keycap tex',
            label: '<i>b</i>',
          },
          {
            class: 'keycap tex',
            label: '<i>y</i>',
          },
          {
            class: 'separator w5',
          },

          {
            class: 'keycap',
            latex: '4',
          },
          {
            class: 'keycap',
            latex: '5',
          },
          {
            class: 'keycap',
            latex: '6',
          },
          {
            class: 'keycap',
            latex: '\\times ',
          },
          {
            class: 'separator w5',
          },
          {
            class: 'keycap',
            latex:'\\frac{#0}{#0}'
          },
          {
            class: 'separator w6',
          },
          {
            class: 'separator w6',
          },
        ],
        [
          // {
          //   class: 'keycap tex',
          //   latex: '\\le',
          // },
          {
            class: 'keycap tex',
            label: '<i>c</i>',
          },
          {
            class: 'keycap tex',
            label: '<i>z</i>',
          },
          {
            class: 'separator w5',
          },

          {
            class: 'keycap',
            latex: '1',
          },
          {
            class: 'keycap',
            latex: '2',
          },
          {
            class: 'keycap',
            latex: '3',
          },
          {
            class: 'keycap',
            latex: '-',
          },
          {
            class: 'separator w5',
          },
          {
            class: 'latex',
            label: '<b>\u2423</b>',
            insert: '\\,',
            // latex:'\\,'
          },
         
          {
            // class: 'action font-glyph bottom right',
            command: ['performWithFeedback', 'deleteBackward'],
            // label: '<b>&#x232b;</b>',
            class: 'action svg-glyph',
            // command: ["performWithFeedback","moveToPreviousChar"],
            label:"<svg><use xlink:href='#svg-delete-backward' /></svg>"
          },
          {
            class: 'separator w6',
          },
        ],
        [
          // {
          //   class: 'keycap tex',
          //   latex: '\\ge',
          // },
          {
            class: 'keycap tex',
            label: '(',
          },
          {
            class: 'keycap tex',
            label: ')',
          },

          {
            class: 'separator w5',
          },
          {
            class: 'keycap',
            latex: '0',
          },
          {
            class: 'keycap',
            latex: ',',
          },
          {
            class: 'keycap tex',
            latex: '\\pi',
          },
          {
            class: 'keycap',
            latex: '+',
          },
          {
            class: 'separator w5',
          },
          {
            class: 'action svg-glyph',
            command: ["performWithFeedback","moveToPreviousChar"],
            label:"<svg><use xlink:href='#svg-arrow-left' /></svg>"
          },
          {
            class: 'action svg-glyph',
            command: ["performWithFeedback","moveToNextChar"],
            label:"<svg><use xlink:href='#svg-arrow-right' /></svg>"
          },
          {
            class: 'action svg-glyph',
            // label: '<b>\u23ce</b>',
            label:"<svg><use xlink:href='#svg-commit' /></svg>",
            command: ["performWithFeedback", "commit"]
          },
        ],
      ],
    },
  },
  customVirtualKeyboards: {
    college: {
      label: 'college',
      tooltip: 'college keyboard',
      layer: 'college',
    },
  },
  virtualKeyboards: 'college',
}
