'use client';

/**
 * MarkdownEditor —— 自研零依赖 Markdown 排版编辑器。
 *
 * - 左：工具栏 + textarea 写作区；右：实时排版预览（分屏，窄屏自动隐藏预览）
 * - 工具栏覆盖：标题 / 粗斜删 / 行内代码 / 代码块 / 引用 / 列表（含任务列表）/
 *   链接 / 图片（MinIO 直传）/ 表格 / 分割线 / 撤销重做
 * - 自维护撤销栈（连续击键合并），并接管 Ctrl/Cmd+Z、Shift+Z、Ctrl+Y、Tab
 * - value/onChange 完全受控，AI 生成、草稿加载等外部写入不会丢光标
 */
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Bold,
  Italic,
  Strikethrough,
  Code,
  Code2,
  Quote,
  List,
  ListOrdered,
  ListChecks,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Minus,
  Undo2,
  Redo2,
  Heading1,
  Heading2,
  Heading3,
  Loader2,
  Columns2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { materialsApi } from '@/lib/api/materials';
import { markdownToHtml, countWords } from '@/lib/markdown';
import { toast } from 'sonner';

export interface MarkdownEditorHandle {
  /** 获取渲染后的 HTML（用于纯预览 tab） */
  getHTML: () => string;
  focus: () => void;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  height?: number;
  onReady?: () => void;
}

interface HistoryState {
  stack: string[];
  index: number;
}

const HISTORY_LIMIT = 100;
const MERGE_WINDOW_MS = 500;

