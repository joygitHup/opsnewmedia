'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  Users,
  ArrowUpRight,
  Calendar,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { ChartConfig } from '@/components/ui/chart';
import { PLATFORM_CONFIG, type PlatformType } from '@/types';

// Mock 数据
const trendData = Array.from({ length: 7 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - i));
  return {
    date: `${date.getMonth() + 1}/${date.getDate()}`,
    阅读量: Math.floor(Math.random() * 50000) + 20000,
    互动量: Math.floor(Math.random() * 5000) + 1000,
  };
});

const platformData = [
  { platform: '公众号', value: 45000, color: '#07C160' },
  { platform: '小红书', value: 32000, color: '#FF2442' },
  { platform: '抖音', value: 28000, color: '#000000' },
  { platform: '知乎', value: 15000, color: '#0066FF' },
  { platform: '微博', value: 12000, color: '#E6162D' },
];

const topContents = [
  {
    id: '1',
    title: '2024年最值得关注的10个AI工具，效率提升200%',
    platform: 'wechat' as PlatformType,
    views: 35680,
    likes: 2156,
    comments: 186,
    date: '2024-01-15',
    status: 'success',
  },
  {
    id: '2',
    title: '打工人必备！5个免费又好用的效率神器',
    platform: 'xiaohongshu' as PlatformType,
    views: 28940,
    likes: 3421,
    comments: 256,
    date: '2024-01-14',
    status: 'success',
  },
  {
    id: '3',
    title: '我用AI一年赚了10万，分享我的经验和方法',
    platform: 'zhihu' as PlatformType,
    views: 22150,
    likes: 1876,
    comments: 312,
    date: '2024-01-13',
    status: 'success',
  },
  {
    id: '4',
    title: '一分钟学会ChatGPT高级用法，告别无效提问',
    platform: 'douyin' as PlatformType,
    views: 58200,
    likes: 8942,
    comments: 546,
    date: '2024-01-12',
    status: 'success',
  },
];

const recentPublish = [
  { id: '1', title: '今日科技热点速览', platform: 'wechat' as PlatformType, status: 'success', time: '10:30' },
  { id: '2', title: '好物分享｜这5件东西太值了', platform: 'xiaohongshu' as PlatformType, status: 'success', time: '09:15' },
  { id: '3', title: '深度解读：AI时代的职场生存法则', platform: 'zhihu' as PlatformType, status: 'publishing', time: '正在发布' },
  { id: '4', title: '周末vlog｜程序员的一天', platform: 'douyin' as PlatformType, status: 'pending', time: '18:00' },
];

const stats = [
  { label: '总阅读量', value: '256,789', change: '+12.5%', up: true, icon: Eye, color: 'text-blue-500' },
  { label: '总点赞数', value: '18,452', change: '+8.3%', up: true, icon: Heart, color: 'text-red-500' },
  { label: '评论数', value: '2,876', change: '+15.2%', up: true, icon: MessageCircle, color: 'text-amber-500' },
  { label: '分享数', value: '4,128', change: '-2.1%', up: false, icon: Share2, color: 'text-emerald-500' },
  { label: '粉丝总数', value: '305,300', change: '+3.6%', up: true, icon: Users, color: 'text-purple-500' },
];

const chartConfig = {
  阅读量: {
    label: '阅读量',
    color: 'hsl(239, 84%, 67%)',
  },
  互动量: {
    label: '互动量',
    color: 'hsl(160, 84%, 39%)',
  },
} satisfies ChartConfig;

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState('7d');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse text-zinc-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">数据看板</h1>
          <p className="text-sm text-zinc-500 mt-1">查看全平台内容数据表现与趋势分析</p>
        </div>
        <div className="flex items-center gap-3">
          <Select defaultValue="all">
            <SelectTrigger className="w-32 h-9">
              <SelectValue placeholder="全部平台" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部平台</SelectItem>
              <SelectItem value="wechat">公众号</SelectItem>
              <SelectItem value="xiaohongshu">小红书</SelectItem>
              <SelectItem value="douyin">抖音</SelectItem>
              <SelectItem value="zhihu">知乎</SelectItem>
            </SelectContent>
          </Select>
          <Select defaultValue="7d" onValueChange={setTimeRange}>
            <SelectTrigger className="w-28 h-9">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <SelectValue />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">今日</SelectItem>
              <SelectItem value="7d">近7天</SelectItem>
              <SelectItem value="30d">近30天</SelectItem>
              <SelectItem value="90d">近90天</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 数据统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className={`p-2 rounded-lg ${stat.color} bg-opacity-10`}>
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                  </div>
                  <div
                    className={`flex items-center gap-0.5 text-xs font-medium ${
                      stat.up ? 'text-emerald-500' : 'text-red-500'
                    }`}
                  >
                    {stat.up ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {stat.change}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {stat.value}
                  </div>
                  <div className="text-sm text-zinc-500 mt-0.5">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 趋势图 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">数据趋势</CardTitle>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-indigo-500" />
                  阅读量
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  互动量
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorEngage" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" vertical={false} />
                  <XAxis dataKey="date" stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#A1A1AA" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E4E4E7',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="阅读量"
                    stroke="#6366F1"
                    strokeWidth={2}
                    fill="url(#colorViews)"
                  />
                  <Area
                    type="monotone"
                    dataKey="互动量"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#colorEngage)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* 平台分布 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">平台分布</CardTitle>
            <CardDescription className="text-xs">各平台阅读量占比</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={platformData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {platformData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {platformData.map((item) => (
                <div key={item.platform} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-zinc-600 dark:text-zinc-400">{item.platform}</span>
                  </div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">
                    {item.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 内容排行 & 发布队列 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 热门内容 */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">内容排行</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7 text-indigo-600">
              查看全部
              <ArrowUpRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="views">
              <TabsList className="mb-3">
                <TabsTrigger value="views">按阅读量</TabsTrigger>
                <TabsTrigger value="likes">按点赞数</TabsTrigger>
                <TabsTrigger value="comments">按评论数</TabsTrigger>
              </TabsList>
              <TabsContent value="views" className="mt-0">
                <div className="space-y-3">
                  {topContents.map((content, index) => (
                    <div
                      key={content.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                          index === 0
                            ? 'bg-amber-500'
                            : index === 1
                            ? 'bg-zinc-400'
                            : index === 2
                            ? 'bg-amber-700'
                            : 'bg-zinc-300 text-zinc-600'
                        }`}
                      >
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {content.title}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                          <Badge
                            variant="outline"
                            className="h-5 text-[10px] px-1.5 font-normal"
                            style={{ borderColor: PLATFORM_CONFIG[content.platform].color, color: PLATFORM_CONFIG[content.platform].color }}
                          >
                            {PLATFORM_CONFIG[content.platform].name}
                          </Badge>
                          <span>{content.date}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {content.views.toLocaleString()}
                        </div>
                        <div className="text-xs text-zinc-500">阅读</div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* 发布队列 */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">发布队列</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7 text-indigo-600">
              全部
              <ArrowUpRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPublish.map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: PLATFORM_CONFIG[item.platform].color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {item.title}
                    </div>
                    <div className="text-xs text-zinc-500 flex items-center gap-2">
                      <span>{PLATFORM_CONFIG[item.platform].name}</span>
                      <span>·</span>
                      <span>{item.time}</span>
                    </div>
                  </div>
                  <Badge
                    className={`text-[10px] h-5 font-normal ${
                      item.status === 'success'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400'
                        : item.status === 'publishing'
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                    }`}
                    variant="secondary"
                  >
                    {item.status === 'success' ? '已发布' : item.status === 'publishing' ? '发布中' : '待发布'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
