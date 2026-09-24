'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  Trash2,
  Crown,
  Settings,
  Eye,
  FileEdit,
  CheckSquare,
  Loader2,
  Copy,
  CheckCircle2,
  Pencil,
  ShieldCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { teamsApi, type Team, type TeamMember, type RoleMatrix } from '@/lib/api/teams';
import { useAuth } from '@/lib/auth/AuthProvider';
import { toast } from 'sonner';

const ROLE_INFO: Record<string, { label: string; icon: LucideIcon; color: string }> = {
  admin: { label: '管理员', icon: Crown, color: 'text-amber-500' },
  editor: { label: '编辑', icon: FileEdit, color: 'text-blue-500' },
  reviewer: { label: '审核员', icon: CheckSquare, color: 'text-purple-500' },
  viewer: { label: '只读', icon: Eye, color: 'text-zinc-500' },
};

export default function TeamPage() {
  const { user, refresh } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roleMatrix, setRoleMatrix] = useState<RoleMatrix | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ link: string; email: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editName, setEditName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [listRes, current] = await Promise.all([
        teamsApi.list({ pageSize: 50 }),
        teamsApi.current(),
      ]);
      setTeams(listRes.list);
      setCurrentTeam(current);
      setMembers(current.members || []);
      try {
        const matrix = await teamsApi.roles();
        setRoleMatrix(matrix);
      } catch {
        // 忽略
      }
    } catch (err) {
      toast.error('加载团队失败：' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSwitchTeam = async (team: Team) => {
    try {
      await teamsApi.switchCurrent(team.id);
      await fetchAll();
      await refresh();
      toast.success('已切换团队');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTeam) return;
    if (!inviteEmail) {
      toast.warning('请填写邮箱');
      return;
    }
    setInviting(true);
    try {
      const inv = await teamsApi.invite(currentTeam.id, {
        email: inviteEmail,
        role: inviteRole,
      });
      const link = `${window.location.origin}/invite?token=${inv.token}`;
      setInviteResult({ link, email: inviteEmail });
      await fetchAll();
    } catch (err) {
      toast.error('邀请失败：' + (err as Error).message);
    } finally {
      setInviting(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName) {
      toast.warning('请填写团队名');
      return;
    }
    setCreating(true);
    try {
      await teamsApi.create({ name: newTeamName });
      toast.success('团队已创建');
      setShowCreate(false);
      setNewTeamName('');
      await fetchAll();
    } catch (err) {
      toast.error('创建失败：' + (err as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (!deletingTeam) return;
    setDeleting(true);
    try {
      await teamsApi.remove(deletingTeam.id);
      toast.success('团队已删除');
      setDeletingTeam(null);
      await fetchAll();
      await refresh();
    } catch (err) {
      toast.error('删除失败：' + (err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    if (!editName.trim()) {
      toast.warning('请填写团队名');
      return;
    }
    setRenaming(true);
    try {
      await teamsApi.update(editingTeam.id, { name: editName.trim() });
      toast.success('团队名已更新');
      setEditingTeam(null);
      await fetchAll();
      await refresh();
    } catch (err) {
      toast.error('更新失败：' + (err as Error).message);
    } finally {
      setRenaming(false);
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (!currentTeam) return;
    if (member.userId === user?.id) {
      toast.warning('无法移除自己');
      return;
    }
    if (!confirm(`确认移除成员「${member.name}」？`)) return;
    try {
      await teamsApi.removeMember(currentTeam.id, member.id);
      toast.success('成员已移除');
      await fetchAll();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleChangeRole = async (member: TeamMember, role: string) => {
    if (!currentTeam) return;
    try {
      await teamsApi.updateMember(currentTeam.id, member.id, { role });
      toast.success('角色已更新');
      await fetchAll();
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">团队管理</h1>
          <p className="text-sm text-zinc-500 mt-1">管理团队成员与权限</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowCreate(true)}>
            新建团队
          </Button>
          <Button
            onClick={() => setShowInvite(true)}
            className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600"
            disabled={!currentTeam}
          >
            <UserPlus className="w-4 h-4" />
            邀请成员
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左侧团队列表 */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">我的团队</CardTitle>
            <CardDescription className="text-xs">点击切换当前团队</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {teams.map((team) => {
              const isCurrent = currentTeam?.id === team.id;
              return (
                <button
                  key={team.id}
                  onClick={() => handleSwitchTeam(team)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    isCurrent
                      ? 'border-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30'
                      : 'border-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{team.name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {team.memberCount} 位成员
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTeam(team);
                          setEditName(team.name);
                        }}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                        title="重命名"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingTeam(team);
                        }}
                        className="p-1.5 rounded-md text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="删除团队"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      {isCurrent && (
                        <Badge variant="outline" className="text-emerald-600">
                          当前
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {teams.length === 0 && (
              <div className="text-sm text-zinc-400 text-center py-4">尚未加入任何团队</div>
            )}
          </CardContent>
        </Card>

        {/* 右侧成员列表 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              成员列表
              {currentTeam && <span className="ml-2 text-zinc-400">· {currentTeam.name}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.length === 0 ? (
              <div className="text-sm text-zinc-400 text-center py-8">暂无成员</div>
            ) : (
              members.map((member) => {
                const roleInfo = ROLE_INFO[member.role] || ROLE_INFO.viewer;
                const RoleIcon = roleInfo.icon;
                return (
                  <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-indigo-500 text-white text-xs">
                        {(member.name || member.email || 'U').slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{member.name || '未命名'}</div>
                      <div className="text-xs text-zinc-500 truncate">{member.email}</div>
                    </div>
                    <div className={`flex items-center gap-1 text-xs ${roleInfo.color}`}>
                      <RoleIcon className="w-3 h-3" />
                      {roleInfo.label}
                    </div>
                    <Select
                      defaultValue={member.role}
                      onValueChange={(v) => handleChangeRole(member, v)}
                    >
                      <SelectTrigger className="w-24 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_INFO).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {member.userId !== user?.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500"
                        onClick={() => handleRemoveMember(member)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* 角色权限矩阵 */}
      {roleMatrix && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              角色权限矩阵
            </CardTitle>
            <CardDescription className="text-xs">各角色可访问的资源与操作权限</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 pr-4 font-medium text-zinc-500">资源</th>
                    {roleMatrix.roles.map((r) => (
                      <th key={r.value} className="text-center py-3 px-2 font-medium">
                        {r.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roleMatrix.resources.map((res) => {
                    const resPerms: Record<string, string[] | string> = {};
                    for (const role of roleMatrix.roles) {
                      const rolePerms = roleMatrix.permissions[role.value];
                      resPerms[role.value] = rolePerms?.[res.value] ?? rolePerms?.['*'] ?? [];
                    }
                    return (
                      <tr key={res.value} className="border-b last:border-0">
                        <td className="py-3 pr-4 font-medium">{res.label}</td>
                        {roleMatrix.roles.map((r) => {
                          const actions = resPerms[r.value];
                          const isAll = actions === '*' || (Array.isArray(actions) && actions.includes('*'));
                          if (isAll) {
                            return (
                              <td key={r.value} className="text-center py-3 px-2">
                                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800">全部权限</Badge>
                              </td>
                            );
                          }
                          if (!actions || (Array.isArray(actions) && actions.length === 0)) {
                            return (
                              <td key={r.value} className="text-center py-3 px-2">
                                <span className="text-xs text-zinc-300 dark:text-zinc-700">—</span>
                              </td>
                            );
                          }
                          return (
                            <td key={r.value} className="text-center py-3 px-2">
                              <div className="flex flex-wrap gap-1 justify-center">
                                {(actions as string[]).map((act) => {
                                  const label = roleMatrix.actionLabels[act] || act;
                                  const colorMap: Record<string, string> = {
                                    create: 'bg-blue-500/10 text-blue-600',
                                    read: 'bg-zinc-500/10 text-zinc-500',
                                    update: 'bg-amber-500/10 text-amber-600',
                                    delete: 'bg-red-500/10 text-red-600',
                                  };
                                  return (
                                    <span
                                      key={act}
                                      className={`inline-block px-1.5 py-0.5 rounded text-xs ${colorMap[act] || 'bg-zinc-500/10 text-zinc-500'}`}
                                    >
                                      {label}
                                    </span>
                                  );
                                })}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-400">
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-blue-500/30" /> 创建
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-zinc-500/30" /> 查看
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-amber-500/30" /> 编辑
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500/30" /> 删除
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block w-2.5 h-2.5 rounded-sm bg-emerald-500/30" /> 全部权限
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 邀请弹窗 */}
      <Dialog
        open={showInvite}
        onOpenChange={(v) => {
          setShowInvite(v);
          if (!v) {
            setInviteResult(null);
            setInviteEmail('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          {inviteResult ? (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <DialogTitle>邀请已发送</DialogTitle>
                    <DialogDescription className="mt-0.5">
                      邀请链接已发送到对方邮箱
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900">
                  <Avatar className="w-9 h-9 shrink-0">
                    <AvatarFallback className="bg-indigo-500 text-white text-xs">
                      {inviteResult.email.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{inviteResult.email}</div>
                    <div className="text-xs text-zinc-500">收到邮件后点击链接即可加入</div>
                  </div>
                </div>
                <div className="rounded-lg bg-zinc-50 dark:bg-zinc-900 border p-3">
                  <p className="text-xs text-zinc-500 mb-2">或手动复制邀请链接：</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs text-zinc-600 dark:text-zinc-400 truncate">
                      {inviteResult.link}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteResult.link);
                        toast.success('链接已复制');
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      复制
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-zinc-400 text-center">
                  邀请链接 7 天内有效
                </p>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setInviteResult(null);
                    setInviteEmail('');
                  }}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-600"
                >
                  继续邀请
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>邀请成员</DialogTitle>
                <DialogDescription>输入邮箱生成邀请链接</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">邮箱</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>角色</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(ROLE_INFO).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600"
                    disabled={inviting}
                  >
                    {inviting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        邀请中...
                      </>
                    ) : (
                      '生成邀请链接'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* 创建团队弹窗 */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>新建团队</DialogTitle>
            <DialogDescription>创建一个新团队/工作空间</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="team-name">团队名</Label>
              <Input
                id="team-name"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                placeholder="如：科技矩阵"
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600"
                disabled={creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  '创建'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 重命名团队弹窗 */}
      <Dialog open={!!editingTeam} onOpenChange={(open) => !open && setEditingTeam(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>重命名团队</DialogTitle>
            <DialogDescription>修改团队名称</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRename} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-team-name">团队名</Label>
              <Input
                id="edit-team-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="请输入团队名"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600"
                disabled={renaming}
              >
                {renaming ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 删除团队确认 */}
      <AlertDialog open={!!deletingTeam} onOpenChange={(open) => !open && setDeletingTeam(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除团队</AlertDialogTitle>
            <AlertDialogDescription>
              确认删除团队「{deletingTeam?.name}」？删除后不可恢复，团队下的所有内容将一并清除。
              {deletingTeam?.id === currentTeam?.id && '（不能删除当前所在团队，请先切换到其他团队）'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTeam}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

void Settings;
void Users;
void Shield;
