import { Head, Link } from '@inertiajs/react';
import { Activity, AlertTriangle, Droplets, Lightbulb, Plus, Thermometer, Wifi } from 'lucide-react';
import { useEffect, useState } from 'react';

type Device = { id: number; name: string; status: string; last_seen_at: string | null; mac_address: string };
type Reading = { temperature: number | null; humidity: number | null; light_percent: number | null; measured_at: string };
type Batch = { id: number; name: string; baglog_count: number; phase: string; inoculated_at: string; total_harvest_kg?: number };
type Alert = { key: string; severity: string; title: string; message: string };
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum ada data';
const number = (value: number | null | undefined) => value == null ? '—' : new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value);

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
                    fetch('/api/devices', { headers: { Accept: 'application/json' } }),
                    fetch('/api/cultivation/batches', { headers: { Accept: 'application/json' } }),
                    fetch('/api/cultivation/alerts', { headers: { Accept: 'application/json' } }),
                ]);
                if (!responses.every(response => response.ok)) throw new Error('Data dashboard belum dapat dimuat.');
                const [devicePayload, batchPayload, alertPayload] = await Promise.all(responses.map(response => response.json()));
                if (!active) return;
                const list: Device[] = devicePayload.data ?? [];
                setDevices(list); setBatches(batchPayload.data ?? []); setAlerts(alertPayload.data ?? []);
                const device = list.find(item => item.status === 'online') ?? list[0];
                if (device) {
                    const response = await fetch('/api/devices/' + encodeURIComponent(device.mac_address) + '/readings', { headers: { Accept: 'application/json' } });
                    const payload = response.ok ? await response.json() : { data: [] };
                    if (active) setReadings(payload.data ?? []);
                } else if (active) setReadings([]);
                if (active) setError('');
            } catch (cause) {
                if (active) setError(cause instanceof Error ? cause.message : 'Gagal memuat data.');
            } finally { if (active) setLoading(false); }
        };
        void load();
        const timer = window.setInterval(() => void load(), 30000);
        return () => { active = false; window.clearInterval(timer); };
    }, []);
    const latest = readings[0];
    const fresh = !!latest && Number.isFinite(new Date(latest.measured_at).getTime()) && Date.now() - new Date(latest.measured_at).getTime() <= 5 * 60 * 1000;
    const metrics = [
        { label: 'Suhu kumbung', value: fresh ? number(latest?.temperature) : '—', unit: '°C', Icon: Thermometer },
        { label: 'Kelembapan udara', value: fresh ? number(latest?.humidity) : '—', unit: '%', Icon: Droplets },
        { label: 'Intensitas cahaya', value: fresh ? number(latest?.light_percent) : '—', unit: '%', Icon: Lightbulb },
    ];
    return <>
        <Head title="Dashboard" />
        <main className="min-h-full bg-slate-50 px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <header className="flex flex-wrap items-end justify-between gap-4">
                    <div><p className="text-sm text-slate-500">Supathings / Dashboard</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Ringkasan kumbung</h1><p className="mt-1 text-sm text-slate-500">Data berasal dari sensor dan catatan budidaya, bukan nilai contoh.</p></div>
                    <Link href="/devices" className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white"><Plus className="size-4" /> Hubungkan perangkat</Link>
                </header>
                {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
                <section className="grid gap-4 sm:grid-cols-3">
                    {metrics.map(({label,value,unit,Icon}) => <article key={label} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm text-slate-500">{label}</p><Icon className="size-5 text-blue-700" /></div><p className="mt-4 text-3xl font-semibold">{value} <span className="text-sm font-normal text-slate-500">{unit}</span></p><p className="mt-2 text-xs text-slate-500">{fresh ? 'Pembacaan ' + dateTime(latest?.measured_at) : 'Data belum tersedia atau lebih dari 5 menit'}</p></article>)}
                </section>
                <section className="grid gap-4 md:grid-cols-3">
                    <article className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 text-slate-500"><Wifi className="size-4" /> Perangkat online</div><p className="mt-3 text-3xl font-semibold">{devices.filter(d => d.status === 'online').length} <span className="text-sm font-normal text-slate-500">/ {devices.length}</span></p><Link href="/devices" className="mt-3 inline-block text-sm font-semibold text-blue-700">Kelola perangkat →</Link></article>
                    <article className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 text-slate-500"><Activity className="size-4" /> Batch aktif</div><p className="mt-3 text-3xl font-semibold">{batches.filter(b => b.phase !== 'completed').length}</p><Link href="/cultivation" className="mt-3 inline-block text-sm font-semibold text-blue-700">Buka budidaya →</Link></article>
                    <article className="rounded-2xl border bg-white p-5"><div className="flex items-center gap-2 text-slate-500"><AlertTriangle className="size-4" /> Peringatan aktif</div><p className="mt-3 text-3xl font-semibold">{alerts.length}</p><p className="mt-2 text-xs text-slate-500">Perangkat offline atau sensor di luar ambang</p></article>
                </section>
                <section className="rounded-2xl border bg-white p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Status perangkat</h2><p className="text-sm text-slate-500">Pembaruan otomatis setiap 30 detik.</p></div><Link href="/monitoring" className="text-sm font-semibold text-blue-700">Buka monitoring →</Link></div>
                    {loading ? <p className="py-8 text-sm text-slate-500">Memuat data...</p> : devices.length === 0 ? <p className="py-8 text-sm text-slate-500">Belum ada perangkat. Hubungkan ESP32 untuk mulai memantau kumbung.</p> : <div className="mt-4 divide-y">{devices.map(d => <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-medium">{d.name}</p><p className="text-xs text-slate-500">{d.mac_address} · Terakhir aktif: {dateTime(d.last_seen_at)}</p></div><span className={'rounded-full px-3 py-1 text-xs font-semibold ' + (d.status === 'online' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{d.status === 'online' ? 'Online' : 'Offline'}</span></div>)}</div>}
                </section>
                <section className="rounded-2xl border bg-white p-5"><h2 className="text-lg font-semibold">Peringatan terbaru</h2>{alerts.length ? <ul className="mt-3 space-y-2">{alerts.slice(0,5).map(a => <li key={a.key} className="rounded-xl bg-amber-50 p-3"><p className="font-medium text-amber-900">{a.title}</p><p className="text-sm text-amber-800">{a.message}</p></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">Tidak ada peringatan aktif berdasarkan data yang tersimpan.</p>}</section>
            </div>
        </main>
    </>;
}
Dashboard.layout = { breadcrumbs: [{ title: 'Dashboard', href: '/dashboard' }] };
