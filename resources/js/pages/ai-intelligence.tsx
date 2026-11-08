import { Head } from '@inertiajs/react';
import {
    AlertTriangle,
    BrainCircuit,
    CheckCircle2,
    CircleHelp,
    Clock3,
    DollarSign,
    MessageCircle,
    RefreshCw,
    Send,
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
    const [chat, setChat] = useState<ChatResponse | null>(null);
    const [chatting, setChatting] = useState(false);

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
    }, []);

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

        if (!question.trim()) {
            return;
        }

        setChatting(true);
        setError('');

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
                body: JSON.stringify({ question: question.trim() }),
            });
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.message ?? 'AI tidak dapat menjawab.');
            }

            setChat(payload.data);
        } catch (cause) {
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

                    <section className="rounded-2xl border bg-white p-5 shadow-sm">
                        <div className="flex items-center gap-2">
                            <MessageCircle className="size-5 text-blue-700" />
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Tanya SupaThings AI
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Jawaban dibatasi pada data SupaThings milik
                                    akun ini.
                                </p>
                            </div>
                        </div>

                        <form
                            onSubmit={ask}
                            className="mt-4 flex flex-col gap-3 sm:flex-row"
                        >
                            <input
                                value={question}
                                onChange={(event) =>
                                    setQuestion(event.target.value)
                                }
                                placeholder="Contoh: kenapa kelembapan sering turun?"
                                className="min-h-11 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                maxLength={2000}
                            />
                            <button
                                type="submit"
                                disabled={chatting || !question.trim()}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                <Send className="size-4" />
                                {chatting ? 'Menjawab...' : 'Tanya'}
                            </button>
                        </form>

                        {chat && (
                            <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                                <p className="text-sm leading-6 whitespace-pre-wrap text-slate-800">
                                    {chat.answer}
                                </p>
                                {chat.evidence.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-xs font-semibold text-slate-500 uppercase">
                                            Bukti data
                                        </p>
                                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-600">
                                            {chat.evidence.map((item) => (
                                                <li key={item}>{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {chat.limitations.length > 0 && (
                                    <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
                                        {chat.limitations.join(' ')}
                                    </div>
                                )}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </>
    );
}

AiIntelligence.layout = {
    breadcrumbs: [{ title: 'AI Intelligence', href: '/ai' }],
};
