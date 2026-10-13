'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Bell,
  Search,
  ChevronDown,
  Plus,
  LogOut,
  User as UserIcon,
  Settings,
  Send,
  ShieldCheck,
  Users2,
  Link2,
  Info,
  CheckCheck,
  Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { NewContentDialog } from './new-content-dialog';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthProvider';
import { teamsApi, type Team } from '@/lib/api/teams';
import { accountsApi, type Account } from '@/lib/api/accounts';
import {
  notificationsApi,
  type AppNotification,
  type NotificationType,
} from '@/lib/api/notifications';
import { PLATFORM_CONFIG } from '@/types';
import { toast } from 'sonner';

const NOTIF_ICON: Record<NotificationType, typeof Bell> = {
  publish: Send,
  review: ShieldCheck,
  team: Users2,
  account: Link2,
  system: Info,
};

const NOTIF_COLOR: Record<NotificationType, string> = {
  publish: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
  review: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
  team: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
  account: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400',
  system: 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
};

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
  return `${d.getMonth() + 1}-${d.getDate()}`;
}

export function TopBar() {
  const { user, logout, refresh } = useAuth();
  const router = useRouter();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [unread, setUnread] = useState(0);
  const [recent, setRecent] = useState<AppNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const refreshUnread = useCallback(async () => {
    try {
      const res = await notificationsApi.unreadCount();
      setUnread(res.total);
    } catch {
      // 静默（未登录或接口异常不打扰）
    }
  }, []);

  useEffect(() => {
    refreshUnread();
    const timer = setInterval(refreshUnread, 60000);
    return () => clearInterval(timer);
  }, [refreshUnread]);

  const loadRecent = useCallback(async () => {
    try {
      const res = await notificationsApi.list({ pageSize: 6 });
      setRecent(res.list);
    } catch {
      setRecent([]);
    }
  }, []);

  useEffect(() => {
    if (notifOpen) loadRecent();
  }, [notifOpen, loadRecent]);

  const handleNotifClick = async (n: AppNotification) => {
    setNotifOpen(false);
    if (!n.isRead) {
      setRecent((prev) => prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      setUnread((v) => Math.max(0, v - 1));
      try {
        await notificationsApi.markRead(n.id);
      } catch {
        // 静默
      }
    }
    if (n.link) router.push(n.link);
  };

  const handleMarkAll = async () => {
    try {
      await notificationsApi.markAllRead();
      setRecent((prev) => prev.map((x) => ({ ...x, isRead: true })));
      setUnread(0);
      toast.success('已全部标记为已读');
    } catch (err) {
      toast.error((err as Error).message || '操作失败');
    }
  };

  useEffect(() => {
    // 加载团队 + 当前团队
    Promise.all([teamsApi.list({ pageSize: 50 }), teamsApi.current()])
      .then(([res, current]) => {
        setTeams(res.list);
        setCurrentTeam(current);
      })
      .catch((err) => {
        // 静默
        console.warn('load teams failed', err);
      });
  }, []);

  useEffect(() => {
    if (!currentTeam) return;
    accountsApi
      .list({ teamId: currentTeam.id, pageSize: 50 })
      .then((res) => setAccounts(res.list))
      .catch(() => setAccounts([]));
  }, [currentTeam]);

  const handleSwitchTeam = async (team: Team) => {
    try {
      await teamsApi.switchCurrent(team.id);
      setCurrentTeam(team);
      // 触发 user 刷新（currentTeamId 已变）
      await refresh();
      toast.success('已切换团队');
    } catch (err) {
      toast.error((err as Error).message || '切换失败');
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  const initial = user?.displayName?.slice(0, 1) || user?.email?.[0] || 'U';

  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {/* 团队切换器 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="gap-2 h-9 font-normal hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              <span className="text-sm font-medium">
                {currentTeam?.name || '未选择团队'}
              </span>
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>切换团队</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {teams.map((team) => (
              <DropdownMenuItem
                key={team.id}
                className="gap-3 cursor-pointer py-2.5"
                onClick={() => handleSwitchTeam(team)}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {team.name}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {team.memberCount} 位成员 · {team.role || '成员'}
                  </div>
                </div>
                {currentTeam?.id === team.id && (
                  <Badge variant="outline" className="text-emerald-600">
                    当前
                  </Badge>
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/team" className="text-indigo-600">
                管理团队
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 搜索框 */}
        <div className="relative w-80 hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input
            placeholder="搜索内容、账号、素材..."
            className="pl-9 h-9 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* 新建按钮 */}
        <Button
          onClick={() => setShowNewDialog(true)}
          className="h-9 gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
        >
          <Plus className="w-4 h-4" />
          <span>新建</span>
        </Button>

        {/* 通知 */}
        <DropdownMenu open={notifOpen} onOpenChange={setNotifOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              {unread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-medium leading-none">
                  {unread > 99 ? '99+' : unread}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between px-3 py-2.5 border-b">
              <span className="text-sm font-semibold">消息通知</span>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  全部已读
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {recent.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-zinc-400">
                  <Inbox className="w-6 h-6 mb-2" />
                  <span className="text-xs">暂无消息</span>
                </div>
              ) : (
                recent.map((n) => {
                  const Icon = NOTIF_ICON[n.type] || Info;
                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => handleNotifClick(n)}
                      className="w-full flex gap-2.5 px-3 py-2.5 text-left hover:bg-zinc-50 dark:hover:bg-zinc-900 border-b last:border-b-0 border-zinc-100 dark:border-zinc-800/60"
                    >
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${NOTIF_COLOR[n.type] || NOTIF_COLOR.system}`}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span
                            className={`text-xs truncate ${n.isRead ? 'text-zinc-600 dark:text-zinc-400' : 'font-semibold text-zinc-900 dark:text-zinc-100'}`}
                          >
                            {n.title}
                          </span>
                          {!n.isRead && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                          )}
                        </span>
                        {n.content && (
                          <span className="block text-[11px] text-zinc-400 mt-0.5 line-clamp-2">
                            {n.content}
                          </span>
                        )}
                        <span className="block text-[10px] text-zinc-300 dark:text-zinc-500 mt-0.5">
                          {formatTime(n.createdAt)}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
            <DropdownMenuItem asChild className="justify-center text-sm text-indigo-600 cursor-pointer py-2.5">
              <Link href="/notifications">查看全部消息</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* 用户头像 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 h-9 px-2">
              <Avatar className="w-7 h-7">
                {user?.avatar ? <AvatarImage src={user.avatar} /> : null}
                <AvatarFallback className="bg-indigo-500 text-white text-xs">
                  {initial.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm hidden sm:block">
                {user?.displayName || user?.email}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span>{user?.displayName || '用户'}</span>
                <span className="text-xs text-zinc-500 font-normal">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/settings" className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                个人设置
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/team" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                团队设置
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-500 cursor-pointer flex items-center gap-2"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 新建内容弹窗 */}
      <NewContentDialog open={showNewDialog} onOpenChange={setShowNewDialog} />
    </header>
  );
}

// 兼容旧代码引用 PLATFORM_CONFIG
void PLATFORM_CONFIG;
