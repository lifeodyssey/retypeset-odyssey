import type { Theme } from 'unocss/preset-uno'
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

const { light, dark } = themeConfig.color

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
  theme: {
    colors: light,
    fontFamily: {
      title: ['Snell-Black', 'EarlySummer', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      date: ['Snell-Bold', 'EarlySummer', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      serif: ['STIX', 'EarlySummer', 'Georgia', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      italic: ['STIX-italic', 'EarlySummer', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      custom: ['EarlySummer-custom', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
    },
  },
  shortcuts: [],
  rules: [],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
})
