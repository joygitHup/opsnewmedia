'use client';

import { useState } from 'react';
import {
  Plus,
  MoreHorizontal,
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Trash2,
  Edit2,
  Link2,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PLATFORM_CONFIG, type Account, type PlatformType } from '@/types';

// Mock 数据
const mockAccounts: Account[] = [
  {
    id: '1',
    platform: 'wechat',
    name: '科技前沿观察',
    status: 'active',
    followers: 125600,
    group: '科技矩阵',
    bindTime: '2024-01-15',
  },
  {
    id: '2',
    platform: 'xiaohongshu',
    name: '科技好物分享',
    status: 'active',
    followers: 58200,
    group: '科技矩阵',
    bindTime: '2024-02-20',
  },
  {
    id: '3',
    platform: 'wechat',
    name: '职场成长笔记',
    status: 'active',
    followers: 89400,
    group: '职场矩阵',
    bindTime: '2024-03-10',
  },
  {
    id: '4',
    platform: 'xiaohongshu',
    name: '生活研究所',
    status: 'expired',
    followers: 32100,
    group: '生活矩阵',
    bindTime: '2024-04-05',
  },
  {
    id: '5',
    platform: 'douyin',
    name: '程序员小李',
    status: 'active',
    followers: 256800,
    group: '科技矩阵',
    bindTime: '2024-01-20',
  },
  {
    id: '6',
    platform: 'zhihu',
    name: '产品老王',
    status: 'active',
    followers: 45200,
    group: '职场矩阵',
    bindTime: '2024-03-15',
  },
  {
    id: '7',
    platform: 'weibo',
    name: '科技每日报',
    status: 'error',
    followers: 168000,
    group: '科技矩阵',
    bindTime: '2024-02-01',
  },
  {
    id: '8',
    platform: 'bilibili',
    name: '硬核科技',
    status: 'active',
    followers: 98500,
    group: '科技矩阵',
    bindTime: '2024-05-10',
  },
];

const groups = ['全部分组', '科技矩阵', '职场矩阵', '生活矩阵'];

