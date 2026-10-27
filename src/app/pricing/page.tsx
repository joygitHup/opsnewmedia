'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Loader2, Sparkles } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { teamsApi, type PlanInfo, type PlanItem } from '@/lib/api/teams';
import { useAuth } from '@/lib/auth/AuthProvider';
import { toast } from 'sonner';

function limitText(value: number | null): string {
  return value === null ? '不限' : String(value);
}

function limitRows(plan: PlanItem): { label: string; value: string }[] {
  return [
    { label: '账号额度', value: limitText(plan.limits.maxAccounts) },
    { label: '平台额度', value: limitText(plan.limits.maxPlatforms) },
    { label: '成员额度', value: limitText(plan.limits.maxMembers) },
    { label: '定时发布', value: plan.limits.scheduledPublish ? '支持' : '—' },
    { label: '审核流', value: plan.limits.reviewFlow ? '支持' : '—' },
    { label: 'API 权限', value: plan.limits.apiAccess ? '支持' : '—' },
  ];
}

export default function PricingPage() {
  const { user, refresh } = useAuth();
  const [loading, setLoading] = useState(true);
  const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null);
  const [pendingPlan, setPendingPlan] = useState<PlanItem | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      const info = await teamsApi.plan();
      setPlanInfo(info);
    } catch (err) {
      toast.error('加载套餐信息失败：' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  const handleUpgrade = async () => {
    if (!pendingPlan) return;
    if (!user?.currentTeamId) {
      toast.warning('尚未选择团队');
      return;
    }
    setUpgrading(true);
    try {
      await teamsApi.upgrade(user.currentTeamId, pendingPlan.value);
      await refresh();
      await loadPlan();
      toast.success(`已升级到${pendingPlan.label}`);
      setPendingPlan(null);
    } catch (err) {
      toast.error('升级失败：' + (err as Error).message);
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-80" />
          ))}
        </div>
      </div>
    );
  }

  const plans = planInfo?.plans || [];
  const currentPlan = planInfo?.currentPlan || 'free';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">套餐定价</h1>
        <p className="text-sm text-zinc-500 mt-1">选择适合团队的套餐，升级后立即生效（线下结算）</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((plan) => {
          const isCurrent = plan.value === currentPlan;
          return (
            <Card
              key={plan.value}
              className={isCurrent ? 'border-indigo-400 shadow-md' : 'hover:shadow-md transition-shadow'}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">{plan.label}</CardTitle>
                  {isCurrent ? (
                    <Badge className="bg-indigo-500 text-white">当前套餐</Badge>
                  ) : plan.value === 'team' ? (
                    <Badge variant="outline" className="text-indigo-600 border-indigo-200">
                      <Sparkles className="w-3 h-3 mr-1" />
                      推荐
                    </Badge>
                  ) : null}
                </div>
                <CardDescription className="text-xs">
                  <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    ¥{plan.price}
                  </span>
                  <span className="ml-1">/ 月</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="rounded-lg border bg-zinc-50/60 dark:bg-zinc-900/40 p-3 space-y-1.5 text-xs">
                  {limitRows(plan).map((row) => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-zinc-500">{row.label}</span>
                      <span className="font-medium text-zinc-800 dark:text-zinc-200">{row.value}</span>
                    </div>
                  ))}
                </div>
                <Button
                  className={`w-full ${
                    isCurrent
                      ? ''
                      : 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white'
                  }`}
                  variant={isCurrent ? 'outline' : 'default'}
                  disabled={isCurrent}
                  onClick={() => setPendingPlan(plan)}
                >
                  {isCurrent ? '当前套餐' : '升级'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!pendingPlan} onOpenChange={(open) => !open && setPendingPlan(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认升级到{pendingPlan?.label}</AlertDialogTitle>
            <AlertDialogDescription>
              当前未接入在线支付，确认后套餐立即生效（线下结算）。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={upgrading}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleUpgrade();
              }}
              disabled={upgrading}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white"
            >
              {upgrading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  处理中...
                </>
              ) : (
                '确认升级'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
