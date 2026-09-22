import type { Metadata } from 'next';
import './globals.css';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { TopBar } from '@/components/layout/top-bar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';

export const metadata: Metadata = {
  title: {
    default: '稿定分发 - 多平台内容一键发布',
    template: '%s | 稿定分发',
  },
  description:
    '一站式多平台内容创作与分发工具，支持公众号、小红书、抖音、知乎等平台，一次创作多端分发，统一管理数据聚合。',
  keywords: [
    '内容分发',
    '多平台发布',
    '公众号运营',
    '小红书运营',
    '自媒体工具',
    '内容创作',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          <SidebarInset>
            <TopBar />
            <main className="flex-1 p-6">{children}</main>
          </SidebarInset>
        </SidebarProvider>
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