function getStatusInfo(status: Account['status']) {
  switch (status) {
    case 'active':
      return { label: '正常', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/50' };
    case 'expired':
      return { label: '已过期', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/50' };
    case 'error':
      return { label: '异常', icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/50' };
  }
}

function PlatformIcon({ platform }: { platform: PlatformType }) {
  const config = PLATFORM_CONFIG[platform];
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold"
      style={{ backgroundColor: config.color }}
    >
      {config.name.slice(0, 1)}
    </div>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>(mockAccounts);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGroup, setFilterGroup] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);
  const [addStep, setAddStep] = useState<'select' | 'auth'>('select');
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | null>(null);

  const filteredAccounts = accounts.filter((account) => {
    if (searchQuery && !account.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (filterPlatform !== 'all' && account.platform !== filterPlatform) return false;
    if (filterStatus !== 'all' && account.status !== filterStatus) return false;
    if (filterGroup !== 'all' && account.group !== filterGroup) return false;
    return true;
  });

  const stats = {
    total: accounts.length,
    active: accounts.filter((a) => a.status === 'active').length,
    expired: accounts.filter((a) => a.status === 'expired').length,
    error: accounts.filter((a) => a.status === 'error').length,
  };

  const handleDelete = () => {
    if (deleteAccountId) {
      setAccounts(accounts.filter((a) => a.id !== deleteAccountId));
      setDeleteAccountId(null);
    }
  };

  const handleRefreshAuth = (id: string) => {
    setAccounts(accounts.map((a) => (a.id === id ? { ...a, status: 'active' as const } : a)));
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">账号管理</h1>
          <p className="text-sm text-zinc-500 mt-1">管理所有平台账号，一键授权，统一管理</p>
        </div>
        <Button
          onClick={() => {
            setShowAddDialog(true);
            setAddStep('select');
          }}
          className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
        >
          <Plus className="w-4 h-4" />
          添加账号
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-zinc-500">账号总数</div>
              </div>
              <Users className="w-8 h-8 text-indigo-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-emerald-500">{stats.active}</div>
                <div className="text-sm text-zinc-500">正常运行</div>
              </div>
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-amber-500">{stats.expired}</div>
                <div className="text-sm text-zinc-500">授权过期</div>
              </div>
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-500">{stats.error}</div>
                <div className="text-sm text-zinc-500">状态异常</div>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 筛选栏 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <Input
                placeholder="搜索账号名称..."
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select defaultValue="all" onValueChange={setFilterPlatform}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder="全部平台" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部平台</SelectItem>
                {(Object.keys(PLATFORM_CONFIG) as PlatformType[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {PLATFORM_CONFIG[key].name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select defaultValue="all" onValueChange={setFilterStatus}>
              <SelectTrigger className="w-28 h-9">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">正常</SelectItem>
                <SelectItem value="expired">已过期</SelectItem>
                <SelectItem value="error">异常</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all" onValueChange={setFilterGroup}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder="全部分组" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group} value={group === '全部分组' ? 'all' : group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex-1" />
            <div className="flex items-center border rounded-md p-0.5">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('grid')}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('list')}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 账号列表 - 网格视图 */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAccounts.map((account) => {
            const statusInfo = getStatusInfo(account.status);
            const StatusIcon = statusInfo.icon;
            return (
              <Card key={account.id} className="hover:shadow-md transition-shadow group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <PlatformIcon platform={account.platform} />
                      <div>
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {account.name}
                        </div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {PLATFORM_CONFIG[account.platform].name}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuLabel>账号操作</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="gap-2 cursor-pointer">
                          <Edit2 className="w-4 h-4" />
                          编辑信息
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer"
                          onClick={() => handleRefreshAuth(account.id)}
                        >
                          <RefreshCw className="w-4 h-4" />
                          刷新授权
                        </DropdownMenuItem>
                        <DropdownMenuItem className="gap-2 cursor-pointer">
                          <Link2 className="w-4 h-4" />
                          分组管理
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer text-red-500"
                          onClick={() => setDeleteAccountId(account.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                          解绑账号
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                          {account.followers.toLocaleString()}
                        </div>
                        <div className="text-xs text-zinc-500">粉丝数</div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${statusInfo.bg}`}>
                        <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.color}`} />
                        <span className={`text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {account.group && (
                    <div className="mt-3 flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {account.group}
                      </Badge>
                      <span className="text-xs text-zinc-400">绑定于 {account.bindTime}</span>
                    </div>
                  )}

                  {account.status !== 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3 h-8 text-xs"
                      onClick={() => handleRefreshAuth(account.id)}
                    >
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                      重新授权
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* 账号列表 - 列表视图 */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {filteredAccounts.map((account) => {
                const statusInfo = getStatusInfo(account.status);
                const StatusIcon = statusInfo.icon;
                return (
                  <div
                    key={account.id}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <PlatformIcon platform={account.platform} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {account.name}
                      </div>
                      <div className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                        <span>{PLATFORM_CONFIG[account.platform].name}</span>
                        {account.group && (
                          <>
                            <span>·</span>
                            <span>{account.group}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">
                        {account.followers.toLocaleString()}
                      </div>
                      <div className="text-xs text-zinc-500">粉丝</div>
                    </div>
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${statusInfo.bg} w-20 justify-center`}>
                      <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.color}`} />
                      <span className={`text-xs font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 w-24 text-right">
                      {account.bindTime}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="gap-2 cursor-pointer">
                          <Edit2 className="w-4 h-4" />
                          编辑信息
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer"
                          onClick={() => handleRefreshAuth(account.id)}
                        >
                          <RefreshCw className="w-4 h-4" />
                          刷新授权
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="gap-2 cursor-pointer text-red-500"
                          onClick={() => setDeleteAccountId(account.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                          解绑账号
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {filteredAccounts.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <div className="text-zinc-500">没有找到匹配的账号</div>
          </CardContent>
        </Card>
      )}

      {/* 添加账号弹窗 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          {addStep === 'select' && (
            <>
              <DialogHeader>
                <DialogTitle>添加账号</DialogTitle>
                <DialogDescription>
                  选择要授权的平台，完成账号绑定
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-3 gap-3 py-4">
                {(Object.keys(PLATFORM_CONFIG) as PlatformType[]).map((platform) => {
                  const config = PLATFORM_CONFIG[platform];
                  return (
                    <button
                      key={platform}
                      onClick={() => {
                        setSelectedPlatform(platform);
                        setAddStep('auth');
                      }}
                      className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-zinc-200 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-zinc-700 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/30 transition-all"
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold"
                        style={{ backgroundColor: config.color }}
                      >
                        {config.name.slice(0, 1)}
                      </div>
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        {config.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {addStep === 'auth' && selectedPlatform && (
            <>
              <DialogHeader>
                <DialogTitle>
                  授权{PLATFORM_CONFIG[selectedPlatform].name}账号
                </DialogTitle>
                <DialogDescription>
                  请使用{PLATFORM_CONFIG[selectedPlatform].name}扫码或登录授权
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center py-8">
                <div
                  className="w-48 h-48 rounded-xl flex items-center justify-center text-white text-4xl font-bold mb-4"
                  style={{ backgroundColor: PLATFORM_CONFIG[selectedPlatform].color }}
                >
                  <svg className="w-16 h-16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </svg>
                </div>
                <p className="text-sm text-zinc-500">
                  请打开{PLATFORM_CONFIG[selectedPlatform].name}APP扫码授权
                </p>
                <p className="text-xs text-zinc-400 mt-2">二维码有效期：5分钟</p>
              </div>
              <DialogFooter className="flex justify-between">
                <Button variant="ghost" onClick={() => setAddStep('select')}>
                  返回选择
                </Button>
                <Button
                  onClick={() => {
                    setShowAddDialog(false);
                    setAddStep('select');
                  }}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                >
                  我已完成授权
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 删除确认弹窗 */}
      <AlertDialog open={!!deleteAccountId} onOpenChange={() => setDeleteAccountId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认解绑账号？</AlertDialogTitle>
            <AlertDialogDescription>
              解绑后将无法再通过该账号发布内容，已发布的内容不受影响。此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={handleDelete}>
              确认解绑
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
