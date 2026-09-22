'use client';

import { useState } from 'react';
import {
  Upload,
  Search,
  FolderOpen,
  Image as ImageIcon,
  Video,
  FileText,
  Music,
  Grid3X3,
  List,
  Trash2,
  Download,
  MoreHorizontal,
  Tag,
  Clock,
  HardDrive,
  Plus,
  X,
} from 'lucide-react';
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
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import type { Material } from '@/types';

const mockMaterials: Material[] = [
  {
    id: '1',
    name: 'AI工具封面图.jpg',
    type: 'image',
    url: 'https://picsum.photos/400/300?random=1',
    size: 245000,
    tags: ['封面', '科技', 'AI'],
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    name: '效率工具配图.png',
    type: 'image',
    url: 'https://picsum.photos/400/300?random=2',
    size: 128000,
    tags: ['配图', '效率'],
    createdAt: '2024-01-14',
  },
  {
    id: '3',
    name: '产品演示视频.mp4',
    type: 'video',
    url: '',
    size: 15200000,
    tags: ['视频', '产品'],
    createdAt: '2024-01-13',
  },
  {
    id: '4',
    name: '科技感背景图.jpg',
    type: 'image',
    url: 'https://picsum.photos/400/300?random=3',
    size: 512000,
    tags: ['背景', '科技', '蓝色'],
    createdAt: '2024-01-12',
  },
  {
    id: '5',
    name: '品牌Logo.png',
    type: 'image',
    url: 'https://picsum.photos/400/300?random=4',
    size: 45000,
    tags: ['Logo', '品牌'],
    createdAt: '2024-01-10',
  },
  {
    id: '6',
    name: '产品介绍PPT.pdf',
    type: 'document',
    url: '',
    size: 3200000,
    tags: ['文档', '产品'],
    createdAt: '2024-01-09',
  },
  {
    id: '7',
    name: '背景音乐.mp3',
    type: 'audio',
    url: '',
    size: 4800000,
    tags: ['音乐', '轻快'],
    createdAt: '2024-01-08',
  },
  {
    id: '8',
    name: '小红书封面模板.jpg',
    type: 'image',
    url: 'https://picsum.photos/400/300?random=5',
    size: 186000,
    tags: ['模板', '小红书', '封面'],
    createdAt: '2024-01-07',
  },
  {
    id: '9',
    name: '数据图表截图.png',
    type: 'image',
    url: 'https://picsum.photos/400/300?random=6',
    size: 98000,
    tags: ['图表', '数据'],
    createdAt: '2024-01-06',
  },
  {
    id: '10',
    name: '人物采访视频.mp4',
    type: 'video',
    url: '',
    size: 28400000,
    tags: ['视频', '采访'],
    createdAt: '2024-01-05',
  },
  {
    id: '11',
    name: '运营数据报告.xlsx',
    type: 'document',
    url: '',
    size: 256000,
    tags: ['文档', '数据', '运营'],
    createdAt: '2024-01-04',
  },
  {
    id: '12',
    name: '公众号头图模板.jpg',
    type: 'image',
    url: 'https://picsum.photos/400/300?random=7',
    size: 165000,
    tags: ['模板', '公众号', '头图'],
    createdAt: '2024-01-03',
  },
];

const categories = [
  { id: 'all', name: '全部文件', icon: FolderOpen, count: mockMaterials.length },
  { id: 'image', name: '图片', icon: ImageIcon, count: mockMaterials.filter((m) => m.type === 'image').length },
  { id: 'video', name: '视频', icon: Video, count: mockMaterials.filter((m) => m.type === 'video').length },
  { id: 'audio', name: '音频', icon: Music, count: mockMaterials.filter((m) => m.type === 'audio').length },
  { id: 'document', name: '文档', icon: FileText, count: mockMaterials.filter((m) => m.type === 'document').length },
];

const allTags = Array.from(new Set(mockMaterials.flatMap((m) => m.tags)));

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getTypeIcon(type: Material['type']) {
  switch (type) {
    case 'image':
      return ImageIcon;
    case 'video':
      return Video;
    case 'audio':
      return Music;
    case 'document':
      return FileText;
  }
}

