'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Users,
  Trash2,
  Link2,
  Loader2,
  ArrowLeft,
  ChevronDown,
  ShieldCheck,
  Keyboard,
  Check,
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
import { Label } from '@/components/ui/label';
import { PLATFORM_CONFIG, type PlatformType } from '@/types';
import { accountsApi, type Account } from '@/lib/api/accounts';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

function formatFollowers(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  return n.toLocaleString();
}

export default function AccountsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filterPlatform, setFilterPlatform] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const [showBind, setShowBind] = useState(false);

  // 绑定表单
  const [bindPlatform, setBindPlatform] = useState<PlatformType>('wechat');
  const [bindName, setBindName] = useState('');
  const [bindGroup, setBindGroup] = useState('');
  const [bindAccountId, setBindAccountId] = useState('');
  const [bindSubmitting, setBindSubmitting] = useState(false);
  // 弹窗步骤：1 选平台 → 2 选授权方式；manualOpen 控制手动录入表单展开
  const [bindStep, setBindStep] = useState<1 | 2>(1);
  const [manualOpen, setManualOpen] = useState(false);

  const openBindDialog = () => {
    setBindStep(1);
    setManualOpen(false);
    setShowBind(true);
  };

  const resetBindForm = () => {
    setBindName('');
    setBindGroup('');
    setBindAccountId('');
    setManualOpen(false);
    setBindStep(1);
  };

  const fetchAccounts = useCallback(async () => {
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
      if (filterPlatform !== 'all') query.platform = filterPlatform;
      if (keyword) query.search = keyword;
      const res = await accountsApi.list(query);
      setAccounts(res.list);
    } catch (err) {
      toast.error('加载账号失败：' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user?.currentTeamId, filterPlatform, keyword]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleBind = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bindName) {
      toast.warning('请填写账号昵称');
      return;
    }
    setBindSubmitting(true);
    try {
      await accountsApi.create({
        platform: bindPlatform,
        name: bindName,
        accountGroup: bindGroup,
        platformAccountId: bindAccountId,
      });
      toast.success('账号已绑定');
      setShowBind(false);
      resetBindForm();
      await fetchAccounts();
    } catch (err) {
      toast.error('绑定失败：' + (err as Error).message);
    } finally {
      setBindSubmitting(false);
    }
  };

  const handleStatus = async (account: Account, status: Account['status']) => {
    try {
      await accountsApi.setStatus(account.id, status);
      toast.success('状态已更新');
      await fetchAccounts();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleDelete = async (account: Account) => {
    if (!confirm(`确认解绑账号「${account.name}」？`)) return;
    try {
      await accountsApi.remove(account.id);
      toast.success('账号已解绑');
      await fetchAccounts();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleOauth = async (platform: PlatformType) => {
    try {
      const result = await accountsApi.oauthStart({
        platform,
        redirectUri: typeof window !== 'undefined' ? `${window.location.origin}/api/v1/integrations/oauth/${platform}/callback/` : undefined,
      });
      if (typeof window !== 'undefined') {
        window.location.href = result.authorizeUrl;
      }
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">账号管理</h1>
          <p className="text-sm text-zinc-500 mt-1">绑定并管理各平台账号</p>
        </div>
        <Button
          onClick={openBindDialog}
          className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600"
        >
          <Plus className="w-4 h-4" />
          绑定账号
        </Button>
      </div>

      {/* 筛选 */}
      <div className="flex items-center gap-3">
        <Select value={filterPlatform} onValueChange={setFilterPlatform}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="全部平台" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部平台</SelectItem>
            {Object.entries(PLATFORM_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="搜索账号名..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-64 h-9"
        />
        <Button variant="outline" size="sm" onClick={fetchAccounts}>
          <RefreshCw className="w-4 h-4 mr-1" />
          刷新
        </Button>
      </div>

      {/* 账号列表 */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">全部 ({accounts.length})</TabsTrigger>
          <TabsTrigger value="active">已授权 ({accounts.filter((a) => a.status === 'active').length})</TabsTrigger>
          <TabsTrigger value="expired">已过期 ({accounts.filter((a) => a.status === 'expired').length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all" className="mt-4">
          <AccountGrid accounts={accounts} onStatus={handleStatus} onDelete={handleDelete} onBind={openBindDialog} />
        </TabsContent>
        <TabsContent value="active" className="mt-4">
          <AccountGrid accounts={accounts.filter((a) => a.status === 'active')} onStatus={handleStatus} onDelete={handleDelete} onBind={openBindDialog} />
        </TabsContent>
        <TabsContent value="expired" className="mt-4">
          <AccountGrid accounts={accounts.filter((a) => a.status === 'expired')} onStatus={handleStatus} onDelete={handleDelete} onBind={openBindDialog} />
        </TabsContent>
      </Tabs>

      {/* 绑定账号弹窗：两段式（选平台 → 选授权方式） */}
      <Dialog open={showBind} onOpenChange={(open) => { setShowBind(open); if (!open) resetBindForm(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>绑定账号</DialogTitle>
            <DialogDescription>
              {bindStep === 1 ? '选择要绑定的内容平台' : `为「${PLATFORM_CONFIG[bindPlatform].name}」选择授权方式`}
            </DialogDescription>
          </DialogHeader>

          {/* 步骤指示 */}
          <div className="flex items-center gap-2 text-xs">
            <span className={`flex items-center gap-1.5 font-medium ${bindStep >= 1 ? 'text-indigo-600' : 'text-zinc-400'}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${bindStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-zinc-200 text-zinc-500'}`}>1</span>
              选择平台
            </span>
            <span className="h-px w-8 bg-zinc-200" />
            <span className={`flex items-center gap-1.5 font-medium ${bindStep >= 2 ? 'text-indigo-600' : 'text-zinc-400'}`}>
              <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${bindStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-zinc-200 text-zinc-500'}`}>2</span>
              授权绑定
            </span>
          </div>

          {bindStep === 1 ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(PLATFORM_CONFIG).map(([key, cfg]) => {
                  const platform = key as PlatformType;
                  const active = bindPlatform === platform;
                  const boundCount = accounts.filter((a) => a.platform === platform).length;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setBindPlatform(platform)}
                      onDoubleClick={() => setBindStep(2)}
                      className={`relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                        active
                          ? 'border-indigo-500 bg-indigo-50/60 ring-1 ring-indigo-500 dark:bg-indigo-950/30'
                          : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900'
                      }`}
                    >
                      <span
                        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white"
                        style={{ backgroundColor: cfg.color }}
                      >
                        {cfg.name.slice(0, 1)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{cfg.name}</span>
                        <span className="block text-xs text-zinc-400">
                          {boundCount > 0 ? `已绑定 ${boundCount} 个` : '未绑定'}
                        </span>
                      </span>
                      {active && (
                        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-600 text-white">
                          <Check className="h-3 w-3" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowBind(false)}>取消</Button>
                <Button
                  onClick={() => setBindStep(2)}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600"
                >
                  下一步
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="space-y-3">
              {/* 已选平台回显 */}
              <div className="flex items-center gap-2.5 rounded-lg bg-zinc-50 p-2.5 dark:bg-zinc-900">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold text-white"
                  style={{ backgroundColor: PLATFORM_CONFIG[bindPlatform].color }}
                >
                  {PLATFORM_CONFIG[bindPlatform].name.slice(0, 1)}
                </span>
                <span className="text-sm font-medium">{PLATFORM_CONFIG[bindPlatform].name}</span>
              </div>

              {/* OAuth 授权 */}
              <button
                type="button"
                onClick={() => handleOauth(bindPlatform)}
                className="group flex w-full items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 text-left transition-all hover:border-indigo-400 hover:bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40"
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <ShieldCheck className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-semibold">OAuth 一键授权</span>
                    <span className="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-medium text-white">推荐</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">
                    安全授权，自动同步账号信息、粉丝与发布数据
                  </span>
                </span>
                <Link2 className="h-4 w-4 flex-shrink-0 text-indigo-400 transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* 分隔 */}
              <div className="flex items-center gap-3 py-0.5">
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                <span className="text-xs text-zinc-400">或手动录入</span>
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              </div>

              {/* 手动录入折叠区 */}
              <button
                type="button"
                onClick={() => setManualOpen((v) => !v)}
                className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 p-3.5 text-left transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
              >
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 dark:bg-zinc-800">
                  <Keyboard className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm font-medium">手动录入账号信息</span>
                <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${manualOpen ? 'rotate-180' : ''}`} />
              </button>

              {manualOpen && (
                <form onSubmit={handleBind} className="space-y-3 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
                  <div className="space-y-1.5">
                    <Label htmlFor="bind-name" className="text-xs">账号昵称 <span className="text-red-500">*</span></Label>
                    <Input id="bind-name" value={bindName} onChange={(e) => setBindName(e.target.value)} placeholder="显示名称" className="h-9" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="bind-account" className="text-xs">平台账号ID</Label>
                      <Input id="bind-account" value={bindAccountId} onChange={(e) => setBindAccountId(e.target.value)} placeholder="openid / uid" className="h-9" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bind-group" className="text-xs">分组</Label>
                      <Input id="bind-group" value={bindGroup} onChange={(e) => setBindGroup(e.target.value)} placeholder="如：客户A矩阵" className="h-9" />
                    </div>
                  </div>
                  <DialogFooter className="gap-2">
                    <Button type="submit" className="w-full bg-gradient-to-r from-indigo-500 to-purple-600" disabled={bindSubmitting}>
                      {bindSubmitting ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />绑定中...</>
                      ) : (
                        '确认绑定'
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setBindStep(1)}>
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  上一步
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountGrid({
  accounts,
  onStatus,
  onDelete,
  onBind,
}: {
  accounts: Account[];
  onStatus: (account: Account, status: Account['status']) => void;
  onDelete: (account: Account) => void;
  onBind: () => void;
}) {
  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 py-16 dark:border-zinc-700">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
          <Link2 className="h-5 w-5 text-zinc-400" />
        </div>
        <p className="mt-3 text-sm font-medium text-zinc-600 dark:text-zinc-300">暂无账号</p>
        <p className="mt-1 text-xs text-zinc-400">绑定平台账号后即可一键分发内容并同步数据</p>
        <Button
          onClick={onBind}
          size="sm"
          className="mt-4 gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600"
        >
          <Plus className="h-3.5 w-3.5" />
          绑定账号
        </Button>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {accounts.map((account) => {
        const cfg = PLATFORM_CONFIG[account.platform] || PLATFORM_CONFIG.wechat;
        const statusInfo = account.status === 'active'
          ? { icon: CheckCircle2, text: '已授权', color: 'text-emerald-500' }
          : account.status === 'expired'
          ? { icon: Clock, text: '已过期', color: 'text-amber-500' }
          : { icon: AlertTriangle, text: '异常', color: 'text-red-500' };
        const StatusIcon = statusInfo.icon;
        return (
          <Card key={account.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback
                      className="text-white"
                      style={{ backgroundColor: cfg.color }}
                    >
                      {account.name.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{account.name}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {cfg.name} · {account.accountGroup || '未分组'}
                    </div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>设置状态</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onStatus(account, 'active')}>正常</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatus(account, 'expired')}>标记过期</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onStatus(account, 'error')}>标记异常</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-500"
                      onClick={() => onDelete(account)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      解绑
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1 text-xs text-zinc-500">
                    <Users className="w-3 h-3" />
                    粉丝
                  </div>
                  <div className="text-sm font-semibold mt-1">
                    {formatFollowers(account.followers)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">同步时间</div>
                  <div className="text-xs mt-1 text-zinc-600">
                    {account.lastSyncedAt ? new Date(account.lastSyncedAt).toLocaleDateString() : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-zinc-500">状态</div>
                  <div className={`mt-1 flex items-center justify-center gap-1 ${statusInfo.color}`}>
                    <StatusIcon className="w-3 h-3" />
                    <span className="text-xs">{statusInfo.text}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
