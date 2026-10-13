import { redirect } from 'next/navigation';

// 注：根路径 / 实际由 next.config.ts 的 beforeFiles rewrite 直接返回宣传页
// public/gaodinintriduce/index.html。此文件仅保留一个有效路由端点，
// 避免 Turbopack dev 模式因缺失 /page 端点触发 HMR 重编译循环。
export default function Home() {
  redirect('/gaodinintriduce/');
}
