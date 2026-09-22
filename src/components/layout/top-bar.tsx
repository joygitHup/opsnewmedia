'use client';

import {
  Bell,
  Search,
  ChevronDown,
  Plus,
  LayoutGrid,
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
import { useState } from 'react';
import { PLATFORM_CONFIG, type Account } from '@/types';
import Link from 'next/link';

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
];

export function TopBar() {
  const [showNewDialog, setShowNewDialog] = useState(false);
  const currentAccount = mockAccounts[0];

  return (
    <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        {/* 账号切换器 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="gap-2 h-9 font-normal hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: PLATFORM_CONFIG[currentAccount.platform].color }}
              />
              <span className="text-sm font-medium">{currentAccount.name}</span>
              <ChevronDown className="w-4 h-4 text-zinc-400" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel>切换账号</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {mockAccounts.map((account) => (
              <DropdownMenuItem key={account.id} className="gap-3 cursor-pointer py-2.5">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: PLATFORM_CONFIG[account.platform].color }}
                >
                  {account.name.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{account.name}</div>
                  <div className="text-xs text-zinc-500 flex items-center gap-2">
                    <span>{PLATFORM_CONFIG[account.platform].name}</span>
                    <span>·</span>
                    <span>
                      {account.status === 'active' ? (
                        <span className="text-emerald-500">已授权</span>
                      ) : (
                        <span className="text-amber-500">已过期</span>
                      )}
                    </span>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer">
              <Link href="/accounts" className="text-indigo-600">
                管理全部账号
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
                <AvatarFallback className="bg-indigo-500 text-white text-xs">
                  管
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>我的账号</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>个人设置</DropdownMenuItem>
            <DropdownMenuItem>团队设置</DropdownMenuItem>
            <DropdownMenuItem>计费方案</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-500">退出登录</DropdownMenuItem>
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
                    window.location.href = '/editor';
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
