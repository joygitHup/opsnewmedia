'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Quote,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Link,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
  Eye,
  Code2,
  Send,
  Save,
  Clock,
  Sparkles,
  Wand2,
  Expand,
  ChevronDown,
  X,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { PLATFORM_CONFIG, type PlatformType } from '@/types';

const platforms: PlatformType[] = ['wechat', 'xiaohongshu', 'douyin', 'zhihu', 'weibo', 'bilibili'];

const defaultContent = `# 欢迎使用稿定分发编辑器

这是一个支持 **Markdown** 的富文本编辑器，你可以在这里创作内容，然后一键分发到多个平台。

## 功能特点

- ✨ 支持 **富文本** 和 *Markdown* 两种编辑模式
- 📱 实时预览各平台显示效果
- 🤖 AI 辅助写作，智能润色
- 🚀 一键发布到多个平台

## 代码示例

\`\`\`javascript
const hello = "Hello World";
console.log(hello);
\`\`\`

## 引用

> 好的内容是成功的一半。
> —— 某位智者

## 列表

### 无序列表
- 第一项
- 第二项
- 第三项

### 有序列表
1. 第一步
2. 第二步
3. 第三步

---

*开始你的创作之旅吧！*
`;

// 简易 Markdown 渲染
function renderMarkdown(text: string): string {
  let html = text
    // 代码块
    .replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre class="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-4 overflow-x-auto text-sm font-mono"><code>$2</code></pre>')
    // 标题
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mt-6 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
    // 粗体和斜体
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 行内代码
    .replace(/`([^`]+)`/g, '<code class="bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono text-pink-600">$1</code>')
    // 引用
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-zinc-300 dark:border-zinc-600 pl-4 italic text-zinc-600 dark:text-zinc-400 my-3">$1</blockquote>')
    // 分割线
    .replace(/^---$/gm, '<hr class="my-6 border-zinc-200 dark:border-zinc-700" />')
    // 无序列表
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
    // 有序列表
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
    // 链接
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-indigo-600 hover:underline" target="_blank">$1</a>')
    // 换行
    .replace(/\n\n/g, '</p><p class="my-3">')
    .replace(/\n/g, '<br />');

  return `<p class="my-3">${html}</p>`;
}

export default function EditorPage() {
  const [title, setTitle] = useState('2024年最值得关注的10个AI工具，效率提升200%');
  const [content, setContent] = useState(defaultContent);
  const [mode, setMode] = useState<'markdown' | 'preview' | 'split'>('split');
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformType[]>(['wechat', 'xiaohongshu']);
  const [tags, setTags] = useState<string[]>(['AI', '效率工具', '干货分享']);
  const [tagInput, setTagInput] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setLastSaved(new Date().toLocaleTimeString());
    }, 500);
  };

  // 自动保存
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSave();
    }, 3000);
    return () => clearTimeout(timer);
  }, [title, content]);

  const insertMarkdown = (before: string, after: string = '') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = content.substring(0, start) + before + selectedText + after + content.substring(end);
    setContent(newText);
    setTimeout(() => {
      textarea.focus();
      textarea.selectionStart = start + before.length;
      textarea.selectionEnd = start + before.length + selectedText.length;
    }, 0);
  };

  const togglePlatform = (platform: PlatformType) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleAIGenerate = () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setTimeout(() => {
      const aiContent = `\n\n## AI 生成内容\n\n${aiPrompt}\n\n这是一段由 AI 生成的示例内容。在实际使用中，这里会根据你的需求生成高质量的文案。\n\n**核心要点：**\n- 要点一：详细说明\n- 要点二：详细说明\n- 要点三：详细说明\n\n希望这段内容对你有帮助！\n`;
      setContent(content + aiContent);
      setAiLoading(false);
      setShowAIDialog(false);
      toast.success('AI 内容已生成并插入到文章末尾');
    }, 1500);
  };

  const handlePublish = () => {
    toast.success('已提交发布任务，正在处理中...');
    setShowPublishDialog(false);
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">内容创作</h1>
          </div>
          {lastSaved && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              {saving ? (
                <>
                  <div className="w-3 h-3 border-2 border-zinc-300 border-t-zinc-500 rounded-full animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-3 h-3" />
                  已保存于 {lastSaved}
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSave}>
            <Save className="w-4 h-4 mr-1.5" />
            保存草稿
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAIDialog(true)}
            className="border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950/50"
          >
            <Sparkles className="w-4 h-4 mr-1.5" />
            AI 写作
          </Button>
          <Button
            onClick={() => setShowPublishDialog(true)}
            size="sm"
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
          >
            <Send className="w-4 h-4 mr-1.5" />
            发布
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        {/* 主编辑区 */}
        <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* 标题输入 */}
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入文章标题"
              className="text-xl font-bold border-none h-10 px-0 focus-visible:ring-0 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
            />
            {/* 标签 */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="gap-1 pr-1 h-6 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  onClick={() => removeTag(tag)}
                >
                  #{tag}
                  <X className="w-3 h-3" />
                </Badge>
              ))}
              <div className="flex items-center">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="添加标签"
                  className="w-24 h-6 text-xs border-none bg-transparent px-1 focus-visible:ring-0"
                />
              </div>
            </div>
          </div>

          {/* 工具栏 */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-0.5">
              <button
                onClick={() => insertMarkdown('**', '**')}
                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
                title="粗体"
              >
                <Bold className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertMarkdown('*', '*')}
                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
                title="斜体"
              >
                <Italic className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertMarkdown('<u>', '</u>')}
                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
                title="下划线"
              >
                <Underline className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertMarkdown('~~', '~~')}
                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
                title="删除线"
              >
                <Strikethrough className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />
              <button
                onClick={() => insertMarkdown('# ')}
                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
                title="一级标题"
              >
                <Heading1 className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertMarkdown('## ')}
                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
                title="二级标题"
              >
                <Heading2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertMarkdown('### ')}
                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
                title="三级标题"
              >
                <Heading3 className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />
              <button
                onClick={() => insertMarkdown('- ')}
                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
                title="无序列表"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertMarkdown('1. ')}
                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
                title="有序列表"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertMarkdown('> ')}
                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
                title="引用"
              >
                <Quote className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertMarkdown('```\n', '\n```')}
                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
                title="代码块"
              >
                <Code className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />
              <button
                onClick={() => insertMarkdown('![图片描述](图片链接)')}
                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
                title="插入图片"
              >
                <Image className="w-4 h-4" />
              </button>
              <button
                onClick={() => insertMarkdown('[链接文字](链接地址)')}
                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
                title="插入链接"
              >
                <Link className="w-4 h-4" />
              </button>
              <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 mx-1" />
              <button
                onClick={() => document.execCommand('undo')}
                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
                title="撤销"
              >
                <Undo className="w-4 h-4" />
              </button>
              <button
                onClick={() => document.execCommand('redo')}
                className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
                title="重做"
              >
                <Redo className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-0.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md p-0.5">
              <Button
                variant={mode === 'markdown' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setMode('markdown')}
              >
                <Code2 className="w-3.5 h-3.5 mr-1" />
                编辑
              </Button>
              <Button
                variant={mode === 'split' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setMode('split')}
              >
                <Expand className="w-3.5 h-3.5 mr-1" />
                分屏
              </Button>
              <Button
                variant={mode === 'preview' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setMode('preview')}
              >
                <Eye className="w-3.5 h-3.5 mr-1" />
                预览
              </Button>
            </div>
          </div>

          {/* 编辑/预览区 */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {(mode === 'markdown' || mode === 'split') && (
              <div className={`flex-1 flex flex-col min-h-0 ${mode === 'split' ? 'border-r border-zinc-100 dark:border-zinc-800' : ''}`}>
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="flex-1 p-4 font-mono text-sm resize-none border-none focus-visible:ring-0 rounded-none text-zinc-800 dark:text-zinc-200 leading-relaxed"
                  placeholder="开始写作..."
                />
              </div>
            )}
            {(mode === 'preview' || mode === 'split') && (
              <div className="flex-1 overflow-auto p-6">
                <article
                  className="prose prose-zinc dark:prose-invert max-w-none text-zinc-800 dark:text-zinc-200 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
                />
              </div>
            )}
          </div>
        </Card>

        {/* 右侧预览面板 */}
        <Card className="w-80 flex-shrink-0 flex flex-col overflow-hidden hidden lg:flex">
          <CardHeader className="pb-2 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
            <CardTitle className="text-sm font-semibold">平台预览</CardTitle>
            <CardDescription className="text-xs">查看各平台显示效果</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-3">
            <Tabs defaultValue="wechat" className="w-full">
              <TabsList className="w-full grid grid-cols-3 mb-3">
                {selectedPlatforms.slice(0, 6).map((p) => (
                  <TabsTrigger key={p} value={p} className="text-xs h-7 px-1">
                    <div
                      className="w-2 h-2 rounded-full mr-1"
                      style={{ backgroundColor: PLATFORM_CONFIG[p].color }}
                    />
                    {PLATFORM_CONFIG[p].name}
                  </TabsTrigger>
                ))}
              </TabsList>
              {selectedPlatforms.map((platform) => (
                <TabsContent key={platform} value={platform} className="mt-0">
                  <div className="border rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
                    {/* 模拟手机顶部 */}
                    <div
                      className="h-8 flex items-center justify-center text-xs text-white"
                      style={{ backgroundColor: PLATFORM_CONFIG[platform].color }}
                    >
                      {PLATFORM_CONFIG[platform].name}
                    </div>
                    <div className="p-3 max-h-96 overflow-auto">
                      <h3 className="font-bold text-sm mb-2 text-zinc-900 dark:text-zinc-100 line-clamp-2">
                        {title}
                      </h3>
                      <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-[12]">
                        {content.replace(/[#*`>_\-]/g, '').slice(0, 200)}...
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="text-[10px] text-indigo-500">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* 发布弹窗 */}
      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent className="sm:max-w-xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>发布内容</DialogTitle>
            <DialogDescription>选择发布平台并设置发布参数</DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* 选择平台 */}
            <div>
              <Label className="text-sm font-medium mb-2 block">选择发布平台</Label>
              <div className="grid grid-cols-3 gap-2">
                {platforms.map((platform) => {
                  const config = PLATFORM_CONFIG[platform];
                  const selected = selectedPlatforms.includes(platform);
                  return (
                    <button
                      key={platform}
                      onClick={() => togglePlatform(platform)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all ${
                        selected
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50'
                          : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: config.color }}
                      >
                        {config.name.slice(0, 1)}
                      </div>
                      <span className="text-xs font-medium">{config.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 发布设置 */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">发布设置</Label>
              <div className="space-y-3 p-4 border rounded-lg bg-zinc-50 dark:bg-zinc-900/50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">定时发布</div>
                    <div className="text-xs text-zinc-500">设置指定时间自动发布</div>
                  </div>
                  <Switch />
                </div>
                <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">错峰发布</div>
                    <div className="text-xs text-zinc-500">按各平台流量高峰时段错开发布</div>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">失败自动重试</div>
                    <div className="text-xs text-zinc-500">发布失败时自动重试最多 3 次</div>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </div>

            {/* 差异化设置提示 */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="text-sm font-medium text-amber-800 dark:text-amber-400 flex items-center gap-2">
                <Wand2 className="w-4 h-4" />
                智能适配已开启
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
                系统将根据各平台特性自动调整标题、排版和图片尺寸。你也可以在下方为每个平台单独设置。
              </p>
            </div>
          </div>

          <DialogFooter className="flex justify-between">
            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>
              取消
            </Button>
            <div className="flex gap-2">
              <Button variant="outline">
                <Clock className="w-4 h-4 mr-1.5" />
                保存定时
              </Button>
              <Button
                onClick={handlePublish}
                className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
              >
                <Send className="w-4 h-4 mr-1.5" />
                立即发布
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI 写作弹窗 */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              AI 智能写作
            </DialogTitle>
            <DialogDescription>
              告诉 AI 你想写什么，让它帮你生成优质内容
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium mb-2 block">写作需求</Label>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="例如：写一篇关于AI工具的推荐文章，介绍5个实用的AI工具..."
                className="h-32 resize-none"
              />
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">快捷指令</Label>
              <div className="flex flex-wrap gap-2">
                {['润色现有文章', '扩写内容', '生成标题', '写开头', '写结尾', '添加案例'].map(
                  (cmd) => (
                    <Button
                      key={cmd}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => setAiPrompt(cmd)}
                    >
                      {cmd}
                    </Button>
                  )
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAIDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleAIGenerate}
              disabled={aiLoading || !aiPrompt.trim()}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
            >
              {aiLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  生成内容
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
