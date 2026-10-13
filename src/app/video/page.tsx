'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Save,
  Send,
  Loader2,
  UploadCloud,
  Video as VideoIcon,
  X,
  Sparkles,
  ImageIcon,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Label } from '@/components/ui/label';
import { PLATFORM_CONFIG, type PlatformType } from '@/types';
import { contentApi, type ContentDraftDetail } from '@/lib/api/content';
import { accountsApi, type Account } from '@/lib/api/accounts';
import { materialsApi } from '@/lib/api/materials';
import { publishApi } from '@/lib/api/publish';
import { aiApi } from '@/lib/api/ai';
import { useAuth } from '@/lib/auth/AuthProvider';

const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export default function VideoCreatePage() {
  const searchParams = useSearchParams();
  const draftId = searchParams.get('id');
  const { user } = useAuth();

  const [loading, setLoading] = useState(Boolean(draftId));
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [platforms, setPlatforms] = useState<PlatformType[]>([]);

  // 视频 / 封面
  const [mediaKey, setMediaKey] = useState('');
  const [mediaName, setMediaName] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaSize, setMediaSize] = useState(0);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [coverKey, setCoverKey] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [originalDraft, setOriginalDraft] = useState<ContentDraftDetail | null>(null);

  // AI 脚本
  const [aiLoading, setAiLoading] = useState(false);

  // 发布
  const [publishDialog, setPublishDialog] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<number>>(new Set());
  const [publishing, setPublishing] = useState(false);

  const loadDraft = useCallback(async () => {
    if (!draftId) return;
    try {
      const d = await contentApi.detail(Number(draftId));
      setOriginalDraft(d);
      setTitle(d.title);
      setCaption(d.contentMd || '');
      setTags(d.tags || []);
      setPlatforms(d.platforms || []);
      setMediaKey(d.mediaKey || '');
      setMediaName(d.mediaName || '');
      setMediaUrl(d.mediaUrl || '');
      setCoverKey(d.mediaCoverKey || '');
      setCoverUrl(d.mediaCoverUrl || '');
    } catch (err) {
      toast.error('加载草稿失败：' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [draftId]);

  useEffect(() => {
    if (!draftId) {
      // 新建视频：重置全部表单状态
      setOriginalDraft(null);
      setTitle('');
      setCaption('');
      setTags([]);
      setTagInput('');
      setPlatforms([]);
      setMediaKey('');
      setMediaName('');
      setMediaUrl('');
      setMediaSize(0);
      setCoverKey('');
      setCoverUrl('');
      setLoading(false);
      return;
    }
    setLoading(true);
    loadDraft();
  }, [draftId, loadDraft]);

  const handleUploadVideo = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      toast.warning('请选择视频文件');
      return;
    }
    if (file.size > MAX_VIDEO_SIZE) {
      toast.warning(`视频不能超过 ${formatSize(MAX_VIDEO_SIZE)}`);
      return;
    }
    // 先拷贝 FileList 再清空 input（防止重复选择同一文件不触发 change）
    setUploadingVideo(true);
    try {
      const [mat] = await materialsApi.upload([file], { type: 'video', tags: ['视频内容'] });
      if (!mat?.objectKey) throw new Error('上传返回缺少 objectKey');
      setMediaKey(mat.objectKey);
      setMediaName(mat.name);
      setMediaUrl(mat.url);
      setMediaSize(mat.size || file.size);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));
      toast.success('视频上传成功');
    } catch (err) {
      toast.error('视频上传失败：' + (err as Error).message);
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleUploadCover = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.warning('请选择图片文件');
      return;
    }
    setUploadingCover(true);
    try {
      const [mat] = await materialsApi.upload([file], { type: 'image', tags: ['视频封面'] });
      if (!mat?.objectKey) throw new Error('上传返回缺少 objectKey');
      setCoverKey(mat.objectKey);
      setCoverUrl(mat.url);
      toast.success('封面上传成功');
    } catch (err) {
      toast.error('封面上传失败：' + (err as Error).message);
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleSave = async (): Promise<number | null> => {
    if (!title.trim()) {
      toast.warning('请填写视频标题');
      return null;
    }
    if (!user?.currentTeamId) {
      toast.warning('请先选择团队');
      return null;
    }
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        contentType: 'video' as const,
        contentMd: caption,
        tags,
        platforms,
        mediaKey,
        mediaName,
        mediaCoverKey: coverKey,
      };
      if (originalDraft) {
        const updated = await contentApi.update(originalDraft.id, body);
        setOriginalDraft(updated);
        toast.success('已保存');
        return updated.id;
      }
      const created = await contentApi.create(body);
      setOriginalDraft(created);
      toast.success('视频草稿已创建');
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', `/video?id=${created.id}`);
      }
      return created.id;
    } catch (err) {
      toast.error('保存失败：' + (err as Error).message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    const id = await handleSave();
    if (!id || !originalDraft) return;
    setPublishDialog(true);
    try {
      const res = await accountsApi.list({
        teamId: user?.currentTeamId ?? undefined,
        pageSize: 100,
      });
      const filtered = res.list.filter(
        (a) =>
          a.status === 'active' &&
          (platforms.length === 0 || platforms.includes(a.platform)),
      );
      setAccounts(filtered);
      if (filtered.length === 0) {
        toast.warning('没有可用的目标平台账号，请先在账号管理中添加');
      }
    } catch (err) {
      toast.error('加载账号失败：' + (err as Error).message);
    }
  };

  const confirmPublish = async () => {
    if (!originalDraft || selectedAccounts.size === 0) return;
    setPublishing(true);
    let okCount = 0;
    let failCount = 0;
    for (const accountId of selectedAccounts) {
      try {
        await publishApi.create({ draft: originalDraft.id, account: accountId });
        okCount++;
      } catch {
        failCount++;
      }
    }
    setPublishing(false);
    setPublishDialog(false);
    setSelectedAccounts(new Set());
    if (okCount > 0)
      toast.success(`成功发布 ${okCount} 个任务${failCount > 0 ? `，${failCount} 个失败` : ''}`);
    else if (failCount > 0) toast.error(`${failCount} 个发布任务创建失败`);
  };

  const handleAiScript = async () => {
    const topic = title.trim() || caption.trim();
    if (!topic) {
      toast.warning('请先填写标题或视频主题');
      return;
    }
    setAiLoading(true);
    try {
      const r = await aiApi.generate({
        prompt: `请为短视频《${topic}》创作一份适合抖音/小红书/视频号的口播脚本与发布文案：包含 3 个备选标题、前 3 秒黄金开场、分镜口播正文、结尾互动引导，以及 5 个话题标签。`,
        length: 600,
      });
      setCaption((prev) => (prev ? `${prev}\n\n${r.output}` : r.output));
      toast.success('脚本已生成');
    } catch (err) {
      toast.error('AI 生成失败：' + (err as Error).message);
    } finally {
      setAiLoading(false);
    }
  };

  const togglePlatform = (p: PlatformType) => {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const handleAddTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <VideoIcon className="w-5 h-5 text-indigo-500" />
            视频内容创作
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            上传视频、撰写文案，一键分发到多个短视频平台
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
            保存草稿
          </Button>
          <Button onClick={handlePublish} disabled={saving}>
            <Send className="w-4 h-4 mr-1.5" />
            发布
          </Button>
        </div>
      </div>

      {/* 视频上传区 */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {mediaUrl ? (
          <div className="relative bg-black">
            <video src={mediaUrl} controls className="w-full max-h-[420px] mx-auto" />
            <button
              type="button"
              onClick={() => {
                setMediaKey('');
                setMediaName('');
                setMediaUrl('');
                setMediaSize(0);
              }}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
              title="移除视频"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="px-4 py-2.5 flex items-center gap-2 text-xs text-zinc-300 bg-black/60 absolute bottom-0 inset-x-0">
              <VideoIcon className="w-3.5 h-3.5" />
              <span className="truncate">{mediaName}</span>
              {mediaSize > 0 && <span className="text-zinc-400">· {formatSize(mediaSize)}</span>}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => videoInputRef.current?.click()}
            disabled={uploadingVideo}
            className="w-full flex flex-col items-center justify-center py-16 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl m-0 hover:border-indigo-400 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors disabled:opacity-60"
          >
            {uploadingVideo ? (
              <>
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-3" />
                <span className="text-sm text-zinc-600 dark:text-zinc-300">视频上传中，请稍候…</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-10 h-10 text-zinc-400 mb-3" />
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                  点击上传视频
                </span>
                <span className="text-xs text-zinc-400 mt-1">
                  支持 MP4 / MOV / WebM，单个文件最大 200MB
                </span>
              </>
            )}
          </button>
        )}
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => handleUploadVideo(e.target.files?.[0])}
        />
      </div>

      {/* 标题 + 封面 */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="video-title">视频标题</Label>
          <Input
            id="video-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="给视频起一个吸引人的标题"
            maxLength={200}
          />
        </div>

        <div className="space-y-1.5">
          <Label>视频封面（选填）</Label>
          {coverUrl ? (
            <div className="relative w-48">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt="视频封面"
                className="w-48 h-28 object-cover rounded-lg border border-zinc-200 dark:border-zinc-800"
              />
              <button
                type="button"
                onClick={() => {
                  setCoverKey('');
                  setCoverUrl('');
                }}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-zinc-800 text-white flex items-center justify-center"
                title="移除封面"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="w-48 h-28 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg hover:border-indigo-400 transition-colors disabled:opacity-60"
            >
              {uploadingCover ? (
                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              ) : (
                <>
                  <ImageIcon className="w-5 h-5 text-zinc-400" />
                  <span className="text-xs text-zinc-400">上传封面图</span>
                </>
              )}
            </button>
          )}
          <input
            ref={coverInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleUploadCover(e.target.files?.[0])}
          />
        </div>
      </div>

      {/* 文案 + AI */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="video-caption">视频文案 / 口播脚本</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleAiScript}
            disabled={aiLoading}
          >
            {aiLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            )}
            AI 写脚本
          </Button>
        </div>
        <Textarea
          id="video-caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="填写视频简介、口播脚本或发布文案…"
          rows={8}
        />
      </div>

      {/* 标签 */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2">
        <Label>话题标签</Label>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <Badge key={t} variant="secondary" className="gap-1 pl-2">
              #{t}
              <button
                type="button"
                onClick={() => setTags(tags.filter((x) => x !== t))}
                className="ml-0.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
            placeholder="输入标签后回车"
            className="max-w-xs"
          />
          <Button type="button" variant="outline" size="sm" onClick={handleAddTag}>
            添加
          </Button>
        </div>
      </div>

      {/* 目标平台 */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2">
        <Label>目标平台</Label>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(PLATFORM_CONFIG) as PlatformType[]).map((p) => {
            const cfg = PLATFORM_CONFIG[p];
            const active = platforms.includes(p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  active
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                    : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900'
                }`}
              >
                {cfg.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* 发布账号选择弹窗 */}
      <Dialog open={publishDialog} onOpenChange={setPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>选择发布账号</DialogTitle>
            <DialogDescription>
              视频将发布到所选账号，可多选；未开放视频接口的平台可能发布失败。
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-72 overflow-y-auto space-y-2">
            {accounts.length === 0 ? (
              <p className="text-sm text-zinc-500 py-6 text-center">
                没有可用的目标平台账号，请先在账号管理中添加
              </p>
            ) : (
              accounts.map((a) => {
                const checked = selectedAccounts.has(a.id);
                return (
                  <label
                    key={a.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                      checked
                        ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                        : 'border-zinc-200 dark:border-zinc-800'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedAccounts((prev) => {
                          const next = new Set(prev);
                          if (next.has(a.id)) next.delete(a.id);
                          else next.add(a.id);
                          return next;
                        })
                      }
                      className="accent-indigo-600"
                    />
                    <span className="text-sm font-medium">{a.name}</span>
                    <Badge variant="outline">{PLATFORM_CONFIG[a.platform]?.name ?? a.platform}</Badge>
                  </label>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishDialog(false)}>
              取消
            </Button>
            <Button onClick={confirmPublish} disabled={publishing || selectedAccounts.size === 0}>
              {publishing && <Loader2 className="w-4 h-4 animate-spin mr-1.5" />}
              确认发布（{selectedAccounts.size}）
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
