'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  FileText,
  Trash2,
  Loader2,
  Eye,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { PLATFORM_CONFIG } from '@/types';
import { contentApi, type ContentDraft } from '@/lib/api/content';
import { useAuth } from '@/lib/auth/AuthProvider';
import { toast } from 'sonner';

const STATUS_MAP: Record<ContentDraft['status'], { label: string; className: string }> = {
  draft: { label: '草稿', className: 'bg-zinc-100 text-zinc-600' },
  pending: { label: '待发布', className: 'bg-amber-100 text-amber-700' },
  published: { label: '已发布', className: 'bg-green-100 text-green-700' },
  failed: { label: '失败', className: 'bg-red-100 text-red-700' },
};

export default function ContentListPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState<ContentDraft[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deletingDraft, setDeletingDraft] = useState<ContentDraft | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDrafts = useCallback(async () => {
    if (!user?.currentTeamId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const query: Record<string, string | number | undefined> = {
        teamId: user.currentTeamId,
        pageSize: 100,
      };
      if (statusFilter !== 'all') query.status = statusFilter;
      if (keyword) query.search = keyword;
      const res = await contentApi.list(query);
      setDrafts(res.list);
    } catch (err) {
      toast.error('加载草稿失败：' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user?.currentTeamId, statusFilter, keyword]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const confirmDelete = async () => {
    if (!deletingDraft) return;
    setDeleting(true);
    try {
      await contentApi.remove(deletingDraft.id);
      toast.success('已删除');
      await fetchDrafts();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
      setDeletingDraft(null);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">我的草稿</h1>
          <p className="text-sm text-zinc-500 mt-1">管理已保存的内容草稿</p>
        </div>
        <Link href="/editor">
          <Button className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600">
            <Plus className="w-4 h-4" />
            新建草稿
          </Button>
        </Link>
      </div>

      {/* 筛选栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="搜索标题或标签…"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="pl-9"
            onKeyDown={(e) => { if (e.key === 'Enter') fetchDrafts(); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="draft">草稿</SelectItem>
            <SelectItem value="pending">待发布</SelectItem>
            <SelectItem value="published">已发布</SelectItem>
            <SelectItem value="failed">失败</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <FileText className="w-12 h-12 mb-3" />
          <p className="text-sm">暂无草稿，点击右上角新建</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drafts.map((d) => {
            const st = STATUS_MAP[d.status] ?? STATUS_MAP.draft;
            return (
              <Card key={d.id} className="group hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/editor?id=${d.id}`} className="flex-1 min-w-0">
                      <h3 className="font-medium truncate hover:text-indigo-600 transition-colors">
                        {d.title || '无标题'}
                      </h3>
                    </Link>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${st.className}`}>
                      {st.label}
                    </span>
                  </div>

                  {/* 平台标签 */}
                  {d.platforms?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {d.platforms.map((p) => {
                        const cfg = PLATFORM_CONFIG[p];
                        return (
                          <span
                            key={p}
                            className="text-[10px] px-1.5 py-0.5 rounded text-white"
                            style={{ backgroundColor: cfg?.color ?? '#999' }}
                          >
                            {cfg?.name ?? p}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* 草稿标签 */}
                  {d.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {d.tags.slice(0, 3).map((t, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1 border-t">
                    <div className="flex items-center gap-3 text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(d.updatedAt)}
                      </span>
                      {d.versionCount > 1 && <span>v{d.versionCount}</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Link href={`/editor?id=${d.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 hover:text-red-500"
                        onClick={() => setDeletingDraft(d)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 删除确认弹窗 */}
      <AlertDialog
        open={!!deletingDraft}
        onOpenChange={(open) => { if (!open) setDeletingDraft(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除草稿</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{deletingDraft?.title || '无标题'}」吗？删除后不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
