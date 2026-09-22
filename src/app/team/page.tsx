'use client';

import { useState } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  MoreHorizontal,
  Search,
  Mail,
  Trash2,
  Edit2,
  Crown,
  Settings,
  Eye,
  FileEdit,
  CheckSquare,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

type RoleType = 'admin' | 'editor' | 'reviewer' | 'viewer';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: RoleType;
  status: 'active' | 'pending' | 'disabled';
  joinDate: string;
  lastActive: string;
}

const roleConfig: Record<RoleType, { label: string; color: string; icon: LucideIcon; desc: string }> = {
  admin: { label: '管理员', color: 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-950/50', icon: Crown, desc: '全部权限' },
  editor: { label: '编辑', color: 'text-indigo-600 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-950/50', icon: FileEdit, desc: '内容创作与发布' },
  reviewer: { label: '审核员', color: 'text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-950/50', icon: CheckSquare, desc: '内容审核' },
  viewer: { label: '只读', color: 'text-zinc-600 bg-zinc-100 dark:text-zinc-400 dark:bg-zinc-800', icon: Eye, desc: '仅查看' },
};

const mockMembers: TeamMember[] = [
  {
    id: '1',
    name: '张小明',
    email: 'zhangxm@example.com',
    role: 'admin',
    status: 'active',
    joinDate: '2023-06-15',
    lastActive: '刚刚',
  },
  {
    id: '2',
    name: '李编辑',
    email: 'libianji@example.com',
    role: 'editor',
    status: 'active',
    joinDate: '2023-08-20',
    lastActive: '10分钟前',
  },
  {
    id: '3',
    name: '王审核',
    email: 'wangshenhe@example.com',
    role: 'reviewer',
    status: 'active',
    joinDate: '2023-09-10',
    lastActive: '1小时前',
  },
  {
    id: '4',
    name: '赵运营',
    email: 'zhaoyunying@example.com',
    role: 'editor',
    status: 'active',
    joinDate: '2023-10-01',
    lastActive: '2小时前',
  },
  {
    id: '5',
    name: '陈数据',
    email: 'chenshuju@example.com',
    role: 'viewer',
    status: 'active',
    joinDate: '2023-11-15',
    lastActive: '昨天',
  },
  {
    id: '6',
    name: '孙设计',
    email: 'sunshiji@example.com',
    role: 'editor',
    status: 'pending',
    joinDate: '2024-01-10',
    lastActive: '未激活',
  },
];

const permissions = [
  { category: '账号管理', items: [
    { name: '添加账号', admin: true, editor: false, reviewer: false, viewer: false },
    { name: '删除账号', admin: true, editor: false, reviewer: false, viewer: false },
    { name: '查看账号列表', admin: true, editor: true, reviewer: true, viewer: true },
  ]},
  { category: '内容管理', items: [
    { name: '创建内容', admin: true, editor: true, reviewer: false, viewer: false },
    { name: '编辑内容', admin: true, editor: true, reviewer: false, viewer: false },
    { name: '删除内容', admin: true, editor: true, reviewer: false, viewer: false },
    { name: '提交审核', admin: true, editor: true, reviewer: false, viewer: false },
  ]},
  { category: '发布管理', items: [
    { name: '发布内容', admin: true, editor: true, reviewer: false, viewer: false },
    { name: '定时发布', admin: true, editor: true, reviewer: false, viewer: false },
    { name: '撤回发布', admin: true, editor: true, reviewer: false, viewer: false },
  ]},
  { category: '审核管理', items: [
    { name: '审核内容', admin: true, editor: false, reviewer: true, viewer: false },
    { name: '查看审核记录', admin: true, editor: true, reviewer: true, viewer: true },
  ]},
  { category: '数据统计', items: [
    { name: '查看数据看板', admin: true, editor: true, reviewer: true, viewer: true },
    { name: '导出报表', admin: true, editor: false, reviewer: false, viewer: false },
  ]},
];

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState('members');
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<RoleType>('editor');

  const filteredMembers = mockMembers.filter((m) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
    }
    return true;
  });

  const handleInvite = () => {
    if (!inviteEmail) return;
    toast.success(`已向 ${inviteEmail} 发送邀请`);
    setShowInviteDialog(false);
    setInviteEmail('');
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">团队协作</h1>
          <p className="text-sm text-zinc-500 mt-1">管理团队成员、角色权限与协作流程</p>
        </div>
        <Button
          onClick={() => setShowInviteDialog(true)}
          className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
        >
          <UserPlus className="w-4 h-4" />
          邀请成员
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(roleConfig).map(([key, config]) => {
          const Icon = config.icon;
          const count = mockMembers.filter((m) => m.role === key).length;
          return (
            <Card key={key}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm text-zinc-500 mt-0.5">{config.label}</div>
                  </div>
                  <div className={`p-2.5 rounded-lg ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <Tabs defaultValue="members" value={activeTab} onValueChange={setActiveTab}>
          <CardHeader className="pb-0">
            <TabsList>
              <TabsTrigger value="members" className="gap-2">
                <Users className="w-4 h-4" />
                成员列表
              </TabsTrigger>
              <TabsTrigger value="roles" className="gap-2">
                <Shield className="w-4 h-4" />
                角色权限
              </TabsTrigger>
            </TabsList>
          </CardHeader>

          <CardContent className="pt-4">
            <TabsContent value="members" className="mt-0">
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  placeholder="搜索成员..."
                  className="pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-32 h-9">
                  <SelectValue placeholder="全部角色" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部角色</SelectItem>
                  {Object.entries(roleConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 -mx-6 px-6">
              {filteredMembers.map((member) => {
                const roleInfo = roleConfig[member.role];
                const RoleIcon = roleInfo.icon;
                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 -mx-6 px-6 transition-colors group"
                  >
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-indigo-500 text-white">
                        {member.name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {member.name}
                        </span>
                        {member.status === 'pending' && (
                          <Badge variant="secondary" className="text-xs font-normal">
                            待激活
                          </Badge>
                        )}
                        {member.status === 'disabled' && (
                          <Badge variant="secondary" className="text-xs font-normal text-zinc-500">
                            已禁用
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-zinc-500 flex items-center gap-2 mt-0.5">
                        <Mail className="w-3.5 h-3.5" />
                        {member.email}
                      </div>
                    </div>

                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md ${roleInfo.color}`}>
                      <RoleIcon className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">{roleInfo.label}</span>
                    </div>

                    <div className="text-sm text-zinc-500 w-24 text-right">
                      {member.lastActive}
                    </div>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuLabel>成员操作</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 cursor-pointer">
                            <Edit2 className="w-4 h-4" />
                            修改角色
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer">
                            <Settings className="w-4 h-4" />
                            账号设置
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="gap-2 cursor-pointer text-red-500">
                            <Trash2 className="w-4 h-4" />
                            移除成员
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="roles" className="mt-0 space-y-6">
            {permissions.map((group) => (
              <div key={group.category}>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                  {group.category}
                </h3>
                <Card>
                  <CardContent className="p-0">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800">
                          <th className="text-left text-xs font-medium text-zinc-500 px-4 py-3">
                            权限项
                          </th>
                          {Object.entries(roleConfig).map(([key, config]) => (
                            <th key={key} className="text-center text-xs font-medium text-zinc-500 px-4 py-3 w-24">
                              {config.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {group.items.map((item) => (
                          <tr key={item.name} className="border-b border-zinc-100 dark:border-zinc-800/50 last:border-0">
                            <td className="text-sm text-zinc-700 dark:text-zinc-300 px-4 py-3">
                              {item.name}
                            </td>
                            <td className="text-center px-4 py-3">
                              {item.admin ? (
                                <span className="inline-flex w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 items-center justify-center">
                                  ✓
                                </span>
                              ) : (
                                <span className="text-zinc-300 dark:text-zinc-700">—</span>
                              )}
                            </td>
                            <td className="text-center px-4 py-3">
                              {item.editor ? (
                                <span className="inline-flex w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 items-center justify-center">
                                  ✓
                                </span>
                              ) : (
                                <span className="text-zinc-300 dark:text-zinc-700">—</span>
                              )}
                            </td>
                            <td className="text-center px-4 py-3">
                              {item.reviewer ? (
                                <span className="inline-flex w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 items-center justify-center">
                                  ✓
                                </span>
                              ) : (
                                <span className="text-zinc-300 dark:text-zinc-700">—</span>
                              )}
                            </td>
                            <td className="text-center px-4 py-3">
                              {item.viewer ? (
                                <span className="inline-flex w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 items-center justify-center">
                                  ✓
                                </span>
                              ) : (
                                <span className="text-zinc-300 dark:text-zinc-700">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            ))}
          </TabsContent>
        </CardContent>
        </Tabs>
      </Card>

      {/* 邀请成员弹窗 */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>邀请团队成员</DialogTitle>
            <DialogDescription>
              输入成员邮箱，邀请其加入团队
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium mb-2 block">邮箱地址</Label>
              <Input
                placeholder="请输入邮箱地址"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm font-medium mb-2 block">分配角色</Label>
              <Select defaultValue={inviteRole} onValueChange={(v) => setInviteRole(v as RoleType)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="选择角色" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="w-4 h-4" />
                        <span>{config.label}</span>
                        <span className="text-zinc-400 text-xs">- {config.desc}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-lg">
              <div className="text-sm font-medium text-indigo-800 dark:text-indigo-400">
                当前套餐：团队版
              </div>
              <div className="text-xs text-indigo-600 dark:text-indigo-500 mt-0.5">
                已使用 {mockMembers.length}/5 个成员席位
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
              取消
            </Button>
            <Button
              onClick={handleInvite}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              发送邀请
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
