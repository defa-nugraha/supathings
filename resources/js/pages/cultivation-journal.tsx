import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { NotebookPen } from 'lucide-react';

function formatIndonesianDate(value: string): string {
    const dateOnly = value.slice(0, 10);
    const date = new Date(`${dateOnly}T00:00:00`);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

type B = {
    id: number;
    name: string;
    inoculated_at: string;
    notes: string | null;
};

type H = {
    id: number;
    harvested_at: string;
    flush_number: number;
    notes: string | null;
    batch?: { name: string };
};

export default function CultivationJournal() {
    const [entries, setEntries] = useState<
        { id: string; date: string; title: string; note: string }[]
    >([]);
    const [error, setError] = useState('');

    useEffect(() => {
        Promise.all([
            fetch('/api/cultivation/batches', {
                headers: { Accept: 'application/json' },
            }),
            fetch('/api/cultivation/harvests', {
                headers: { Accept: 'application/json' },
            }),
        ])
            .then(async ([batchResponse, harvestResponse]) => {
                if (!batchResponse.ok || !harvestResponse.ok) {
                    throw new Error('Jurnal budidaya gagal dimuat.');
                }

                const [batchData, harvestData] = await Promise.all([
                    batchResponse.json(),
                    harvestResponse.json(),
                ]);
                const batchEntries = (batchData.data as B[])
                    .filter((batch) => batch.notes?.trim())
                    .map((batch) => ({
                        id: `b${batch.id}`,
                        date: batch.inoculated_at,
                        title: `${batch.name} · catatan batch`,
                        note: batch.notes as string,
                    }));
                const harvestEntries = (harvestData.data as H[])
                    .filter((harvest) => harvest.notes?.trim())
                    .map((harvest) => ({
                        id: `h${harvest.id}`,
                        date: harvest.harvested_at,
                        title:
                            (harvest.batch?.name ?? 'Batch') +
                            ' · panen gelombang ' +
                            harvest.flush_number,
                        note: harvest.notes as string,
                    }));

                setEntries(
                    [...batchEntries, ...harvestEntries].sort((a, b) =>
                        b.date.localeCompare(a.date),
                    ),
                );
            })
            .catch((caughtError) => {
                setError(
                    caughtError instanceof Error
                        ? caughtError.message
                        : 'Terjadi kesalahan.',
                );
            });
    }, []);

    return (
        <>
            <Head title="Jurnal budidaya" />
            <main className="min-h-full bg-[#f6f8fb] p-4 sm:p-6 md:p-8">
                <div className="mx-auto max-w-[1100px] space-y-6">
                    <header data-tour="cultivation-journal">
                        <h1 className="text-3xl font-semibold text-slate-900">
                            Jurnal budidaya
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Catatan kondisi baglog dan observasi saat panen.
                        </p>
                    </header>
                    {error && <p role="alert">{error}</p>}
                    {entries.length === 0 ? (
                        <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                            Belum ada jurnal. Tambahkan catatan pada batch atau
                            saat mencatat panen.
                        </p>
                    ) : (
                        entries.map((entry) => (
                            <article
                                key={entry.id}
                                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                            >
                                <div className="flex gap-3">
                                    <NotebookPen className="size-5 text-emerald-700" />
                                    <div>
                                        <p className="font-semibold">
                                            {entry.title}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {formatIndonesianDate(entry.date)}
                                        </p>
                                        <p className="mt-3 text-sm leading-6 whitespace-pre-wrap">
                                            {entry.note}
                                        </p>
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            </main>
        </>
    );
}
