import { Head } from '@inertiajs/react';
import { ClipboardList, Pencil, Trash2 } from 'lucide-react';
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

function formatIndonesianDate(value: string): string {
    const date = new Date(value.slice(0, 10) + 'T00:00:00');
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
          });
}
type BatchOption = { id: number; name: string };
type Harvest = {
    id: number;
    cultivation_batch_id: number;
    harvested_at: string;
    flush_number: number;
    weight_kg: number;
    quality: string | null;
    sale_price_per_kg: number | null;
    notes: string | null;
    batch?: BatchOption;
};
const today = new Date().toLocaleDateString('en-CA');
const inputClass =
    'mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';
function csrfHeaders(): HeadersInit {
    return {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN':
            document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                ?.content ?? '',
    };
}
export default function CultivationHistory() {
    const [data, setData] = useState<Harvest[]>([]);
    const [batches, setBatches] = useState<BatchOption[]>([]);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [editing, setEditing] = useState<Harvest | null>(null);
    const [busy, setBusy] = useState(false);
    const [form, setForm] = useState({
        cultivation_batch_id: '',
        harvested_at: today,
        flush_number: '1',
        weight_kg: '',
        quality: 'good',
        sale_price_per_kg: '',
        notes: '',
    });

    const load = useCallback(async () => {
        try {
            const [harvestResponse, batchResponse] = await Promise.all([
                fetch('/api/cultivation/harvests', {
                    headers: { Accept: 'application/json' },
                }),
                fetch('/api/cultivation/batches', {
                    headers: { Accept: 'application/json' },
                }),
            ]);
            if (!harvestResponse.ok || !batchResponse.ok)
                throw new Error('Riwayat panen gagal dimuat.');
            const [harvestPayload, batchPayload] = await Promise.all([
                harvestResponse.json(),
                batchResponse.json(),
            ]);
            setData(harvestPayload.data ?? []);
            setBatches(
                (batchPayload.data ?? []).map((item: BatchOption) => ({
                    id: item.id,
                    name: item.name,
                })),
            );
        } catch (cause) {
            setError(
                cause instanceof Error ? cause.message : 'Terjadi kesalahan.',
            );
        }
    }, []);
    useEffect(() => {
        void load();
    }, [load]);

    const startEdit = (item: Harvest) => {
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
    };
    const save = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!editing) return;
        setBusy(true);
        setError('');
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
                        notes: form.notes || null,
                        quality: form.quality || null,
                    }),
                },
            );
            const payload = await response.json();
            if (!response.ok)
                throw new Error(
                    payload.message ?? 'Catatan panen gagal diperbarui.',
                );
            setEditing(null);
            setNotice('Catatan panen berhasil diperbarui.');
            await load();
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : 'Catatan panen gagal diperbarui.',
            );
        } finally {
            setBusy(false);
        }
    };
    const remove = async (item: Harvest) => {
        if (
            !window.confirm(
                'Hapus catatan panen tanggal ' +
                    formatIndonesianDate(item.harvested_at) +
                    '? Data ini akan memengaruhi laporan hasil dan laba.',
            )
        )
            return;
        setError('');
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
            await load();
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
                            Rekap hasil panen per batch dan gelombang. Catatan
                            yang salah dapat diedit atau dihapus.
                        </p>
                    </header>
                    {error && (
                        <p
                            role="alert"
                            className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800"
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
                    <section data-tour="harvest-history" className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
                                <table className="w-full min-w-[820px] text-left text-sm">
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
                                    <tbody className="divide-y divide-slate-100">
                                        {data.map((item) => (
                                            <tr
                                                key={item.id}
                                                className="hover:bg-slate-50/70"
                                            >
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    {formatIndonesianDate(
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
                                                    {(
                                                        {
                                                            premium: 'Premium',
                                                            good: 'Baik',
                                                            standard: 'Standar',
                                                            reject: 'Afkir',
                                                        } as Record<
                                                            string,
                                                            string
                                                        >
                                                    )[item.quality ?? ''] ??
                                                        '—'}
                                                </td>
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    {item.sale_price_per_kg ===
                                                    null
                                                        ? '—'
                                                        : 'Rp ' +
                                                          Number(
                                                              item.sale_price_per_kg,
                                                          ).toLocaleString(
                                                              'id-ID',
                                                          )}
                                                </td>
                                                <td className="px-3 py-3">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            onClick={() =>
                                                                startEdit(item)
                                                            }
                                                            title="Edit panen"
                                                            aria-label="Edit panen"
                                                            className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                                                        >
                                                            <Pencil className="size-4" />
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                void remove(
                                                                    item,
                                                                )
                                                            }
                                                            title="Hapus panen"
                                                            aria-label="Hapus panen"
                                                            className="rounded-lg p-2 text-slate-500 hover:bg-rose-50 hover:text-rose-700"
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
            <Dialog
                open={Boolean(editing)}
                onOpenChange={(open) => !open && setEditing(null)}
            >
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Edit catatan panen</DialogTitle>
                        <DialogDescription>
                            Perubahan akan langsung memperbarui ringkasan panen
                            dan laporan keuangan.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-medium">
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
                                <SelectTrigger className="mt-1.5 h-11 w-full rounded-xl border-slate-200">
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
                        <label className="text-sm font-medium">
                            Tanggal panen
                            <input
                                className={inputClass}
                                type="date"
                                max={today}
                                required
                                value={form.harvested_at}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        harvested_at: event.target.value,
                                    })
                                }
                            />
                        </label>
                        <label className="text-sm font-medium">
                            Gelombang
                            <input
                                className={inputClass}
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
                            />
                        </label>
                        <label className="text-sm font-medium">
                            Berat (kg)
                            <input
                                className={inputClass}
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
                            />
                        </label>
                        <label className="text-sm font-medium">
                            Kualitas
                            <Select
                                value={form.quality}
                                onValueChange={(value) =>
                                    setForm({ ...form, quality: value })
                                }
                            >
                                <SelectTrigger className="mt-1.5 h-11 w-full rounded-xl border-slate-200">
                                    <SelectValue placeholder="Pilih kualitas" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="premium">
                                        Premium
                                    </SelectItem>
                                    <SelectItem value="good">Baik</SelectItem>
                                    <SelectItem value="standard">
                                        Standar
                                    </SelectItem>
                                    <SelectItem value="reject">
                                        Afkir
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </label>
                        <label className="text-sm font-medium">
                            Harga jual per kg (Rp)
                            <input
                                className={inputClass}
                                type="number"
                                min="0"
                                value={form.sale_price_per_kg}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        sale_price_per_kg: event.target.value,
                                    })
                                }
                            />
                        </label>
                        <label className="text-sm font-medium sm:col-span-2">
                            Keterangan panen
                            <textarea
                                className={inputClass + ' resize-y leading-6'}
                                rows={3}
                                maxLength={5000}
                                value={form.notes}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        notes: event.target.value,
                                    })
                                }
                                placeholder="Catatan kualitas, kondisi jamur, atau penanganan panen"
                            />
                        </label>
                        {error && (
                            <p
                                role="alert"
                                className="text-sm text-rose-700 sm:col-span-2"
                            >
                                {error}
                            </p>
                        )}
                        <div className="flex justify-end gap-2 sm:col-span-2">
                            <button
                                type="button"
                                onClick={() => setEditing(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
                            >
                                Batal
                            </button>
                            <button
                                disabled={busy}
                                className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {busy ? 'Menyimpan...' : 'Simpan perubahan'}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
