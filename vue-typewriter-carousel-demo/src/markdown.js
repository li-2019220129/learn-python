import MarkdownIt from 'markdown-it'

const parser = new MarkdownIt({ html: true })

export function parseMarkdown(markdown) {
  return new DOMParser().parseFromString(parser.render(markdown), 'text/html').body
}

export function groupImageNodes(nodes) {
  const groups = []
  let pending = []

  function flush() {
    if (pending.length) groups.push({ nodes: pending })
    pending = []
  }

  function isImage(node) {
    return node.nodeType === 1 && node.tagName === 'IMG' && node.getAttribute('src')?.trim()
  }

  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    if (!isImage(node)) {
      pending.push(node)
      continue
    }
    let end = index + 1
    const images = [node]
    while (end < nodes.length) {
      const next = nodes[end]
      if (isImage(next)) images.push(next)
      else if (next.nodeType !== 3 || next.textContent.trim()) break
      end += 1
    }
    if (images.length < 2) {
      pending.push(node)
      continue
    }
    flush()
    groups.push({
      images: images.map(image => ({
        src: image.getAttribute('src'),
        alt: image.getAttribute('alt') || '',
      })),
    })
    index = end - 1
  }
  flush()
  return groups
}
