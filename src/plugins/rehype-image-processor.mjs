import { visit } from 'unist-util-visit'

function createFigcaption(text) {
  return {
    type: 'element',
    tagName: 'figcaption',
    properties: {},
    children: [{ type: 'text', value: text }],
  }
}

function shouldConvertToFigure(node) {
  // Required paragraph must have single child
  if (node.children.length !== 1) {
    return false
  }

  // Required child must be an image element
  const imgNode = node.children[0]
  if (imgNode?.tagName !== 'img') {
    return false
  }

  // Required image must have alt text and not start with underscore
  const altText = imgNode.properties?.alt
  if (!altText || altText.startsWith('_')) {
    return false
  }

  return true
}

function convertToFigure(node) {
  const imgNode = node.children[0]
  const altText = imgNode.properties.alt

  // Convert paragraph to figure with caption
  node.tagName = 'figure'
  node.children = [imgNode, createFigcaption(altText)]
}

function unwrapImages(node, index, parent) {
  const imgNodes = []

  // Collect images, skip if non-image non-whitespace content found
  for (const child of node.children) {
    if (child.tagName === 'img') {
      imgNodes.push(child)
    }
    else if (child.type !== 'text' || child.value.trim() !== '') {
      return
    }
  }

  // Replace paragraph with unwrapped images
  if (imgNodes.length > 0) {
    parent.children.splice(index, 1, ...imgNodes)
  }
}

export function rehypeImageProcessor() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'p') {
        return
      }
      if (!node.children?.length) {
        return
      }
      if (!parent) {
        return
      }

      // Convert single image to figure
      if (shouldConvertToFigure(node)) {
        convertToFigure(node)
        return
      }

      // Unwrap images from paragraph
      unwrapImages(node, index, parent)
    })
  }
}
