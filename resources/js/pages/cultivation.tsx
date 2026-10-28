import { Head } from '@inertiajs/react';
import {
    AlertTriangle,
    CalendarDays,
    CheckCircle2,
    CircleAlert,
    ClipboardList,
    Plus,
    Pencil,
    Trash2,
    Sprout,
    Wheat,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
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

type Batch = {
    id: number;
    name: string;
    strain: string | null;
    inoculated_at: string;
    baglog_count: number;
    phase: string;
    notes: string | null;
    total_harvest_kg?: number | null;
    harvests?: Harvest[];
};
type Harvest = {
    id: number;
    cultivation_batch_id: number;
    harvested_at: string;
    flush_number: number;
    weight_kg: number;
    quality: string | null;
    sale_price_per_kg: number | null;
    notes: string | null;
    batch?: { id: number; name: string };
};
type Alert = { key: string; severity: string; title: string; message: string };

const phases = [
    { value: 'incubation', label: 'Inkubasi' },
    { value: 'fruiting', label: 'Pembentukan tubuh buah' },
    { value: 'harvesting', label: 'Masa panen' },
    { value: 'resting', label: 'Pemulihan antarpanen' },
    { value: 'completed', label: 'Selesai' },
];

const today = new Date().toLocaleDateString('en-CA');

function formatIndonesianDate(value: string): string {
    const dateOnly = value.slice(0, 10);
    const date = new Date(`${dateOnly}T00:00:00`);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

function csrfHeaders(): HeadersInit {
    return {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN':
            document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                ?.content ?? '',
    };
}

export default function Cultivation() {
    const [batches, setBatches] = useState<Batch[]>([]);
    const [harvests, setHarvests] = useState<Harvest[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [showBatchForm, setShowBatchForm] = useState(false);
    const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
    const [showHarvestForm, setShowHarvestForm] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState('');
    const [batchForm, setBatchForm] = useState({
        name: '',
        strain: '',
        inoculated_at: today,
        baglog_count: '100',
        notes: '',
    });
    const [harvestForm, setHarvestForm] = useState({
        harvested_at: today,
        flush_number: '1',
        weight_kg: '',
        quality: 'good',
        sale_price_per_kg: '',
        notes: '',
    });

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const responses = await Promise.all([
                fetch('/api/cultivation/batches', {
                    headers: { Accept: 'application/json' },
                }),
                fetch('/api/cultivation/harvests', {
                    headers: { Accept: 'application/json' },
                }),
                fetch('/api/cultivation/alerts', {
                    headers: { Accept: 'application/json' },
                }),
            ]);
            for (const response of responses) {
                if (!response.ok)
                    throw new Error(
                        'Data budidaya belum dapat dimuat. Coba muat ulang halaman.',
                    );
            }
            const [batchPayload, harvestPayload, alertPayload] =
                await Promise.all(responses.map((response) => response.json()));
            setBatches(batchPayload.data ?? []);
            setHarvests(harvestPayload.data ?? []);
            setAlerts(alertPayload.data ?? []);
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : 'Terjadi kesalahan saat memuat data.',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const createBatch = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const response = await fetch(
                editingBatch
                    ? '/api/cultivation/batches/' + editingBatch.id
                    : '/api/cultivation/batches',
                {
                    method: editingBatch ? 'PATCH' : 'POST',
                    headers: csrfHeaders(),
                    body: JSON.stringify({
                        ...batchForm,
                        baglog_count: Number(batchForm.baglog_count),
                        strain: batchForm.strain || null,
                        notes: batchForm.notes || null,
                    }),
                },
            );
            const payload = await response.json();
            if (!response.ok)
                throw new Error(
                    payload.message ??
                        'Batch gagal disimpan. Periksa kembali data.',
                );
            setBatchForm({
                name: '',
                strain: '',
                inoculated_at: today,
                baglog_count: '100',
                notes: '',
            });
            setShowBatchForm(false);
            setEditingBatch(null);
            setNotice(
                editingBatch
                    ? 'Batch budidaya berhasil diperbarui.'
                    : 'Batch budidaya berhasil ditambahkan.',
            );
            await refresh();
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : 'Batch gagal disimpan.',
            );
        } finally {
            setBusy(false);
        }
    };

    const deleteBatch = async (batch: Batch) => {
        if (
            !window.confirm(
                'Hapus batch "' +
                    batch.name +
                    '"? Batch yang memiliki catatan panen atau biaya tidak dapat dihapus.',
            )
        )
            return;
        setError('');
        setNotice('');
        try {
            const response = await fetch(
                '/api/cultivation/batches/' + batch.id,
                {
                    method: 'DELETE',
                    headers: csrfHeaders(),
                },
            );
            const payload = await response.json();
            if (!response.ok)
                throw new Error(payload.message ?? 'Batch gagal dihapus.');
            setNotice(payload.message ?? 'Batch berhasil dihapus.');
            await refresh();
        } catch (cause) {
            setError(
                cause instanceof Error ? cause.message : 'Batch gagal dihapus.',
            );
        }
    };

    const updatePhase = async (batch: Batch, phase: string) => {
        setError('');
        setNotice('');
        try {
            const response = await fetch(
                '/api/cultivation/batches/' + batch.id,
                {
                    method: 'PATCH',
                    headers: csrfHeaders(),
                    body: JSON.stringify({ phase }),
                },
            );
            if (!response.ok)
                throw new Error('Fase budidaya gagal diperbarui.');
            setNotice('Fase budidaya diperbarui.');
            await refresh();
        } catch (cause) {
            setError(
                cause instanceof Error ? cause.message : 'Pembaruan gagal.',
            );
        }
    };

    const createHarvest = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!selectedBatch) {
            setError('Pilih batch terlebih dahulu.');
            return;
        }
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const body = {
                ...harvestForm,
                flush_number: Number(harvestForm.flush_number),
                weight_kg: Number(harvestForm.weight_kg),
                sale_price_per_kg: harvestForm.sale_price_per_kg
                    ? Number(harvestForm.sale_price_per_kg)
                    : null,
                quality: harvestForm.quality || null,
                notes: harvestForm.notes || null,
            };
            const response = await fetch(
                '/api/cultivation/batches/' + selectedBatch + '/harvests',
                {
                    method: 'POST',
                    headers: csrfHeaders(),
                    body: JSON.stringify(body),
                },
            );
            const payload = await response.json();
            if (!response.ok)
                throw new Error(
                    payload.message ?? 'Catatan panen gagal disimpan.',
                );
            setHarvestForm({
                harvested_at: today,
                flush_number: '1',
                weight_kg: '',
                quality: 'good',
                sale_price_per_kg: '',
                notes: '',
            });
            setShowHarvestForm(false);
            setNotice('Catatan panen berhasil disimpan.');
            await refresh();
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : 'Catatan panen gagal disimpan.',
            );
        } finally {
            setBusy(false);
        }
    };

    const totalKg = harvests.reduce(
        (sum, item) => sum + Number(item.weight_kg || 0),
        0,
    );
    const totalBaglogs = batches.reduce(
        (sum, item) => sum + item.baglog_count,
        0,
    );

    return (
        <>
            <Head title="Budidaya jamur" />
            <div className="min-h-full bg-[#f6f8fb] px-4 py-6 md:px-8 md:py-8">
                <div className="mx-auto max-w-[1500px] space-y-7">
                    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                                <span>SupaThings</span>
                                <span>/</span>
                                <span>Budidaya</span>
                            </div>
                            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                                Budidaya jamur tiram
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Kelola umur baglog, fase budidaya, panen, dan
                                kondisi kumbung.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingBatch(null);
                                    setBatchForm({
                                        name: '',
                                        strain: '',
                                        inoculated_at: today,
                                        baglog_count: '100',
                                        notes: '',
                                    });
                                    setShowBatchForm(true);
                                }}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                            >
                                <Plus className="size-4" /> Tambah batch
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowHarvestForm(true)}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-700 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
                            >
                                <Plus className="size-4" /> Catat panen
                            </button>
                        </div>
                    </header>

                    {error && (
                        <div
                            role="alert"
                            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                        >
                            {error}
                        </div>
                    )}
                    {notice && (
                        <div
                            role="status"
                            className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                        >
                            {notice}
                        </div>
                    )}

                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center gap-2">
                            <AlertTriangle className="size-5 text-amber-600" />
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Peringatan kumbung
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Berdasarkan heartbeat perangkat dan ambang
                                    sensor yang telah dikonfigurasi.
                                </p>
                            </div>
                        </div>
                        {alerts.length === 0 ? (
                            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
                                <CheckCircle2 className="size-5" />
                                Tidak ada peringatan aktif dari data yang
                                tersedia.
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {alerts.map((alert) => (
                                    <div
                                        key={alert.key}
                                        className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
                                    >
                                        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-700" />
                                        <div>
                                            <p className="font-semibold text-amber-950">
                                                {alert.title}
                                            </p>
                                            <p className="mt-1 text-sm text-amber-900">
                                                {alert.message}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className="mt-3 text-xs text-slate-500">
                            Peringatan bergantung pada data sensor dan aturan
                            yang tersedia. Nilai contoh atau data yang tidak
                            terkirim tidak dianggap sebagai pengukuran aktual.
                        </p>
                    </section>

                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <SummaryCard
                            icon={<Sprout className="size-5" />}
                            label="Batch aktif"
                            value={String(
                                batches.filter(
                                    (batch) => batch.phase !== 'completed',
                                ).length,
                            )}
                            detail="kelompok budidaya"
                        />
                        <SummaryCard
                            icon={<ClipboardList className="size-5" />}
                            label="Total baglog"
                            value={totalBaglogs.toLocaleString('id-ID')}
                            detail="di semua batch"
                        />
                        <SummaryCard
                            icon={<Wheat className="size-5" />}
                            label="Total panen"
                            value={
                                totalKg.toLocaleString('id-ID', {
                                    maximumFractionDigits: 2,
                                }) + ' kg'
                            }
                            detail="berdasarkan catatan"
                        />
                        <SummaryCard
                            icon={<CircleAlert className="size-5" />}
                            label="Peringatan"
                            value={String(alerts.length)}
                            detail="kondisi yang perlu diperiksa"
                        />
                    </section>

                    <Dialog
                        open={showBatchForm}
                        onOpenChange={setShowBatchForm}
                    >
                        <DialogContent className="sm:max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>
                                    {editingBatch
                                        ? 'Edit batch budidaya'
                                        : 'Batch budidaya baru'}
                                </DialogTitle>
                                <DialogDescription>
                                    Masukkan informasi awal kelompok baglog yang
                                    akan dipantau.
                                </DialogDescription>
                            </DialogHeader>
                            <form
                                onSubmit={createBatch}
                                className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
                            >
                                <Field label="Nama batch">
                                    <input
                                        required
                                        maxLength={100}
                                        value={batchForm.name}
                                        onChange={(event) =>
                                            setBatchForm({
                                                ...batchForm,
                                                name: event.target.value,
                                            })
                                        }
                                        placeholder="Contoh: Batch Oktober A"
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Strain / jenis bibit">
                                    <input
                                        value={batchForm.strain}
                                        onChange={(event) =>
                                            setBatchForm({
                                                ...batchForm,
                                                strain: event.target.value,
                                            })
                                        }
                                        placeholder="Opsional"
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Tanggal inokulasi">
                                    <input
                                        type="date"
                                        required
                                        max={today}
                                        value={batchForm.inoculated_at}
                                        onChange={(event) =>
                                            setBatchForm({
                                                ...batchForm,
                                                inoculated_at:
                                                    event.target.value,
                                            })
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Jumlah baglog">
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        max="1000000"
                                        value={batchForm.baglog_count}
                                        onChange={(event) =>
                                            setBatchForm({
                                                ...batchForm,
                                                baglog_count:
                                                    event.target.value,
                                            })
                                        }
                                        className={inputClass}
                                    />
                                </Field>
                                <Field label="Catatan awal">
                                    <input
                                        value={batchForm.notes}
                                        onChange={(event) =>
                                            setBatchForm({
                                                ...batchForm,
                                                notes: event.target.value,
                                            })
                                        }
                                        maxLength={5000}
                                        placeholder="Kondisi media, asal bibit, dll."
                                        className={inputClass}
                                    />
                                </Field>
                                <div className="flex items-end">
                                    <button
                                        disabled={busy}
                                        className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                                    >
                                        {busy ? 'Menyimpan…' : 'Simpan batch'}
                                    </button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="text-lg font-semibold text-slate-900">
                                        Batch dan masa tanam
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Umur dihitung dari tanggal inokulasi.
                                    </p>
                                </div>
                                <CalendarDays className="size-5 text-emerald-700" />
                            </div>
                            {loading ? (
                                <p className="py-8 text-center text-sm text-slate-500">
                                    Memuat data…
                                </p>
                            ) : batches.length === 0 ? (
                                <p className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                                    Belum ada batch. Tambahkan batch pertama
                                    untuk mulai mencatat masa tanam.
                                </p>
                            ) : (
                                <div className="space-y-3">
                                    {batches.map((batch) => {
                                        const age = Math.max(
                                            0,
                                            Math.floor(
                                                (Date.now() -
                                                    new Date(
                                                        batch.inoculated_at,
                                                    ).getTime()) /
                                                    86400000,
                                            ),
                                        );
                                        return (
                                            <article
                                                key={batch.id}
                                                className="rounded-xl border border-slate-200 p-4"
                                            >
                                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                    <div>
                                                        <h3 className="font-semibold text-slate-900">
                                                            {batch.name}
                                                        </h3>
                                                        <p className="mt-1 text-sm text-slate-500">
                                                            {batch.strain ||
                                                                'Strain belum dicatat'}{' '}
                                                            ·{' '}
                                                            {batch.baglog_count.toLocaleString(
                                                                'id-ID',
                                                            )}{' '}
                                                            baglog
                                                        </p>
                                                        <p className="mt-1 text-sm text-slate-500">
                                                            Inokulasi{' '}
                                                            {formatIndonesianDate(
                                                                batch.inoculated_at,
                                                            )}{' '}
                                                            · umur {age} hari
                                                        </p>
                                                        {batch.notes && (
                                                            <p className="mt-2 text-sm whitespace-pre-wrap text-slate-600">
                                                                {batch.notes}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <span className="w-fit rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                                                        {phases.find(
                                                            (phase) =>
                                                                phase.value ===
                                                                batch.phase,
                                                        )?.label ?? batch.phase}
                                                    </span>
                                                </div>
                                                <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                                                    <p className="text-sm text-slate-600">
                                                        Hasil tercatat:{' '}
                                                        <strong>
                                                            {Number(
                                                                batch.total_harvest_kg ??
                                                                    0,
                                                            ).toLocaleString(
                                                                'id-ID',
                                                                {
                                                                    maximumFractionDigits: 2,
                                                                },
                                                            )}{' '}
                                                            kg
                                                        </strong>
                                                    </p>
                                                    <div className="flex flex-wrap items-end gap-2">
                                                        <Field label="Perbarui fase">
                                                            <Select
                                                                value={
                                                                    batch.phase
                                                                }
                                                                onValueChange={(
                                                                    value,
                                                                ) =>
                                                                    void updatePhase(
                                                                        batch,
                                                                        value,
                                                                    )
                                                                }
                                                            >
                                                                <SelectTrigger className="h-10 w-full min-w-[190px] rounded-xl border-slate-200">
                                                                    <SelectValue placeholder="Pilih fase" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {phases.map(
                                                                        (
                                                                            phase,
                                                                        ) => (
                                                                            <SelectItem
                                                                                key={
                                                                                    phase.value
                                                                                }
                                                                                value={
                                                                                    phase.value
                                                                                }
                                                                            >
                                                                                {
                                                                                    phase.label
                                                                                }
                                                                            </SelectItem>
                                                                        ),
                                                                    )}
                                                                </SelectContent>
                                                            </Select>
                                                        </Field>
                                                        <button
                                                            type="button"
                                                            title="Edit batch"
                                                            onClick={() => {
                                                                setEditingBatch(
                                                                    batch,
                                                                );
                                                                setBatchForm({
                                                                    name: batch.name,
                                                                    strain:
                                                                        batch.strain ??
                                                                        '',
                                                                    inoculated_at:
                                                                        batch.inoculated_at.slice(
                                                                            0,
                                                                            10,
                                                                        ),
                                                                    baglog_count:
                                                                        String(
                                                                            batch.baglog_count,
                                                                        ),
                                                                    notes:
                                                                        batch.notes ??
                                                                        '',
                                                                });
                                                                setShowBatchForm(
                                                                    true,
                                                                );
                                                            }}
                                                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                                        >
                                                            <Pencil className="size-4" />{' '}
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            title="Hapus batch"
                                                            onClick={() =>
                                                                void deleteBatch(
                                                                    batch,
                                                                )
                                                            }
                                                            className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 px-3 text-sm font-medium text-rose-700 hover:bg-rose-50"
                                                        >
                                                            <Trash2 className="size-4" />{' '}
                                                            Hapus
                                                        </button>
                                                    </div>
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </section>

                        <Dialog
                            open={showHarvestForm}
                            onOpenChange={setShowHarvestForm}
                        >
                            <DialogContent className="sm:max-w-2xl">
                                <DialogHeader>
                                    <DialogTitle>Catat panen</DialogTitle>
                                    <DialogDescription>
                                        Catat hasil panen pada salah satu batch
                                        budidaya.
                                    </DialogDescription>
                                </DialogHeader>
                                <form
                                    onSubmit={createHarvest}
                                    className="space-y-3"
                                >
                                    <Field label="Batch">
                                        <Select
                                            required
                                            value={selectedBatch}
                                            onValueChange={setSelectedBatch}
                                        >
                                            <SelectTrigger className="h-11 w-full rounded-xl border-slate-200">
                                                <SelectValue placeholder="Pilih batch" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {batches.map((batch) => (
                                                    <SelectItem
                                                        key={batch.id}
                                                        value={String(batch.id)}
                                                    >
                                                        {batch.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </Field>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label="Tanggal panen">
                                            <input
                                                type="date"
                                                required
                                                max={today}
                                                value={harvestForm.harvested_at}
                                                onChange={(event) =>
                                                    setHarvestForm({
                                                        ...harvestForm,
                                                        harvested_at:
                                                            event.target.value,
                                                    })
                                                }
                                                className={inputClass}
                                            />
                                        </Field>
                                        <Field label="Gelombang ke-">
                                            <input
                                                type="number"
                                                required
                                                min="1"
                                                max="20"
                                                value={harvestForm.flush_number}
                                                onChange={(event) =>
                                                    setHarvestForm({
                                                        ...harvestForm,
                                                        flush_number:
                                                            event.target.value,
                                                    })
                                                }
                                                className={inputClass}
                                            />
                                        </Field>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Field label="Berat (kg)">
                                            <input
                                                type="number"
                                                step="0.001"
                                                required
                                                min="0.001"
                                                value={harvestForm.weight_kg}
                                                onChange={(event) =>
                                                    setHarvestForm({
                                                        ...harvestForm,
                                                        weight_kg:
                                                            event.target.value,
                                                    })
                                                }
                                                placeholder="Contoh: 4.25"
                                                className={inputClass}
                                            />
                                        </Field>
                                        <Field label="Kualitas">
                                            <Select
                                                value={harvestForm.quality}
                                                onValueChange={(value) =>
                                                    setHarvestForm({
                                                        ...harvestForm,
                                                        quality: value,
                                                    })
                                                }
                                            >
                                                <SelectTrigger className="h-11 w-full rounded-xl border-slate-200">
                                                    <SelectValue placeholder="Pilih kualitas" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="premium">
                                                        Premium
                                                    </SelectItem>
                                                    <SelectItem value="good">
                                                        Baik
                                                    </SelectItem>
                                                    <SelectItem value="standard">
                                                        Standar
                                                    </SelectItem>
                                                    <SelectItem value="reject">
                                                        Afkir
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </Field>
                                    </div>
                                    <Field label="Harga jual per kg (Rp)">
                                        <input
                                            type="number"
                                            min="0"
                                            value={
                                                harvestForm.sale_price_per_kg
                                            }
                                            onChange={(event) =>
                                                setHarvestForm({
                                                    ...harvestForm,
                                                    sale_price_per_kg:
                                                        event.target.value,
                                                })
                                            }
                                            placeholder="Opsional"
                                            className={inputClass}
                                        />
                                    </Field>
                                    <Field label="Jurnal / catatan">
                                        <textarea
                                            rows={2}
                                            maxLength={5000}
                                            value={harvestForm.notes}
                                            onChange={(event) =>
                                                setHarvestForm({
                                                    ...harvestForm,
                                                    notes: event.target.value,
                                                })
                                            }
                                            placeholder="Kondisi jamur, tindakan, atau catatan kualitas"
                                            className={inputClass}
                                        />
                                    </Field>
                                    <button
                                        disabled={busy || batches.length === 0}
                                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                                    >
                                        {busy
                                            ? 'Menyimpan…'
                                            : 'Simpan catatan panen'}
                                    </button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>
            </div>
        </>
    );
}

const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';
function Field({
    label,
    children,
}: {
    label: string;
    children: React.ReactNode;
}) {
    return (
        <label className="block min-w-0 text-sm font-medium text-slate-700">
            <span className="mb-1.5 block">{label}</span>
            {children}
        </label>
    );
}
function SummaryCard({
    icon,
    label,
    value,
    detail,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    detail: string;
}) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">{label}</p>
                <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700">
                    {icon}
                </span>
            </div>
            <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
                {value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </article>
    );
}
