import { Head } from '@inertiajs/react';
import {
    AlertTriangle,
    BrainCircuit,
    CheckCircle2,
    CircleHelp,
    Clock3,
    DollarSign,
    MessageCircle,
    History,
    RefreshCw,
    Send,
    X,
    Plus,
    Bot,
    UserRound,
    ShieldAlert,
    Sparkles,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';

type Finding = {
    title: string;
    severity: 'info' | 'warning' | 'critical';
    description: string;
    evidence: string[];
};

type Recommendation = {
    priority: 'low' | 'medium' | 'high';
    title: string;
    action: string;
    reason: string;
};

type Prediction = {
    metric: string;
    horizon: string;
    trend: 'rising' | 'falling' | 'stable' | 'unknown';
    expected_value: number | null;
    confidence: number;
};

type Analysis = {
    status: 'normal' | 'warning' | 'critical' | 'insufficient_data';
    summary: string;
    findings: Finding[];
    recommendations: Recommendation[];
    predictions: Prediction[];
    financial: {
        summary: string;
        risk: string;
    };
};

type Latest = {
    status: string;
    model: string;
    period_from: string;
    period_to: string;
    created_at: string;
    analysis: Analysis | null;
    error_message: string | null;
};

type ChatResponse = {
    answer: string;
    evidence: string[];
    limitations: string[];
};

type ChatMessage = {
    id: string;
    role: 'user' | 'assistant';
    question?: string;
    response?: ChatResponse;
    pending?: boolean;
    createdAt: string;
};

type ChatHistory = {
    id: string;
    title: string;
    createdAt: string;
    messages: ChatMessage[];
};

const dateTime = (value: string) =>
    new Date(value).toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    });

function severityClass(severity: Finding['severity']) {
    if (severity === 'critical') {
        return 'border-red-200 bg-red-50 text-red-900';
    }

    if (severity === 'warning') {
        return 'border-amber-200 bg-amber-50 text-amber-900';
    }

    return 'border-slate-200 bg-slate-50 text-slate-800';
}

