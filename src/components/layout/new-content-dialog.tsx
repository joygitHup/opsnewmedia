'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid,
  Video,
  FileUp,
  Loader2,
  ClipboardPaste,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { contentApi } from '@/lib/api/content';
import {
  CONTENT_TEMPLATES,
  TEMPLATE_CATEGORIES,
  type ContentTemplate,
  type TemplateCategory,
} from '@/lib/content-templates';
import { useAuth } from '@/lib/auth/AuthProvider';
import { cn } from '@/lib/utils';

/** 从 Markdown/纯文本中提取标题与正文 */
function parseTitleAndBody(raw: string): { title: string; body: string } {
  const text = raw.replace(/^\uFEFF/, '').trim();
  const lines = text.split(/\r?\n/);
  // 优先取第一个 H1
  const h1Idx = lines.findIndex((l) => /^#\s+(.+)$/.test(l.trim()));
  if (h1Idx >= 0) {
    const title = lines[h1Idx].trim().replace(/^#\s+/, '').trim();
    const body = lines
      .filter((_, i) => i !== h1Idx)
      .join('\n')
      .trim();
    return { title: title.slice(0, 200), body };
  }
  // 否则第一行非空文本作为标题
  const firstIdx = lines.findIndex((l) => l.trim());
  if (firstIdx < 0) return { title: '', body: '' };
  const title = lines[firstIdx].trim().slice(0, 200);
  const body = lines
    .filter((_, i) => i !== firstIdx)
    .join('\n')
    .trim();
  return { title, body };
}

export function NewContentDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const { user } = useAuth();

  // 模板筛选
  const [tplCategory, setTplCategory] = useState<TemplateCategory | 'all'>('all');
  const [applyingTpl, setApplyingTpl] = useState<string | null>(null);

  // 导入
  const [importText, setImportText] = useState('');
  const [importName, setImportName] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filteredTemplates = useMemo(
    () =>
      tplCategory === 'all'
        ? CONTENT_TEMPLATES
        : CONTENT_TEMPLATES.filter((t) => t.category === tplCategory),
    [tplCategory],
  );

  const ensureTeam = (): boolean => {
    if (!user?.currentTeamId) {
      toast.warning('请先选择团队');
      return false;
    }
    return true;
  };

  const useTemplate = async (tpl: ContentTemplate) => {
    if (!ensureTeam()) return;
    setApplyingTpl(tpl.id);
    try {
      const created = await contentApi.create({
        title: tpl.title,
        contentType: 'article',
        contentMd: tpl.contentMd,
        tags: tpl.tags,
        platforms: tpl.platforms,
      });
      onOpenChange(false);
      router.push(`/editor?id=${created.id}`);
    } catch (err) {
      toast.error('模板创建失败：' + (err as Error).message);
    } finally {
      setApplyingTpl(null);
    }
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;
    if (!/\.(md|markdown|txt)$/i.test(file.name)) {
      toast.warning('仅支持 .md / .markdown / .txt 文件');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.warning('文件不能超过 5MB');
      return;
    }
    try {
      const text = await file.text();
      setImportText(text);
      setImportName(file.name);
      toast.success(`已读取文件：${file.name}`);
    } catch {
      toast.error('文件读取失败');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleImportCreate = async () => {
    const raw = importText.trim();
    if (!raw) {
      toast.warning('请先选择文件或粘贴内容');
      return;
    }
    if (!ensureTeam()) return;
    const { title, body } = parseTitleAndBody(raw);
    if (!title) {
      toast.warning('未能识别标题，请在内容首行填写标题');
      return;
    }
    setImporting(true);
    try {
      const created = await contentApi.create({
        title,
        contentType: 'article',
        contentMd: body || raw,
      });
      onOpenChange(false);
      setImportText('');
      setImportName('');
      router.push(`/editor?id=${created.id}`);
    } catch (err) {
      toast.error('导入失败：' + (err as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const previewMeta = useMemo(() => {
    const raw = importText.trim();
    if (!raw) return null;
    const { title, body } = parseTitleAndBody(raw);
    return { title: title || '（未识别到标题）', chars: body.length || raw.length };
  }, [importText]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>新建内容</DialogTitle>
          <DialogDescription>选择一种方式开始创作你的内容</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">新建内容</TabsTrigger>
            <TabsTrigger value="template">从模板</TabsTrigger>
            <TabsTrigger value="import">导入内容</TabsTrigger>
          </TabsList>

          {/* 新建 */}
          <TabsContent value="create" className="mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-28 flex flex-col gap-2 hover:border-indigo-300 hover:bg-indigo-50/50"
                onClick={() => {
                  onOpenChange(false);
                  router.push('/editor');
                }}
              >
                <LayoutGrid className="w-6 h-6 text-indigo-500" />
                <span className="text-sm font-medium">图文内容</span>
                <span className="text-[11px] text-zinc-400 font-normal">
                  Markdown 编辑器 · AI 辅助
                </span>
              </Button>
              <Button
                variant="outline"
                className="h-28 flex flex-col gap-2 hover:border-indigo-300 hover:bg-indigo-50/50"
                onClick={() => {
                  onOpenChange(false);
                  router.push('/video');
                }}
              >
                <Video className="w-6 h-6 text-fuchsia-500" />
                <span className="text-sm font-medium">视频内容</span>
                <span className="text-[11px] text-zinc-400 font-normal">
                  上传视频 · 封面 · 文案
                </span>
              </Button>
            </div>
          </TabsContent>

          {/* 模板 */}
          <TabsContent value="template" className="mt-4">
            <div className="flex gap-1.5 flex-wrap mb-3">
              {TEMPLATE_CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => setTplCategory(c.value)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-xs border transition-colors',
                    tplCategory === c.value
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                      : 'border-zinc-200 text-zinc-500 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900',
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {filteredTemplates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{tpl.name}</span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                      {tpl.description}
                    </p>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {tpl.tags.slice(0, 3).map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="flex-shrink-0"
                    disabled={applyingTpl === tpl.id}
                    onClick={() => useTemplate(tpl)}
                  >
                    {applyingTpl === tpl.id && (
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                    )}
                    使用模板
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* 导入 */}
          <TabsContent value="import" className="mt-4 space-y-3">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-16 flex-col gap-1"
                onClick={() => fileRef.current?.click()}
              >
                <FileUp className="w-5 h-5 text-indigo-500" />
                <span className="text-xs">选择 Markdown / 文本文件</span>
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".md,.markdown,.txt,text/markdown,text/plain"
                className="hidden"
                onChange={(e) => handleImportFile(e.target.files?.[0])}
              />
            </div>
            {importName && (
              <p className="text-xs text-zinc-400 flex items-center gap-1">
                <ClipboardPaste className="w-3.5 h-3.5" />
                已选择：{importName}
              </p>
            )}
            <Textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="…或直接把 Markdown / 文本内容粘贴到这里。首个「# 标题」或第一行将作为草稿标题。"
              rows={7}
            />
            {previewMeta && (
              <div className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900 rounded-lg px-3 py-2">
                识别标题：<span className="font-medium text-zinc-700 dark:text-zinc-300">{previewMeta.title}</span>
                <span className="mx-2 text-zinc-300">|</span>
                正文约 {previewMeta.chars} 字
              </div>
            )}
            <div className="flex justify-end">
              <Button onClick={handleImportCreate} disabled={importing || !importText.trim()}>
                {importing && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
                导入并创建草稿
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        <DialogFooter className="sm:justify-start">
          <div className="text-xs text-zinc-500">
            <Badge variant="outline" className="mr-2">
              AI
            </Badge>
            创建后可在编辑器中使用 AI 生成、润色与标题推荐
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
