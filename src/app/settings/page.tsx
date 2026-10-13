'use client';

import { useState } from 'react';
import {
  KeyRound,
  User as UserIcon,
  Mail,
  Loader2,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth/AuthProvider';
import { authApi } from '@/lib/api/auth';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const initial = user?.displayName?.slice(0, 1) || user?.email?.[0] || 'U';

  const validate = (): string | null => {
    if (!oldPassword.trim()) return '请输入当前密码';
    if (!newPassword) return '请输入新密码';
    if (newPassword.length < 8) return '新密码至少 8 位';
    if (newPassword.length > 64) return '新密码不能超过 64 位';
    if (!/^[A-Za-z0-9!@#$%^&*()_+\-=\[\]{}|;:,.<>?~]+$/.test(newPassword))
      return '新密码包含非法字符';
    if (newPassword === oldPassword) return '新密码不能与当前密码相同';
    if (newPassword !== confirmPassword) return '两次输入的新密码不一致';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) {
      toast.warning(err);
      return;
    }
    setSaving(true);
    try {
      await authApi.changePassword({
        oldPassword,
        newPassword,
        newPasswordConfirm: confirmPassword,
      });
      toast.success('密码修改成功，请重新登录');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      // 密码修改后强制重新登录
      setTimeout(() => {
        window.location.href = '/login';
      }, 1500);
    } catch (err) {
      const msg = (err as Error).message;
      toast.error(msg || '密码修改失败');
    } finally {
      setSaving(false);
    }
  };

  const strength = (() => {
    if (!newPassword) return 0;
    let s = 0;
    if (newPassword.length >= 8) s++;
    if (/[A-Z]/.test(newPassword)) s++;
    if (/[0-9]/.test(newPassword)) s++;
    if (/[^A-Za-z0-9]/.test(newPassword)) s++;
    return s;
  })();

  const strengthLabel = ['', '弱', '一般', '较强', '强'][strength];
  const strengthColor = [
    '',
    'bg-red-400',
    'bg-amber-400',
    'bg-sky-400',
    'bg-emerald-400',
  ][strength];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold">个人设置</h1>
        <p className="text-sm text-zinc-500 mt-1">管理账号信息与安全设置</p>
      </div>

      {/* 账号信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserIcon className="w-4 h-4 text-indigo-500" />
            账号信息
          </CardTitle>
          <CardDescription>你的基本账号资料</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              {user?.avatar ? <AvatarImage src={user.avatar} /> : null}
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xl">
                {initial.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="font-medium">{user?.displayName || '未设置'}</p>
              <p className="text-xs text-zinc-500">支持 JPG / PNG，暂不开放修改</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">邮箱</Label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-50 dark:bg-zinc-900 border text-sm">
                <Mail className="w-4 h-4 text-zinc-400" />
                <span>{user?.email}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-500">昵称</Label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-zinc-50 dark:bg-zinc-900 border text-sm">
                <UserIcon className="w-4 h-4 text-zinc-400" />
                <span>{user?.name || '未设置'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 修改密码 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="w-4 h-4 text-indigo-500" />
            修改密码
          </CardTitle>
          <CardDescription>
            修改后需重新登录，请妥善保管新密码
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            {/* 当前密码 */}
            <div className="space-y-1.5">
              <Label htmlFor="oldPassword">当前密码</Label>
              <div className="relative">
                <Input
                  id="oldPassword"
                  type={showOld ? 'text' : 'password'}
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="请输入当前密码"
                  autoComplete="current-password"
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={() => setShowOld((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600"
                >
                  {showOld ? '隐藏' : '显示'}
                </button>
              </div>
            </div>

            {/* 新密码 */}
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">新密码</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="8-64 位，建议含字母、数字、符号"
                  autoComplete="new-password"
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600"
                >
                  {showNew ? '隐藏' : '显示'}
                </button>
              </div>
              {/* 密码强度 */}
              {newPassword && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${strengthColor}`}
                      style={{ width: `${(strength / 4) * 100}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-zinc-400 w-8 text-right">
                    {strengthLabel}
                  </span>
                </div>
              )}
            </div>

            {/* 确认新密码 */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">确认新密码</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="请再次输入新密码"
                  autoComplete="new-password"
                  disabled={saving}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600"
                >
                  {showConfirm ? '隐藏' : '显示'}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500">两次输入的新密码不一致</p>
              )}
            </div>

            <Button type="submit" disabled={saving} className="gap-1.5">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  修改中...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  确认修改
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
