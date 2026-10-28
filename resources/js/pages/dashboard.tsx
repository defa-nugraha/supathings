import { Head, Link } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    Cpu,
    Droplets,
    Lightbulb,
    Plus,
    Sprout,
    Thermometer,
    Wifi,
} from 'lucide-react';
import { useEffect, useState } from 'react';

type Device = {
    id: number;
    name: string;
    status: string;
    last_seen_at: string | null;
    mac_address: string;
};
type Reading = {
    temperature: number | null;
    humidity: number | null;
    light_percent: number | null;
    measured_at: string;
};
type Batch = {
    id: number;
    name: string;
    baglog_count: number;
    phase: string;
    inoculated_at: string;
    total_harvest_kg?: number;
};
type Alert = {
    key: string;
    severity: string;
    title: string;
    message: string;
};

const dateTime = (value?: string | null) =>
    value
        ? new Date(value).toLocaleString('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
          })
        : 'Belum ada data';
const number = (value: number | null | undefined) =>
    value == null
        ? '—'
        : new Intl.NumberFormat('id-ID', {
              maximumFractionDigits: 1,
          }).format(value);

type DashboardMetric = {
    label: string;
    value: string;
    unit: string;
    Icon: typeof Thermometer;
};

function DashboardMobile({
    devices,
    batches,
    alerts,
    loading,
    error,
    metrics,
    fresh,
    measuredAt,
}: {
    devices: Device[];
    batches: Batch[];
    alerts: Alert[];
    loading: boolean;
    error: string;
    metrics: DashboardMetric[];
    fresh: boolean;
    measuredAt?: string;
}) {
    const onlineCount = devices.filter(
        (device) => device.status === 'online',
    ).length;
    const activeBatches = batches.filter(
        (batch) => batch.phase !== 'completed',
    ).length;

    return (
        <main className="min-h-full bg-slate-50 px-4 pt-4 pb-5 lg:hidden">
            <div className="mx-auto max-w-xl space-y-5">
                <header className="space-y-3">
                    <div>
                        <p className="text-xs font-semibold tracking-wide text-blue-700">
                            SUPATHINGS · RINGKASAN
                        </p>
                        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                            Kondisi kumbung
                        </h1>
                        <p className="mt-1 text-sm leading-5 text-slate-500">
                            Pantau kondisi dan aktivitas budidaya hari ini.
                        </p>
                    </div>
                    <Link
                        href="/devices"
                        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-sm active:bg-blue-800"
                    >
                        <Plus className="size-4" />
                        Hubungkan perangkat
                    </Link>
                </header>

                {error && (
                    <div
                        role="alert"
                        className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                    >
                        {error}
                    </div>
                )}

                <section aria-labelledby="mobile-sensor-title">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <h2
                            id="mobile-sensor-title"
                            className="text-base font-semibold text-slate-900"
                        >
                            Sensor kumbung
                        </h2>
                        <span
                            className={
                                'rounded-full px-2.5 py-1 text-[11px] font-semibold ' +
                                (fresh
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-slate-200 text-slate-600')
                            }
                        >
                            {fresh ? 'Data terbaru' : 'Belum diperbarui'}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {metrics.map(({ label, value, unit, Icon }, index) => (
                            <article
                                key={label}
                                className={
                                    'min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ' +
                                    (index === 0 ? 'col-span-2' : '')
                                }
                            >
                                <div className="flex items-center gap-2 text-slate-500">
                                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                                        <Icon className="size-5" />
                                    </span>
                                    <p className="text-xs font-medium leading-4">
                                        {label}
                                    </p>
                                </div>
                                <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                                    {value}
                                    <span className="ml-1 text-sm font-medium text-slate-500">
                                        {unit}
                                    </span>
                                </p>
                                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                                    {fresh && measuredAt
                                        ? 'Diperbarui ' + dateTime(measuredAt)
                                        : 'Menunggu pembacaan sensor yang terbaru'}
                                </p>
                            </article>
                        ))}
                    </div>
                </section>

                <section
                    aria-label="Ringkasan aktivitas"
                    className="grid grid-cols-3 gap-2"
                >
                    <Link
                        href="/devices"
                        className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 active:bg-slate-50"
                    >
                        <Wifi className="size-4 text-blue-700" />
                        <p className="mt-2 text-xl font-bold text-slate-900">
                            {onlineCount}
                            <span className="text-xs font-medium text-slate-500">
                                /{devices.length}
                            </span>
                        </p>
                        <p className="text-[11px] leading-4 text-slate-500">
                            Perangkat online
                        </p>
                    </Link>
                    <Link
                        href="/cultivation"
                        className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 active:bg-slate-50"
                    >
                        <Sprout className="size-4 text-emerald-700" />
                        <p className="mt-2 text-xl font-bold text-slate-900">
                            {activeBatches}
                        </p>
                        <p className="text-[11px] leading-4 text-slate-500">
                            Batch aktif
                        </p>
                    </Link>
                    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
                        <AlertTriangle className="size-4 text-amber-600" />
                        <p className="mt-2 text-xl font-bold text-slate-900">
                            {alerts.length}
                        </p>
                        <p className="text-[11px] leading-4 text-slate-500">
                            Peringatan
                        </p>
                    </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4">
                        <div>
                            <h2 className="font-semibold text-slate-900">
                                Perangkat
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Status koneksi sensor
                            </p>
                        </div>
                        <Link
                            href="/devices"
                            className="flex min-h-10 items-center rounded-lg px-2 text-xs font-semibold text-blue-700"
                        >
                            Lihat semua
                        </Link>
                    </div>
                    {loading ? (
                        <p className="p-4 text-sm text-slate-500">
                            Memuat perangkat…
                        </p>
                    ) : devices.length === 0 ? (
                        <div className="p-4">
                            <p className="text-sm text-slate-600">
                                Belum ada perangkat yang terhubung.
                            </p>
                            <Link
                                href="/devices"
                                className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-blue-700"
                            >
                                Hubungkan ESP32
                            </Link>
                        </div>
                    ) : (
                        <ul className="divide-y divide-slate-100">
                            {devices.slice(0, 4).map((device) => (
                                <li
                                    key={device.id}
                                    className="flex min-w-0 items-center justify-between gap-3 p-4"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <span
                                            className={
                                                'grid size-10 shrink-0 place-items-center rounded-xl ' +
                                                (device.status === 'online'
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-amber-50 text-amber-700')
                                            }
                                        >
                                            <Cpu className="size-5" />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-slate-900">
                                                {device.name}
                                            </p>
                                            <p className="truncate text-xs text-slate-500">
                                                {dateTime(device.last_seen_at)}
                                            </p>
                                        </div>
                                    </div>
                                    <span
                                        className={
                                            'shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ' +
                                            (device.status === 'online'
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-amber-50 text-amber-700')
                                        }
                                    >
                                        {device.status === 'online'
                                            ? 'Online'
                                            : 'Offline'}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="font-semibold text-slate-900">
                                Peringatan terbaru
                            </h2>
                            <p className="mt-0.5 text-xs text-slate-500">
                                Kondisi yang perlu diperhatikan
                            </p>
                        </div>
                        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                            {alerts.length}
                        </span>
                    </div>
                    {alerts.length ? (
                        <ul className="mt-3 space-y-2">
                            {alerts.slice(0, 3).map((alert) => (
                                <li
                                    key={alert.key}
                                    className="rounded-xl bg-amber-50 p-3"
                                >
                                    <p className="text-sm font-semibold text-amber-900">
                                        {alert.title}
                                    </p>
                                    <p className="mt-1 text-xs leading-5 text-amber-800">
                                        {alert.message}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-3 text-sm leading-5 text-slate-500">
                            Tidak ada peringatan aktif berdasarkan data yang
                            tersimpan.
                        </p>
                    )}
                </section>

                <Link
                    href="/monitoring"
                    className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 active:bg-slate-50"
                >
                    <Activity className="size-4 text-blue-700" />
                    Buka monitoring lengkap
                </Link>
            </div>
        </main>
    );
}

export default function Dashboard() {
    const [devices, setDevices] = useState<Device[]>([]);
    const [readings, setReadings] = useState<Reading[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;
        const load = async () => {
            try {
                const responses = await Promise.all([
                    fetch('/api/devices', {
                        headers: { Accept: 'application/json' },
                    }),
                    fetch('/api/cultivation/batches', {
                        headers: { Accept: 'application/json' },
                    }),
                    fetch('/api/cultivation/alerts', {
                        headers: { Accept: 'application/json' },
                    }),
                ]);
                if (!responses.every((response) => response.ok)) {
                    throw new Error('Data dashboard belum dapat dimuat.');
                }

                const [devicePayload, batchPayload, alertPayload] =
                    await Promise.all(
                        responses.map((response) => response.json()),
                    );
                if (!active) return;

                const list: Device[] = devicePayload.data ?? [];
                setDevices(list);
                setBatches(batchPayload.data ?? []);
                setAlerts(alertPayload.data ?? []);

                const device =
                    list.find((item) => item.status === 'online') ?? list[0];
                if (device) {
                    const response = await fetch(
                        '/api/devices/' +
                            encodeURIComponent(device.mac_address) +
                            '/readings',
                        { headers: { Accept: 'application/json' } },
                    );
                    const payload = response.ok
                        ? await response.json()
                        : { data: [] };
                    if (active) setReadings(payload.data ?? []);
                } else if (active) {
                    setReadings([]);
                }

                if (active) setError('');
            } catch (cause) {
                if (active) {
                    setError(
                        cause instanceof Error
                            ? cause.message
                            : 'Gagal memuat data.',
                    );
                }
            } finally {
                if (active) setLoading(false);
            }
        };

        void load();
        const timer = window.setInterval(() => void load(), 30000);
        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, []);

    const latest = readings[0];
    const measuredAt = latest
        ? new Date(latest.measured_at).getTime()
        : Number.NaN;
    const fresh =
        !!latest &&
        Number.isFinite(measuredAt) &&
        Date.now() - measuredAt <= 5 * 60 * 1000;
    const metrics = [
        {
            label: 'Suhu kumbung',
            value: fresh ? number(latest?.temperature) : '—',
            unit: '°C',
            Icon: Thermometer,
        },
        {
            label: 'Kelembapan udara',
            value: fresh ? number(latest?.humidity) : '—',
            unit: '%',
            Icon: Droplets,
        },
        {
            label: 'Intensitas cahaya',
            value: fresh ? number(latest?.light_percent) : '—',
            unit: '%',
            Icon: Lightbulb,
        },
    ];

    return (
        <>
            <Head title="Dashboard" />
            <DashboardMobile
                devices={devices}
                batches={batches}
                alerts={alerts}
                loading={loading}
                error={error}
                metrics={metrics}
                fresh={fresh}
                measuredAt={latest?.measured_at}
            />
            <div className="hidden lg:block">
            <main className="min-h-full bg-slate-50 px-4 py-6 md:px-8 md:py-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <header className="flex flex-wrap items-end justify-between gap-4">
                        <div>
                            <p className="text-sm text-slate-500">
                                Supathings / Dashboard
                            </p>
                            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                                Ringkasan kumbung
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Data berasal dari sensor dan catatan budidaya,
                                bukan nilai contoh.
                            </p>
                        </div>
                        <Link
                            href="/devices"
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white"
                        >
                            <Plus className="size-4" />
                            Hubungkan perangkat
                        </Link>
                    </header>

                    {error && (
                        <div
                            role="alert"
                            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                        >
                            {error}
                        </div>
                    )}

                    <section className="grid gap-4 sm:grid-cols-3">
                        {metrics.map(({ label, value, unit, Icon }) => (
                            <article
                                key={label}
                                className="rounded-2xl border bg-white p-5 shadow-sm"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-slate-500">
                                        {label}
                                    </p>
                                    <Icon className="size-5 text-blue-700" />
                                </div>
                                <p className="mt-4 text-3xl font-semibold">
                                    {value}{' '}
                                    <span className="text-sm font-normal text-slate-500">
                                        {unit}
                                    </span>
                                </p>
                                <p className="mt-2 text-xs text-slate-500">
                                    {fresh
                                        ? 'Pembacaan ' +
                                          dateTime(latest?.measured_at)
                                        : 'Data belum tersedia atau lebih dari 5 menit'}
                                </p>
                            </article>
                        ))}
                    </section>

                    <section className="grid gap-4 md:grid-cols-3">
                        <article className="rounded-2xl border bg-white p-5">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Wifi className="size-4" />
                                Perangkat online
                            </div>
                            <p className="mt-3 text-3xl font-semibold">
                                {
                                    devices.filter(
                                        (device) => device.status === 'online',
                                    ).length
                                }{' '}
                                <span className="text-sm font-normal text-slate-500">
                                    / {devices.length}
                                </span>
                            </p>
                            <Link
                                href="/devices"
                                className="mt-3 inline-block text-sm font-semibold text-blue-700"
                            >
                                Kelola perangkat →
                            </Link>
                        </article>
                        <article className="rounded-2xl border bg-white p-5">
                            <div className="flex items-center gap-2 text-slate-500">
                                <Activity className="size-4" />
                                Batch aktif
                            </div>
                            <p className="mt-3 text-3xl font-semibold">
                                {
                                    batches.filter(
                                        (batch) => batch.phase !== 'completed',
                                    ).length
                                }
                            </p>
                            <Link
                                href="/cultivation"
                                className="mt-3 inline-block text-sm font-semibold text-blue-700"
                            >
                                Buka budidaya →
                            </Link>
                        </article>
                        <article className="rounded-2xl border bg-white p-5">
                            <div className="flex items-center gap-2 text-slate-500">
                                <AlertTriangle className="size-4" />
                                Peringatan aktif
                            </div>
                            <p className="mt-3 text-3xl font-semibold">
                                {alerts.length}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                                Perangkat offline atau sensor di luar ambang
                            </p>
                        </article>
                    </section>

                    <section className="rounded-2xl border bg-white p-5">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="text-lg font-semibold">
                                    Status perangkat
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Pembaruan otomatis setiap 30 detik.
                                </p>
                            </div>
                            <Link
                                href="/monitoring"
                                className="text-sm font-semibold text-blue-700"
                            >
                                Buka monitoring →
                            </Link>
                        </div>
                        {loading ? (
                            <p className="py-8 text-sm text-slate-500">
                                Memuat data...
                            </p>
                        ) : devices.length === 0 ? (
                            <p className="py-8 text-sm text-slate-500">
                                Belum ada perangkat. Hubungkan ESP32 untuk mulai
                                memantau kumbung.
                            </p>
                        ) : (
                            <div className="mt-4 divide-y">
                                {devices.map((device) => (
                                    <div
                                        key={device.id}
                                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                                    >
                                        <div>
                                            <p className="font-medium">
                                                {device.name}
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                {device.mac_address} · Terakhir
                                                aktif:{' '}
                                                {dateTime(device.last_seen_at)}
                                            </p>
                                        </div>
                                        <span
                                            className={
                                                'rounded-full px-3 py-1 text-xs font-semibold ' +
                                                (device.status === 'online'
                                                    ? 'bg-emerald-50 text-emerald-700'
                                                    : 'bg-amber-50 text-amber-700')
                                            }
                                        >
                                            {device.status === 'online'
                                                ? 'Online'
                                                : 'Offline'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="rounded-2xl border bg-white p-5">
                        <h2 className="text-lg font-semibold">
                            Peringatan terbaru
                        </h2>
                        {alerts.length ? (
                            <ul className="mt-3 space-y-2">
                                {alerts.slice(0, 5).map((alert) => (
                                    <li
                                        key={alert.key}
                                        className="rounded-xl bg-amber-50 p-3"
                                    >
                                        <p className="font-medium text-amber-900">
                                            {alert.title}
                                        </p>
                                        <p className="text-sm text-amber-800">
                                            {alert.message}
                                        </p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="mt-2 text-sm text-slate-500">
                                Tidak ada peringatan aktif berdasarkan data yang
                                tersimpan.
                            </p>
                        )}
                    </section>
                </div>
            </main>
            </div>
        </>
    );
}

Dashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: '/dashboard' }],
};
