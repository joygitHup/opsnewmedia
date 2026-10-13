'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Send,
  ShieldCheck,
  Users2,
  Link2,
  Info,
  CheckCheck,
  Loader2,
  Inbox,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  notificationsApi,
  type AppNotification,
  type NotificationType,
} from '@/lib/api/notifications';

// 类型 → 图标 / 颜色 / 标签
const TYPE_META: Record<
  NotificationType,
  { icon: typeof Bell; color: string; bg: string; label: string }
> = {
  publish: {
    icon: Send,
    color: 'text-indigo-600 dark:text-indigo-400',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
    label: '发布动态',
  },
  review: {
    icon: ShieldCheck,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    label: '审核动态',
  },
  team: {
    icon: Users2,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    label: '团队动态',
  },
  account: {
    icon: Link2,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    label: '账号动态',
  },
  system: {
    icon: Info,
    color: 'text-zinc-500 dark:text-zinc-400',
    bg: 'bg-zinc-100 dark:bg-zinc-800',
    label: '系统通知',
  },
};

const FILTERS: { value: NotificationType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'publish', label: '发布动态' },
  { value: 'review', label: '审核动态' },
  { value: 'team', label: '团队动态' },
  { value: 'account', label: '账号动态' },
  { value: 'system', label: '系统通知' },
];

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < min) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / min)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)} 天前`;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchList = useCallback(
    async (reset: boolean) => {
      const nextPage = reset ? 1 : page + 1;
      if (reset) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await notificationsApi.list({
          type: typeFilter === 'all' ? undefined : typeFilter,
          isRead: unreadOnly ? false : undefined,
          page: nextPage,
          pageSize,
        });
        setItems((prev) => (reset ? res.list : [...prev, ...res.list]));
        setTotal(res.total);
        setPage(nextPage);
      } catch (err) {
        toast.error((err as Error).message || '加载失败');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [page, pageSize, typeFilter, unreadOnly],
  );

  useEffect(() => {
    fetchList(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, unreadOnly]);

  const handleClick = async (n: AppNotification) => {
    if (!n.isRead) {
      // 乐观更新
      setItems((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)),
      );
      try {
        await notificationsApi.markRead(n.id);
      } catch {
        // 静默失败，不阻塞跳转
      }
    }
    if (n.link) {
      router.push(n.link);
    }
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllRead(
        typeFilter === 'all' ? undefined : typeFilter,
      );
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
      toast.success('已全部标记为已读');
    } catch (err) {
      toast.error((err as Error).message || '操作失败');
    } finally {
      setMarkingAll(false);
    }
  };

  const hasMore = items.length < total;
  const unreadCount = items.filter((x) => !x.isRead).length;

  return (
    <div className="space-y-4">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">消息中心</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            发布结果、审核进度与团队动态
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={handleMarkAll}
          disabled={markingAll || unreadCount === 0}
        >
          {markingAll ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <CheckCheck className="w-3.5 h-3.5" />
          )}
          全部已读
        </Button>
      </div>

      {/* 筛选 */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setTypeFilter(f.value)}
            className={cn(
              'px-3 py-1 rounded-full text-xs border transition-colors',
              typeFilter === f.value
                ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900',
            )}
          >
            {f.label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => setUnreadOnly((v) => !v)}
          className={cn(
            'px-3 py-1 rounded-full text-xs border transition-colors',
            unreadOnly
              ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
              : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900',
          )}
        >
          仅看未读
        </button>
      </div>

      {/* 列表 */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-3 animate-pulse">
                  <div className="w-9 h-9 rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-40 bg-zinc-100 dark:bg-zinc-800 rounded" />
                    <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-20 dark:border-zinc-700">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Inbox className="w-5 h-5 text-zinc-400" />
          </div>
          <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">
            暂无消息
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            发布内容或团队有新动态时会在这里提醒你
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const meta = TYPE_META[n.type] || TYPE_META.system;
            const Icon = meta.icon;
            return (
              <Card
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => handleClick(n)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleClick(n);
                }}
                className={cn(
                  'cursor-pointer transition-colors',
                  !n.isRead && 'border-indigo-200 dark:border-indigo-900',
                )}
              >
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                        meta.bg,
                      )}
                    >
                      <Icon className={cn('w-4.5 h-4.5', meta.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-sm truncate',
                            n.isRead
                              ? 'font-medium text-zinc-700 dark:text-zinc-300'
                              : 'font-semibold text-zinc-900 dark:text-zinc-100',
                          )}
                        >
                          {n.title}
                        </span>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                        )}
                      </div>
                      {n.content && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                          {n.content}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5">
                        <span
                          className={cn(
                            'text-[10px] px-1.5 py-0.5 rounded',
                            meta.bg,
                            meta.color,
                          )}
                        >
                          {meta.label}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {formatTime(n.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchList(false)}
                disabled={loadingMore}
              >
                {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                加载更多
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
