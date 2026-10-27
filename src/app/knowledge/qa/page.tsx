'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MessageSquareText,
  Send,
  Loader2,
  BookOpen,
  Sparkles,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  knowledgeApi,
  type KnowledgeQASource,
  type KnowledgeQAHistoryMsg,
} from '@/lib/api/knowledge';
import { toast } from 'sonner';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  sources?: KnowledgeQASource[];
}

const SUGGESTIONS = [
  '我们团队的内容发布流程是什么？',
  '总结一下知识库中的核心要点',
  '根据知识库帮我列一个内容选题清单',
];

export default function KnowledgeQAPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [asking, setAsking] = useState(false);
  const [hasDocs, setHasDocs] = useState<boolean | null>(null);
  const [showHistory, setShowHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user?.currentTeamId) return;
    knowledgeApi
      .list({ teamId: user.currentTeamId, status: 'ready', pageSize: 1 })
      .then((res) => setHasDocs(res.total > 0))
      .catch(() => setHasDocs(false));
  }, [user?.currentTeamId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, asking]);

  const buildHistoryForAPI = (msgs: ChatMsg[]): KnowledgeQAHistoryMsg[] => {
    // 最多传最近 10 轮历史
    const recent = msgs.slice(-20);
    return recent.map((m) => ({
      role: m.role,
      content: m.content,
      sources: m.sources,
    }));
  };

  const handleAsk = async (question?: string) => {
    const q = (question ?? input).trim();
    if (!q) {
      toast.warning('请输入问题');
      return;
    }
    if (asking) return;

    // 构造要传给后端的历史（不含当前问题）
    const historyForAPI = showHistory ? buildHistoryForAPI(messages) : [];

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setAsking(true);
    try {
      const res = await knowledgeApi.ask(q, 5, historyForAPI);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.answer, sources: res.sources },
      ]);
    } catch (err) {
      toast.error('问答失败：' + (err as Error).message);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '抱歉，本次问答出错，请稍后重试。' },
      ]);
    } finally {
      setAsking(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success('对话已清空');
  };

  // 点击引用来源 → 跳到管理页并自动打开对应分块
  const handleSourceClick = (docId: number, chunkIdx: number) => {
    router.push(`/knowledge?docId=${docId}&chunk=${chunkIdx}`);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto">
      {/* 头部 */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquareText className="w-6 h-6 text-indigo-500" />
            知识问答
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            基于团队知识库（RAG）的智能问答
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowHistory((v) => !v)}
            title={showHistory ? '关闭多轮对话历史' : '开启多轮对话历史'}
          >
            <History className="w-4 h-4" />
            {showHistory ? '历史：开' : '历史：关'}
          </Button>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-zinc-500 hover:text-zinc-700"
              onClick={clearChat}
            >
              清空对话
            </Button>
          )}
          <Link href="/knowledge">
            <Button variant="outline" className="gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              知识库
            </Button>
          </Link>
        </div>
      </div>

      {/* 消息区 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto rounded-lg border bg-zinc-50/50 dark:bg-zinc-900/50 p-4 space-y-4"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-4">
            {hasDocs === false ? (
              <>
                <BookOpen className="w-12 h-12" />
                <p className="text-sm">知识库还没有已就绪的文档</p>
                <Link href="/knowledge">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <BookOpen className="w-4 h-4" />
                    去上传文档
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Sparkles className="w-10 h-10 text-indigo-300" />
                <p className="text-sm">开始提问，AI 将基于知识库回答</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleAsk(s)}
                      className="text-xs px-3 py-1.5 rounded-full border bg-white dark:bg-zinc-800 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-indigo-500 text-white rounded-br-md'
                    : 'bg-white dark:bg-zinc-800 border rounded-bl-md'
                }`}
              >
                {m.content}
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2.5 pt-2.5 border-t flex flex-wrap gap-1.5">
                    <span className="text-[10px] text-zinc-400 mr-1">引用：</span>
                    {m.sources.map((s, j) => (
                      <button
                        key={j}
                        type="button"
                        onClick={() => handleSourceClick(s.docId, s.chunkIdx)}
                        className="text-[10px] text-indigo-500 hover:text-indigo-700 hover:underline"
                        title={`点击跳到知识库查看「${s.docTitle}」分块`}
                      >
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-normal cursor-pointer hover:bg-indigo-100"
                        >
                          {s.docTitle} · 块#{s.chunkIdx} · {s.score.toFixed(2)}
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {asking && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-zinc-800 border rounded-2xl rounded-bl-md px-4 py-2.5 flex items-center gap-2 text-sm text-zinc-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              正在检索知识库并生成回答...
            </div>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="pt-4 flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            showHistory
              ? '输入你的问题（多轮对话历史已开启），Ctrl+Enter 发送'
              : '输入你的问题（多轮对话历史已关闭），Ctrl+Enter 发送'
          }
          className="min-h-[52px] max-h-32 resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleAsk();
            }
          }}
        />
        <Button
          onClick={() => handleAsk()}
          disabled={asking || !input.trim()}
          className="gap-1.5 h-[52px] px-5 flex-shrink-0 bg-gradient-to-r from-indigo-500 to-purple-600"
        >
          {asking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          发送
        </Button>
      </div>
    </div>
  );
}