export default function AiIntelligence() {
    const [latest, setLatest] = useState<Latest | null>(null);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState('');
    const [question, setQuestion] = useState('');
    const [chatting, setChatting] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
    const [activeChatId, setActiveChatId] = useState<string | null>(null);
    const [historyOpen, setHistoryOpen] = useState(false);

    const loadLatest = async () => {
        try {
            const response = await fetch('/api/ai/analysis/latest', {
                headers: { Accept: 'application/json' },
            });

            if (!response.ok) {
                throw new Error('Analisis AI belum dapat dimuat.');
            }

            setLatest((await response.json()).data ?? null);
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : 'Gagal memuat analisis AI.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void loadLatest();

        try {
            const saved = localStorage.getItem('supathings-ai-chat-history');
            if (saved) {
                setChatHistory(JSON.parse(saved) as ChatHistory[]);
            }
        } catch {
            localStorage.removeItem('supathings-ai-chat-history');
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(
            'supathings-ai-chat-history',
            JSON.stringify(chatHistory.slice(0, 30)),
        );
    }, [chatHistory]);

    const startNewChat = () => {
        setActiveChatId(null);
        setQuestion('');
        setHistoryOpen(false);
    };

    const openChat = () => {
        setChatOpen(true);
        setHistoryOpen(false);
    };

    const selectChat = (item: ChatHistory) => {
        setActiveChatId(item.id);
        setQuestion('');
        setHistoryOpen(false);
    };

    const analyze = async () => {
        setAnalyzing(true);
        setError('');

        try {
            const response = await fetch('/api/ai/analysis', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content') ?? '',
                },
                body: JSON.stringify({}),
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.message ?? 'Analisis AI gagal.');
            }

            setLatest(payload.data);
        } catch (cause) {
            setError(
                cause instanceof Error ? cause.message : 'Analisis AI gagal.',
            );
        } finally {
            setAnalyzing(false);
        }
    };

    const ask = async (event: FormEvent) => {
        event.preventDefault();

        const trimmedQuestion = question.trim();
        if (!trimmedQuestion || chatting) {
            return;
        }

        const messageTime = new Date().toISOString();
        const userMessage: ChatMessage = {
            id: `user-${messageTime}`,
            role: 'user',
            question: trimmedQuestion,
            createdAt: messageTime,
        };
        const pendingMessage: ChatMessage = {
            id: `assistant-${messageTime}`,
            role: 'assistant',
            pending: true,
            createdAt: messageTime,
        };

        let targetChatId = activeChatId;
        setChatting(true);
        setError('');
        setQuestion('');

        setChatHistory((current) => {
            const existing = current.find((item) => item.id === activeChatId);

            if (existing) {
                return current.map((item) =>
                    item.id === activeChatId
                        ? {
                              ...item,
                              messages: [
                                  ...item.messages,
                                  userMessage,
                                  pendingMessage,
                              ],
                          }
                        : item,
                );
            }

            const newChat: ChatHistory = {
                id: messageTime,
                title: trimmedQuestion.slice(0, 60),
                createdAt: messageTime,
                messages: [userMessage, pendingMessage],
            };

            targetChatId = newChat.id;
            setActiveChatId(newChat.id);
            return [newChat, ...current];
        });

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN':
                        document
                            .querySelector('meta[name="csrf-token"]')
                            ?.getAttribute('content') ?? '',
                },
                body: JSON.stringify({ question: trimmedQuestion }),
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.message ?? 'AI tidak dapat menjawab.');
            }

            const responseData = payload.data as ChatResponse;

            setChatHistory((current) =>
                current.map((item) =>
                    item.id === targetChatId
                        ? {
                              ...item,
                              messages: item.messages.map((message) =>
                                  message.id === pendingMessage.id
                                      ? {
                                            ...message,
                                            pending: false,
                                            response: responseData,
                                        }
                                      : message,
                              ),
                          }
                        : item,
                ),
            );
        } catch (cause) {
            setChatHistory((current) =>
                current
                    .map((item) =>
                        item.id === targetChatId
                            ? {
                                  ...item,
                                  messages: item.messages.filter(
                                      (message) =>
                                          message.id !== pendingMessage.id,
                                  ),
                              }
                            : item,
                    )
                    .filter((item) => item.messages.length > 0),
            );
            setError(
                cause instanceof Error
                    ? cause.message
                    : 'AI tidak dapat menjawab.',
            );
        } finally {
            setChatting(false);
        }
    };

    const analysis = latest?.analysis;

    return (
        <>
            <Head title="AI Intelligence" />
            <main className="min-h-full bg-slate-50 px-4 py-6 md:px-8 md:py-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <header className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-sm text-slate-500">
                                Supathings / AI Intelligence
                            </p>
                            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                                SupaThings AI
                            </h1>
                            <p className="mt-1 max-w-3xl text-sm text-slate-500">
                                Analisis lingkungan, deteksi anomali, prediksi
                                tren, rekomendasi tindakan, dan analisis biaya
                                berdasarkan data SupaThings.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => void analyze()}
                            disabled={analyzing}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                        >
                            <RefreshCw
                                className={
                                    analyzing ? 'size-4 animate-spin' : 'size-4'
                                }
                            />
                            {analyzing
                                ? 'Menganalisis...'
                                : 'Analisis sekarang'}
                        </button>
                    </header>

                    {error && (
                        <div
                            role="alert"
                            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                        >
                            {error}
                        </div>
                    )}

                    <section className="grid gap-4 md:grid-cols-4">
                        <article className="rounded-2xl border bg-white p-5">
                            <div className="flex items-center gap-2 text-slate-500">
                                <BrainCircuit className="size-4" />
                                Status AI
                            </div>
                            <p className="mt-3 text-xl font-semibold">
                                {loading
                                    ? 'Memuat...'
                                    : analysis
                                      ? 'Siap'
                                      : 'Belum dianalisis'}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                                Model: {latest?.model ?? '—'}
                            </p>
                        </article>

                        <article className="rounded-2xl border bg-white p-5">
                            <div className="flex items-center gap-2 text-slate-500">
                                <ShieldAlert className="size-4" />
                                Temuan
                            </div>
                            <p className="mt-3 text-3xl font-semibold">
                                {analysis?.findings.length ?? 0}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                                Anomali dan risiko terdeteksi.
                            </p>
                        </article>

                        <article className="rounded-2xl border bg-white p-5">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Sparkles className="size-4" />
                                Rekomendasi
                            </div>
                            <p className="mt-3 text-3xl font-semibold">
                                {analysis?.recommendations.length ?? 0}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                                Tindakan yang dapat diverifikasi operator.
                            </p>
                        </article>

                        <article className="rounded-2xl border bg-white p-5">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Clock3 className="size-4" />
                                Analisis terakhir
                            </div>
                            <p className="mt-3 text-sm font-semibold">
                                {latest?.created_at
                                    ? dateTime(latest.created_at)
                                    : '—'}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                                AI tidak berjalan otomatis tanpa tindakan
                                pengguna.
                            </p>
                        </article>
                    </section>

                    {analysis ? (
                        <>
                            <section className="rounded-2xl border bg-white p-5 shadow-sm">
                                <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div>
                                        <p className="text-sm font-semibold text-blue-700">
                                            Ringkasan AI
                                        </p>
                                        <h2 className="mt-1 text-xl font-semibold">
                                            {analysis.summary}
                                        </h2>
                                    </div>
                                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase">
                                        {analysis.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <p className="mt-3 text-xs text-slate-500">
                                    Periode data:{' '}
                                    {dateTime(latest?.period_from ?? '')} —{' '}
                                    {dateTime(latest?.period_to ?? '')}
                                </p>
                            </section>

                            <section className="grid gap-4 lg:grid-cols-2">
                                <article className="rounded-2xl border bg-white p-5">
                                    <h2 className="text-lg font-semibold">
                                        Temuan & anomali
                                    </h2>
                                    <div className="mt-4 space-y-3">
                                        {analysis.findings.length ? (
                                            analysis.findings.map((finding) => (
                                                <div
                                                    key={finding.title}
                                                    className={
                                                        'rounded-xl border p-4 ' +
                                                        severityClass(
                                                            finding.severity,
                                                        )
                                                    }
                                                >
                                                    <div className="flex gap-3">
                                                        {finding.severity ===
                                                        'critical' ? (
                                                            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
                                                        ) : (
                                                            <CircleHelp className="mt-0.5 size-5 shrink-0" />
                                                        )}
                                                        <div>
                                                            <p className="font-semibold">
                                                                {finding.title}
                                                            </p>
                                                            <p className="mt-1 text-sm">
                                                                {
                                                                    finding.description
                                                                }
                                                            </p>
                                                            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                                                                {finding.evidence.map(
                                                                    (item) => (
                                                                        <li
                                                                            key={
                                                                                item
                                                                            }
                                                                        >
                                                                            {
                                                                                item
                                                                            }
                                                                        </li>
                                                                    ),
                                                                )}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-500">
                                                Tidak ada temuan penting.
                                            </p>
                                        )}
                                    </div>
                                </article>

                                <article className="rounded-2xl border bg-white p-5">
                                    <h2 className="text-lg font-semibold">
                                        Rekomendasi operator
                                    </h2>
                                    <div className="mt-4 space-y-3">
                                        {analysis.recommendations.length ? (
                                            analysis.recommendations.map(
                                                (item) => (
                                                    <div
                                                        key={item.title}
                                                        className="rounded-xl bg-slate-50 p-4"
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <p className="font-semibold">
                                                                {item.title}
                                                            </p>
                                                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase">
                                                                {item.priority}
                                                            </span>
                                                        </div>
                                                        <p className="mt-2 text-sm text-slate-700">
                                                            {item.action}
                                                        </p>
                                                        <p className="mt-2 text-xs text-slate-500">
                                                            {item.reason}
                                                        </p>
                                                    </div>
                                                ),
                                            )
                                        ) : (
                                            <p className="text-sm text-slate-500">
                                                Belum ada rekomendasi.
                                            </p>
                                        )}
                                    </div>
                                </article>
                            </section>

                            <section className="grid gap-4 lg:grid-cols-2">
                                <article className="rounded-2xl border bg-white p-5">
                                    <h2 className="text-lg font-semibold">
                                        Prediksi tren
                                    </h2>
                                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                                        {analysis.predictions.length ? (
                                            analysis.predictions.map((item) => (
                                                <div
                                                    key={
                                                        item.metric +
                                                        item.horizon
                                                    }
                                                    className="rounded-xl bg-slate-50 p-4"
                                                >
                                                    <div className="flex items-center justify-between gap-3">
                                                        <p className="font-medium">
                                                            {item.metric}
                                                        </p>
                                                        {item.trend ===
                                                        'rising' ? (
                                                            <TrendingUp className="size-4" />
                                                        ) : item.trend ===
                                                          'falling' ? (
                                                            <TrendingDown className="size-4" />
                                                        ) : (
                                                            <CheckCircle2 className="size-4" />
                                                        )}
                                                    </div>
                                                    <p className="mt-2 text-sm">
                                                        {item.expected_value ==
                                                        null
                                                            ? 'Belum cukup data'
                                                            : item.expected_value}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {item.horizon} ·
                                                        confidence{' '}
                                                        {Math.round(
                                                            item.confidence *
                                                                100,
                                                        )}
                                                        %
                                                    </p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-slate-500">
                                                Belum cukup data.
                                            </p>
                                        )}
                                    </div>
                                </article>

                                <article className="rounded-2xl border bg-white p-5">
                                    <div className="flex items-center gap-2">
                                        <DollarSign className="size-5 text-emerald-700" />
                                        <h2 className="text-lg font-semibold">
                                            Intelijen biaya
                                        </h2>
                                    </div>
                                    <p className="mt-4 text-sm text-slate-700">
                                        {analysis.financial.summary}
                                    </p>
                                    <p className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                                        {analysis.financial.risk}
                                    </p>
                                </article>
                            </section>
                        </>
                    ) : (
                        <section className="rounded-2xl border bg-white p-8 text-center">
                            <BrainCircuit className="mx-auto size-10 text-blue-700" />
                            <h2 className="mt-3 text-lg font-semibold">
                                Belum ada analisis AI
                            </h2>
                            <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
                                Jalankan analisis untuk membaca sensor,
                                perangkat, kontrol, batch, panen, dan biaya pada
                                periode terakhir.
                            </p>
                        </section>
                    )}

                    <button
                        type="button"
                        onClick={openChat}
                        aria-label="Buka Tanya SupaThings AI"
                        className="fixed right-6 bottom-6 z-40 inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-xl transition hover:-translate-y-0.5 hover:bg-slate-800 focus:ring-4 focus:outline-none"
                    >
                        <MessageCircle className="size-5" />
                        Tanya AI
                    </button>

                    {chatOpen && (
                        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-6">
                            <div className="flex h-[92vh] w-full max-w-5xl overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:h-[min(760px,90vh)] sm:rounded-3xl">
                                <aside
                                    className={`w-72 shrink-0 border-r bg-slate-50 ${historyOpen ? 'block' : 'hidden'} sm:block`}
                                >
                                    <div className="flex h-full flex-col">
                                        <div className="flex items-center justify-between border-b px-4 py-4">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-900">
                                                    Riwayat chat
                                                </p>
                                                <p className="mt-0.5 text-xs text-slate-500">
                                                    Tersimpan di perangkat ini
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setHistoryOpen(false)
                                                }
                                                className="rounded-lg p-2 text-slate-500 hover:bg-white sm:hidden"
                                            >
                                                <X className="size-4" />
                                            </button>
                                        </div>
                                        <div className="p-3">
                                            <button
                                                type="button"
                                                onClick={startNewChat}
                                                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                                            >
                                                <Plus className="size-4" /> Chat
                                                baru
                                            </button>
                                        </div>
                                        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
                                            {chatHistory.length === 0 ? (
                                                <p className="px-3 py-8 text-center text-xs leading-5 text-slate-400">
                                                    Belum ada riwayat
                                                    percakapan.
                                                </p>
                                            ) : (
                                                chatHistory.map((item) => (
                                                    <button
                                                        key={item.id}
                                                        type="button"
                                                        onClick={() =>
                                                            selectChat(item)
                                                        }
                                                        className={`w-full rounded-xl px-3 py-3 text-left transition ${item.id === activeChatId ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-white'}`}
                                                    >
                                                        <p className="truncate text-sm font-medium text-slate-800">
                                                            {item.title}
                                                        </p>
                                                        <p className="mt-1 text-[11px] text-slate-400">
                                                            {dateTime(
                                                                item.createdAt,
                                                            )}
                                                        </p>
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </aside>

                                <section className="flex min-w-0 flex-1 flex-col">
                                    <header className="flex items-center justify-between border-b px-4 py-3 sm:px-5">
                                        <div className="flex min-w-0 items-center gap-3">
                                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white">
                                                <Bot className="size-5" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-semibold text-slate-900">
                                                    SupaThings AI
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    Berbasis data SupaThings
                                                    akun Anda
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setHistoryOpen(true)
                                                }
                                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 sm:hidden"
                                                aria-label="Riwayat chat"
                                            >
                                                <History className="size-5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={startNewChat}
                                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                                                aria-label="Chat baru"
                                            >
                                                <Plus className="size-5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setChatOpen(false)
                                                }
                                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                                                aria-label="Tutup chat"
                                            >
                                                <X className="size-5" />
                                            </button>
                                        </div>
                                    </header>

                                    <div className="flex-1 overflow-y-auto bg-white px-4 py-5 sm:px-6">
                                        {activeChatId &&
                                        chatHistory.find(
                                            (item) => item.id === activeChatId,
                                        )?.messages.length ? (
                                            <div className="mx-auto max-w-3xl space-y-5">
                                                {chatHistory
                                                    .find(
                                                        (item) =>
                                                            item.id ===
                                                            activeChatId,
                                                    )
                                                    ?.messages.map((message) =>
                                                        message.role ===
                                                        'user' ? (
                                                            <div
                                                                key={message.id}
                                                                className="flex justify-end gap-2"
                                                            >
                                                                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-slate-900 px-4 py-3 text-sm leading-6 text-white">
                                                                    {
                                                                        message.question
                                                                    }
                                                                </div>
                                                                <UserRound className="mt-2 size-4 shrink-0 text-slate-400" />
                                                            </div>
                                                        ) : (
                                                            <div
                                                                key={message.id}
                                                                className="flex gap-3"
                                                            >
                                                                <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
                                                                    <Bot className="size-4 text-slate-600" />
                                                                </div>
                                                                <div className="max-w-[88%] rounded-2xl rounded-tl-md bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-800">
                                                                    {message.pending ? (
                                                                        <div
                                                                            className="flex items-center gap-1.5 py-1"
                                                                            role="status"
                                                                            aria-label="SupaThings AI sedang menjawab"
                                                                        >
                                                                            <span className="text-xs text-slate-500">
                                                                                {'SupaThings AI sedang menjawab'}
                                                                            </span>
                                                                            <span className="flex items-center gap-1">
                                                                                <span
                                                                                    className="size-1.5 animate-bounce rounded-full bg-slate-500"
                                                                                    style={{ animationDelay: '0ms' }}
                                                                                />
                                                                                <span
                                                                                    className="size-1.5 animate-bounce rounded-full bg-slate-500"
                                                                                    style={{ animationDelay: '140ms' }}
                                                                                />
                                                                                <span
                                                                                    className="size-1.5 animate-bounce rounded-full bg-slate-500"
                                                                                    style={{ animationDelay: '280ms' }}
                                                                                />
                                                                            </span>
                                                                    ) : (
                                                                        <>
                                                                            <p className="whitespace-pre-wrap">
                                                                                {
                                                                                    message
                                                                                        .response
                                                                                        ?.answer
                                                                                }
                                                                            </p>
                                                                            {message
                                                                                .response
                                                                                ?.evidence
                                                                                .length ? (
                                                                                <div className="mt-3 border-t border-slate-200 pt-3">
                                                                                    <p className="text-[11px] font-semibold tracking-wide text-slate-500 uppercase">
                                                                                        Bukti
                                                                                        data
                                                                                    </p>
                                                                                    <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-slate-600">
                                                                                        {message.response.evidence.map(
                                                                                            (
                                                                                                item,
                                                                                            ) => (
                                                                                                <li
                                                                                                    key={
                                                                                                        item
                                                                                                    }
                                                                                                >
                                                                                                    {
                                                                                                        item
                                                                                                    }
                                                                                                </li>
                                                                                            ),
                                                                                        )}
                                                                                    </ul>
                                                                                </div>
                                                                            ) : null}
                                                                            {message
                                                                                .response
                                                                                ?.limitations
                                                                                .length ? (
                                                                                <p className="mt-3 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                                                                                    {message.response.limitations.join(
                                                                                        ' ',
                                                                                    )}
                                                                                </p>
                                                                            ) : null}
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ),
                                                    )}
                                            </div>
                                        ) : (
                                            <div className="mx-auto flex h-full max-w-2xl items-center justify-center text-center">
                                                <div>
                                                    <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-slate-100">
                                                        <MessageCircle className="size-7 text-slate-700" />
                                                    </div>
                                                    <p className="mt-4 text-sm font-semibold text-slate-900">
                                                        Apa yang ingin Anda
                                                        ketahui?
                                                    </p>
                                                    <p className="mt-1 text-sm text-slate-500">
                                                        Tanyakan kondisi
                                                        lingkungan, perangkat,
                                                        budidaya, atau biaya
                                                        berdasarkan data
                                                        SupaThings.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <form
                                        onSubmit={ask}
                                        className="border-t bg-white p-3 sm:p-4"
                                    >
                                        <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-slate-400 focus-within:bg-white">
                                            <textarea
                                                value={question}
                                                onChange={(event) =>
                                                    setQuestion(
                                                        event.target.value,
                                                    )
                                                }
                                                onKeyDown={(event) => {
                                                    if (
                                                        event.key === 'Enter' &&
                                                        !event.shiftKey
                                                    ) {
                                                        event.preventDefault();
                                                        event.currentTarget.form?.requestSubmit();
                                                    }
                                                }}
                                                placeholder="Tanyakan sesuatu tentang SupaThings..."
                                                className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-slate-400"
                                                maxLength={2000}
                                                rows={1}
                                            />
                                            <button
                                                type="submit"
                                                disabled={
                                                    chatting || !question.trim()
                                                }
                                                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                                                aria-label="Kirim pertanyaan"
                                            >
                                                <Send className="size-4" />
                                            </button>
                                        </div>
                                        <p className="mx-auto mt-2 max-w-3xl px-2 text-[11px] text-slate-400">
                                            AI hanya menggunakan data SupaThings
                                            akun ini. Enter untuk kirim ·
                                            Shift+Enter untuk baris baru.
                                        </p>
                                    </form>
                                </section>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </>
    );
}

AiIntelligence.layout = {
    breadcrumbs: [{ title: 'AI Intelligence', href: '/ai' }],
};
