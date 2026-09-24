'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Sparkles, Zap, Shield, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login, register } = useAuth();
  const [loading, setLoading] = useState<'login' | 'register' | null>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regConfirm, setRegConfirm] = useState('');

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.warning('请填写邮箱和密码');
      return;
    }
    setLoading('login');
    try {
      await login(loginEmail, loginPassword);
      toast.success('登录成功');
    } catch (err) {
      toast.error((err as Error).message || '登录失败');
    } finally {
      setLoading(null);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regPassword) {
      toast.warning('请填写邮箱和密码');
      return;
    }
    if (regPassword !== regConfirm) {
      toast.warning('两次密码不一致');
      return;
    }
    if (regPassword.length < 8) {
      toast.warning('密码至少 8 位');
      return;
    }
    setLoading('register');
    try {
      await register(regEmail, regPassword, regName || undefined);
      toast.success('注册成功，已自动登录');
    } catch (err) {
      toast.error((err as Error).message || '注册失败');
    } finally {
      setLoading(null);
    }
  };

  const features = [
    { icon: Zap, title: '一键多平台分发', desc: '微信、小红书、抖音等 6+ 平台同步发布' },
    { icon: Sparkles, title: '自研 Markdown 编辑器', desc: '零依赖轻量写作，分屏预览实时渲染' },
    { icon: Shield, title: '企业级安全', desc: 'JWT 认证、Token 加密、操作审计日志' },
  ];

  return (
    <div className="min-h-screen flex bg-[#0a0814] text-white overflow-hidden">
      {/* ===== 左侧品牌展示区 ===== */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        {/* 浮动光球 */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute w-96 h-96 rounded-full blur-3xl opacity-30"
            style={{
              background: 'radial-gradient(circle, #7c3aed, transparent 70%)',
              top: '-10%',
              left: '-5%',
              animation: mounted ? 'float1 12s ease-in-out infinite' : 'none',
            }}
          />
          <div
            className="absolute w-80 h-80 rounded-full blur-3xl opacity-25"
            style={{
              background: 'radial-gradient(circle, #a855f7, transparent 70%)',
              bottom: '5%',
              right: '-10%',
              animation: mounted ? 'float2 15s ease-in-out infinite' : 'none',
            }}
          />
          <div
            className="absolute w-64 h-64 rounded-full blur-3xl opacity-20"
            style={{
              background: 'radial-gradient(circle, #c084fc, transparent 70%)',
              top: '40%',
              left: '30%',
              animation: mounted ? 'float3 18s ease-in-out infinite' : 'none',
            }}
          />
        </div>

        {/* 网格背景 */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* 顶部 Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-violet-500/30">
            稿
          </div>
          <span className="text-xl font-semibold tracking-tight">稿定分发</span>
        </div>

        {/* 中间标语 */}
        <div className="relative z-10">
          <h1 className="text-5xl font-bold leading-tight mb-4">
            一次创作
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-purple-400 to-fuchsia-400 bg-clip-text text-transparent">
              全网触达
            </span>
          </h1>
          <p className="text-base text-white/50 max-w-md leading-relaxed">
            从 Markdown 写作到 6+ 平台同步发布，让优质内容在 5 分钟内触达更多读者。
          </p>
        </div>

        {/* 底部特性列表 */}
        <div className="relative z-10 space-y-3">
          {features.map((f, i) => (
            <div
              key={i}
              className="flex items-start gap-3 group"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(12px)',
                transition: `all 0.6s cubic-bezier(0.16,1,0.3,1) ${0.3 + i * 0.15}s`,
              }}
            >
              <div className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0 group-hover:bg-violet-500/20 group-hover:border-violet-400/30 transition-colors">
                <f.icon className="w-4 h-4 text-violet-300" />
              </div>
              <div>
                <div className="text-sm font-medium text-white/90">{f.title}</div>
                <div className="text-xs text-white/40">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== 右侧表单区 ===== */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative">
        {/* 移动端背景光效 */}
        <div className="absolute inset-0 lg:hidden overflow-hidden">
          <div
            className="absolute w-72 h-72 rounded-full blur-3xl opacity-20"
            style={{
              background: 'radial-gradient(circle, #7c3aed, transparent 70%)',
              top: '-20%',
              right: '-10%',
            }}
          />
        </div>

        <div className="w-full max-w-[420px] relative z-10">
          {/* 移动端 Logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-violet-500/30">
                稿
              </div>
              <span className="text-xl font-semibold">稿定分发</span>
            </div>
          </div>

          {/* 玻璃拟态卡片 */}
          <div
            className="rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 shadow-2xl shadow-violet-950/30"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'translateY(0)' : 'translateY(20px)',
              transition: 'all 0.7s cubic-bezier(0.16,1,0.3,1) 0.1s',
            }}
          >
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight">欢迎回来</h2>
              <p className="text-sm text-white/40 mt-1">登录或注册，开始你的内容分发之旅</p>
            </div>

            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-white/5 border border-white/10 rounded-lg p-1">
                <TabsTrigger
                  value="login"
                  className="text-white/60 dark:text-white/60 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white dark:data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 data-[state=active]:border-transparent rounded-md transition-all"
                >
                  登录
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="text-white/60 dark:text-white/60 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-purple-600 data-[state=active]:text-white dark:data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 data-[state=active]:border-transparent rounded-md transition-all"
                >
                  注册
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="space-y-4 mt-0">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="text-white/60 text-xs font-medium">
                      邮箱
                    </Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      autoComplete="email"
                      className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus:border-violet-400/50 focus:bg-white/[0.06] transition-all rounded-lg h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="text-white/60 text-xs font-medium">
                      密码
                    </Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="至少 8 位"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      autoComplete="current-password"
                      className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus:border-violet-400/50 focus:bg-white/[0.06] transition-all rounded-lg h-11"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all rounded-lg group"
                    disabled={loading === 'login'}
                  >
                    {loading === 'login' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        登录中...
                      </>
                    ) : (
                      <>
                        登录
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="register" className="space-y-4 mt-0">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name" className="text-white/60 text-xs font-medium">
                      昵称
                      <span className="text-white/25 ml-1">（可选）</span>
                    </Label>
                    <Input
                      id="reg-name"
                      type="text"
                      placeholder="你的昵称"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus:border-violet-400/50 focus:bg-white/[0.06] transition-all rounded-lg h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-white/60 text-xs font-medium">
                      邮箱
                    </Label>
                    <Input
                      id="reg-email"
                      type="email"
                      placeholder="you@example.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      autoComplete="email"
                      className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus:border-violet-400/50 focus:bg-white/[0.06] transition-all rounded-lg h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password" className="text-white/60 text-xs font-medium">
                      密码
                    </Label>
                    <Input
                      id="reg-password"
                      type="password"
                      placeholder="至少 8 位"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      autoComplete="new-password"
                      className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus:border-violet-400/50 focus:bg-white/[0.06] transition-all rounded-lg h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-confirm" className="text-white/60 text-xs font-medium">
                      确认密码
                    </Label>
                    <Input
                      id="reg-confirm"
                      type="password"
                      placeholder="再次输入密码"
                      value={regConfirm}
                      onChange={(e) => setRegConfirm(e.target.value)}
                      autoComplete="new-password"
                      className="bg-white/[0.04] border-white/10 text-white placeholder:text-white/25 focus:border-violet-400/50 focus:bg-white/[0.06] transition-all rounded-lg h-11"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all rounded-lg group"
                    disabled={loading === 'register'}
                  >
                    {loading === 'register' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        注册中...
                      </>
                    ) : (
                      <>
                        注册并登录
                        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {/* 分割线 */}
            <div className="my-6 flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-xs text-white/30">其他方式</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* 第三方登录占位 */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-10 bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/[0.06] hover:text-white/90 rounded-lg"
                onClick={() => toast.info('微信登录即将开放')}
              >
                微信登录
              </Button>
              <Button
                variant="outline"
                className="h-10 bg-white/[0.03] border-white/10 text-white/60 hover:bg-white/[0.06] hover:text-white/90 rounded-lg"
                onClick={() => toast.info('GitHub 登录即将开放')}
              >
                GitHub
              </Button>
            </div>
          </div>

          <p className="text-center text-xs text-white/30 mt-6">
            登录即表示同意
            <a href="/gaodinintriduce/" className="hover:text-violet-400 transition-colors mx-1">
              用户协议
            </a>
            与
            <a href="/gaodinintriduce/" className="hover:text-violet-400 transition-colors mx-1">
              隐私政策
            </a>
          </p>
        </div>
      </div>

      {/* 浮动动画 keyframes */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes float1 {
              0%, 100% { transform: translate(0, 0) scale(1); }
              33% { transform: translate(40px, -30px) scale(1.05); }
              66% { transform: translate(-20px, 20px) scale(0.95); }
            }
            @keyframes float2 {
              0%, 100% { transform: translate(0, 0) scale(1); }
              50% { transform: translate(-50px, -40px) scale(1.1); }
            }
            @keyframes float3 {
              0%, 100% { transform: translate(0, 0) scale(1); }
              40% { transform: translate(30px, 30px) scale(1.08); }
              70% { transform: translate(-30px, 10px) scale(0.92); }
            }
          `,
        }}
      />
    </div>
  );
}
