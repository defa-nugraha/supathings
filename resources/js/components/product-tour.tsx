import { usePage } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, CircleHelp, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

type TourStep = {
    target: string;
    title: string;
    description: string;
};

type TargetRect = {
    top: number;
    left: number;
    width: number;
    height: number;
};

const TOUR_VERSION = '2026-10-v1';
const AUTO_COOLDOWN = 24 * 60 * 60 * 1000;

const tours: Record<string, TourStep[]> = {
    '/dashboard': [
        {
            target: '[data-tour="dashboard-connect"]',
            title: 'Hubungkan perangkat',
            description:
                'Mulai dengan mencari dan mendaftarkan ESP32 milik Anda.',
        },
        {
            target: '[data-tour="dashboard-metrics"]',
            title: 'Pantau kondisi kumbung',
            description:
                'Suhu, kelembapan, dan intensitas cahaya ditampilkan dari pembacaan sensor terbaru.',
        },
        {
            target: '[data-tour="dashboard-device-status"]',
            title: 'Periksa koneksi perangkat',
            description:
                'Lihat perangkat yang online atau offline beserta waktu terakhir aktif.',
        },
        {
            target: '[data-tour="dashboard-alerts"]',
            title: 'Kenali peringatan',
            description:
                'Peringatan membantu Anda menemukan perangkat offline atau kondisi di luar ambang.',
        },
    ],
    '/monitoring': [
        {
            target: '[data-tour="monitoring-device"]',
            title: 'Pilih perangkat',
            description:
                'Pilih perangkat yang ingin dipantau atau dikendalikan.',
        },
        {
            target: '[data-tour="monitoring-mode"]',
            title: 'Pilih mode kontrol',
            description:
                'Gunakan mode manual untuk mengendalikan aktuator atau otomatis untuk mengikuti aturan yang tersedia.',
        },
        {
            target: '[data-tour="monitoring-layout"]',
            title: 'Sesuaikan tampilan',
            description:
                'Aktifkan mode edit untuk menambah, menghapus, atau mengatur ulang kartu pemantauan.',
        },
        {
            target: '[data-tour="monitoring-controls"]',
            title: 'Pantau dan kendalikan',
            description:
                'Periksa nilai sensor dan gunakan kontrol aktuator yang tersedia untuk perangkat terpilih.',
        },
    ],
    '/devices': [
        {
            target: '[data-tour="devices-scan"]',
            title: 'Temukan ESP32',
            description:
                'Jalankan pencarian agar perangkat yang tersedia dapat ditemukan.',
        },
        {
            target: '[data-tour="devices-list"]',
            title: 'Kelola perangkat',
            description:
                'Periksa status perangkat, buka detailnya, atau hapus perangkat yang tidak digunakan.',
        },
    ],
    '/cultivation': [
        {
            target: '[data-tour="cultivation-actions"]',
            title: 'Catat aktivitas utama',
            description:
                'Tambah batch saat memulai siklus budidaya atau catat panen saat hasil sudah siap dipetik.',
        },
        {
            target: '[data-tour="cultivation-batches"]',
            title: 'Kelola batch budidaya',
            description:
                'Pantau fase, jumlah baglog, dan catatan untuk setiap batch.',
        },
        {
            target: '[data-tour="cultivation-harvests"]',
            title: 'Catat hasil panen',
            description:
                'Masukkan tanggal, batch, gelombang, berat, dan informasi penjualan untuk mencatat hasil panen.',
        },
    ],
    '/cultivation/history': [
        {
            target: '[data-tour="harvest-history"]',
            title: 'Riwayat panen',
            description:
                'Tinjau hasil panen terdahulu dan gunakan aksi edit atau hapus untuk memperbaiki catatan.',
        },
    ],
    '/cultivation/journal': [
        {
            target: '[data-tour="cultivation-journal"]',
            title: 'Jurnal budidaya',
            description:
                'Gunakan jurnal untuk meninjau catatan kegiatan yang terkait dengan batch budidaya.',
        },
    ],
    '/cultivation/expenses': [
        {
            target: '[data-tour="expenses-add"]',
            title: 'Catat pengeluaran',
            description:
                'Tambahkan biaya operasional agar perhitungan biaya dan laba lebih akurat.',
        },
        {
            target: '[data-tour="expenses-summary"]',
            title: 'Ringkasan biaya',
            description:
                'Ringkasan menampilkan total pengeluaran, jumlah transaksi, dan rata-rata biaya.',
        },
        {
            target: '[data-tour="expenses-table"]',
            title: 'Kelola transaksi',
            description:
                'Periksa detail pengeluaran dan gunakan aksi edit atau hapus jika diperlukan.',
        },
    ],
    '/reports': [
        {
            target: '[data-tour="reports-filters"]',
            title: 'Atur laporan',
            description:
                'Pilih rentang waktu atau filter yang tersedia sebelum memuat laporan.',
        },
        {
            target: '[data-tour="reports-export"]',
            title: 'Ekspor laporan',
            description:
                'Unduh data laporan ke CSV atau gunakan cetak untuk menyimpan laporan.',
        },
        {
            target: '[data-tour="reports-summary"]',
            title: 'Baca ringkasan',
            description:
                'Gunakan metrik dan tabel untuk memahami perkembangan budidaya pada periode terpilih.',
        },
    ],
    '/settings/profile': [
        {
            target: '[data-tour="settings-profile"]',
            title: 'Profil akun',
            description:
                'Perbarui informasi profil yang digunakan pada akun Anda.',
        },
    ],
    '/settings/branding': [
        {
            target: '[data-tour="settings-branding"]',
            title: 'Identitas aplikasi',
            description:
                'Sesuaikan identitas visual aplikasi melalui pengaturan yang tersedia.',
        },
    ],
    '/settings/security': [
        {
            target: '[data-tour="settings-security"]',
            title: 'Keamanan akun',
            description:
                'Kelola opsi keamanan akun seperti kata sandi dan autentikasi tambahan.',
        },
    ],
};

