'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  ClipboardCheck,
  RefreshCw,
  Loader2,
  FileText,
  Clock,
  User,
  Check,
  X,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PLATFORM_CONFIG } from '@/types';
import { reviewsApi, type ReviewFlow } from '@/lib/api/reviews';
import { contentApi, type ContentDraft, type ContentDraftDetail } from '@/lib/api/content';
import { markdownToHtml } from '@/lib/markdown';
import { useAuth } from '@/lib/auth/AuthProvider';
import { toast } from 'sonner';

const STAGE_INFO: Record<string, { label: string; className: string }> = {
  submit: { label: '待审核', className: 'bg-amber-100 text-amber-700' },
  approve: { label: '复审中', className: 'bg-indigo-100 text-indigo-700' },
  final: { label: '终审中', className: 'bg-purple-100 text-purple-700' },
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [flows, setFlows] = useState<ReviewFlow[]>([]);
  const [drafts, setDrafts] = useState<Record<number, ContentDraft>>({});

  const [selectedFlow, setSelectedFlow] = useState<ReviewFlow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState<ContentDraftDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [acting, setActing] = useState<null | 'approve' | 'reject'>(null);

  const fetchPending = useCallback(
    async (silent = false) => {
      if (!user?.currentTeamId) {
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const [flowList, draftRes] = await Promise.all([
          reviewsApi.pending(),
          contentApi.list({ teamId: user.currentTeamId, pageSize: 100 }),
        ]);
        const map: Record<number, ContentDraft> = {};
        draftRes.list.forEach((d) => {
          map[d.id] = d;
        });
        setFlows(flowList);
        setDrafts(map);
      } catch (err) {
        if (!silent) toast.error('加载待审列表失败：' + (err as Error).message);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user?.currentTeamId],
  );

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const openDetail = async (flow: ReviewFlow) => {
    setSelectedFlow(flow);
    setDetailOpen(true);
    setDetail(null);
    setComment('');
    setDetailLoading(true);
    try {
      const d = await contentApi.detail(flow.draft);
      setDetail(d);
    } catch (err) {
      toast.error('加载草稿详情失败：' + (err as Error).message);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedFlow(null);
    setDetail(null);
    setComment('');
  };

  const handleApprove = async () => {
    if (!selectedFlow) return;
    setActing('approve');
    try {
      await reviewsApi.approve(selectedFlow.id, comment.trim() || undefined);
      toast.success('已通过审核');
      closeDetail();
      await fetchPending(true);
    } catch (err) {
      toast.error('审核通过失败：' + (err as Error).message);
    } finally {
      setActing(null);
    }
  };

  const handleReject = async () => {
    if (!selectedFlow) return;
    const text = comment.trim();
    if (!text) {
      toast.warning('请填写驳回意见');
      return;
    }
    setActing('reject');
    try {
      await reviewsApi.reject(selectedFlow.id, text);
      toast.success('已驳回');
      closeDetail();
      await fetchPending(true);
    } catch (err) {
      toast.error('驳回失败：' + (err as Error).message);
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-indigo-500" />
            待审内容
          </h1>
          <p className="text-sm text-zinc-500 mt-1">审核团队草稿，通过或驳回并填写意见</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchPending()} className="gap-1.5">
          <RefreshCw className="w-4 h-4" />
          刷新
        </Button>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : flows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
          <ClipboardCheck className="w-12 h-12 mb-3" />
          <p className="text-sm">暂无待审核内容</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flows.map((flow) => {
            const draft = drafts[flow.draft];
            const stage = STAGE_INFO[flow.current_stage] ?? STAGE_INFO.submit;
            return (
              <Card key={flow.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() => openDetail(flow)}
                    className="flex w-full items-center gap-4 p-4 text-left"
                  >
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium truncate max-w-md">
                          {flow.draftTitle || draft?.title || '无标题'}
                        </h3>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${stage.className}`}
                        >
                          {stage.label}
                        </span>
                        {draft?.contentType === 'video' && (
                          <Badge variant="outline" className="text-[10px]">
                            视频
                          </Badge>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {flow.submittedByName || draft?.authorName || '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          提交于 {formatDate(flow.submitted_at || flow.created_at)}
                        </span>
                      </div>
                      {draft?.platforms?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {draft.platforms.map((p) => {
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
                      ) : (
                        <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-zinc-400">
                          目标平台：—
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-zinc-400 flex-shrink-0" />
                  </button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 审核详情弹窗 */}
      <Dialog
        open={detailOpen}
        onOpenChange={(open) => {
          if (!open) closeDetail();
        }}
      >
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="truncate">
              {selectedFlow?.draftTitle || detail?.title || '草稿详情'}
            </DialogTitle>
            <DialogDescription>
              {selectedFlow?.submittedByName || detail?.authorName || '—'} · 提交于{' '}
              {formatDate(selectedFlow?.submitted_at ?? selectedFlow?.created_at ?? null)}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
            {detailLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
              </div>
            ) : detail ? (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  {detail.platforms?.length ? (
                    detail.platforms.map((p) => {
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
                    })
                  ) : (
                    <span className="text-xs text-zinc-400">未设置目标平台</span>
                  )}
                  {detail.tags?.map((t, i) => (
                    <Badge key={`${t}-${i}`} variant="secondary" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>
                <div
                  className="md-preview rounded-lg border border-zinc-200 bg-white p-6 text-sm dark:border-zinc-800 dark:bg-zinc-900"
                  dangerouslySetInnerHTML={{
                    __html: markdownToHtml(detail.contentMd || ''),
                  }}
                />
              </>
            ) : (
              <div className="flex items-center justify-center py-16 text-sm text-zinc-400">
                草稿内容加载失败
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="review-comment" className="text-xs">
              审核意见
              <span className="text-red-500">（驳回必填）</span>
            </Label>
            <Textarea
              id="review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="填写审核意见…"
              className="min-h-[72px]"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleReject}
              disabled={acting !== null || detailLoading}
            >
              {acting === 'reject' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <X className="w-4 h-4" />
              )}
              驳回
            </Button>
            <Button
              className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600"
              onClick={handleApprove}
              disabled={acting !== null || detailLoading}
            >
              {acting === 'approve' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              通过
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
