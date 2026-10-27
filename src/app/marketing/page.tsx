import Link from 'next/link';
import {
  Sparkles,
  Users,
  Radio,
  FileText,
  Bot,
  Shield,
  ArrowRight,
  Check,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Sparkles,
    title: 'AI 智能辅助',
    desc: '一键生成标题、润色正文、智能推荐标签，内容创作提效 3 倍',
  },
  {
    icon: Radio,
    title: '多平台分发',
    desc: '公众号、小红书一键发布，抖音/微博等更多平台即将支持',
  },
  {
    icon: FileText,
    title: '知识库(RAG)',
    desc: '上传企业文档，AI 生成自动引用，统一品牌口径',
  },
  {
    icon: Users,
    title: '团队协作',
    desc: '审核流、版本历史、成员权限，多人共创不乱套',
  },
  {
    icon: Bot,
    title: '模板与素材',
    desc: '预置内容模板、素材库去重存储，重复使用零成本',
  },
  {
    icon: Shield,
    title: '企业级安全',
    desc: '团队隔离、成员角色、操作审计，数据归属清晰',
  },
];

const PLANS = [
  {
    name: '个人版',
    price: '¥199',
    period: '/月',
    features: ['2 个平台账号', '6 个内容模板', 'AI 辅助无限次', '知识库 50 篇'],
    highlight: false,
  },
  {
    name: '团队版',
    price: '¥799',
    period: '/月',
    features: ['6 个平台账号', '审核流 + 定时发布', '团队知识库', '成员权限管理', '优先支持'],
    highlight: true,
  },
  {
    name: '企业版',
    price: '面议',
    period: '',
    features: ['不限平台账号', 'API 接入', '专属部署支持', '定制化功能', '7×24 响应'],
    highlight: false,
  },
];

export default function MarketingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Hero */}
      <section className="px-6 pt-24 pb-16 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          AI 驱动的一站式运营内容平台
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-zinc-900 leading-tight">
          让内容创作与分发
          <br />
          <span className="bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            像发一条朋友圈一样简单
          </span>
        </h1>
        <p className="mt-6 text-lg text-zinc-600 max-w-2xl mx-auto">
          从 AI 草稿生成、团队审核到多平台一键分发，运营新媒提供完整的内容生产闭环。
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium hover:opacity-90 transition-opacity"
          >
            免费开始 <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-zinc-300 text-zinc-700 font-medium hover:bg-zinc-50 transition-colors"
          >
            查看套餐
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">核心功能</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="p-6 rounded-xl bg-white border border-zinc-200 hover:border-indigo-300 hover:shadow-md transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <h3 className="font-semibold text-zinc-900 mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-600 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 py-16 max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">简单透明的定价</h2>
        <p className="text-center text-zinc-600 mb-12">按团队计费，所有套餐不限成员人数</p>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`p-6 rounded-2xl border transition-all ${
                p.highlight
                  ? 'border-indigo-400 shadow-lg shadow-indigo-100 bg-white relative'
                  : 'border-zinc-200 bg-white/50'
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-indigo-500 text-white text-xs font-medium">
                  最受欢迎
                </span>
              )}
              <h3 className="font-semibold text-lg text-zinc-900">{p.name}</h3>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-zinc-900">{p.price}</span>
                <span className="text-sm text-zinc-500">{p.period}</span>
              </div>
              <ul className="mt-5 space-y-2.5">
                {p.features.map((ft) => (
                  <li key={ft} className="flex items-start gap-2 text-sm text-zinc-700">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    {ft}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className={`mt-6 block text-center px-4 py-2.5 rounded-lg font-medium transition-colors ${
                  p.highlight
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90'
                    : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                选择此套餐
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-10 text-center text-sm text-zinc-500 border-t border-zinc-200">
        © {new Date().getFullYear()} 运营新媒 · AI 驱动的内容运营平台
      </footer>
    </div>
  );
}
