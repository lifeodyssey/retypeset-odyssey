import type { AttributifyAttributes } from '@unocss/preset-attributify'

declare global {
  namespace astroHTML.JSX {
    interface HTMLAttributes extends AttributifyAttributes {}
  }
}

declare global {
  interface Document {
    startViewTransition: (callback: () => void) => void
  }
}

export {}