export const MarkdownEditor = forwardRef<MarkdownEditorHandle, MarkdownEditorProps>(
  function MarkdownEditor(
    { value, onChange, placeholder = '开始创作，支持 Markdown 排版…', height = 540, onReady },
    ref,
  ) {
    const taRef = useRef<HTMLTextAreaElement>(null);
    const historyRef = useRef<HistoryState>({ stack: [value], index: 0 });
    const lastInputRef = useRef<{ time: number; prev: string }>({ time: 0, prev: value });
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [historyVersion, setHistoryVersion] = useState(0); // 触发撤销/重做按钮态刷新
    const [uploading, setUploading] = useState(false);
    const [showPreview, setShowPreview] = useState(true);

    useImperativeHandle(ref, () => ({
      getHTML: () => markdownToHtml(value),
      focus: () => taRef.current?.focus(),
    }), [value]);

    // ---- 撤销栈 ----
    const pushHistory = useCallback((next: string, merge = false) => {
      const h = historyRef.current;
      if (h.stack[h.index] === next) return;
      if (merge) {
        h.stack[h.index] = next; // 连续击键：替换栈顶
      } else {
        h.stack = h.stack.slice(0, h.index + 1);
        h.stack.push(next);
        if (h.stack.length > HISTORY_LIMIT) h.stack.shift();
        h.index = h.stack.length - 1;
      }
    }, []);

    const restoreStack = useCallback((next: string) => {
      onChange(next);
      lastInputRef.current = { time: 0, prev: next };
      setHistoryVersion((v) => v + 1);
      requestAnimationFrame(() => taRef.current?.focus());
    }, [onChange]);

    const undo = useCallback(() => {
      const h = historyRef.current;
      if (h.index <= 0) return;
      h.index -= 1;
      restoreStack(h.stack[h.index]);
    }, [restoreStack]);

    const redo = useCallback(() => {
      const h = historyRef.current;
      if (h.index >= h.stack.length - 1) return;
      h.index += 1;
      restoreStack(h.stack[h.index]);
    }, [restoreStack]);

    // ---- 文本变换 ----
    /** 应用一次工具栏变换：算出新值与选区，入栈并同步 */
    const applyChange = useCallback(
      (next: string, selStart: number, selEnd: number) => {
        pushHistory(next, false);
        onChange(next);
        setHistoryVersion((v) => v + 1);
        requestAnimationFrame(() => {
          const ta = taRef.current;
          if (!ta) return;
          ta.focus();
          ta.setSelectionRange(selStart, selEnd);
        });
      },
      [onChange, pushHistory],
    );

    /** 选区文本行内包裹：**xx**、`xx` */
    const wrapInline = useCallback(
      (before: string, after: string, fallback: string) => {
        const ta = taRef.current;
        if (!ta) return;
        const { selectionStart: s, selectionEnd: e } = ta;
        const selected = value.slice(s, e) || fallback;
        const next = value.slice(0, s) + before + selected + after + value.slice(e);
        const selStart = s + before.length;
        applyChange(next, selStart, selStart + selected.length);
      },
      [value, applyChange],
    );

    /** 整行前缀切换：# / - / 1. / > / - [ ] */
    const toggleLinePrefix = useCallback(
      (makePrefix: (lineNo: number) => string, match: RegExp) => {
        const ta = taRef.current;
        if (!ta) return;
        const { selectionStart: s, selectionEnd: e } = ta;
        const lineStart = value.lastIndexOf('\n', s - 1) + 1;
        let lineEnd = value.indexOf('\n', e);
        if (lineEnd === -1) lineEnd = value.length;
        const block = value.slice(lineStart, lineEnd);
        const lines = block.split('\n');

        const allMatched = lines.every((l) => match.test(l));
        let cursorOffset = 0;
        const replaced = lines.map((l, idx) => {
          if (allMatched) return l.replace(match, '');
          const prefix = makePrefix(idx + 1);
          if (!match.test(l)) {
            if (idx === 0) cursorOffset = prefix.length;
            return prefix + l;
          }
          return l;
        });

        const newBlock = replaced.join('\n');
        const next = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
        const pos = s + cursorOffset;
        applyChange(next, Math.min(pos, lineStart + newBlock.length), Math.min(pos, lineStart + newBlock.length));
      },
      [value, applyChange],
    );

    /** 插入块级模板（表格、代码块、分割线等） */
    const insertBlock = useCallback(
      (snippet: string) => {
        const ta = taRef.current;
        if (!ta) return;
        const { selectionStart: s } = ta;
        const needLeadingBreak = s > 0 && value[s - 1] !== '\n';
        const insert = `${needLeadingBreak ? '\n\n' : ''}${snippet}\n`;
        const next = value.slice(0, s) + insert + value.slice(s);
        const pos = s + insert.length;
        applyChange(next, pos, pos);
      },
      [value, applyChange],
    );

    const insertLink = useCallback(() => {
      const ta = taRef.current;
      if (!ta) return;
      const { selectionStart: s, selectionEnd: e } = ta;
      const label = value.slice(s, e) || '链接文字';
      const snippet = `[${label}](https://)`;
      const next = value.slice(0, s) + snippet + value.slice(e);
      const urlStart = s + label.length + 3; // 选中 https:// 便于直接替换
      applyChange(next, urlStart, urlStart + 8);
    }, [value, applyChange]);

    // ---- 事件 ----
    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const next = e.target.value;
      const now = Date.now();
      const prev = lastInputRef.current;
      // 连续普通击键（短时间、差异很小）合并进同一条历史
      const diffLen = Math.abs(next.length - prev.prev.length);
      const continuous = now - prev.time < MERGE_WINDOW_MS && diffLen <= 2;
      pushHistory(next, continuous);
      lastInputRef.current = { time: now, prev: next };
      onChange(next);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        wrapInline('**', '**', '粗体');
        return;
      }
      if (mod && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        wrapInline('*', '*', '斜体');
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const { selectionStart: s, selectionEnd: end } = e.currentTarget;
        const next = value.slice(0, s) + '  ' + value.slice(end);
        applyChange(next, s + 2, s + 2);
      }
    };

    // ---- 图片上传（MinIO 直传 + 入库素材库） ----
    const handlePickImage = () => fileInputRef.current?.click();

    const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
      // 注意：必须先把 FileList 拷贝成数组，再清空 input.value——
      // 浏览器中给 file input 赋 value='' 会立刻清空 live FileList，
      // 若先清空再读 length 会恒为 0，导致上传被静默跳过。
      const images = e.target.files
        ? Array.from(e.target.files).filter((f) => f.type.startsWith('image/'))
        : [];
      e.target.value = '';
      if (images.length === 0) {
        toast.warning('请选择图片文件');
        return;
      }
      setUploading(true);
      try {
        // 同源代理上传（后端转发 MinIO），规避直传 CORS；sha256 自动去重
        const materials = await materialsApi.upload(images, { type: 'image' });
        const inserted = materials
          .filter((m) => !!m.url)
          .map((m) => `![${m.name}](${m.url})`);
        if (inserted.length > 0) {
          const s = taRef.current?.selectionStart ?? value.length;
          const add = (s > 0 && value[s - 1] !== '\n' ? '\n' : '') + inserted.join('\n') + '\n';
          const next = value.slice(0, s) + add + value.slice(s);
          applyChange(next, s + add.length, s + add.length);
          toast.success(`已插入 ${inserted.length} 张图片`);
        }
      } catch (err) {
        toast.error(`图片上传失败：${(err as Error).message}`);
      } finally {
        setUploading(false);
      }
    };

    // 外部整体替换（AI 生成/润色、加载草稿）：当 value 不等于栈顶时重置撤销栈
    const lastExternalValue = useRef(value);
    if (lastExternalValue.current !== value) {
      if (value !== historyRef.current.stack[historyRef.current.index]) {
        historyRef.current = { stack: [value], index: 0 };
        lastInputRef.current = { time: 0, prev: value };
      }
      lastExternalValue.current = value;
    }

    const previewHtml = useMemo(() => markdownToHtml(value), [value]);
    const words = useMemo(() => countWords(value), [value]);

    // onReady 仅通知一次
    const readyNotified = useRef(false);
    if (!readyNotified.current) {
      readyNotified.current = true;
      onReady?.();
    }

    const h = historyRef.current;
    const canUndo = h.index > 0;
    const canRedo = h.index < h.stack.length - 1;
    void historyVersion; // 仅用于驱动按钮态重渲染

    return (
      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {/* 工具栏 */}
        <TooltipProvider delayDuration={300}>
        <div className="flex flex-wrap items-center gap-0.5 border-b border-zinc-200 bg-zinc-50 px-2 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/60">
          <Tip label="撤销 (Ctrl+Z)">
            <ToolBtn onClick={undo} disabled={!canUndo}><Undo2 className="h-4 w-4" /></ToolBtn>
          </Tip>
          <Tip label="重做 (Ctrl+Shift+Z)">
            <ToolBtn onClick={redo} disabled={!canRedo}><Redo2 className="h-4 w-4" /></ToolBtn>
          </Tip>
          <Divider />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <ToolBtn label="标题"><Heading2 className="h-4 w-4" /></ToolBtn>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => toggleLinePrefix(() => '# ', /^#{1,6}\s/)}>
                <Heading1 className="mr-2 h-4 w-4" /> 一级标题
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleLinePrefix(() => '## ', /^#{1,6}\s/)}>
                <Heading2 className="mr-2 h-4 w-4" /> 二级标题
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleLinePrefix(() => '### ', /^#{1,6}\s/)}>
                <Heading3 className="mr-2 h-4 w-4" /> 三级标题
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Tip label="加粗 (Ctrl+B)">
            <ToolBtn onClick={() => wrapInline('**', '**', '粗体')}><Bold className="h-4 w-4" /></ToolBtn>
          </Tip>
          <Tip label="斜体 (Ctrl+I)">
            <ToolBtn onClick={() => wrapInline('*', '*', '斜体')}><Italic className="h-4 w-4" /></ToolBtn>
          </Tip>
          <Tip label="删除线">
            <ToolBtn onClick={() => wrapInline('~~', '~~', '删除线')}><Strikethrough className="h-4 w-4" /></ToolBtn>
          </Tip>
          <Divider />

          <Tip label="行内代码">
            <ToolBtn onClick={() => wrapInline('`', '`', 'code')}><Code className="h-4 w-4" /></ToolBtn>
          </Tip>
          <Tip label="代码块">
            <ToolBtn onClick={() => insertBlock('```js\n// 代码\n```')}><Code2 className="h-4 w-4" /></ToolBtn>
          </Tip>
          <Tip label="引用">
            <ToolBtn onClick={() => toggleLinePrefix(() => '> ', /^>\s?/)}><Quote className="h-4 w-4" /></ToolBtn>
          </Tip>
          <Divider />

          <Tip label="无序列表">
            <ToolBtn onClick={() => toggleLinePrefix(() => '- ', /^[-*+]\s/)}><List className="h-4 w-4" /></ToolBtn>
          </Tip>
          <Tip label="有序列表">
            <ToolBtn onClick={() => toggleLinePrefix((n) => `${n}. `, /^\d+\.\s/)}><ListOrdered className="h-4 w-4" /></ToolBtn>
          </Tip>
          <Tip label="任务列表">
            <ToolBtn onClick={() => toggleLinePrefix(() => '- [ ] ', /^- \[[ xX]\]\s/)}><ListChecks className="h-4 w-4" /></ToolBtn>
          </Tip>
          <Divider />

          <Tip label="链接">
            <ToolBtn onClick={insertLink}><LinkIcon className="h-4 w-4" /></ToolBtn>
          </Tip>
          <Tip label="上传图片（直传素材库）">
            <ToolBtn onClick={handlePickImage} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
            </ToolBtn>
          </Tip>
          <Tip label="表格">
            <ToolBtn onClick={() => insertBlock('| 列1 | 列2 | 列3 |\n| --- | --- | --- |\n| 内容 | 内容 | 内容 |')}>
              <TableIcon className="h-4 w-4" />
            </ToolBtn>
          </Tip>
          <Tip label="分割线">
            <ToolBtn onClick={() => insertBlock('---')}><Minus className="h-4 w-4" /></ToolBtn>
          </Tip>

          <div className="ml-auto flex items-center gap-3 pr-1">
            <button
              type="button"
              onClick={() => setShowPreview((v) => !v)}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
                showPreview
                  ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                  : 'text-zinc-500 hover:bg-zinc-200/60 dark:hover:bg-zinc-800'
              }`}
            >
              <Columns2 className="h-3.5 w-3.5" />
              分屏预览
            </button>
            <span className="hidden text-[11px] tabular-nums text-zinc-400 sm:inline">{words} 字</span>
          </div>
        </div>
        </TooltipProvider>

        {/* 编辑 / 预览分屏 */}
        <div className="flex" style={{ height }}>
          <textarea
            ref={taRef}
            value={value}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            spellCheck={false}
            className={`min-w-0 flex-1 resize-none bg-transparent px-4 py-3 font-mono text-[13px] leading-7 outline-none placeholder:text-zinc-400 ${
              showPreview ? 'border-r border-zinc-200 dark:border-zinc-800' : ''
            }`}
          />
          {showPreview && (
            <div className="hidden min-w-0 flex-1 overflow-auto bg-zinc-50/60 md:block dark:bg-zinc-900/40">
              {previewHtml ? (
                <div className="md-preview px-6 py-4" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-zinc-400">
                  实时预览
                </div>
              )}
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleImageSelected}
        />
      </div>
    );
  },
);

// ---- 工具栏小部件 ----
function ToolBtn({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-200/70 disabled:cursor-not-allowed disabled:opacity-35 dark:text-zinc-300 dark:hover:bg-zinc-800"
    >
      {children}
    </button>
  );
}

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Divider() {
  return <span className="mx-1 h-4 w-px bg-zinc-200 dark:bg-zinc-700" />;
}
