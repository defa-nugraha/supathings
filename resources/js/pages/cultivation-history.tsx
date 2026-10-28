import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';

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
type H = {
    id: number;
    harvested_at: string;
    flush_number: number;
    weight_kg: number;
    quality: string | null;
    sale_price_per_kg: number | null;
    batch?: { id: number; name: string };
};
export default function CultivationHistory() {
    const [data, setData] = useState<H[]>([]);
    const [error, setError] = useState('');
    useEffect(() => {
        fetch('/api/cultivation/harvests', {
            headers: { Accept: 'application/json' },
        })
            .then(async (r) => {
                if (!r.ok) throw new Error('Riwayat panen gagal dimuat.');
                return r.json();
            })
            .then((p) => setData(p.data ?? []))
            .catch((e) =>
                setError(e instanceof Error ? e.message : 'Terjadi kesalahan.'),
            );
    }, []);
    return (
        <>
            <Head title="Riwayat panen" />
            <main className="min-h-full bg-[#f6f8fb] p-6 md:p-8">
                <div className="mx-auto max-w-[1400px] space-y-6">
                    <header>
                        <h1 className="text-3xl font-semibold text-slate-900">
                            Riwayat panen
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Rekap hasil panen per batch dan gelombang.
                        </p>
                    </header>
                    {error && <p role="alert">{error}</p>}
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
                                <table className="w-full min-w-[650px] text-left text-sm">
                                    <thead>
                                        <tr>
                                            <th>Tanggal</th>
                                            <th>Batch</th>
                                            <th>Gelombang</th>
                                            <th>Berat</th>
                                            <th>Kualitas</th>
                                            <th>Harga/kg</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map((x) => (
                                            <tr
                                                key={x.id}
                                                className="border-t border-slate-100"
                                            >
                                                <td className="py-3">
                                                    {formatIndonesianDate(x.harvested_at)}
                                                </td>
                                                <td>{x.batch?.name ?? '—'}</td>
                                                <td>{x.flush_number}</td>
                                                <td>
                                                    {Number(
                                                        x.weight_kg,
                                                    ).toLocaleString(
                                                        'id-ID',
                                                    )}{' '}
                                                    kg
                                                </td>
                                                <td>{x.quality ?? '—'}</td>
                                                <td>
                                                    {x.sale_price_per_kg ===
                                                    null
                                                        ? '—'
                                                        : 'Rp ' +
                                                          Number(
                                                              x.sale_price_per_kg,
                                                          ).toLocaleString(
                                                              'id-ID',
                                                          )}
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
        </>
    );
}
