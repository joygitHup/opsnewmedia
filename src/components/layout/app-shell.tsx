'use client';

import { usePathname } from 'next/navigation';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth, isPublicPath } from '@/lib/auth/AuthProvider';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const isPublic = isPublicPath(pathname);

  // 公开页（登录/注册）：直接渲染
  if (isPublic) {
    return <>{children}</>;
  }

  // 加载中：渲染骨架屏
  if (loading) {
    return (
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset>
          <div className="h-14 border-b bg-background/95" />
          <main className="flex-1 p-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-4 h-32 w-full" />
          </main>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  if (!user) {
    // useAuth 会自动跳转 /login，这里返回 null
    return null;
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AppSidebar />
      <SidebarInset>
        <TopBar />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
