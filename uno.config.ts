import type { Theme } from 'unocss/preset-uno'
import type { ThemeConfig } from './src/types'
import {
  defineConfig,
  presetAttributify,
  presetTypography,
  presetUno,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'
import presetTheme from 'unocss-preset-theme'
import { themeConfig } from './src/config'

const { light, dark }: {
  light: ThemeConfig['color']['light']
  dark: ThemeConfig['color']['dark']
} = themeConfig.color

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetTypography(),
    presetTheme<Theme>({
      theme: {
        dark: {
          colors: dark,
        },
      },
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
  theme: {
    colors: light,
    fontFamily: {
      title: ['Snell-Black', 'EarlySummer', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      date: ['Snell-Bold', 'EarlySummer', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      serif: ['STIX', 'EarlySummer', 'Georgia', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      italic: ['STIX-italic', 'EarlySummer', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      custom: ['EarlySummer-custom', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      mono: ['Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
    },
  },
  shortcuts: {
    'blog-container': 'max-w-3xl mx-auto px-4',
  },
  rules: [
    // grid-[1_2]-[3_4]
    [/^grid-(\d+|\[.+?\])-(\d+|\[.+?\])$/, ([, rows, cols]) => {
      const isColsBracket = cols.startsWith('[') && cols.endsWith(']')
      const isRowsBracket = rows.startsWith('[') && rows.endsWith(']')
      return {
        'display': 'grid',
        'grid-template-rows': isRowsBracket
          ? rows.slice(1, -1).replace(/_/g, ' ')
          : `repeat(${rows}, 1fr)`,
        'grid-template-columns': isColsBracket
          ? cols.slice(1, -1).replace(/_/g, ' ')
          : `repeat(${cols}, 1fr)`,
      }
    }],
    // (lg:)area-1-2-3-4
    [/^area-(\d+)-(\d+)-(\d+)-(\d+)$/, ([, Xstart, Ystart, Xend, Yend]) => ({
      'grid-area': `${Xstart} / ${Ystart} / ${Xend} / ${Yend}`,
    })],
  ],
})
