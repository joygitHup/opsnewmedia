'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Save,
  Eye,
  Code2,
  Send,
  Sparkles,
  Wand2,
  Plus,
  Loader2,
  BookOpen,
  History,
} from 'lucide-react';
import { MarkdownEditor, type MarkdownEditorHandle } from '@/components/editor/markdown-editor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { PLATFORM_CONFIG, type PlatformType } from '@/types';
import {
  contentApi,
  type ContentDraftDetail,
  type ContentVersionBrief,
  type ContentVersionDetail,
} from '@/lib/api/content';
import { markdownToHtml } from '@/lib/markdown';
import { accountsApi, type Account } from '@/lib/api/accounts';
import { publishApi } from '@/lib/api/publish';
import { aiApi } from '@/lib/api/ai';
import { useAuth } from '@/lib/auth/AuthProvider';
import { toast } from 'sonner';

export default function EditorPage() {
  const searchParams = useSearchParams();
  const draftId = searchParams.get('id');
  const { user } = useAuth();

  const [loading, setLoading] = useState(Boolean(draftId));
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [contentMd, setContentMd] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<PlatformType[]>([]);
  const [coverUrl, setCoverUrl] = useState('');
  const [originalDraft, setOriginalDraft] = useState<ContentDraftDetail | null>(null);

  // AI 弹窗
  const [aiDialog, setAiDialog] = useState<null | 'generate' | 'polish' | 'title' | 'tags'>(null);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiUseKb, setAiUseKb] = useState(false);

  // 标签输入
  const [tagInput, setTagInput] = useState('');

  // 发布弹窗
  const [publishDialog, setPublishDialog] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<number>>(new Set());
  const [publishing, setPublishing] = useState(false);

  // 版本历史
  const [versionDialogOpen, setVersionDialogOpen] = useState(false);
  const [versions, setVersions] = useState<ContentVersionBrief[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [selectedVersionNo, setSelectedVersionNo] = useState<number | null>(null);
  const [versionDetail, setVersionDetail] = useState<ContentVersionDetail | null>(null);
  const [versionDetailLoading, setVersionDetailLoading] = useState(false);
  const [rollbackConfirmOpen, setRollbackConfirmOpen] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  // 排版编辑器
  const editorRef = useRef<MarkdownEditorHandle>(null);
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [previewHtml, setPreviewHtml] = useState('');

  // 切到预览或正文变化时，用 Vditor(Lute) 渲染 HTML
  const syncPreview = useCallback(() => {
    setPreviewHtml(editorRef.current?.getHTML() ?? '');
  }, []);

  useEffect(() => {
    if (activeTab === 'preview') syncPreview();
  }, [activeTab, contentMd, syncPreview]);

  const loadDraft = useCallback(async () => {
    if (!draftId) return;
    try {
      const d = await contentApi.detail(Number(draftId));
      setOriginalDraft(d);
      setTitle(d.title);
      setContentMd(d.contentMd || '');
      setTags(d.tags || []);
      setPlatforms((d.platforms || []).filter((p) => PLATFORM_CONFIG[p]?.supported));
      setCoverUrl(d.coverUrl || '');
    } catch (err) {
      toast.error('加载草稿失败：' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const handleSave = async () => {
    if (!title) {
      toast.warning('请填写标题');
      return;
    }
    if (!user?.currentTeamId) {
      toast.warning('请先选择团队');
      return;
    }
    setSaving(true);
    try {
      const body = {
        title,
        contentMd,
        tags,
        platforms,
        coverUrl,
      };
      if (originalDraft) {
        const updated = await contentApi.update(originalDraft.id, body);
        setOriginalDraft(updated);
        toast.success('已保存');
      } else {
        const created = await contentApi.create(body);
        setOriginalDraft(created);
        toast.success('已创建草稿');
        // 替换 URL 包含 id
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', `/editor?id=${created.id}`);
        }
      }
    } catch (err) {
      toast.error('保存失败：' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    // 必须先保存草稿才能发布
    if (!originalDraft) {
      await handleSave();
    }
    const draftId = originalDraft?.id;
    if (!draftId) return;
    setPublishDialog(true);
    try {
      const res = await accountsApi.list({ teamId: user?.currentTeamId ?? undefined, pageSize: 100 });
      // 只显示草稿目标平台的、状态正常的账号
      const draftPlatforms = originalDraft?.platforms ?? platforms;
      const filtered = res.list.filter(
        (a) => a.status === 'active' && (draftPlatforms.length === 0 || draftPlatforms.includes(a.platform)),
      );
      setAccounts(filtered);
      if (filtered.length === 0) {
        toast.warning('没有可用的目标平台账号，请先在账号管理中添加');
      }
    } catch (err) {
      toast.error('加载账号失败：' + (err as Error).message);
    }
  };

  const toggleAccount = (id: number) => {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const confirmPublish = async () => {
    if (!originalDraft || selectedAccounts.size === 0) return;
    setPublishing(true);
    let ok = 0;
    let fail = 0;
    for (const accountId of selectedAccounts) {
      try {
        await publishApi.create({ draft: originalDraft.id, account: accountId });
        ok++;
      } catch {
        fail++;
      }
    }
    setPublishing(false);
    setPublishDialog(false);
    setSelectedAccounts(new Set());
    if (ok > 0) toast.success(`成功发布 ${ok} 个任务${fail > 0 ? `，${fail} 个失败` : ''}`);
    else if (fail > 0) toast.error(`${fail} 个发布任务创建失败`);
  };

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((x) => x !== t));
  };

  const togglePlatform = (p: PlatformType) => {
    if (!PLATFORM_CONFIG[p].supported) return;
    if (platforms.includes(p)) {
      setPlatforms(platforms.filter((x) => x !== p));
    } else {
      setPlatforms([...platforms, p]);
    }
  };

  // ---- 版本历史 ----
  const loadVersion = async (id: number, versionNo: number) => {
    setSelectedVersionNo(versionNo);
    setVersionDetail(null);
    setVersionDetailLoading(true);
    try {
      const detail = await contentApi.versionDetail(id, versionNo);
      setVersionDetail(detail);
    } catch (err) {
      setVersionDetail(null);
      toast.error('加载版本详情失败：' + (err as Error).message);
    } finally {
      setVersionDetailLoading(false);
    }
  };

  const openVersions = async () => {
    if (!originalDraft) return;
    setVersionDialogOpen(true);
    setVersions([]);
    setSelectedVersionNo(null);
    setVersionDetail(null);
    setVersionsLoading(true);
    try {
      const list = await contentApi.versions(originalDraft.id);
      setVersions(list);
      if (list.length > 0) {
        await loadVersion(originalDraft.id, list[0].versionNo);
      }
    } catch (err) {
      toast.error('加载版本历史失败：' + (err as Error).message);
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!originalDraft || !versionDetail) return;
    setRollingBack(true);
    try {
      const updated = await contentApi.rollback(originalDraft.id, versionDetail.versionNo);
      setOriginalDraft(updated);
      setTitle(updated.title);
      setContentMd(updated.contentMd || '');
      setTags(updated.tags || []);
      setPlatforms((updated.platforms || []).filter((p) => PLATFORM_CONFIG[p]?.supported));
      setCoverUrl(updated.coverUrl || '');
      toast.success(`已回滚到 v${versionDetail.versionNo}`);
      setRollbackConfirmOpen(false);
      setVersionDialogOpen(false);
    } catch (err) {
      toast.error('回滚失败：' + (err as Error).message);
    } finally {
      setRollingBack(false);
    }
  };

  // ---- AI ----
  const handleAi = async () => {
    if (!aiDialog) return;
    // 润色/标题/标签需要正文内容，无内容时直接提示
    if (aiDialog !== 'generate') {
      const content = aiInput || contentMd;
      if (!content.trim()) {
        toast.warning('当前未识别到内容，请先输入正文');
        return;
      }
    }
    setAiLoading(true);
    try {
      if (aiDialog === 'generate') {
        const r = await aiApi.generate({
          prompt: aiInput || title || '请帮我写一篇关于运营的文章',
          length: 800,
          useKnowledge: aiUseKb,
        });
        setContentMd((prev) => (prev ? `${prev}\n\n${r.output}` : r.output));
        const cited = r.sources ?? [];
        toast.success('生成完成', {
          description: cited.length
            ? `已引用知识库：${cited.map((s) => `《${s.docTitle}》`).join('、')}`
            : aiUseKb
              ? '知识库未检索到相关内容，已按通用知识生成'
              : undefined,
        });
      } else if (aiDialog === 'polish') {
        const r = await aiApi.polish({
          content: aiInput || contentMd,
          mode: 'lite',
          useKnowledge: aiUseKb,
        });
        setContentMd(r.output);
        toast.success('润色完成');
      } else if (aiDialog === 'title') {
        const r = await aiApi.title({
          content: contentMd,
          count: 3,
          useKnowledge: aiUseKb,
        });
        toast.success(`已生成 ${r.options.length} 个候选标题`, {
          description: r.options.join('\n'),
        });
      } else if (aiDialog === 'tags') {
        const r = await aiApi.tags({
          content: contentMd,
          count: 5,
          useKnowledge: aiUseKb,
        });
        const newTags = r.tags.filter((t) => !tags.includes(t));
        setTags([...tags, ...newTags]);
        toast.success(`已添加 ${newTags.length} 个标签`);
      }
      setAiDialog(null);
      setAiInput('');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="输入标题..."
            className="text-lg font-medium border-0 px-0 focus-visible:ring-0 max-w-md"
          />
          {originalDraft && (
            <Badge variant="outline">
              v{originalDraft.versionNo}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {originalDraft && (
            <Button variant="outline" className="gap-1.5" onClick={openVersions}>
              <History className="w-4 h-4" />
              版本
            </Button>
          )}
          <DropdownAiButton onPick={(t) => { setAiDialog(t); setAiInput(''); }} />
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存
          </Button>
          <Button variant="outline" className="gap-1.5" disabled={!originalDraft} onClick={handlePublish}>
            <Send className="w-4 h-4" />
            发布
          </Button>
        </div>
      </div>

      {/* 平台标签选择 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-zinc-500">目标平台：</span>
        {Object.entries(PLATFORM_CONFIG).map(([k, v]) => {
          const p = k as PlatformType;
          const active = platforms.includes(p);
          return (
            <button
              key={k}
              type="button"
              onClick={() => togglePlatform(p)}
              disabled={!v.supported}
              title={v.supported ? v.name : '该平台暂未接入，即将支持'}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? 'border-transparent text-white'
                  : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
              style={active ? { backgroundColor: v.color } : {}}
            >
              {v.name}
              {!v.supported && (
                <span className="rounded bg-zinc-100 px-1 py-0.5 text-[9px] leading-none text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  即将支持
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 标签 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-zinc-500">标签：</span>
        {tags.map((t) => (
          <Badge key={t} variant="secondary" className="gap-1">
            {t}
            <button onClick={() => handleRemoveTag(t)} className="text-zinc-400 hover:text-zinc-600">
              ×
            </button>
          </Badge>
        ))}
        <div className="flex items-center gap-1">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
            placeholder="添加标签"
            className="h-7 w-24 text-xs"
          />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAddTag}>
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* 编辑器主区 */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')}
        className="w-full"
      >
        <TabsList>
          <TabsTrigger value="edit" className="gap-1.5">
            <Code2 className="w-4 h-4" />
            编辑
          </TabsTrigger>
          <TabsTrigger value="preview" className="gap-1.5" onClick={syncPreview}>
            <Eye className="w-4 h-4" />
            预览
          </TabsTrigger>
        </TabsList>
        {/* forceMount 保持编辑器常驻，切 tab 不销毁 Vditor 实例 */}
        <TabsContent value="edit" forceMount className="mt-2 data-[state=inactive]:hidden">
          <MarkdownEditor
            ref={editorRef}
            value={contentMd}
            onChange={setContentMd}
            height={540}
          />
        </TabsContent>
        <TabsContent value="preview" forceMount className="mt-2 data-[state=inactive]:hidden">
          {previewHtml ? (
            <div
              className="md-preview min-h-[540px] rounded-lg border border-zinc-200 bg-white p-8 dark:border-zinc-800 dark:bg-zinc-900"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <div className="flex min-h-[540px] items-center justify-center rounded-lg border border-dashed border-zinc-300 text-sm text-zinc-400 dark:border-zinc-700">
              暂无内容
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* AI 弹窗 */}
      <Dialog open={aiDialog !== null} onOpenChange={(o) => !o && setAiDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500" />
              {aiDialog === 'generate' && 'AI 生成内容'}
              {aiDialog === 'polish' && 'AI 润色'}
              {aiDialog === 'title' && 'AI 生成标题'}
              {aiDialog === 'tags' && 'AI 推荐标签'}
            </DialogTitle>
            <DialogDescription>
              {aiDialog === 'generate' && '输入主题，AI 帮你生成正文'}
              {aiDialog === 'polish' && '当前正文将被 AI 润色（可在输入框覆盖）'}
              {aiDialog === 'title' && '基于当前正文生成候选标题'}
              {aiDialog === 'tags' && '基于当前正文推荐标签'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>输入</Label>
            <Textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder={
                aiDialog === 'generate'
                  ? '主题 / 描述'
                  : aiDialog === 'polish'
                  ? '（留空则润色当前正文）'
                  : '（无需输入，直接执行）'
              }
              className="min-h-[120px]"
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={aiUseKb}
                onChange={(e) => setAiUseKb(e.target.checked)}
                className="w-4 h-4 accent-indigo-500"
              />
              <BookOpen className="w-4 h-4 text-indigo-500" />
              引用知识库（检索团队知识文档辅助生成）
            </label>
          </div>
          <DialogFooter>
            <Button
              onClick={handleAi}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600"
              disabled={aiLoading}
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI 处理中...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  执行
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 发布弹窗 */}
      <Dialog open={publishDialog} onOpenChange={setPublishDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>发布到平台</DialogTitle>
            <DialogDescription>
              选择目标账号，确认后将创建发布任务并立即发布。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {accounts.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-4">暂无可用账号</p>
            ) : (
              accounts.map((a) => {
                const cfg = PLATFORM_CONFIG[a.platform];
                const checked = selectedAccounts.has(a.id);
                return (
                  <label
                    key={a.id}
                    className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors ${checked ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950' : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800'}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAccount(a.id)}
                      className="w-4 h-4 accent-indigo-500"
                    />
                    {a.avatar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{a.name}</div>
                      <div className="text-xs text-zinc-400">{cfg?.name ?? a.platform}</div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialog(false)} disabled={publishing}>
              取消
            </Button>
            <Button
              onClick={confirmPublish}
              disabled={publishing || selectedAccounts.size === 0}
              className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600"
            >
              {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              发布到 {selectedAccounts.size || ''} 个账号
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 版本历史弹窗 */}
      <Dialog open={versionDialogOpen} onOpenChange={setVersionDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-500" />
              版本历史
            </DialogTitle>
            <DialogDescription>
              查看草稿的历史版本，可将内容回滚到任意版本
            </DialogDescription>
          </DialogHeader>
          {versionsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400">
              <History className="w-10 h-10 mb-2" />
              <p className="text-sm">暂无历史版本</p>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
              <div className="w-48 flex-shrink-0 space-y-1 overflow-y-auto border-r pr-2">
                {versions.map((v) => {
                  const active = selectedVersionNo === v.versionNo;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => originalDraft && loadVersion(originalDraft.id, v.versionNo)}
                      className={`w-full rounded-lg border px-2.5 py-2 text-left transition-colors ${
                        active
                          ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                          : 'border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium">v{v.versionNo}</span>
                        <span className="text-[10px] text-zinc-400 truncate">
                          {v.createdByName || '—'}
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] text-zinc-400">
                        {new Date(v.createdAt).toLocaleString('zh-CN')}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="min-w-0 flex-1 overflow-y-auto">
                {versionDetailLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
                  </div>
                ) : versionDetail ? (
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium truncate">{versionDetail.title || '无标题'}</h4>
                      <div className="mt-1 text-[11px] text-zinc-400">
                        v{versionDetail.versionNo} · {versionDetail.createdByName || '—'} ·{' '}
                        {versionDetail.createdAt
                          ? new Date(versionDetail.createdAt).toLocaleString('zh-CN')
                          : '—'}
                      </div>
                      {versionDetail.changelog && (
                        <p className="mt-1 text-xs text-zinc-500">变更说明：{versionDetail.changelog}</p>
                      )}
                    </div>
                    <div
                      className="md-preview min-h-[240px] rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
                      dangerouslySetInnerHTML={{
                        __html: markdownToHtml(versionDetail.contentMd || ''),
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-16 text-sm text-zinc-400">
                    选择左侧版本查看详情
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionDialogOpen(false)}>
              关闭
            </Button>
            <Button
              className="gap-1.5"
              disabled={!versionDetail || versionDetailLoading || rollingBack}
              onClick={() => setRollbackConfirmOpen(true)}
            >
              {rollingBack ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <History className="w-4 h-4" />
              )}
              回滚到此版本
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 回滚二次确认 */}
      <AlertDialog open={rollbackConfirmOpen} onOpenChange={setRollbackConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认回滚版本</AlertDialogTitle>
            <AlertDialogDescription>
              将用该版本（v{versionDetail?.versionNo}）覆盖当前内容，当前未保存修改会丢失。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rollingBack}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRollback();
              }}
              disabled={rollingBack}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {rollingBack ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  回滚中...
                </>
              ) : (
                '确认回滚'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function DropdownAiButton({ onPick }: { onPick: (t: 'generate' | 'polish' | 'title' | 'tags') => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-1.5">
          <Sparkles className="w-4 h-4 text-indigo-500" />
          AI
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onPick('generate')}>生成内容</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPick('polish')}>润色</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPick('title')}>生成标题</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPick('tags')}>推荐标签</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
