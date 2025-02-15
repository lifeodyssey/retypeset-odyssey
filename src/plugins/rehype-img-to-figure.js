import { visit } from 'unist-util-visit'

export function rehypeImgToFigure() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'p' || !node.children)
        return

      const child = node.children[0]
      if (!child || child.tagName !== 'img')
        return

      const altText = child.properties.alt
      if (!altText)
        return

      node.tagName = 'figure'
      node.children = [
        child,
        {
          type: 'element',
          tagName: 'figcaption',
          properties: {},
          children: [{ type: 'text', value: altText }],
        },
      ]

      child.properties.alt = ''
    })
  }
}
