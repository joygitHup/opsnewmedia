import type { PlatformType } from '@/types';

/** 内容模板：从模板创建草稿时直接带入标题/正文/标签/目标平台 */
export interface ContentTemplate {
  id: string;
  category: TemplateCategory;
  name: string;
  description: string;
  title: string;
  contentMd: string;
  tags: string[];
  platforms: PlatformType[];
}

export type TemplateCategory =
  | 'product'
  | 'knowledge'
  | 'marketing'
  | 'lifestyle'
  | 'industry';

export const TEMPLATE_CATEGORIES: { value: TemplateCategory | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'product', label: '产品推广' },
  { value: 'knowledge', label: '知识科普' },
  { value: 'marketing', label: '活动营销' },
  { value: 'lifestyle', label: '日常种草' },
  { value: 'industry', label: '行业资讯' },
];

export const CONTENT_TEMPLATES: ContentTemplate[] = [
  {
    id: 'product-launch',
    category: 'product',
    name: '新品上市发布',
    description: '卖点清晰、节奏紧凑，适合公众号长图文与知乎',
    title: '【新品首发】{产品名} 正式上线，这 3 个亮点值得关注',
    contentMd: `# {产品名} 正式上线

## 为什么做这款产品

{用一两句话描述目标用户和痛点}

## 三大核心亮点

1. **亮点一：{填写核心功能}**
   {具体说明带来的价值，尽量用场景化描述}

2. **亮点二：{填写差异化优势}**
   {与同类方案对比，突出不同}

3. **亮点三：{填写体验提升}**
   {用数据或细节增强可信度}

## 适合谁使用

- {目标人群 1}
- {目标人群 2}

## 限时福利

首发期间 {优惠政策}，点击文末链接即可体验。

---
*（发布前请把 {} 占位内容替换为真实信息）*`,
    tags: ['新品发布', '产品测评'],
    platforms: ['wechat_mp', 'zhihu'],
  },
  {
    id: 'product-compare',
    category: 'product',
    name: '产品对比测评',
    description: '客观对比建立信任，适合小红书/知乎',
    title: '{产品A} vs {产品B}｜真实使用一周后，我更推荐这一个',
    contentMd: `# {产品A} 和 {产品B} 怎么选？

先说结论：**{一句话结论}**。

## 对比维度

| 维度 | {产品A} | {产品B} |
| --- | --- | --- |
| 价格 |  |  |
| 核心功能 |  |  |
| 使用门槛 |  |  |
| 适合人群 |  |  |

## 我的真实体验

{分 2-3 段描述使用场景与感受}

## 购买建议

- 如果你 {情况一}，选 {产品A}
- 如果你 {情况二}，选 {产品B}`,
    tags: ['好物测评', '选购指南'],
    platforms: ['xiaohongshu', 'zhihu'],
  },
  {
    id: 'knowledge-howto',
    category: 'knowledge',
    name: '干货教程',
    description: '步骤清晰的 How-to 结构，收藏率高',
    title: '{主题}保姆级教程：从 0 到 1，看这一篇就够了',
    contentMd: `# {主题}保姆级教程

## 先看效果

{描述完成后能达到的效果}

## 准备工作

- {工具/账号/素材 1}
- {工具/账号/素材 2}

## 详细步骤

### 第一步：{步骤名}

{操作说明 + 注意事项}

### 第二步：{步骤名}

{操作说明}

### 第三步：{步骤名}

{操作说明}

## 常见问题

**Q：{典型问题}**
A：{解答}

## 最后

{总结 + 引导关注/收藏}`,
    tags: ['干货分享', '教程'],
    platforms: ['zhihu', 'wechat_mp', 'xiaohongshu'],
  },
  {
    id: 'knowledge-myth',
    category: 'knowledge',
    name: '认知误区科普',
    description: '反常识开头抓注意力，适合视频号脚本改写',
    title: '关于{主题}，90% 的人都搞错了这几件事',
    contentMd: `# 关于{主题}的 {N} 个误区

## 误区一：{常见错误认知}

事实是：{正确解释}

## 误区二：{常见错误认知}

{给出依据与原理}

## 误区三：{常见错误认知}

{正确做法是什么}

## 写在最后

{一句话总结核心观点，引导转发}`,
    tags: ['科普', '避坑指南'],
    platforms: ['wechat_mp', 'douyin'],
  },
  {
    id: 'marketing-festival',
    category: 'marketing',
    name: '节日促销活动',
    description: '限时利益点突出，适合全平台同步',
    title: '{节日/活动名}福利来了：{利益点}，仅限 {时间}',
    contentMd: `# {活动名} 限时开启

## 活动时间

{开始时间} - {结束时间}

## 活动福利

1. **{福利一}**：{说明}
2. **{福利二}**：{说明}
3. **{福利三}**：{说明}

## 参与方式

{步骤一} → {步骤二} → {步骤三}

## 温馨提示

{使用规则 / 名额限制等说明}`,
    tags: ['限时活动', '福利'],
    platforms: ['wechat_mp', 'weibo', 'xiaohongshu'],
  },
  {
    id: 'marketing-livestream',
    category: 'marketing',
    name: '直播预告',
    description: '时间、福利、预约引导三段式',
    title: '直播预告｜{日期} {主题}，直播间专属 {福利}',
    contentMd: `# {日期} 直播预告

## 直播讲什么

- {话题一}
- {话题二}
- {话题三}

## 直播间专属福利

- {福利一}
- {福利二}

## 怎么参加

{预约/进入路径说明}

⏰ 时间：{具体时间}
📍 地点：{直播间入口}

记得点预约，开播不错过！`,
    tags: ['直播预告'],
    platforms: ['douyin', 'xiaohongshu', 'weibo'],
  },
  {
    id: 'lifestyle-daily',
    category: 'lifestyle',
    name: '日常种草分享',
    description: '真实口吻 + 清单体，小红书风格',
    title: '近期爱用分享｜{数量} 个提升幸福感的小东西',
    contentMd: `# 近期爱用清单 🌿

最近挖到几个真的好用的东西，忍不住来分享～

## 1. {物品名}

{使用感受，突出具体场景}
💰 参考价格：{}
推荐指数：⭐⭐⭐⭐⭐

## 2. {物品名}

{使用感受}

## 3. {物品名}

{使用感受}

---

以上都是自费使用后的真实感受，姐妹们理性种草～
#好物分享 #生活方式`,
    tags: ['好物分享', '爱用物'],
    platforms: ['xiaohongshu', 'weibo'],
  },
  {
    id: 'industry-news',
    category: 'industry',
    name: '行业资讯解读',
    description: '资讯 + 观点，建立专业形象',
    title: '{事件/政策} 意味着什么？一文读懂对 {行业} 的影响',
    contentMd: `# {事件} 深度解读

## 事件回顾

{用 3-5 句话交代背景与关键信息}

## 为什么值得关注

{分析事件的关键节点}

## 对 {行业} 的三个影响

1. {影响一 + 解释}
2. {影响二 + 解释}
3. {影响三 + 解释}

## 普通人/从业者该怎么做

- {建议一}
- {建议二}

## 结语

{给出你的判断，保持客观留有余地}`,
    tags: ['行业解读', '深度分析'],
    platforms: ['wechat_mp', 'zhihu', 'weibo'],
  },
];
