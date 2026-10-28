import { Head } from '@inertiajs/react';
import { Pencil, Plus, ReceiptText, Trash2 } from 'lucide-react';
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
type Expense = {
    id: number;
    cultivation_batch_id: number | null;
    incurred_at: string;
    category: string;
    description: string;
    amount: number;
    batch?: Batch | null;
};
const categories = [
    { value: 'baglog', label: 'Baglog' },
    { value: 'bibit', label: 'Bibit' },
    { value: 'listrik', label: 'Listrik' },
    { value: 'air', label: 'Air' },
    { value: 'tenaga_kerja', label: 'Tenaga kerja' },
    { value: 'perawatan', label: 'Perawatan' },
    { value: 'lainnya', label: 'Lainnya' },
];
const today = new Date().toLocaleDateString('en-CA');
const initialForm = {
    incurred_at: today,
    category: 'lainnya',
    description: '',
    amount: '',
    cultivation_batch_id: 'general',
};
const inputClass =
    'mt-1.5 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

function dateLabel(value: string) {
    const date = new Date(value.slice(0, 10) + 'T00:00:00');
    return Number.isNaN(date.getTime())
        ? value
        : date.toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
          });
}
function money(value: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);
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

export default function CultivationExpenses() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState('');
    const [error, setError] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<Expense | null>(null);
    const [deleting, setDeleting] = useState<Expense | null>(null);
    const [form, setForm] = useState(initialForm);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [expenseResponse, batchResponse] = await Promise.all([
                fetch('/api/cultivation/expenses?from=2000-01-01&to=' + today, {
                    headers: { Accept: 'application/json' },
                }),
                fetch('/api/cultivation/batches', {
                    headers: { Accept: 'application/json' },
                }),
            ]);
            if (!expenseResponse.ok || !batchResponse.ok) {
                throw new Error('Data biaya operasional gagal dimuat.');
            }
            const [expensePayload, batchPayload] = await Promise.all([
                expenseResponse.json(),
                batchResponse.json(),
            ]);
            setExpenses(expensePayload.data ?? []);
            setBatches(
                (batchPayload.data ?? []).map((batch: Batch) => ({
                    id: batch.id,
                    name: batch.name,
                })),
            );
        } catch (cause) {
            setError(
                cause instanceof Error ? cause.message : 'Terjadi kesalahan.',
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    const openCreate = () => {
        setEditing(null);
        setForm(initialForm);
        setError('');
        setNotice('');
        setDialogOpen(true);
    };
    const openEdit = (expense: Expense) => {
        setEditing(expense);
        setForm({
            incurred_at: expense.incurred_at.slice(0, 10),
            category: expense.category,
            description: expense.description,
            amount: String(expense.amount),
            cultivation_batch_id: expense.cultivation_batch_id
                ? String(expense.cultivation_batch_id)
                : 'general',
        });
        setError('');
        setNotice('');
        setDialogOpen(true);
    };

    const save = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setBusy(true);
        setError('');
        setNotice('');
        try {
            const response = await fetch(
                editing
                    ? '/api/cultivation/expenses/' + editing.id
                    : '/api/cultivation/expenses',
                {
                    method: editing ? 'PATCH' : 'POST',
                    headers: csrfHeaders(),
                    body: JSON.stringify({
                        ...form,
                        amount: Number(form.amount),
                        cultivation_batch_id:
                            form.cultivation_batch_id === 'general'
                                ? null
                                : Number(form.cultivation_batch_id),
                    }),
                },
            );
            const payload = await response.json();
            if (!response.ok) {
                throw new Error(
                    payload.message ??
                        'Biaya gagal disimpan. Periksa kembali isian.',
                );
            }
            setDialogOpen(false);
            setNotice(
                editing
                    ? 'Biaya berhasil diperbarui.'
                    : 'Biaya berhasil dicatat.',
            );
            await load();
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : 'Biaya gagal disimpan.',
            );
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!deleting) return;
        setBusy(true);
        setError('');
        try {
            const response = await fetch(
                '/api/cultivation/expenses/' + deleting.id,
                {
                    method: 'DELETE',
                    headers: csrfHeaders(),
                },
            );
            const payload = await response.json();
            if (!response.ok)
                throw new Error(payload.message ?? 'Biaya gagal dihapus.');
            setDeleting(null);
            setNotice('Catatan biaya berhasil dihapus.');
            await load();
        } catch (cause) {
            setError(
                cause instanceof Error ? cause.message : 'Biaya gagal dihapus.',
            );
            setDeleting(null);
        } finally {
            setBusy(false);
        }
    };

    const total = expenses.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
    );

    return (
        <>
            <Head title="Biaya operasional" />
            <main className="min-h-full bg-[#f6f8fb] p-4 md:p-8">
                <div className="mx-auto max-w-[1400px] space-y-6">
                    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="mb-2 text-sm text-slate-500">
                                Budidaya jamur / Biaya operasional
                            </p>
                            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                                Biaya operasional
                            </h1>
                            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                                Catat pengeluaran budidaya untuk menghitung
                                estimasi laba. Keterangan dapat diisi lebih
                                lengkap agar transaksi mudah ditelusuri.
                            </p>
                        </div>
                        <button
                            data-tour="expenses-add"
                            onClick={openCreate}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                        >
                            <Plus className="size-4" /> Catat biaya
                        </button>
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

                    <section data-tour="expenses-summary" className="grid gap-4 sm:grid-cols-3">
                        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <p className="text-sm text-slate-500">
                                Total pengeluaran tercatat
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-slate-900">
                                {money(total)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                Semua catatan yang tersimpan
                            </p>
                        </article>
                        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <p className="text-sm text-slate-500">
                                Jumlah transaksi
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-slate-900">
                                {expenses.length.toLocaleString('id-ID')}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                Catatan biaya operasional
                            </p>
                        </article>
                        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <p className="text-sm text-slate-500">
                                Rata-rata transaksi
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-slate-900">
                                {money(
                                    expenses.length
                                        ? total / expenses.length
                                        : 0,
                                )}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                Per catatan biaya
                            </p>
                        </article>
                    </section>

                    <section data-tour="expenses-table" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 p-5">
                            <div className="flex items-center gap-2">
                                <ReceiptText className="size-5 text-emerald-700" />
                                <h2 className="font-semibold text-slate-900">
                                    Riwayat biaya
                                </h2>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                                Edit data yang keliru atau hapus transaksi yang
                                tidak lagi diperlukan.
                            </p>
                        </div>
                        {loading ? (
                            <p className="p-8 text-center text-sm text-slate-500">
                                Memuat biaya...
                            </p>
                        ) : expenses.length === 0 ? (
                            <div className="p-12 text-center">
                                <ReceiptText className="mx-auto size-8 text-slate-300" />
                                <p className="mt-3 font-medium text-slate-800">
                                    Belum ada biaya operasional
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                    Mulai dengan mencatat pengeluaran pertama.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[780px] text-left text-sm">
                                    <thead className="bg-slate-50 text-xs text-slate-500">
                                        <tr>
                                            <th className="px-5 py-3">
                                                Tanggal
                                            </th>
                                            <th className="px-5 py-3">
                                                Kategori
                                            </th>
                                            <th className="px-5 py-3">
                                                Keterangan
                                            </th>
                                            <th className="px-5 py-3">Batch</th>
                                            <th className="px-5 py-3 text-right">
                                                Nominal
                                            </th>
                                            <th className="px-5 py-3 text-right">
                                                Aksi
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {expenses.map((expense) => (
                                            <tr
                                                key={expense.id}
                                                className="align-top hover:bg-slate-50/70"
                                            >
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    {dateLabel(
                                                        expense.incurred_at,
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    {categories.find(
                                                        (item) =>
                                                            item.value ===
                                                            expense.category,
                                                    )?.label ??
                                                        expense.category}
                                                </td>
                                                <td className="max-w-[340px] px-5 py-4 font-medium break-words whitespace-pre-wrap text-slate-800">
                                                    {expense.description}
                                                </td>
                                                <td className="px-5 py-4">
                                                    {expense.batch?.name ??
                                                        'Umum'}
                                                </td>
                                                <td className="px-5 py-4 text-right font-medium whitespace-nowrap">
                                                    {money(
                                                        Number(expense.amount),
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex justify-end gap-1">
                                                        <button
                                                            aria-label="Edit biaya"
                                                            title="Edit biaya"
                                                            onClick={() =>
                                                                openEdit(
                                                                    expense,
                                                                )
                                                            }
                                                            className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                                                        >
                                                            <Pencil className="size-4" />
                                                        </button>
                                                        <button
                                                            aria-label="Hapus biaya"
                                                            title="Hapus biaya"
                                                            onClick={() =>
                                                                setDeleting(
                                                                    expense,
                                                                )
                                                            }
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

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editing
                                ? 'Edit biaya operasional'
                                : 'Catat biaya operasional'}
                        </DialogTitle>
                        <DialogDescription>
                            Lengkapi informasi transaksi. Semua nominal dicatat
                            dalam rupiah.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
                        <label className="block min-w-0 text-sm font-medium text-slate-700">
                            Tanggal
                            <input
                                className={inputClass}
                                type="date"
                                required
                                max={today}
                                value={form.incurred_at}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        incurred_at: event.target.value,
                                    })
                                }
                            />
                        </label>
                        <label className="block min-w-0 text-sm font-medium text-slate-700">
                            Kategori
                            <Select
                                value={form.category}
                                onValueChange={(value) =>
                                    setForm({ ...form, category: value })
                                }
                            >
                                <SelectTrigger className="mt-1.5 h-11 w-full rounded-xl border-slate-200">
                                    <SelectValue placeholder="Pilih kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((item) => (
                                        <SelectItem
                                            key={item.value}
                                            value={item.value}
                                        >
                                            {item.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </label>
                        <label className="block min-w-0 text-sm font-medium text-slate-700 sm:col-span-2">
                            Batch (opsional)
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
                                    <SelectItem value="general">
                                        Umum / semua batch
                                    </SelectItem>
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
                        <label className="block min-w-0 text-sm font-medium text-slate-700 sm:col-span-2">
                            Keterangan
                            <textarea
                                required
                                maxLength={160}
                                rows={3}
                                value={form.description}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        description: event.target.value,
                                    })
                                }
                                placeholder="Contoh: pembelian 100 baglog, listrik kumbung bulan Oktober, atau upah tenaga kerja"
                                className={inputClass + ' resize-y leading-6'}
                            />
                            <span className="mt-1 block text-xs font-normal text-slate-500">
                                Jelaskan kebutuhan atau tujuan pengeluaran
                                (maksimal 160 karakter).{' '}
                                {form.description.length}/160
                            </span>
                        </label>
                        <label className="block min-w-0 text-sm font-medium text-slate-700 sm:col-span-2">
                            Nominal (Rp)
                            <input
                                className={inputClass}
                                type="number"
                                required
                                min="1"
                                step="1"
                                value={form.amount}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        amount: event.target.value,
                                    })
                                }
                                placeholder="Contoh: 150000"
                            />
                        </label>
                        {error && (
                            <p
                                role="alert"
                                className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 sm:col-span-2"
                            >
                                {error}
                            </p>
                        )}
                        <div className="flex justify-end gap-2 sm:col-span-2">
                            <button
                                type="button"
                                onClick={() => setDialogOpen(false)}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
                            >
                                Batal
                            </button>
                            <button
                                disabled={busy}
                                className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {busy
                                    ? 'Menyimpan...'
                                    : editing
                                      ? 'Simpan perubahan'
                                      : 'Simpan biaya'}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <Dialog
                open={Boolean(deleting)}
                onOpenChange={(open) => !open && setDeleting(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Hapus biaya operasional?</DialogTitle>
                        <DialogDescription>
                            Catatan “{deleting?.description}” sebesar{' '}
                            {deleting ? money(Number(deleting.amount)) : ''}{' '}
                            akan dihapus permanen dan memengaruhi perhitungan
                            laba.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setDeleting(null)}
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold"
                        >
                            Batal
                        </button>
                        <button
                            disabled={busy}
                            onClick={() => void remove()}
                            className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {busy ? 'Menghapus...' : 'Ya, hapus biaya'}
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
