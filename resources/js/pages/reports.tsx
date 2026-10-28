import { Head } from '@inertiajs/react';
import {
    Activity,
    CalendarDays,
    ChartNoAxesColumn,
    Download,
    Sprout,
    Weight,
} from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';

type Batch = {
    id: number;
    name: string;
    strain: string | null;
    phase: string;
    inoculated_at: string | null;
    baglog_count: number;
    harvest_kg: number;
    harvest_count: number;
    kg_per_100_baglogs: number;
    has_device: boolean;
};
type Harvest = {
    id: number;
    date: string;
    batch: string;
    flush_number: number;
    weight_kg: number;
    quality: string | null;
    sale_price_per_kg: number | null;
};
type Metric = {
    label: string;
    unit: string;
    average: number | null;
    minimum: number | null;
    maximum: number | null;
    sample_count: number;
};
type Report = {
    period: { from: string; to: string };
    summary: {
        harvest_kg: number;
        harvest_count: number;
        batch_count: number;
        revenue_recorded: number;
        expenses_recorded: number;
        estimated_profit: number;
        priced_harvest_count: number;
        unpriced_harvest_count: number;
    };
    daily: { date: string; weight_kg: number; records: number }[];
    batches: Batch[];
    harvests: Harvest[];
    expenses: {
        id: number;
        date: string;
        batch: string | null;
        category: string;
        description: string;
        amount: number;
    }[];
    sensors: { reading_count: number; metrics: Record<string, Metric> };
};

const today = new Date().toISOString().slice(0, 10);
const defaultFrom = new Date(Date.now() - 29 * 86400000)
    .toISOString()
    .slice(0, 10);
const formatNumber = (value: number, digits = 1) =>
    new Intl.NumberFormat('id-ID', { maximumFractionDigits: digits }).format(
        value,
    );
const formatMoney = (value: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);
const formatDate = (value: string) =>
    new Date(value.slice(0, 10) + 'T00:00:00').toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
const phaseLabels: Record<string, string> = {
    incubation: 'Inkubasi',
    fruiting: 'Pembentukan tubuh buah',
    harvesting: 'Panen',
    resting: 'Istirahat',
    completed: 'Selesai',
};

