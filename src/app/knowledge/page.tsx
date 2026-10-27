'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  BookOpen,
  Upload,
  ClipboardPaste,
  Trash2,
  Loader2,
  RefreshCw,
  Search,
  FileText,
  MessageSquareText,
  AlertCircle,
  ChevronDown,
  Check,
  Pencil,
  X,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  knowledgeApi,
  type KnowledgeChunk,
  type KnowledgeDoc,
  type KnowledgeDocStatus,
  type KnowledgeSearchHit,
} from '@/lib/api/knowledge';
import { toast } from 'sonner';

const STATUS_STYLE: Record<KnowledgeDocStatus, { className: string }> = {
  pending: { className: 'bg-zinc-100 text-zinc-600' },
  processing: { className: 'bg-amber-100 text-amber-700' },
  ready: { className: 'bg-green-100 text-green-700' },
  failed: { className: 'bg-red-100 text-red-700' },
};

const ALLOWED_EXTS = ['.md', '.txt', '.pdf', '.docx'];
const MAX_SIZE = 20 * 1024 * 1024;
const MAX_PASTE_CHARS = 20000;

type StatusFilter = 'all' | KnowledgeDocStatus;

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function KnowledgePage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const targetDocId = Number(searchParams.get('docId')) || 0;
  const chunkParam = searchParams.get('chunk');
  const targetChunkIdx = chunkParam === null ? -1 : Number(chunkParam);
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'upload' | 'paste'>('all');
  const [uploading, setUploading] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [pasteSaving, setPasteSaving] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<KnowledgeDoc | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [chunksDoc, setChunksDoc] = useState<KnowledgeDoc | null>(null);
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [chunksLoading, setChunksLoading] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchHits, setSearchHits] = useState<KnowledgeSearchHit[]>([]);

  // 批量删除
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [batchConfirmOpen, setBatchConfirmOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  // 标题编辑
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);

  // 重试
  const [reparsingId, setReparsingId] = useState<number | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);

  const fetchDocs = useCallback(async (silent = false) => {
    if (!user?.currentTeamId) {
      setLoading(false);
      return;
    }
    if (!silent) setLoading(true);
    try {
      const query: Record<string, string | number | undefined> = {
        teamId: user.currentTeamId,
        pageSize: 100,
      };
      if (keyword) query.search = keyword;
      if (sourceFilter !== 'all') query.sourceType = sourceFilter;
      const res = await knowledgeApi.list(query);
      setDocs(res.list);
    } catch (err) {
      if (!silent) toast.error('加载知识库失败：' + (err as Error).message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user?.currentTeamId, keyword, sourceFilter]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  // 轮询刷新：存在处理中的文档时每 3 秒刷新
  useEffect(() => {
    const hasProcessing = docs.some(
      (d) => d.status === 'pending' || d.status === 'processing'
    );
    if (!hasProcessing) return;
    const timer = setInterval(() => fetchDocs(true), 3000);
    return () => clearInterval(timer);
  }, [docs, fetchDocs]);

  // 状态筛选在前端做，保证各状态 Tab 计数始终准确
  const visibleDocs =
    statusFilter === 'all' ? docs : docs.filter((d) => d.status === statusFilter);

  // 从问答页「引用」跳转过来时，自动打开对应文档分块并高亮
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!targetDocId || autoOpenedRef.current) return;
    const doc = docs.find((d) => d.id === targetDocId);
    if (!doc) return;
    autoOpenedRef.current = true;
    void openChunks(doc, targetChunkIdx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, targetDocId, targetChunkIdx]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTS.includes(ext)) {
      toast.warning(`不支持的文件类型 ${ext}，仅支持 md / txt / pdf / docx`);
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.warning('文件大小不能超过 20MB');
      return;
    }
    setUploading(true);
    try {
      await knowledgeApi.upload(file);
      toast.success('上传成功，正在解析...');
      await fetchDocs(true);
    } catch (err) {
      toast.error('上传失败：' + (err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handlePasteSave = async () => {
    if (!pasteTitle.trim()) {
      toast.warning('请输入标题');
      return;
    }
    if (!pasteContent.trim()) {
      toast.warning('请输入内容');
      return;
    }
    if (pasteContent.length > MAX_PASTE_CHARS) {
      toast.warning(`粘贴内容不能超过 ${MAX_PASTE_CHARS} 字符（当前 ${pasteContent.length}）`);
      return;
    }
    setPasteSaving(true);
    try {
      await knowledgeApi.paste(pasteTitle.trim(), pasteContent);
      toast.success('导入成功，正在解析...');
      setPasteOpen(false);
      setPasteTitle('');
      setPasteContent('');
      await fetchDocs(true);
    } catch (err) {
      toast.error('导入失败：' + (err as Error).message);
    } finally {
      setPasteSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingDoc) return;
    setDeleting(true);
    try {
      await knowledgeApi.remove(deletingDoc.id);
      toast.success('已删除');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deletingDoc.id);
        return next;
      });
      await fetchDocs(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
      setDeletingDoc(null);
    }
  };

  const confirmBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setBatchDeleting(true);
    try {
      const res = await knowledgeApi.batchRemove([...selectedIds]);
      toast.success(`已删除 ${res.count} 个文档`);
      setSelectedIds(new Set());
      await fetchDocs(true);
      setBatchConfirmOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBatchDeleting(false);
    }
  };

  const handleReparse = async (doc: KnowledgeDoc) => {
    setReparsingId(doc.id);
    try {
      await knowledgeApi.reparse(doc.id);
      toast.success('已重新开始解析');
      await fetchDocs(true);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setReparsingId(null);
    }
  };

  const startEditTitle = (doc: KnowledgeDoc) => {
    setEditingId(doc.id);
    setEditTitle(doc.title);
  };

  const saveTitle = async () => {
    if (!editingId) return;
    if (!editTitle.trim()) {
      toast.warning('标题不能为空');
      return;
    }
    setSavingTitle(true);
    try {
      const updated = await knowledgeApi.updateTitle(editingId, editTitle.trim());
      setDocs((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      toast.success('标题已更新');
      setEditingId(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingTitle(false);
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === visibleDocs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleDocs.map((d) => d.id)));
    }
  };

  const openChunks = async (doc: KnowledgeDoc, highlight = -1) => {
    setChunksDoc(doc);
    setChunks([]);
    setHighlightIdx(highlight);
    setChunksLoading(true);
    try {
      const res = await knowledgeApi.chunks(doc.id, 1, 50);
      setChunks(res.list);
      if (highlight >= 0) {
        setTimeout(() => {
          document
            .getElementById(`kb-chunk-${highlight}`)
            ?.scrollIntoView({ block: 'center' });
        }, 120);
      }
    } catch (err) {
      toast.error('加载分块失败：' + (err as Error).message);
    } finally {
      setChunksLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast.warning('请输入检索内容');
      return;
    }
    setSearching(true);
    try {
      const res = await knowledgeApi.search(searchQuery.trim(), 5);
      setSearchHits(res.results);
      if (res.results.length === 0) {
        toast.info('未检索到相关内容');
      }
    } catch (err) {
      toast.error('检索失败：' + (err as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const statusTabs: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'ready', label: '已就绪' },
    { key: 'processing', label: '处理中' },
    { key: 'failed', label: '失败' },
  ];

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-500" />
            知识库
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            上传业务文档，AI 创作与问答将引用知识库内容（RAG）
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => {
              setSearchHits([]);
              setSearchOpen(true);
            }}
          >
            <Search className="w-4 h-4" />
            检索测试
          </Button>
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => setPasteOpen(true)}
          >
            <ClipboardPaste className="w-4 h-4" />
            粘贴导入
          </Button>
          <Link href="/knowledge/qa">
            <Button className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600">
              <MessageSquareText className="w-4 h-4" />
              知识问答
            </Button>
          </Link>
        </div>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          ref={fileRef}
          type="file"
          accept=".md,.txt,.pdf,.docx"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files)}
        />
        <Button
          className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              上传中...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              上传文档
            </>
          )}
        </Button>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="搜索文档标题…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => fetchDocs()}
          title="刷新"
        >
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* 筛选 Tab */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          {statusTabs.map((t) => {
            const active = statusFilter === t.key;
            const count =
              t.key === 'all'
                ? docs.length
                : docs.filter((d) => d.status === t.key).length;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setStatusFilter(t.key)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  active
                    ? 'bg-white dark:bg-zinc-700 shadow-sm font-medium'
                    : 'text-zinc-500 hover:text-zinc-700'
                }`}
              >
                {t.label}
                {count > 0 && (
                  <span className="ml-1.5 text-[10px] text-zinc-400">{count}</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-1 ml-2">
          <button
            type="button"
            onClick={() => setSourceFilter('all')}
            className={`text-xs px-2 py-1 rounded ${
              sourceFilter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            全部来源
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter('upload')}
            className={`text-xs px-2 py-1 rounded ${
              sourceFilter === 'upload' ? 'bg-indigo-100 text-indigo-700' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            文件上传
          </button>
          <button
            type="button"
            onClick={() => setSourceFilter('paste')}
            className={`text-xs px-2 py-1 rounded ${
              sourceFilter === 'paste' ? 'bg-indigo-100 text-indigo-700' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            粘贴导入
          </button>
        </div>
        {/* 批量操作栏 */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg px-3 py-1.5">
            <span className="text-xs text-red-600 dark:text-red-400">
              已选 {selectedIds.size} 项
            </span>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
              onClick={() => setBatchConfirmOpen(true)}
              disabled={batchDeleting}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              批量删除
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => setSelectedIds(new Set())}
            >
              取消
            </Button>
          </div>
        )}
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : visibleDocs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <BookOpen className="w-12 h-12 mb-3" />
          <p className="text-sm">
            {docs.length === 0
              ? '知识库为空，上传文档或粘贴导入开始构建'
              : '当前筛选条件下没有文档'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* 全选行 */}
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={selectedIds.size === visibleDocs.length && visibleDocs.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 accent-indigo-500"
            />
            <span className="text-xs text-zinc-400">全选</span>
          </div>

          {visibleDocs.map((d) => {
            const st = STATUS_STYLE[d.status];
            const isEditing = editingId === d.id;
            return (
              <Card key={d.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-4 flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(d.id)}
                    onChange={() => toggleSelect(d.id)}
                    className="w-4 h-4 accent-indigo-500 flex-shrink-0"
                  />
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-indigo-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="h-7 text-sm max-w-xs"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveTitle();
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-green-600 hover:text-green-700"
                            onClick={saveTitle}
                            disabled={savingTitle}
                          >
                            {savingTitle ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-zinc-500"
                            onClick={() => setEditingId(null)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <h3 className="font-medium truncate max-w-md">{d.title}</h3>
                          <button
                            type="button"
                            onClick={() => startEditTitle(d)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-zinc-400 hover:text-indigo-500"
                            title="编辑标题"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1 ${st.className}`}
                      >
                        {d.status === 'processing' || d.status === 'pending' ? (
                          <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        ) : null}
                        {d.statusName}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {d.sourceTypeName}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1 flex-wrap">
                      {d.fileName && <span>{d.fileName}</span>}
                      {d.fileSize > 0 && <span>{formatSize(d.fileSize)}</span>}
                      {d.status === 'ready' && <span>{d.chunkCount} 个分块</span>}
                      {d.hitCount > 0 && (
                        <span className="flex items-center gap-0.5 text-indigo-400">
                          <Eye className="w-3 h-3" />
                          被引用 {d.hitCount} 次
                        </span>
                      )}
                      {d.status === 'failed' && (
                        <span className="text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {d.errorMsg || '解析失败'}
                        </span>
                      )}
                      <span>{d.createdByName || '—'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {d.status === 'ready' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs"
                        onClick={() => openChunks(d)}
                      >
                        查看分块
                        <ChevronDown className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {(d.status === 'failed' || d.status === 'pending') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1 text-xs text-indigo-600 hover:text-indigo-700"
                        onClick={() => handleReparse(d)}
                        disabled={reparsingId === d.id}
                        title="重新解析"
                      >
                        {reparsingId === d.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    )}
                    {d.status !== 'processing' && d.status !== 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-zinc-400 hover:text-indigo-500"
                        onClick={() => startEditTitle(d)}
                        title="编辑标题"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:text-red-500"
                      onClick={() => setDeletingDoc(d)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 粘贴导入弹窗 */}
      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>粘贴导入</DialogTitle>
            <DialogDescription>
              粘贴文本内容，系统将自动分块并向量化入知识库（≤ {MAX_PASTE_CHARS} 字符）
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="pasteTitle">标题</Label>
              <Input
                id="pasteTitle"
                value={pasteTitle}
                onChange={(e) => setPasteTitle(e.target.value)}
                placeholder="例如：产品白皮书 v2"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="pasteContent">内容</Label>
                <span
                  className={`text-[10px] ${
                    pasteContent.length > MAX_PASTE_CHARS ? 'text-red-500' : 'text-zinc-400'
                  }`}
                >
                  {pasteContent.length} / {MAX_PASTE_CHARS}
                </span>
              </div>
              <Textarea
                id="pasteContent"
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                placeholder="粘贴文档内容（支持 Markdown），空行分段效果更佳"
                className="min-h-[240px] font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasteOpen(false)}>
              取消
            </Button>
            <Button onClick={handlePasteSave} disabled={pasteSaving} className="gap-1.5">
              {pasteSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  导入中...
                </>
              ) : (
                '确认导入'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 分块查看弹窗 */}
      <Dialog open={!!chunksDoc} onOpenChange={(open) => { if (!open) setChunksDoc(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>分块预览 — {chunksDoc?.title}</DialogTitle>
            <DialogDescription>共 {chunks.length} 个分块</DialogDescription>
          </DialogHeader>
          {chunksLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : (
            <div className="space-y-3">
              {chunks.map((c) => (
                <div
                  key={c.id}
                  id={`kb-chunk-${c.idx}`}
                  className={`rounded-lg border p-3 text-sm bg-zinc-50 dark:bg-zinc-900 ${
                    highlightIdx === c.idx ? 'ring-2 ring-indigo-400 border-indigo-300' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge variant="secondary" className="text-[10px]">
                      块 #{c.idx}
                    </Badge>
                    <span className="text-[10px] text-zinc-400">{c.tokenCount} 字</span>
                  </div>
                  <p className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-6">
                    {c.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 检索测试弹窗 */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>检索测试</DialogTitle>
            <DialogDescription>
              输入查询语句，查看向量检索返回的相关分块（top-5）
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="例如：我们的产品定价策略是什么？"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !searching) handleSearch();
              }}
            />
            <Button onClick={handleSearch} disabled={searching} className="gap-1.5 flex-shrink-0">
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              检索
            </Button>
          </div>
          <div className="space-y-3">
            {searchHits.map((h, i) => (
              <div key={i} className="rounded-lg border p-3 text-sm">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-indigo-600">
                    {h.docTitle} · 块 #{h.chunkIdx}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    相似度 {h.score.toFixed(3)}
                  </Badge>
                </div>
                <p className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-300 leading-relaxed line-clamp-5">
                  {h.content}
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* 批量删除确认 */}
      <AlertDialog open={batchConfirmOpen} onOpenChange={setBatchConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认批量删除</AlertDialogTitle>
            <AlertDialogDescription>
              将删除选中的 {selectedIds.size} 个知识文档及其全部分块、存储文件，删除后不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={batchDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmBatchDelete();
              }}
              disabled={batchDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {batchDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 删除确认 */}
      <AlertDialog
        open={!!deletingDoc}
        onOpenChange={(open) => { if (!open) setDeletingDoc(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除知识文档</AlertDialogTitle>
            <AlertDialogDescription>
              「{deletingDoc?.title}」及其全部分块和存储文件将被删除，删除后不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
