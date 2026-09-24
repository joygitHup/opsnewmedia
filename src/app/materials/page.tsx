'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Upload,
  Search,
  Image as ImageIcon,
  Video,
  FileText,
  Music,
  Trash2,
  Tag,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { PLATFORM_CONFIG, type MaterialType } from '@/types';
import { materialsApi, type Material } from '@/lib/api/materials';
import { useAuth } from '@/lib/auth/AuthProvider';
import { toast } from 'sonner';

const TYPE_ICONS: Record<MaterialType, typeof ImageIcon> = {
  image: ImageIcon,
  video: Video,
  audio: Music,
  document: FileText,
};

function formatSize(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${n} B`;
}

export default function MaterialsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [keyword, setKeyword] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState<Material | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMaterials = useCallback(async () => {
    if (!user?.currentTeamId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const query: Record<string, string | number | undefined> = {
        teamId: user.currentTeamId,
        pageSize: 100,
      };
      if (filterType !== 'all') query.type = filterType;
      if (keyword) query.search = keyword;
      const res = await materialsApi.list(query);
      setMaterials(res.list);
    } catch (err) {
      toast.error('加载素材失败：' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user?.currentTeamId, filterType, keyword]);

  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    setUploading(true);
    try {
      // 同源代理上传：一次请求多文件，后端流式转发 MinIO，sha256 自动去重
      const created = await materialsApi.upload(fileList);
      if (created.length < fileList.length) {
        toast.info(`${fileList.length - created.length} 个素材因内容重复已自动跳过`);
      }
      if (created.length > 0) {
        toast.success(`成功上传 ${created.length} 个素材`);
      }
      await fetchMaterials();
    } catch (err) {
      toast.error('上传失败：' + (err as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = (material: Material) => {
    setDeletingMaterial(material);
  };

  const confirmDelete = async () => {
    if (!deletingMaterial) return;
    setDeleting(true);
    try {
      await materialsApi.remove(deletingMaterial.id);
      toast.success('已删除');
      await fetchMaterials();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
      setDeletingMaterial(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">素材库</h1>
          <p className="text-sm text-zinc-500 mt-1">图片/视频/文档统一存储</p>
        </div>
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600"
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              上传中...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              上传素材
            </>
          )}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleUpload}
        />
      </div>

      <div className="flex items-center gap-3">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32 h-9">
            <SelectValue placeholder="全部类型" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="image">图片</SelectItem>
            <SelectItem value="video">视频</SelectItem>
            <SelectItem value="audio">音频</SelectItem>
            <SelectItem value="document">文档</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="搜索素材..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="w-64 h-9"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      ) : materials.length === 0 ? (
        <div className="text-center py-12 text-sm text-zinc-400">
          暂无素材，点击右上角上传
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {materials.map((m) => {
            const Icon = TYPE_ICONS[m.type] || ImageIcon;
            return (
              <Card key={m.id} className="overflow-hidden hover:shadow-md transition-shadow group">
                <CardContent className="p-0">
                  <div className="aspect-square bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center relative">
                    {m.type === 'image' && m.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt={m.name} className="w-full h-full object-cover" />
                    ) : (
                      <Icon className="w-12 h-12 text-zinc-400" />
                    )}
                    <button
                      onClick={() => handleDelete(m)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 dark:bg-zinc-800/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-medium truncate">{m.name}</div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-zinc-500">{formatSize(m.size)}</span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1">
                        {m.typeName}
                      </Badge>
                    </div>
                    {m.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.tags.slice(0, 2).map((t, i) => (
                          <span key={i} className="text-[10px] text-zinc-500 inline-flex items-center gap-0.5">
                            <Tag className="w-2 h-2" />
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={!!deletingMaterial}
        onOpenChange={(open) => { if (!open) setDeletingMaterial(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除素材</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除「{deletingMaterial?.name}」吗？删除后不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

void PLATFORM_CONFIG;