function getVisibleTarget(selector: string): HTMLElement | null {
    const element = document.querySelector<HTMLElement>(selector);
    return element && element.getClientRects().length > 0 ? element : null;
}

export function ProductTour() {
    const page = usePage();
    const userId = page.props.auth?.user?.id ?? 'guest';
    const pathname = page.url.split('?')[0].replace(/\/$/, '') || '/';
    const steps = useMemo(() => tours[pathname] ?? [], [pathname]);
    const [open, setOpen] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [rect, setRect] = useState<TargetRect | null>(null);
    const [targetMissing, setTargetMissing] = useState(false);

    const storageKey = `supathings:coach-marks:${userId}:${TOUR_VERSION}:${pathname}`;

    const updateRect = useCallback(() => {
        const step = steps[stepIndex];
        if (!step) {
            setRect(null);
            return;
        }

        const target = getVisibleTarget(step.target);
        if (!target) {
            setRect(null);
            setTargetMissing(true);
            return;
        }

        const bounds = target.getBoundingClientRect();
        setRect({
            top: Math.max(8, bounds.top),
            left: Math.max(8, bounds.left),
            width: bounds.width,
            height: bounds.height,
        });
        setTargetMissing(false);
    }, [stepIndex, steps]);

    const startTour = useCallback(
        (automatic = false) => {
            const firstIndex = steps.findIndex((step) =>
                getVisibleTarget(step.target),
            );
            if (firstIndex < 0) return;

            const firstTarget = getVisibleTarget(steps[firstIndex].target);
            firstTarget?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
                inline: 'nearest',
            });
            setStepIndex(firstIndex);
            setOpen(true);
            setTargetMissing(false);

            if (automatic) {
                try {
                    window.localStorage.setItem(storageKey, String(Date.now()));
                } catch {
                    // The tour remains usable when browser storage is unavailable.
                }
            }
        },
        [steps, storageKey],
    );

    useEffect(() => {
        if (!steps.length) {
            setOpen(false);
            return;
        }

        let frame = 0;
        try {
            const lastShown = Number(window.localStorage.getItem(storageKey));
            if (lastShown && Date.now() - lastShown < AUTO_COOLDOWN) return;
        } catch {
            // Storage may be disabled; show the guide for this page session.
        }

        frame = window.requestAnimationFrame(() => startTour(true));
        return () => window.cancelAnimationFrame(frame);
    }, [startTour, steps.length, storageKey]);

    useEffect(() => {
        if (!open) return;

        updateRect();
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setOpen(false);
        };
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect, true);
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('resize', updateRect);
            window.removeEventListener('scroll', updateRect, true);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open, updateRect]);

    const goTo = (direction: -1 | 1) => {
        let nextIndex = stepIndex + direction;
        while (nextIndex >= 0 && nextIndex < steps.length) {
            const target = getVisibleTarget(steps[nextIndex].target);
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                    inline: 'nearest',
                });
                setStepIndex(nextIndex);
                return;
            }
            nextIndex += direction;
        }
        setOpen(false);
    };

    const activeStep = steps[stepIndex];

    const tooltipPosition = useMemo(() => {
        if (!rect) return { top: 0, left: 0 };
        const width = Math.min(360, window.innerWidth - 32);
        const left = Math.min(
            Math.max(16, rect.left + rect.width / 2 - width / 2),
            window.innerWidth - width - 16,
        );
        const estimatedHeight = 210;
        const below = rect.top + rect.height + 16;
        const top =
            below + estimatedHeight <= window.innerHeight - 16
                ? below
                : Math.max(16, rect.top - estimatedHeight - 16);
        return { top, left };
    }, [rect]);

    if (!steps.length) return null;

    return (
        <>
            <button
                type="button"
                onClick={() => startTour(false)}
                aria-label="Buka panduan penggunaan"
                title="Panduan penggunaan"
                className="fixed right-4 bottom-20 z-[70] inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-lg transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none md:right-6 md:bottom-6"
            >
                <CircleHelp
                    aria-hidden="true"
                    className="size-5 text-blue-700"
                />
                <span>Panduan</span>
            </button>

            {open && activeStep && rect && (
                <>
                    <div
                        aria-hidden="true"
                        className="fixed inset-x-0 top-0 z-[80] bg-slate-950/65"
                        style={{ height: Math.max(0, rect.top - 8) }}
                    />
                    <div
                        aria-hidden="true"
                        className="fixed left-0 z-[80] bg-slate-950/65"
                        style={{
                            top: Math.max(0, rect.top - 8),
                            width: Math.max(0, rect.left - 8),
                            height: rect.height + 16,
                        }}
                    />
                    <div
                        aria-hidden="true"
                        className="fixed right-0 z-[80] bg-slate-950/65"
                        style={{
                            top: Math.max(0, rect.top - 8),
                            left: rect.left + rect.width + 8,
                            height: rect.height + 16,
                        }}
                    />
                    <div
                        aria-hidden="true"
                        className="fixed inset-x-0 bottom-0 z-[80] bg-slate-950/65"
                        style={{
                            top: rect.top + rect.height + 8,
                        }}
                    />
                    <div
                        aria-hidden="true"
                        className="pointer-events-none fixed z-[81] rounded-xl border-2 border-white shadow-[0_0_0_4px_rgba(37,99,235,0.9)]"
                        style={{
                            top: rect.top - 8,
                            left: rect.left - 8,
                            width: rect.width + 16,
                            height: rect.height + 16,
                        }}
                    />
                    <section
                        role="dialog"
                        aria-keyshortcuts="Escape"
                        aria-modal="true"
                        aria-labelledby="product-tour-title"
                        aria-describedby="product-tour-description"
                        className="fixed z-[90] w-[calc(100vw-2rem)] max-w-[360px] rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 shadow-2xl sm:p-5"
                        style={tooltipPosition}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-xs font-semibold tracking-wide text-blue-700 uppercase">
                                    Panduan {stepIndex + 1} dari {steps.length}
                                </p>
                                <h2
                                    id="product-tour-title"
                                    className="mt-1 text-base font-semibold"
                                >
                                    {activeStep.title}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                aria-label="Tutup panduan"
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                            >
                                <X aria-hidden="true" className="size-4" />
                            </button>
                        </div>
                        <p
                            id="product-tour-description"
                            className="mt-2 text-sm leading-6 text-slate-600"
                        >
                            {targetMissing
                                ? 'Kontrol ini tidak tersedia pada tampilan saat ini. Lanjutkan ke langkah berikutnya.'
                                : activeStep.description}
                        </p>
                        <div className="mt-4 flex items-center justify-between gap-2">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="rounded-lg px-2 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:outline-none"
                            >
                                Lewati
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => goTo(-1)}
                                    disabled={stepIndex === 0}
                                    className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-slate-200 px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    <ChevronLeft
                                        aria-hidden="true"
                                        className="size-4"
                                    />
                                    Kembali
                                </button>
                                <button
                                    type="button"
                                    onClick={() => goTo(1)}
                                    className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 focus-visible:outline-none"
                                >
                                    {stepIndex === steps.length - 1
                                        ? 'Selesai'
                                        : 'Lanjut'}
                                    {stepIndex < steps.length - 1 && (
                                        <ChevronRight
                                            aria-hidden="true"
                                            className="size-4"
                                        />
                                    )}
                                </button>
                            </div>
                        </div>
                    </section>
                </>
            )}
        </>
    );
}