export default function MaterialsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const filteredMaterials = mockMaterials.filter((m) => {
    if (activeCategory !== 'all' && m.type !== activeCategory) return false;
    if (searchQuery && !m.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedTags.length > 0 && !selectedTags.some((t) => m.tags.includes(t))) return false;
    return true;
  });

  const totalSize = mockMaterials.reduce((acc, m) => acc + m.size, 0);

  const startUpload = () => {
    setUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          toast.success('上传成功！');
          setTimeout(() => setShowUploadDialog(false), 1000);
          return 100;
        }
        return prev + Math.random() * 20;
      });
    }, 300);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">素材库</h1>
          <p className="text-sm text-zinc-500 mt-1">统一管理图片、视频、文档等素材资源</p>
        </div>
        <Button
          onClick={() => setShowUploadDialog(true)}
          className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
        >
          <Upload className="w-4 h-4" />
          上传素材
        </Button>
      </div>

      <div className="flex gap-4">
        {/* 左侧分类 */}
        <Card className="w-56 flex-shrink-0 hidden md:block">
          <CardContent className="p-3">
            {/* 存储空间 */}
            <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 rounded-lg mb-3">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                <HardDrive className="w-4 h-4" />
                存储空间
              </div>
              <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {formatFileSize(totalSize)}
                <span className="text-sm font-normal text-zinc-500"> / 10 GB</span>
              </div>
              <Progress value={(totalSize / (10 * 1024 * 1024 * 1024)) * 100} className="h-1.5 mt-2" />
            </div>

            {/* 分类列表 */}
            <div className="space-y-1">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const active = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      active
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 font-medium'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="flex-1 text-left">{cat.name}</span>
                    <span className="text-xs">{cat.count}</span>
                  </button>
                );
              })}
            </div>

            {/* 标签筛选 */}
            <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
              <div className="text-xs font-medium text-zinc-500 mb-2 px-3 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                标签筛选
              </div>
              <div className="flex flex-wrap gap-1.5 px-2">
                {allTags.slice(0, 12).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-indigo-500 text-white'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 右侧内容区 */}
        <div className="flex-1 space-y-4">
          {/* 工具栏 */}
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input
                  placeholder="搜索素材..."
                  className="pl-9 h-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select defaultValue="newest">
                <SelectTrigger className="w-28 h-9">
                  <SelectValue placeholder="排序" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">最新上传</SelectItem>
                  <SelectItem value="oldest">最早上传</SelectItem>
                  <SelectItem value="name">按名称</SelectItem>
                  <SelectItem value="size">按大小</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex-1" />
              <div className="flex items-center border rounded-md p-0.5">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 网格视图 */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredMaterials.map((material) => {
                const TypeIcon = getTypeIcon(material.type);
                return (
                  <Card
                    key={material.id}
                    className="overflow-hidden hover:shadow-md transition-shadow group cursor-pointer"
                  >
                    <div className="aspect-video bg-zinc-100 dark:bg-zinc-800 relative overflow-hidden">
                      {material.type === 'image' && material.url ? (
                        <img
                          src={material.url}
                          alt={material.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-400">
                          <TypeIcon className="w-12 h-12" />
                        </div>
                      )}
                      {/* 悬浮操作 */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="icon" className="w-8 h-8 bg-white/20 backdrop-blur hover:bg-white/30">
                          <Download className="w-4 h-4 text-white" />
                        </Button>
                        <Button size="icon" className="w-8 h-8 bg-white/20 backdrop-blur hover:bg-white/30">
                          <Trash2 className="w-4 h-4 text-white" />
                        </Button>
                      </div>
                      {/* 视频播放标识 */}
                      {material.type === 'video' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-black/50 backdrop-blur flex items-center justify-center">
                            <svg className="w-6 h-6 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M8 5v14l11-7z" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {material.name}
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs text-zinc-500">
                        <span>{formatFileSize(material.size)}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {material.createdAt}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {material.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px] h-4 px-1.5 font-normal">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* 列表视图 */}
          {viewMode === 'list' && (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredMaterials.map((material) => {
                    const TypeIcon = getTypeIcon(material.type);
                    return (
                      <div
                        key={material.id}
                        className="flex items-center gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group"
                      >
                        <div className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {material.type === 'image' && material.url ? (
                            <img src={material.url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <TypeIcon className="w-6 h-6 text-zinc-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {material.name}
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500">
                            <span>{formatFileSize(material.size)}</span>
                            <span>·</span>
                            <span>{material.createdAt}</span>
                            <span>·</span>
                            <div className="flex gap-1">
                              {material.tags.slice(0, 3).map((tag) => (
                                <span key={tag}>#{tag}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Download className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuLabel>操作</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="gap-2 cursor-pointer">
                                <Tag className="w-4 h-4" />
                                编辑标签
                              </DropdownMenuItem>
                              <DropdownMenuItem className="gap-2 cursor-pointer">
                                <Download className="w-4 h-4" />
                                下载
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="gap-2 cursor-pointer text-red-500">
                                <Trash2 className="w-4 h-4" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {filteredMaterials.length === 0 && (
            <Card>
              <CardContent className="py-16 text-center">
                <div className="text-4xl mb-3">📁</div>
                <div className="text-zinc-500">暂无素材</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 上传弹窗 */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>上传素材</DialogTitle>
            <DialogDescription>拖拽文件到下方区域，或点击选择文件</DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl p-8 text-center hover:border-indigo-400 dark:hover:border-indigo-600 transition-colors cursor-pointer">
              <div className="w-16 h-16 rounded-full bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-8 h-8 text-indigo-500" />
              </div>
              <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                点击或拖拽文件到此处上传
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                支持 JPG、PNG、MP4、MP3、PDF 等格式，单个文件最大 500MB
              </div>
            </div>

            {uploading && (
              <div className="mt-4 p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="font-medium">AI工具封面图.jpg</span>
                  <span className="text-zinc-500">{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <div className="mt-4 space-y-3">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">添加标签</Label>
                <div className="flex flex-wrap gap-1.5">
                  {['封面', '配图', '科技', '产品', '背景', '模板'].map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-950/50 h-6"
                    >
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">保存到</Label>
                <Select defaultValue="personal">
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="选择分组" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">个人素材库</SelectItem>
                    <SelectItem value="team">团队素材库</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)}>
              取消
            </Button>
            <Button
              onClick={startUpload}
              disabled={uploading}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              <Upload className="w-4 h-4 mr-1.5" />
              开始上传
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
