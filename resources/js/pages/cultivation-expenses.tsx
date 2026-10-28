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
    incurred_at: string;
    category: string;
    description: string;
    amount: number;
    cultivation_batch_id: number | null;
    batch?: Batch | null;
};
type ExpenseForm = {
    incurred_at: string;
    category: string;
    description: string;
    amount: string;
    cultivation_batch_id: string;
};
const today = new Date().toLocaleDateString('en-CA');
const categories = [
    { value: 'baglog', label: 'Baglog' },
    { value: 'bibit', label: 'Bibit' },
    { value: 'listrik', label: 'Listrik' },
    { value: 'air', label: 'Air' },
    { value: 'tenaga_kerja', label: 'Tenaga kerja' },
    { value: 'perawatan', label: 'Perawatan' },
    { value: 'lainnya', label: 'Lainnya' },
];
const money = (value: number) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(value);
const dateLabel = (value: string) =>
    new Date(value.slice(0, 10) + 'T00:00:00').toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
const emptyForm = (): ExpenseForm => ({
    incurred_at: today,
    category: 'lainnya',
    description: '',
    amount: '',
    cultivation_batch_id: 'general',
});
const csrfHeaders = (): HeadersInit => ({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-CSRF-TOKEN':
        document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.content ?? '',
});

export default function CultivationExpenses() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [form, setForm] = useState<ExpenseForm>(emptyForm());
    const [editing, setEditing] = useState<Expense | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const [er, br] = await Promise.all([
                fetch('/api/cultivation/expenses', {
                    headers: { Accept: 'application/json' },
                }),
                fetch('/api/cultivation/batches', {
                    headers: { Accept: 'application/json' },
                }),
            ]);
            const [ep, bp] = await Promise.all([er.json(), br.json()]);
            if (!er.ok || !br.ok)
                throw new Error(
                    ep.message ?? bp.message ?? 'Data biaya gagal dimuat.',
                );
            setExpenses(ep.data ?? []);
            setBatches(
                (bp.data ?? []).map((batch: Batch) => ({
                    id: batch.id,
                    name: batch.name,
                })),
            );
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : 'Data biaya gagal dimuat.',
            );
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => {
        void refresh();
    }, [refresh]);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm());
        setError('');
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
        setDialogOpen(true);
    };
    const save = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSaving(true);
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
            if (!response.ok)
                throw new Error(payload.message ?? 'Biaya gagal disimpan.');
            setDialogOpen(false);
            setNotice(
                editing
                    ? 'Biaya operasional berhasil diperbarui.'
                    : 'Biaya operasional berhasil dicatat.',
            );
            await refresh();
        } catch (cause) {
            setError(
                cause instanceof Error
                    ? cause.message
                    : 'Biaya gagal disimpan.',
            );
        } finally {
            setSaving(false);
        }
    };
    const remove = async (expense: Expense) => {
        if (
            !window.confirm(
                'Hapus catatan biaya "' +
                    expense.description +
                    '"? Tindakan ini tidak dapat dibatalkan.',
            )
        )
            return;
        setError('');
        setNotice('');
        try {
            const response = await fetch(
                '/api/cultivation/expenses/' + expense.id,
                { method: 'DELETE', headers: csrfHeaders() },
            );
            const payload = await response.json();
            if (!response.ok)
                throw new Error(payload.message ?? 'Biaya gagal dihapus.');
            setNotice('Catatan biaya berhasil dihapus.');
            await refresh();
        } catch (cause) {
            setError(
                cause instanceof Error ? cause.message : 'Biaya gagal dihapus.',
            );
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
                    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-700">
                                <ReceiptText className="size-4" /> Budidaya
                                jamur
                            </p>
                            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                                Biaya operasional
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                                Catat pengeluaran kumbung, hubungkan biaya ke
                                batch, dan perbarui catatan jika ada perubahan.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={openCreate}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                        >
                            <Plus className="size-4" /> Catat biaya
                        </button>
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
                    <section className="grid gap-4 sm:grid-cols-3">
                        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <p className="text-sm text-slate-500">
                                Total pengeluaran yang tampil
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-slate-900">
                                {money(total)}
                            </p>
                        </article>
                        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <p className="text-sm text-slate-500">
                                Jumlah catatan
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-slate-900">
                                {expenses.length}
                            </p>
                        </article>
                        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                            <p className="text-sm text-slate-500">
                                Terhubung ke batch
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-slate-900">
                                {
                                    expenses.filter(
                                        (item) =>
                                            item.cultivation_batch_id !== null,
                                    ).length
                                }
                            </p>
                        </article>
                    </section>
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-100 p-5">
                            <h2 className="font-semibold text-slate-900">
                                Riwayat biaya
                            </h2>
                            <p className="mt-1 text-sm text-slate-500">
                                Keterangan panjang dibungkus otomatis agar tetap
                                mudah dibaca.
                            </p>
                        </div>
                        {loading ? (
                            <p className="p-8 text-center text-sm text-slate-500">
                                Memuat data biaya…
                            </p>
                        ) : expenses.length === 0 ? (
                            <p className="p-8 text-center text-sm text-slate-500">
                                Belum ada biaya operasional yang tercatat.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-left text-sm">
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
                                    <tbody>
                                        {expenses.map((expense) => (
                                            <tr
                                                key={expense.id}
                                                className="border-t border-slate-100 align-top hover:bg-slate-50/70"
                                            >
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    {dateLabel(
                                                        expense.incurred_at,
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap">
                                                    {categories.find(
                                                        (item) =>
                                                            item.value ===
                                                            expense.category,
                                                    )?.label ??
                                                        expense.category}
                                                </td>
                                                <td className="max-w-sm px-5 py-4">
                                                    <p className="font-medium break-words whitespace-pre-wrap text-slate-800">
                                                        {expense.description}
                                                    </p>
                                                </td>
                                                <td className="px-5 py-4">
                                                    {expense.batch?.name ??
                                                        'Umum'}
                                                </td>
                                                <td className="px-5 py-4 text-right font-semibold whitespace-nowrap">
                                                    {money(
                                                        Number(expense.amount),
                                                    )}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openEdit(
                                                                    expense,
                                                                )
                                                            }
                                                            aria-label="Edit biaya"
                                                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-white"
                                                        >
                                                            <Pencil className="size-4" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                void remove(
                                                                    expense,
                                                                )
                                                            }
                                                            aria-label="Hapus biaya"
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
                        <DialogTitle>
                            {editing
                                ? 'Edit biaya operasional'
                                : 'Catat biaya operasional'}
                        </DialogTitle>
                        <DialogDescription>
                            Isi keterangan dengan jelas agar mudah ditelusuri
                            saat menghitung biaya budidaya.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5 text-sm font-medium text-slate-700">
                            Tanggal
                            <input
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
                                className="block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"
                            />
                        </label>
                        <label className="space-y-1.5 text-sm font-medium text-slate-700">
                            Kategori
                            <Select
                                value={form.category}
                                onValueChange={(value) =>
                                    setForm({ ...form, category: value })
                                }
                            >
                                <SelectTrigger className="w-full bg-white">
                                    <SelectValue placeholder="Pilih kategori" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((category) => (
                                        <SelectItem
                                            key={category.value}
                                            value={category.value}
                                        >
                                            {category.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </label>
                        <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                            Batch budidaya
                            <Select
                                value={form.cultivation_batch_id}
                                onValueChange={(value) =>
                                    setForm({
                                        ...form,
                                        cultivation_batch_id: value,
                                    })
                                }
                            >
                                <SelectTrigger className="w-full bg-white">
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
                        <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
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
                                placeholder="Contoh: pembelian listrik kumbung untuk minggu pertama"
                                className="block min-h-24 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 leading-6 font-normal placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 focus:outline-none"
                            />
                            <span className="block text-right text-xs font-normal text-slate-500">
                                {form.description.length}/160 karakter
                            </span>
                        </label>
                        <label className="space-y-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                            Nominal (Rp)
                            <input
                                type="number"
                                required
                                min="1"
                                max="100000000000"
                                step="1"
                                value={form.amount}
                                onChange={(event) =>
                                    setForm({
                                        ...form,
                                        amount: event.target.value,
                                    })
                                }
                                placeholder="Contoh: 150000"
                                className="block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"
                            />
                        </label>
                        {error && (
                            <p
                                role="alert"
                                className="rounded-lg bg-red-50 p-3 text-sm text-red-700 sm:col-span-2"
                            >
                                {error}
                            </p>
                        )}
                        <div className="flex justify-end gap-2 sm:col-span-2">
                            <button
                                type="button"
                                onClick={() => setDialogOpen(false)}
                                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {saving
                                    ? 'Menyimpan…'
                                    : editing
                                      ? 'Simpan perubahan'
                                      : 'Simpan biaya'}
                            </button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
