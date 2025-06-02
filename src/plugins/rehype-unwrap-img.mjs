import { visit } from 'unist-util-visit'

export function rehypeUnwrapImg() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (
        node.tagName !== 'p'
        || !node.children?.length
        || !parent
      ) {
        return
      }

      const allImgOrEmptyText = node.children.every(child =>
        child.tagName === 'img'
        || (child.type === 'text' && child.value.trim() === ''),
      )

      if (!allImgOrEmptyText)
        return

      const imgNodes = node.children.filter(child => child.tagName === 'img')
      if (imgNodes.length > 0) {
        parent.children.splice(index, 1, ...imgNodes)
      }
    })
  }
}
