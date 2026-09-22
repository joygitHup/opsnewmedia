'use client';

import { useState } from 'react';
import {
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  MoreHorizontal,
  Plus,
  Search,
  Filter,
  Calendar,
  Trash2,
  ChevronRight,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { PLATFORM_CONFIG, type PlatformType } from '@/types';

interface PublishTask {
  id: string;
  title: string;
  platform: PlatformType;
  account: string;
  status: 'pending' | 'publishing' | 'success' | 'failed';
  scheduledTime?: string;
  publishTime?: string;
  errorMsg?: string;
  views?: number;
  likes?: number;
  comments?: number;
}

const mockTasks: PublishTask[] = [
  {
    id: '1',
    title: '2024年最值得关注的10个AI工具，效率提升200%',
    platform: 'wechat',
    account: '科技前沿观察',
    status: 'success',
    publishTime: '2024-01-15 10:30',
    views: 35680,
    likes: 2156,
    comments: 186,
  },
  {
    id: '2',
    title: '打工人必备！5个免费又好用的效率神器',
    platform: 'xiaohongshu',
    account: '科技好物分享',
    status: 'success',
    publishTime: '2024-01-15 09:00',
    views: 28940,
    likes: 3421,
    comments: 256,
  },
  {
    id: '3',
    title: '深度解读：AI时代的职场生存法则',
    platform: 'zhihu',
    account: '产品老王',
    status: 'publishing',
    scheduledTime: '2024-01-16 14:00',
  },
  {
    id: '4',
    title: '周末vlog｜程序员的一天',
    platform: 'douyin',
    account: '程序员小李',
    status: 'pending',
    scheduledTime: '2024-01-17 18:00',
  },
  {
    id: '5',
    title: '一分钟学会ChatGPT高级用法',
    platform: 'bilibili',
    account: '硬核科技',
    status: 'pending',
    scheduledTime: '2024-01-17 20:00',
  },
  {
    id: '6',
    title: '今日科技热点速览',
    platform: 'weibo',
    account: '科技每日报',
    status: 'failed',
    scheduledTime: '2024-01-15 12:00',
    errorMsg: '账号授权已过期，请重新授权',
  },
  {
    id: '7',
    title: '年终总结｜我的2024年度书单推荐',
    platform: 'wechat',
    account: '职场成长笔记',
    status: 'success',
    publishTime: '2024-01-14 08:30',
    views: 18620,
    likes: 986,
    comments: 124,
  },
  {
    id: '8',
    title: '好物分享｜这5件东西太值了',
    platform: 'xiaohongshu',
    account: '生活研究所',
    status: 'pending',
    scheduledTime: '2024-01-16 10:00',
  },
];

function getStatusInfo(status: PublishTask['status']) {
  switch (status) {
    case 'pending':
      return { label: '待发布', icon: Clock, color: 'text-zinc-500', bg: 'bg-zinc-100 dark:bg-zinc-800' };
    case 'publishing':
      return { label: '发布中', icon: RefreshCw, color: 'text-indigo-500', bg: 'bg-indigo-100 dark:bg-indigo-950/50' };
    case 'success':
      return { label: '已发布', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-100 dark:bg-emerald-950/50' };
    case 'failed':
      return { label: '发布失败', icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-950/50' };
  }
}

export default function DistributePage() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewPublishDialog, setShowNewPublishDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState<PublishTask | null>(null);
  const [progress, setProgress] = useState(45);

  // 模拟发布进度
  const startPublish = () => {
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          toast.success('发布成功！');
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 500);
  };

  const filteredTasks = mockTasks.filter((task) => {
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeTab === 'all') return true;
    return task.status === activeTab;
  });

  const stats = {
    total: mockTasks.length,
    pending: mockTasks.filter((t) => t.status === 'pending').length,
    publishing: mockTasks.filter((t) => t.status === 'publishing').length,
    success: mockTasks.filter((t) => t.status === 'success').length,
    failed: mockTasks.filter((t) => t.status === 'failed').length,
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">一键分发</h1>
          <p className="text-sm text-zinc-500 mt-1">管理所有发布任务，查看发布状态和数据</p>
        </div>
        <Button
          onClick={() => setShowNewPublishDialog(true)}
          className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
        >
          <Plus className="w-4 h-4" />
          新建发布
        </Button>
      </div>

      {/* 统计概览 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-zinc-500 mt-0.5">全部任务</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-zinc-500">{stats.pending}</div>
            <div className="text-sm text-zinc-500 mt-0.5">待发布</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-indigo-500">{stats.publishing}</div>
            <div className="text-sm text-zinc-500 mt-0.5">发布中</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-500">{stats.success}</div>
            <div className="text-sm text-zinc-500 mt-0.5">已发布</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-500">{stats.failed}</div>
            <div className="text-sm text-zinc-500 mt-0.5">发布失败</div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选和列表 */}
      <Card>
        <CardHeader className="pb-0">
          <div className="flex items-center justify-between">
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="pending">待发布</TabsTrigger>
                <TabsTrigger value="publishing">发布中</TabsTrigger>
                <TabsTrigger value="success">已发布</TabsTrigger>
                <TabsTrigger value="failed">失败</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-2">
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  placeholder="搜索标题..."
                  className="pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="outline" size="sm" className="h-9">
                <Filter className="w-4 h-4 mr-1.5" />
                筛选
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3">
            {filteredTasks.map((task) => {
              const statusInfo = getStatusInfo(task.status);
              const StatusIcon = statusInfo.icon;
              const pConfig = PLATFORM_CONFIG[task.platform];
              return (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                >
                  {/* 平台图标 */}
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: pConfig.color }}
                  >
                    {pConfig.name.slice(0, 1)}
                  </div>

                  {/* 标题和账号 */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {task.title}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                      <span>{pConfig.name}</span>
                      <span>·</span>
                      <span>{task.account}</span>
                      {task.scheduledTime && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {task.scheduledTime}
                          </span>
                        </>
                      )}
                      {task.publishTime && (
                        <>
                          <span>·</span>
                          <span>{task.publishTime}</span>
                        </>
                      )}
                    </div>
                    {task.status === 'publishing' && (
                      <div className="mt-2 w-48">
                        <Progress value={progress} className="h-1.5" />
                      </div>
                    )}
                    {task.status === 'failed' && task.errorMsg && (
                      <div className="mt-1 text-xs text-red-500">
                        失败原因：{task.errorMsg}
                      </div>
                    )}
                  </div>

                  {/* 数据统计（已发布的） */}
                  {task.status === 'success' && task.views && (
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {task.views.toLocaleString()}
                        </div>
                        <div className="text-xs text-zinc-500">阅读</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {task.likes?.toLocaleString()}
                        </div>
                        <div className="text-xs text-zinc-500">点赞</div>
                      </div>
                      <div className="text-center">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100">
                          {task.comments?.toLocaleString()}
                        </div>
                        <div className="text-xs text-zinc-500">评论</div>
                      </div>
                    </div>
                  )}

                  {/* 状态标签 */}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${statusInfo.bg}`}>
                    <StatusIcon className={`w-4 h-4 ${statusInfo.color} ${task.status === 'publishing' ? 'animate-spin' : ''}`} />
                    <span className={`text-sm font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuLabel>操作</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {task.status === 'pending' && (
                          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={startPublish}>
                            <Send className="w-4 h-4" />
                            立即发布
                          </DropdownMenuItem>
                        )}
                        {task.status === 'failed' && (
                          <DropdownMenuItem className="gap-2 cursor-pointer" onClick={startPublish}>
                            <RefreshCw className="w-4 h-4" />
                            重新发布
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="gap-2 cursor-pointer">
                          <Eye className="w-4 h-4" />
                          查看详情
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 cursor-pointer text-red-500">
                          <Trash2 className="w-4 h-4" />
                          删除任务
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTasks.length === 0 && (
            <div className="py-16 text-center">
              <div className="text-4xl mb-3">📭</div>
              <div className="text-zinc-500">暂无发布任务</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 新建发布弹窗 */}
      <Dialog open={showNewPublishDialog} onOpenChange={setShowNewPublishDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>新建发布任务</DialogTitle>
            <DialogDescription>选择内容和平台，设置发布参数</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 py-2">
              {/* 选择内容 */}
              <div>
                <Label className="text-sm font-medium mb-2 block">选择内容</Label>
                <Card className="cursor-pointer border-2 border-transparent hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white">
                        📝
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          2024年最值得关注的10个AI工具，效率提升200%
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          上次编辑：2024-01-15 14:30 · 字数：约 2500 字
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-zinc-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 选择平台 */}
              <div>
                <Label className="text-sm font-medium mb-2 block">选择发布平台</Label>
                <div className="grid grid-cols-3 gap-3">
                  {(['wechat', 'xiaohongshu', 'douyin', 'zhihu', 'weibo', 'bilibili'] as PlatformType[]).map(
                    (platform) => {
                      const config = PLATFORM_CONFIG[platform];
                      return (
                        <div
                          key={platform}
                          className="p-3 border rounded-lg cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/30 transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: config.color }}
                            >
                              {config.name.slice(0, 1)}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium">{config.name}</div>
                              <div className="text-xs text-zinc-500">2 个账号</div>
                            </div>
                            <div className="w-4 h-4 rounded-full border-2 border-zinc-300" />
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>

              {/* 发布方式 */}
              <div>
                <Label className="text-sm font-medium mb-2 block">发布方式</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="cursor-pointer border-2 border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Send className="w-6 h-6 text-indigo-500" />
                        <div>
                          <div className="font-medium">立即发布</div>
                          <div className="text-xs text-zinc-500">审核通过后立即发布</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover:border-indigo-300 transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Clock className="w-6 h-6 text-zinc-500" />
                        <div>
                          <div className="font-medium">定时发布</div>
                          <div className="text-xs text-zinc-500">选择时间自动发布</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* 高级选项 */}
              <div>
                <Label className="text-sm font-medium mb-2 block">高级选项</Label>
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">智能排版适配</div>
                      <div className="text-xs text-zinc-500">
                        根据各平台特性自动调整内容格式
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">自动生成标题</div>
                      <div className="text-xs text-zinc-500">
                        AI 根据平台风格优化标题
                      </div>
                    </div>
                    <Switch />
                  </div>
                  <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">错峰发布</div>
                      <div className="text-xs text-zinc-500">
                        按各平台流量高峰时段错开发布
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="border-t border-zinc-200 dark:border-zinc-700 pt-3 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">失败自动重试</div>
                      <div className="text-xs text-zinc-500">发布失败自动重试最多 3 次</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="pt-4 border-t mt-2">
            <Button variant="outline" onClick={() => setShowNewPublishDialog(false)}>
              取消
            </Button>
            <Button
              onClick={() => {
                setShowNewPublishDialog(false);
                toast.success('发布任务已创建');
                startPublish();
              }}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              <Send className="w-4 h-4 mr-1.5" />
              确认发布
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
