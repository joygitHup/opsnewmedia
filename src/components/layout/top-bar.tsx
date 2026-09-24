'use client';

import { useEffect, useState } from 'react';
import {
  Bell,
  Search,
  ChevronDown,
  Plus,
  LayoutGrid,
  LogOut,
  User as UserIcon,
  Settings,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/AuthProvider';
import { teamsApi, type Team } from '@/lib/api/teams';
import { accountsApi, type Account } from '@/lib/api/accounts';
import { PLATFORM_CONFIG } from '@/types';
import { toast } from 'sonner';

export function TopBar() {
  const { user, logout, refresh } = useAuth();
  const router = useRouter();
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);

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
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full" />
        </Button>

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
              <Link href="/team" className="flex items-center gap-2">
                <UserIcon className="w-4 h-4" />
                个人设置
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer flex items-center gap-2">
              <Settings className="w-4 h-4" />
              团队设置
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
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>新建内容</DialogTitle>
            <DialogDescription>
              选择一种方式开始创作你的内容
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="create">新建内容</TabsTrigger>
              <TabsTrigger value="template">从模板</TabsTrigger>
              <TabsTrigger value="import">导入内容</TabsTrigger>
            </TabsList>
            <TabsContent value="create" className="mt-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2 hover:border-indigo-300 hover:bg-indigo-50/50"
                  onClick={() => {
                    setShowNewDialog(false);
                    router.push('/editor');
                  }}
                >
                  <LayoutGrid className="w-6 h-6 text-indigo-500" />
                  <span className="text-sm font-medium">图文内容</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-24 flex flex-col gap-2 hover:border-indigo-300 hover:bg-indigo-50/50"
                >
                  <span className="text-2xl">🎬</span>
                  <span className="text-sm font-medium">视频内容</span>
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="template" className="mt-4">
              <div className="text-sm text-zinc-500 text-center py-8">
                模板库功能即将上线
              </div>
            </TabsContent>
            <TabsContent value="import" className="mt-4">
              <div className="text-sm text-zinc-500 text-center py-8">
                导入功能即将上线
              </div>
            </TabsContent>
          </Tabs>
          <DialogFooter className="sm:justify-start">
            <div className="text-xs text-zinc-500">
              <Badge variant="outline" className="mr-2">
                AI
              </Badge>
              试试 AI 帮你生成内容？
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}

// 兼容旧代码引用 PLATFORM_CONFIG
void PLATFORM_CONFIG;
