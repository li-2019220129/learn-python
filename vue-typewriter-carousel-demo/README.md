# Vue 打字机 + Markdown 多图插槽复现

默认场景已替换为用户提供的完整测试用例。src/mock.js 导出原始字符串 markdownSource，以及 parseMarkdown(markdownSource) 得到的 DOM body（markdown）。打字机接受原始字符串，不接受 DOM body。

重要区别：这个用例的图片前后没有空白行。实测 markdown-it 将两组未缩进的图片都保留在各自 li 中，属于段落的延续行。因此“图片没有缩进就一定不在 li 内”并不成立。裸 <img> 无 src，保留但不计入轮播图片。最后的 10. 列表没有图片，仅验证有序列表解析。

## 运行

需要 Node.js 22.12+（当前环境使用 22.17）。

```powershell
cd C:\workspace\learn-python\vue-typewriter-carousel-demo
npm install
npm run dev
```

打开终端显示的本地地址。点击“立即完成”，并切换四种场景。

```powershell
npm test
npm run build
```

## 复现的两类问题

1. **Markdown 层级正确，组件插槽位置错误**：无序列表两格缩进正确，原始图片在 li 中。但把图片抽到数组，并在文本容器末尾统一渲染 imgs 插槽，轮播 div 就变成列表的兄弟节点。增加空格无法修复组件挂载位置。
2. **Markdown 层级已经错误**：10. 有序列表仅用两格缩进，原始图片就不在 li 中。修复版保留原始位置，不会强行移动内容，必须先把 mock 缩进改成四格。

这是基于描述构造的最小复现，不代表已经确认你的现有组件采用了这套实现。真实项目需要检查 Markdown 解析后的 HTML、拆分图片组后的数据结构、以及实际调用 imgs 插槽的位置。

## #imgs 用法

```vue
<Typewriter :markdown="markdown" mode="fixed">
  <template #imgs="{ images, groupId }">
    <ImageCarousel :images="images" />
  </template>
</Typewriter>
```

## 为什么修复版有效

- Markdown 转换成 DOM 树，再递归生成 Vue VNode；ul/ol/li 的父子关系被保留。
- 多图段落在原位置调用 slots.imgs，而不是提取到全局数组后追加到根容器。
- 替换整个纯图片 p 段落，避免 p 内嵌 div。正确结构是 ul → li → div，div 不应直接放在 ul 下。
- 多组图片独立调用插槽，轮播索引互不影响；DOM 路径作为 key，在树结构不变时保留组件状态。
- 同一父节点下连续的两张及以上有效图片构成一组（允许空白文本间隔），支持紧凑 li 以及文字混排 p。遇到混排 p 会拆成文字 p 与轮播 div，保持有效结构。无 src 的 img 不加入轮播；链接包裹图片等需要扩展识别规则。

## 在现有组件中怎么改

若当前是“分割 HTML 为文本片段和图片片段，然后平铺渲染”，不要继续用正则把 ul/li 分成若干 HTML 字符串，分别 v-html 会重新解析不完整片段。建议保留 Markdown token/AST 的嵌套信息，递归渲染并在图片组节点处调用插槽。

本 Demo 用 DOMParser 做一个易读的过渡方案。真实组件若已经使用 token/AST，直接在原树中替换图片组节点更合理。

如果暂时必须保留 v-html，可在正确 li 里生成一个稳定的 div 占位容器，再通过 Vue Teleport 将轮播插槽挂到该容器中。应在 nextTick 后确保目标存在，使用每个组件实例与图片组独有的标识，并处理逐字重渲染删除目标的生命周期；不能在目标不存在时先 Teleport。相比之下，VNode/AST 方案更稳妥。

不要把 `<slot name="imgs">` 字符串塞进 v-html：v-html 内容不会被 Vue 模板编译，不能激活插槽或组件。

## 范围与安全

仅用于可信 mock。html: true、DOMParser、递归 VNode 都不是 HTML 清洗器。真实项目必须对不可信原始 HTML、事件属性、标签和 URL 做白名单/清洗，不能直接复用此信任策略。

打字机每次重新解析当前前缀，未完成标签会暂时作为文本或不完整 DOM 出现；这不是生产级增量 Markdown 解析器。测试覆盖逐字前缀、不完整标签、最终列表层级、轮播点击、重播与计时器清理。
