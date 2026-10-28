import { Head } from '@inertiajs/react';
import { Pencil, Trash2, ClipboardList } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
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

type Batch = { id: number; name: string };
type H = {
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
type HarvestForm = {
    cultivation_batch_id: string;
    harvested_at: string;
    flush_number: string;
    weight_kg: string;
    quality: string;
    sale_price_per_kg: string;
    notes: string;
};
const today = new Date().toLocaleDateString('en-CA');
const qualityOptions = [
    { value: 'premium', label: 'Premium' },
    { value: 'good', label: 'Baik' },
    { value: 'standard', label: 'Standar' },
    { value: 'reject', label: 'Afkir' },
];
const csrfHeaders = (): HeadersInit => ({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-CSRF-TOKEN':
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? '',
});
const formatDate = (value: string) =>
    new Date(value.slice(0, 10) + 'T00:00:00').toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
const money = (value: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);
const emptyForm = (): HarvestForm => ({
    cultivation_batch_id: '',
    harvested_at: today,
    flush_number: '1',
    weight_kg: '',
    quality: 'good',
    sale_price_per_kg: '',
    notes: '',
});

export default function CultivationHistory() {
    const [data, setData] = useState<H[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [form, setForm] = useState<HarvestForm>(emptyForm());
    const [editing, setEditing] = useState<H | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [saving, setSaving] = useState(false);

    const refresh = useCallback(async () => {
        try {
            const [harvestResponse, batchResponse] = await Promise.all([
                fetch('/api/cultivation/harvests', {
                    headers: { Accept: 'application/json' },
                }),
                fetch('/api/cultivation/batches', {
                    headers: { Accept: 'application/json' },
                }),
            ]);
            const [harvestPayload, batchPayload] = await Promise.all([
                harvestResponse.json(),
                batchResponse.json(),
            ]);
            if (!harvestResponse.ok || !batchResponse.ok)
                throw new Error('Riwayat panen gagal dimuat.');
            setData(harvestPayload.data ?? []);
            setBatches(
                (batchPayload.data ?? []).map((batch: Batch) => ({
                    id: batch.id,
                    name: batch.name,
                })),
            );
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : 'Terjadi kesalahan saat memuat riwayat.',
            );
        }
    }, []);
    useEffect(() => {
        void refresh();
    }, [refresh]);

    const openEdit = (item: H) => {
        setEditing(item);
        setForm({
            cultivation_batch_id: String(item.cultivation_batch_id),
            harvested_at: item.harvested_at.slice(0, 10),
            flush_number: String(item.flush_number),
            weight_kg: String(item.weight_kg),
            quality: item.quality ?? 'good',
            sale_price_per_kg:
                item.sale_price_per_kg === null
                    ? ''
                    : String(item.sale_price_per_kg),
            notes: item.notes ?? '',
        });
        setError('');
        setDialogOpen(true);
    };
    const save = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editing) return;
        setSaving(true);
        setError('');
        setNotice('');
        try {
            const response = await fetch(
                '/api/cultivation/harvests/' + editing.id,
                {
                    method: 'PATCH',
                    headers: csrfHeaders(),
                    body: JSON.stringify({
                        ...form,
                        cultivation_batch_id: Number(form.cultivation_batch_id),
                        flush_number: Number(form.flush_number),
                        weight_kg: Number(form.weight_kg),
                        sale_price_per_kg: form.sale_price_per_kg
                            ? Number(form.sale_price_per_kg)
                            : null,
                        quality: form.quality || null,
                        notes: form.notes || null,
                    }),
                },
            );
            const payload = await response.json();
            if (!response.ok)
                throw new Error(
                    payload.message ?? 'Catatan panen gagal diperbarui.',
                );
            setDialogOpen(false);
            setNotice('Catatan panen berhasil diperbarui.');
            await refresh();
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : 'Catatan panen gagal diperbarui.',
            );
        } finally {
            setSaving(false);
        }
    };
    const remove = async (item: H) => {
        if (
            !window.confirm(
                'Hapus catatan panen batch "' +
                    (item.batch?.name ?? 'tanpa nama') +
                    '" tanggal ' +
                    formatDate(item.harvested_at) +
                    '?',
            )
        )
            return;
        setError('');
        setNotice('');
        try {
            const response = await fetch(
                '/api/cultivation/harvests/' + item.id,
                { method: 'DELETE', headers: csrfHeaders() },
            );
            const payload = await response.json();
            if (!response.ok)
                throw new Error(
                    payload.message ?? 'Catatan panen gagal dihapus.',
                );
            setNotice('Catatan panen berhasil dihapus.');
            await refresh();
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : 'Catatan panen gagal dihapus.',
            );
        }
    };

    return (
        <>
            <Head title="Riwayat panen" />
            <main className="min-h-full bg-[#f6f8fb] p-4 md:p-8">
                <div className="mx-auto max-w-[1400px] space-y-6">
                    <header>
                        <h1 className="text-3xl font-semibold text-slate-900">
                            Riwayat panen
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Rekap hasil panen per batch dan gelombang. Data
                            dapat diperbaiki atau dihapus jika terjadi kesalahan
                            pencatatan.
                        </p>
                    </header>
                    {error && (
                        <p
                            role="alert"
                            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                        >
                            {error}
                        </p>
                    )}
                    {notice && (
                        <p
                            role="status"
                            className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"
                        >
                            {notice}
                        </p>
                    )}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-4 flex items-center gap-2">
                            <ClipboardList className="size-5 text-emerald-700" />
                            <h2 className="text-lg font-semibold">
                                Catatan panen
                            </h2>
                        </div>
                        {data.length === 0 ? (
                            <p className="p-6 text-center text-sm text-slate-500">
                                Belum ada catatan panen.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[800px] text-left text-sm">
                                    <thead className="bg-slate-50 text-xs text-slate-500">
                                        <tr>
                                            <th className="px-3 py-3">
                                                Tanggal
                                            </th>
                                            <th className="px-3 py-3">Batch</th>
                                            <th className="px-3 py-3">
                                                Gelombang
                                            </th>
                                            <th className="px-3 py-3">Berat</th>
                                            <th className="px-3 py-3">
                                                Kualitas
                                            </th>
                                            <th className="px-3 py-3">
                                                Harga/kg
                                            </th>
                                            <th className="px-3 py-3 text-right">
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map((item) => (
                                            <tr
                                                key={item.id}
                                                className="border-t border-slate-100 align-top"
                                            >
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    {formatDate(
                                                        item.harvested_at,
                                                    )}
                                                </td>
                                                <td className="px-3 py-3">
                                                    {item.batch?.name ?? '—'}
                                                </td>
                                                <td className="px-3 py-3">
                                                    {item.flush_number}
                                                </td>
                                                <td className="px-3 py-3">
                                                    {Number(
                                                        item.weight_kg,
                                                    ).toLocaleString(
                                                        'id-ID',
                                                    )}{' '}
                                                    kg
                                                </td>
                                                <td className="px-3 py-3">
                                                    {qualityOptions.find(
                                                        (q) =>
                                                            q.value ===
                                                            item.quality,
                                                    )?.label ??
                                                        item.quality ??
                                                        '—'}
                                                </td>
                                                <td className="px-3 py-3">
                                                    {item.sale_price_per_kg ===
                                                    null
                                                        ? '—'
                                                        : money(
                                                              Number(
                                                                  item.sale_price_per_kg,
                                                              ),
                                                          )}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openEdit(item)
                                                            }
                                                            aria-label="Edit catatan panen"
                                                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50"
                                                        >
                                                            <Pencil className="size-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                void remove(
                                                                    item,
                                                                )
                                                            }
                                                            aria-label="Hapus catatan panen"
                                                            className="rounded-lg border border-red-200 p-2 text-red-700 hover:bg-red-50"
                                                        >
                                                            <Trash2 className="size-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                </div>
            </main>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit catatan panen</DialogTitle>
                        <DialogDescription>
                            Perbarui data panen yang salah dicatat. Perubahan
                            ini memengaruhi rekap dan estimasi omzet.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5 text-sm font-medium">
                            Batch
                            <Select
                                value={form.cultivation_batch_id}
                                onValueChange={(value) =>
                                    setForm({
                                        ...form,
                                        cultivation_batch_id: value,
                                    })
                                }
                            >
                                <SelectTrigger className="w-full">
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
                        </label>
                        <label className="space-y-1.5 text-sm font-medium">
                            Tanggal panen
                            <input
                                type="date"
                                required
                                max={today}
                                value={form.harvested_at}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        harvested_at: event.target.value,
                                    })
                                }
                                className="block h-10 w-full rounded-lg border border-slate-300 px-3 font-normal"
                            />
                        </label>
                        <label className="space-y-1.5 text-sm font-medium">
                            Gelombang
                            <input
                                type="number"
                                min="1"
                                max="20"
                                required
                                value={form.flush_number}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        flush_number: event.target.value,
                                    })
                                }
                                className="block h-10 w-full rounded-lg border border-slate-300 px-3 font-normal"
                            />
                        </label>
                        <label className="space-y-1.5 text-sm font-medium">
                            Berat (kg)
                            <input
                                type="number"
                                min="0.001"
                                step="0.001"
                                required
                                value={form.weight_kg}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        weight_kg: event.target.value,
                                    })
                                }
                                className="block h-10 w-full rounded-lg border border-slate-300 px-3 font-normal"
                            />
                        </label>
                        <label className="space-y-1.5 text-sm font-medium">
                            Kualitas
                            <Select
                                value={form.quality}
                                onValueChange={(value) =>
                                    setForm({ ...form, quality: value })
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Pilih kualitas" />
                                </SelectTrigger>
                                <SelectContent>
                                    {qualityOptions.map((quality) => (
                                        <SelectItem
                                            key={quality.value}
                                            value={quality.value}
                                        >
                                            {quality.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </label>
                        <label className="space-y-1.5 text-sm font-medium">
                            Harga jual per kg (Rp)
                            <input
                                type="number"
                                min="0"
                                step="1"
                                value={form.sale_price_per_kg}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        sale_price_per_kg: event.target.value,
                                    })
                                }
                                className="block h-10 w-full rounded-lg border border-slate-300 px-3 font-normal"
                            />
                        </label>
                        <label className="space-y-1.5 text-sm font-medium sm:col-span-2">
                            Catatan
                            <textarea
                                maxLength={5000}
                                rows={3}
                                value={form.notes}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        notes: event.target.value,
                                    })
                                }
                                className="block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
                            />
                        </label>
                        {error && (
                            <p
                                role="alert"
                                className="text-sm text-red-700 sm:col-span-2"
                            >
                                {error}
                            </p>
                        )}
                        <div className="flex justify-end gap-2 sm:col-span-2">
                            <button
                                type="button"
                                onClick={() => setDialogOpen(false)}
                                className="rounded-lg border px-4 py-2 text-sm"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {saving ? 'Menyimpan…' : 'Simpan perubahan'}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
