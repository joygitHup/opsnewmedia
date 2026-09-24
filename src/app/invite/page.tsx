'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { teamsApi } from '@/lib/api/teams';
import { useAuth } from '@/lib/auth/AuthProvider';
import { toast } from 'sonner';

type State = 'loading' | 'success' | 'error' | 'need-login';

export default function InvitePage() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, refresh } = useAuth();
  const token = params.get('token');
  const [state, setState] = useState<State>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMsg('邀请链接无效：缺少 token');
      return;
    }
    if (!user) {
      setState('need-login');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        await teamsApi.accept(token);
        if (cancelled) return;
        await refresh();
        setState('success');
        toast.success('已加入团队');
      } catch (err) {
        if (cancelled) return;
        setState('error');
        setErrorMsg((err as Error).message);
      }
    })();
    return () => { cancelled = true; };
  }, [token, user, refresh]);

  if (state === 'need-login') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-500 mx-auto" />
          <h1 className="text-xl font-bold">请先登录</h1>
          <p className="text-sm text-zinc-500">
            登录后将自动加入团队
          </p>
          <Button
            onClick={() => router.push(`/login?redirect=/invite?token=${token}`)}
            className="bg-gradient-to-r from-indigo-500 to-purple-600"
          >
            前往登录
          </Button>
        </div>
      </div>
    );
  }

  if (state === 'loading') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (state === 'success') {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" />
          <h1 className="text-xl font-bold">加入成功</h1>
          <p className="text-sm text-zinc-500">
            你已成功加入团队，现在可以开始协作了
          </p>
          <Button
            onClick={() => router.push('/dashboard')}
            className="bg-gradient-to-r from-indigo-500 to-purple-600"
          >
            进入工作台
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center space-y-4 max-w-sm">
        <XCircle className="w-16 h-16 text-red-500 mx-auto" />
        <h1 className="text-xl font-bold">加入失败</h1>
        <p className="text-sm text-zinc-500">{errorMsg || '邀请链接无效或已过期'}</p>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          返回工作台
        </Button>
      </div>
    </div>
  );
}