export default function Reports() {
    const [from, setFrom] = useState(defaultFrom);
    const [to, setTo] = useState(today);
    const [batchId, setBatchId] = useState('all');
    const [data, setData] = useState<Report | null>(null);
    const [batchOptions, setBatchOptions] = useState<
        Pick<Batch, 'id' | 'name'>[]
    >([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expenseForm, setExpenseForm] = useState({
        incurred_at: today,
        category: 'lainnya',
        description: '',
        amount: '',
        cultivation_batch_id: '',
    });
    const [expenseMessage, setExpenseMessage] = useState('');
    const [savingExpense, setSavingExpense] = useState(false);

    const loadReport = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams({ from, to });
            if (batchId !== 'all') params.set('batch_id', batchId);
            const response = await fetch('/api/reports?' + params, {
                headers: { Accept: 'application/json' },
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.message ?? 'Laporan gagal dimuat.');
            }
            setData(payload.data as Report);
            if (batchId === 'all') {
                setBatchOptions(
                    (payload.data.batches as Batch[]).map(({ id, name }) => ({
                        id,
                        name,
                    })),
                );
            }
        } catch (e) {
            setError(
                e instanceof Error
                    ? e.message
                    : 'Terjadi kesalahan saat memuat laporan.',
            );
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [from, to, batchId]);

    const saveExpense = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSavingExpense(true);
        setExpenseMessage('');
        try {
            const response = await fetch('/api/cultivation/expenses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN':
                        document.querySelector<HTMLMetaElement>(
                            'meta[name="csrf-token"]',
                        )?.content ?? '',
                },
                body: JSON.stringify({
                    ...expenseForm,
                    amount: Number(expenseForm.amount),
                    cultivation_batch_id: expenseForm.cultivation_batch_id
                        ? Number(expenseForm.cultivation_batch_id)
                        : null,
                }),
            });
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(payload.message ?? 'Biaya gagal disimpan.');
            }
            setExpenseForm((prev) => ({
                ...prev,
                description: '',
                amount: '',
            }));
            setExpenseMessage(
                'Biaya berhasil dicatat. Ringkasan laporan diperbarui.',
            );
            await loadReport();
        } catch (cause) {
            setExpenseMessage(
                cause instanceof Error
                    ? cause.message
                    : 'Biaya gagal disimpan.',
            );
        } finally {
            setSavingExpense(false);
        }
    };

    useEffect(() => {
        void loadReport();
    }, [loadReport]);

    const exportCsv = () => {
        if (!data) return;
        const rows = [
            [
                'Tanggal',
                'Batch',
                'Gelombang panen',
                'Berat (kg)',
                'Kualitas',
                'Harga per kg (Rp)',
            ],
            ...data.harvests.map((harvest) => [
                harvest.date,
                harvest.batch,
                String(harvest.flush_number),
                String(harvest.weight_kg),
                harvest.quality ?? '',
                harvest.sale_price_per_kg === null
                    ? ''
                    : String(harvest.sale_price_per_kg),
            ]),
        ];
        const csv = rows
            .map((row) =>
                row
                    .map((cell) => '"' + cell.replaceAll('"', '""') + '"')
                    .join(','),
            )
            .join('\r\n');
        const url = URL.createObjectURL(
            new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }),
        );
        const link = document.createElement('a');
        link.href = url;
        link.download = 'laporan-supathings-' + from + '-' + to + '.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    const maxDaily = Math.max(
        1,
        ...(data?.daily.map((item) => item.weight_kg) ?? []),
    );

    return (
        <>
            <Head title="Laporan budidaya" />
            <main className="min-h-full bg-[#f6f8fb] p-5 md:p-8">
                <div className="mx-auto max-w-[1400px] space-y-6">
                    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700">
                                <ChartNoAxesColumn className="size-4" />
                                Ringkasan untuk petani
                            </p>
                            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                                Laporan budidaya
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                Pantau hasil panen, bandingkan batch, dan lihat
                                kondisi kumbung berdasarkan data yang tercatat.
                            </p>
                        </div>
                        <div className="flex gap-2 print:hidden">
                            <button
                                onClick={() => window.print()}
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium"
                            >
                                Simpan PDF
                            </button>
                            <button
                                onClick={exportCsv}
                                disabled={!data || loading}
                                className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                            >
                                <Download className="size-4" />
                                Ekspor CSV
                            </button>
                        </div>
                    </header>

                    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
                        <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                            <CalendarDays className="size-4 text-emerald-700" />
                            Atur laporan
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr_auto] lg:items-end">
                            <label className="text-sm text-slate-600">
                                Dari tanggal
                                <input
                                    type="date"
                                    value={from}
                                    max={to}
                                    onChange={(event) =>
                                        setFrom(event.target.value)
                                    }
                                    className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5"
                                />
                            </label>
                            <label className="text-sm text-slate-600">
                                Sampai tanggal
                                <input
                                    type="date"
                                    value={to}
                                    min={from}
                                    max={today}
                                    onChange={(event) =>
                                        setTo(event.target.value)
                                    }
                                    className="mt-1.5 block w-full rounded-xl border border-slate-200 px-3 py-2.5"
                                />
                            </label>
                            <label className="text-sm text-slate-600">
                                Batch budidaya
                                <select
                                    value={batchId}
                                    onChange={(event) =>
                                        setBatchId(event.target.value)
                                    }
                                    className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                                >
                                    <option value="all">Semua batch</option>
                                    {batchOptions.map((batch) => (
                                        <option key={batch.id} value={batch.id}>
                                            {batch.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <button
                                onClick={() => void loadReport()}
                                disabled={loading || !from || !to || from > to}
                                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                            >
                                {loading ? 'Memuat…' : 'Terapkan'}
                            </button>
                        </div>
                    </section>

                    {error && (
                        <div
                            role="alert"
                            className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
                        >
                            {error}
                        </div>
                    )}
                    {loading && (
                        <p className="text-sm text-slate-500">
                            Menghitung laporan dari catatan Anda…
                        </p>
                    )}

                    {data && !loading && (
                        <>
                            <p className="text-sm text-slate-500">
                                Periode {formatDate(data.period.from)} –{' '}
                                {formatDate(data.period.to)}
                            </p>
                            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {[
                                    {
                                        icon: Weight,
                                        label: 'Total hasil panen',
                                        value:
                                            formatNumber(
                                                data.summary.harvest_kg,
                                                3,
                                            ) + ' kg',
                                        hint:
                                            data.summary.harvest_count +
                                            ' catatan panen',
                                    },
                                    {
                                        icon: Sprout,
                                        label: 'Batch tercakup',
                                        value: String(data.summary.batch_count),
                                        hint: 'Batch budidaya',
                                    },
                                    {
                                        icon: ChartNoAxesColumn,
                                        label: 'Omzet tercatat',
                                        value: formatMoney(
                                            data.summary.revenue_recorded,
                                        ),
                                        hint:
                                            data.summary
                                                .unpriced_harvest_count +
                                            ' catatan belum memiliki harga',
                                    },
                                    {
                                        icon: Activity,
                                        label: 'Pembacaan sensor',
                                        value: formatNumber(
                                            data.sensors.reading_count,
                                            0,
                                        ),
                                        hint: 'Data lingkungan pada periode ini',
                                    },
                                ].map((card) => (
                                    <article
                                        key={card.label}
                                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                                    >
                                        <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
                                            {card.label}
                                            <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                                                <card.icon className="size-5" />
                                            </span>
                                        </div>
                                        <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">
                                            {card.value}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {card.hint}
                                        </p>
                                    </article>
                                ))}
                            </section>

                            <section className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
                                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <h2 className="text-lg font-semibold">
                                        Tren hasil panen
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Berat panen per tanggal pencatatan.
                                    </p>
                                    {data.daily.length === 0 ? (
                                        <p className="mt-5 rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
                                            Belum ada panen pada periode ini.
                                        </p>
                                    ) : (
                                        <div className="mt-5 space-y-3">
                                            {data.daily
                                                .slice(-12)
                                                .map((item) => (
                                                    <div
                                                        key={item.date}
                                                        className="grid grid-cols-[82px_1fr_68px] items-center gap-3 text-sm"
                                                    >
                                                        <span className="text-xs text-slate-500">
                                                            {formatDate(
                                                                item.date,
                                                            )}
                                                        </span>
                                                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                                                            <div
                                                                className="h-full rounded-full bg-emerald-600"
                                                                style={{
                                                                    width:
                                                                        Math.max(
                                                                            2,
                                                                            (item.weight_kg /
                                                                                maxDaily) *
                                                                                100,
                                                                        ) + '%',
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-right font-medium">
                                                            {formatNumber(
                                                                item.weight_kg,
                                                                3,
                                                            )}{' '}
                                                            kg
                                                        </span>
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </article>

                                <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                    <h2 className="text-lg font-semibold">
                                        Kondisi kumbung
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Statistik sensor, bukan penilaian
                                        otomatis kualitas panen.
                                    </p>
                                    <div className="mt-5 space-y-3">
                                        {Object.entries(
                                            data.sensors.metrics,
                                        ).map(([key, metric]) => (
                                            <div
                                                key={key}
                                                className="rounded-xl bg-slate-50 p-4"
                                            >
                                                <div className="flex justify-between gap-3 text-sm">
                                                    <span className="font-medium">
                                                        {metric.label}
                                                    </span>
                                                    <span className="text-xs text-slate-500">
                                                        {metric.sample_count}{' '}
                                                        data
                                                    </span>
                                                </div>
                                                {metric.average === null ? (
                                                    <p className="mt-2 text-sm text-slate-500">
                                                        Belum ada data sensor.
                                                    </p>
                                                ) : (
                                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                                        {[
                                                            [
                                                                'Rata-rata',
                                                                metric.average,
                                                            ],
                                                            [
                                                                'Terendah',
                                                                metric.minimum,
                                                            ],
                                                            [
                                                                'Tertinggi',
                                                                metric.maximum,
                                                            ],
                                                        ].map(
                                                            ([
                                                                label,
                                                                value,
                                                            ]) => (
                                                                <div
                                                                    key={String(
                                                                        label,
                                                                    )}
                                                                >
                                                                    <p className="text-xs text-slate-500">
                                                                        {label}
                                                                    </p>
                                                                    <p className="font-semibold">
                                                                        {formatNumber(
                                                                            Number(
                                                                                value,
                                                                            ),
                                                                        )}{' '}
                                                                        {
                                                                            metric.unit
                                                                        }
                                                                    </p>
                                                                </div>
                                                            ),
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    {batchId !== 'all' &&
                                        data.batches[0] &&
                                        !data.batches[0].has_device && (
                                            <p className="mt-3 text-xs text-amber-700">
                                                Batch belum terhubung ke
                                                perangkat IoT; statistik sensor
                                                tidak mewakili batch khusus ini.
                                            </p>
                                        )}
                                </article>
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="text-lg font-semibold">
                                    Perbandingan batch
                                </h2>
                                <p className="mt-1 mb-4 text-sm text-slate-500">
                                    Hanya panen yang tercatat pada periode
                                    terpilih.
                                </p>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[620px] text-left text-sm">
                                        <thead>
                                            <tr className="border-b text-xs text-slate-500">
                                                <th className="pb-3">
                                                    Nama batch
                                                </th>
                                                <th className="pb-3">Mulai</th>
                                                <th className="pb-3">Baglog</th>
                                                <th className="pb-3">
                                                    Catatan panen
                                                </th>
                                                <th className="pb-3 text-right">
                                                    Total panen
                                                </th>
                                                <th className="pb-3 text-right">
                                                    kg / 100 baglog
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.batches.map((batch) => (
                                                <tr
                                                    key={batch.id}
                                                    className="border-b border-slate-50"
                                                >
                                                    <td className="py-3 font-medium">
                                                        {batch.name}
                                                        <p className="mt-1 text-xs font-normal text-slate-500">
                                                            {phaseLabels[
                                                                batch.phase
                                                            ] ?? batch.phase}
                                                            {batch.strain
                                                                ? ' · ' +
                                                                  batch.strain
                                                                : ''}
                                                        </p>
                                                    </td>
                                                    <td className="py-3">
                                                        {batch.inoculated_at
                                                            ? formatDate(
                                                                  batch.inoculated_at,
                                                              )
                                                            : '—'}
                                                    </td>
                                                    <td className="py-3">
                                                        {formatNumber(
                                                            batch.baglog_count,
                                                            0,
                                                        )}
                                                    </td>
                                                    <td className="py-3">
                                                        {batch.harvest_count}
                                                    </td>
                                                    <td className="py-3 text-right font-semibold">
                                                        {formatNumber(
                                                            batch.harvest_kg,
                                                            3,
                                                        )}{' '}
                                                        kg
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        {formatNumber(
                                                            batch.kg_per_100_baglogs,
                                                            3,
                                                        )}{' '}
                                                        kg
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="text-lg font-semibold">
                                    Rincian catatan panen
                                </h2>
                                <p className="mt-1 mb-4 text-sm text-slate-500">
                                    Omzet dihitung hanya jika harga jual per
                                    kilogram tersedia.
                                </p>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[650px] text-left text-sm">
                                        <thead>
                                            <tr className="border-b text-xs text-slate-500">
                                                <th className="pb-3">
                                                    Tanggal
                                                </th>
                                                <th className="pb-3">Batch</th>
                                                <th className="pb-3">
                                                    Gelombang
                                                </th>
                                                <th className="pb-3">Berat</th>
                                                <th className="pb-3">
                                                    Kualitas
                                                </th>
                                                <th className="pb-3 text-right">
                                                    Harga/kg
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.harvests.map((harvest) => (
                                                <tr
                                                    key={harvest.id}
                                                    className="border-b border-slate-50"
                                                >
                                                    <td className="py-3">
                                                        {formatDate(
                                                            harvest.date,
                                                        )}
                                                    </td>
                                                    <td className="py-3">
                                                        {harvest.batch}
                                                    </td>
                                                    <td className="py-3">
                                                        {harvest.flush_number}
                                                    </td>
                                                    <td className="py-3">
                                                        {formatNumber(
                                                            harvest.weight_kg,
                                                            3,
                                                        )}{' '}
                                                        kg
                                                    </td>
                                                    <td className="py-3">
                                                        {harvest.quality ?? '—'}
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        {harvest.sale_price_per_kg ===
                                                        null
                                                            ? 'Belum diisi'
                                                            : formatMoney(
                                                                  harvest.sale_price_per_kg,
                                                              )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                                <h2 className="text-lg font-semibold">
                                    Biaya operasional dan estimasi laba
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Laba adalah omzet tercatat dikurangi biaya
                                    yang dicatat. Biaya yang belum dimasukkan
                                    belum ikut dihitung.
                                </p>
                                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                                    <article className="rounded-xl bg-slate-50 p-4">
                                        <p className="text-sm text-slate-500">
                                            Omzet tercatat
                                        </p>
                                        <p className="mt-1 text-xl font-semibold">
                                            {formatMoney(
                                                data.summary.revenue_recorded,
                                            )}
                                        </p>
                                    </article>
                                    <article className="rounded-xl bg-slate-50 p-4">
                                        <p className="text-sm text-slate-500">
                                            Biaya tercatat
                                        </p>
                                        <p className="mt-1 text-xl font-semibold">
                                            {formatMoney(
                                                data.summary.expenses_recorded,
                                            )}
                                        </p>
                                    </article>
                                    <article className="rounded-xl bg-slate-50 p-4">
                                        <p className="text-sm text-slate-500">
                                            Estimasi laba
                                        </p>
                                        <p className="mt-1 text-xl font-semibold">
                                            {formatMoney(
                                                data.summary.estimated_profit,
                                            )}
                                        </p>
                                    </article>
                                </div>
                                <form
                                    onSubmit={saveExpense}
                                    className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
                                >
                                    <label className="text-sm">
                                        Tanggal
                                        <input
                                            required
                                            type="date"
                                            max={today}
                                            value={expenseForm.incurred_at}
                                            onChange={(event) =>
                                                setExpenseForm((prev) => ({
                                                    ...prev,
                                                    incurred_at:
                                                        event.target.value,
                                                }))
                                            }
                                            className="mt-1 w-full rounded-lg border-slate-300"
                                        />
                                    </label>
                                    <label className="text-sm">
                                        Kategori
                                        <select
                                            value={expenseForm.category}
                                            onChange={(event) =>
                                                setExpenseForm((prev) => ({
                                                    ...prev,
                                                    category:
                                                        event.target.value,
                                                }))
                                            }
                                            className="mt-1 w-full rounded-lg border-slate-300"
                                        >
                                            {[
                                                ['baglog', 'Baglog'],
                                                ['bibit', 'Bibit'],
                                                ['listrik', 'Listrik'],
                                                ['air', 'Air'],
                                                [
                                                    'tenaga_kerja',
                                                    'Tenaga kerja',
                                                ],
                                                ['perawatan', 'Perawatan'],
                                                ['lainnya', 'Lainnya'],
                                            ].map(([value, label]) => (
                                                <option
                                                    key={value}
                                                    value={value}
                                                >
                                                    {label}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="text-sm">
                                        Batch (opsional)
                                        <select
                                            value={
                                                expenseForm.cultivation_batch_id
                                            }
                                            onChange={(event) =>
                                                setExpenseForm((prev) => ({
                                                    ...prev,
                                                    cultivation_batch_id:
                                                        event.target.value,
                                                }))
                                            }
                                            className="mt-1 w-full rounded-lg border-slate-300"
                                        >
                                            <option value="">
                                                Umum / semua batch
                                            </option>
                                            {batchOptions.map((batch) => (
                                                <option
                                                    key={batch.id}
                                                    value={batch.id}
                                                >
                                                    {batch.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                    <label className="text-sm">
                                        Keterangan
                                        <input
                                            required
                                            maxLength={160}
                                            value={expenseForm.description}
                                            onChange={(event) =>
                                                setExpenseForm((prev) => ({
                                                    ...prev,
                                                    description:
                                                        event.target.value,
                                                }))
                                            }
                                            className="mt-1 w-full rounded-lg border-slate-300"
                                            placeholder="Contoh: listrik kumbung"
                                        />
                                    </label>
                                    <label className="text-sm">
                                        Nominal (Rp)
                                        <input
                                            required
                                            min="1"
                                            step="1"
                                            type="number"
                                            value={expenseForm.amount}
                                            onChange={(event) =>
                                                setExpenseForm((prev) => ({
                                                    ...prev,
                                                    amount: event.target.value,
                                                }))
                                            }
                                            className="mt-1 w-full rounded-lg border-slate-300"
                                        />
                                    </label>
                                    <div className="flex items-end">
                                        <button
                                            disabled={savingExpense}
                                            className="w-full rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                                        >
                                            {savingExpense
                                                ? 'Menyimpan...'
                                                : 'Catat biaya'}
                                        </button>
                                    </div>
                                </form>
                                {expenseMessage && (
                                    <p
                                        role="status"
                                        className="mt-3 text-sm text-slate-600"
                                    >
                                        {expenseMessage}
                                    </p>
                                )}
                                <div className="mt-5 overflow-x-auto">
                                    <table className="w-full min-w-[560px] text-left text-sm">
                                        <thead>
                                            <tr className="border-b text-xs text-slate-500">
                                                <th className="pb-3">
                                                    Tanggal
                                                </th>
                                                <th className="pb-3">
                                                    Kategori
                                                </th>
                                                <th className="pb-3">
                                                    Keterangan
                                                </th>
                                                <th className="pb-3">Batch</th>
                                                <th className="pb-3 text-right">
                                                    Nominal
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.expenses.map((expense) => (
                                                <tr
                                                    key={expense.id}
                                                    className="border-b border-slate-50"
                                                >
                                                    <td className="py-3">
                                                        {formatDate(
                                                            expense.date,
                                                        )}
                                                    </td>
                                                    <td className="py-3">
                                                        {expense.category.replace(
                                                            '_',
                                                            ' ',
                                                        )}
                                                    </td>
                                                    <td className="py-3">
                                                        {expense.description}
                                                    </td>
                                                    <td className="py-3">
                                                        {expense.batch ??
                                                            'Umum'}
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        {formatMoney(
                                                            expense.amount,
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                            <p className="text-xs leading-5 text-slate-500">
                                Laporan memakai data panen, biaya, dan sensor
                                yang tersimpan. Simpan PDF membuka dialog cetak
                                browser.
                            </p>
                        </>
                    )}
                </div>
            </main>
            <style>
                {
                    '@media print { body { background:white!important; } main {padding:0!important;background:white!important;} button {display:none!important;} article,section {break-inside:avoid;box-shadow:none!important;} }'
                }
            </style>
        </>
    );
}
