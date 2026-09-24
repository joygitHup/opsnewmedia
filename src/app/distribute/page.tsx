'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { PLATFORM_CONFIG, type PlatformType } from '@/types';
import { publishApi, type PublishTask } from '@/lib/api/publish';
import { useAuth } from '@/lib/auth/AuthProvider';
import { toast } from 'sonner';

const STATUS_INFO: Record<string, { label: string; icon: typeof CheckCircle2; color: string; cls: string }> = {
  pending: { label: '待发布', icon: Clock, color: 'text-zinc-500', cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
  publishing: { label: '发布中', icon: Loader2, color: 'text-indigo-500', cls: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400' },
  success: { label: '已发布', icon: CheckCircle2, color: 'text-emerald-500', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' },
  failed: { label: '失败', icon: AlertCircle, color: 'text-red-500', cls: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400' },
  canceled: { label: '已取消', icon: Trash2, color: 'text-zinc-400', cls: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400' },
};

function formatTime(s: string | null): string {
  if (!s) return '-';
  try {
    const d = new Date(s);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  } catch {
    return s;
  }
}

export default function DistributePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<PublishTask[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [keyword, setKeyword] = useState('');

  const fetchTasks = useCallback(async () => {
    if (!user?.currentTeamId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const query: Record<string, string | number | undefined> = {
        teamId: user.currentTeamId,
        pageSize: 50,
      };
      if (filterStatus !== 'all') query.status = filterStatus;
      if (keyword) query.search = keyword;
      const res = await publishApi.list(query);
      setTasks(res.list);
    } catch (err) {
      toast.error('加载任务失败：' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user?.currentTeamId, filterStatus, keyword]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleRetry = async (task: PublishTask) => {
    try {
      await publishApi.retry(task.id);
      toast.success('已重试');
      await fetchTasks();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleCancel = async (task: PublishTask) => {
    if (!confirm('确认取消此任务？')) return;
    try {
      await publishApi.cancel(task.id, '用户取消');
      toast.success('已取消');
      await fetchTasks();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const counts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    publishing: tasks.filter((t) => t.status === 'publishing').length,
    success: tasks.filter((t) => t.status === 'success').length,
    failed: tasks.filter((t) => t.status === 'failed').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">发布分发</h1>
          <p className="text-sm text-zinc-500 mt-1">管理多平台发布任务</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchTasks}>
          <RefreshCw className="w-4 h-4 mr-1" />
          刷新
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="全部状态" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">待发布</SelectItem>
            <SelectItem value="publishing">发布中</SelectItem>
            <SelectItem value="success">已发布</SelectItem>
            <SelectItem value="failed">失败</SelectItem>
            <SelectItem value="canceled">已取消</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="搜索任务..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-64 h-9"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : (
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">全部 ({counts.all})</TabsTrigger>
            <TabsTrigger value="pending">待发布 ({counts.pending})</TabsTrigger>
            <TabsTrigger value="publishing">发布中 ({counts.publishing})</TabsTrigger>
            <TabsTrigger value="success">已发布 ({counts.success})</TabsTrigger>
            <TabsTrigger value="failed">失败 ({counts.failed})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-4">
            <TaskList tasks={tasks} onRetry={handleRetry} onCancel={handleCancel} />
          </TabsContent>
          <TabsContent value="pending" className="mt-4">
            <TaskList tasks={tasks.filter((t) => t.status === 'pending')} onRetry={handleRetry} onCancel={handleCancel} />
          </TabsContent>
          <TabsContent value="publishing" className="mt-4">
            <TaskList tasks={tasks.filter((t) => t.status === 'publishing')} onRetry={handleRetry} onCancel={handleCancel} />
          </TabsContent>
          <TabsContent value="success" className="mt-4">
            <TaskList tasks={tasks.filter((t) => t.status === 'success')} onRetry={handleRetry} onCancel={handleCancel} />
          </TabsContent>
          <TabsContent value="failed" className="mt-4">
            <TaskList tasks={tasks.filter((t) => t.status === 'failed')} onRetry={handleRetry} onCancel={handleCancel} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function TaskList({
  tasks,
  onRetry,
  onCancel,
}: {
  tasks: PublishTask[];
  onRetry: (task: PublishTask) => void;
  onCancel: (task: PublishTask) => void;
}) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-zinc-400">
        暂无任务
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const cfg = PLATFORM_CONFIG[task.platform as PlatformType] || PLATFORM_CONFIG.wechat;
        const info = STATUS_INFO[task.status] || STATUS_INFO.pending;
        const StatusIcon = info.icon;
        return (
          <Card key={task.id} className="hover:shadow-sm transition-shadow">
            <CardContent className="p-4 flex items-center gap-4">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: cfg.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {task.draftTitle || '未命名'}
                  </span>
                  <Badge variant="outline" className="h-5 text-[10px] px-1.5 font-normal" style={{ borderColor: cfg.color, color: cfg.color }}>
                    {cfg.name}
                  </Badge>
                </div>
                <div className="text-xs text-zinc-500 mt-1 flex items-center gap-2 flex-wrap">
                  <span>{task.accountName || '-'}</span>
                  <span>·</span>
                  <span>计划：{formatTime(task.scheduledAt)}</span>
                  <span>·</span>
                  <span>发布：{formatTime(task.publishedAt)}</span>
                  {task.retryCount > 0 && (
                    <>
                      <span>·</span>
                      <span className="text-amber-500">已重试 {task.retryCount}/{task.maxRetries}</span>
                    </>
                  )}
                </div>
                {task.errorMsg && (
                  <div className="text-xs text-red-500 mt-1 truncate">
                    {task.errorMsg}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge className={`text-[10px] h-5 font-normal ${info.cls}`} variant="secondary">
                  <StatusIcon className={`w-3 h-3 mr-1 ${task.status === 'publishing' ? 'animate-spin' : ''}`} />
                  {info.label}
                </Badge>
                {(task.status === 'failed' || task.status === 'canceled') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => onRetry(task)}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    重试
                  </Button>
                )}
                {(task.status === 'pending' || task.status === 'publishing') && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-red-500"
                    onClick={() => onCancel(task)}
                  >
                    取消
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
