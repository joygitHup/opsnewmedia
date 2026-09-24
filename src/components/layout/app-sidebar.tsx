'use client';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  Users,
  FileEdit,
  Send,
  FolderOpen,
  Users2,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const menuItems = [
  {
    title: '工作台',
    items: [
      { icon: LayoutDashboard, label: '数据看板', href: '/dashboard' },
      { icon: FileEdit, label: '内容创作', href: '/editor' },
      { icon: FileText, label: '我的草稿', href: '/content' },
      { icon: Send, label: '一键分发', href: '/distribute' },
    ],
  },
  {
    title: '资源管理',
    items: [
      { icon: Users, label: '账号管理', href: '/accounts' },
      { icon: FolderOpen, label: '素材库', href: '/materials' },
    ],
  },
  {
    title: '团队协作',
    items: [
      { icon: Users2, label: '团队成员', href: '/team' },
    ],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="h-14 flex items-center justify-between px-3 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-base bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              稿定分发
            </span>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {menuItems.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link
                          href={item.href}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
                            isActive
                              ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 font-medium'
                              : 'text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                          )}
                        >
                          <Icon className="w-5 h-5 flex-shrink-0" />
                          {!isCollapsed && <span>{item.label}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <button
                onClick={toggleSidebar}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
              >
                {isCollapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <>
                    <Settings className="w-5 h-5" />
                    <span className="flex-1 text-left">收起侧栏</span>
                    <ChevronLeft className="w-4 h-4" />
                  </>
                )}
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

export { SidebarTrigger } from '@/components/ui/sidebar';
