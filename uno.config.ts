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
      title: ['Snell-Black', 'EarlySummer-subset', 'EarlySummer', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      navbar: ['STIX-italic', 'EarlySummer-subset', 'EarlySummer', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      time: ['Snell-Bold', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
      serif: ['STIX', 'EarlySummer', 'Georgia', 'ui-serif', 'Georgia', 'Cambria', 'Times New Roman', 'Times', 'serif'],
    },
  },
  shortcuts: {
    'underline-animation': [
      'relative',
      'after:content-empty',
      'after:absolute',
      'after:left-0',
      'after:bottom--1',
      'after:w-full',
      'after:h-0.4',
      'after:bg-secondary',
      'after:scale-x-0',
      'after:origin-right',
      'after:transition-transform',
      'after:duration-300',
      'after:ease-out',
      'hover:after:scale-x-100',
      'hover:after:origin-left',
      'transition-ready',
      '[&.force-leave]:after:scale-x-0',
      '[&.force-leave]:after:origin-right',
    ],
  },
  rules: [],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
})
