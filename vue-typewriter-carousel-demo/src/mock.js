import { parseMarkdown } from './markdown.js'

export const images = '<img src="/images/mountain.svg" alt="山间日落"> <img src="/images/sea.svg" alt="海边晴天">'

export const markdownSource = `
# 轮播测试

## 测试用例

### 无序列表：两格缩进正确，插槽放错仍会跑出去

- 推荐旅行照片


  ${images}


  这句话和轮播应该属于同一个 li。
- 第二组照片


  ${images}


  这是第二个列表项的轮播。

### 10. 有序列表：两格缩进不够，先修 Markdown

10. 推荐旅行照片
`

export const markdown = parseMarkdown(markdownSource)
