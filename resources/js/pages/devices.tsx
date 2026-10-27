import { Head } from '@inertiajs/react';
import {
    Check,
    Clock3,
    Cpu,
    Link2,
    Plus,
    Radio,
    RefreshCw,
    Search,
    Signal,
    Trash2,
    Wifi,
    X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

type Device = {
    id: string;
    name: string;
    status: 'online' | 'offline';
    lastSeen: string;
    sensors: string[];
};
const seedDevices: Device[] = [
    {
        id: 'AA:BB:CC:DD:EE:FF',
        name: 'Kumbung Utama',
        status: 'online',
        lastSeen: 'Baru saja',
        sensors: ['DHT22', 'LDR'],
    },
];

export default function Devices() {
    const [devices, setDevices] = useState<Device[]>(seedDevices);
    const [discovered, setDiscovered] = useState<Device[]>([]);
    const [scanning, setScanning] = useState(false);
    const [selected, setSelected] = useState<Device | null>(null);
    const [deviceName, setDeviceName] = useState('');
    const [query, setQuery] = useState('');
    const [notice, setNotice] = useState('');
    const [issuedToken, setIssuedToken] = useState('');
    const socket = useRef<WebSocket | null>(null);
    const [wsStatus, setWsStatus] = useState<'connected' | 'offline'>(
        'offline',
    );

    useEffect(() => {
        void fetch('/api/devices', { headers: { Accept: 'application/json' } })
            .then((response) => (response.ok ? response.json() : null))
            .then((payload) => {
                if (Array.isArray(payload?.data))
                    setDevices(
                        payload.data.map(
                            (d: {
                                mac_address: string;
                                name: string;
                                status: string;
                                last_seen_at?: string | null;
                                metadata?: { sensors?: string[] };
                            }) => ({
                                id: d.mac_address,
                                name: d.name,
                                status:
                                    d.status === 'online'
                                        ? 'online'
                                        : 'offline',
                                lastSeen: d.last_seen_at
                                    ? new Date(d.last_seen_at).toLocaleString(
                                          'id-ID',
                                      )
                                    : 'Belum pernah terhubung',
                                sensors: d.metadata?.sensors ?? [
                                    'DHT22',
                                    'LDR',
                                ],
                            }),
                        ),
                    );
            })
            .catch(() => undefined);
        const url = import.meta.env.VITE_WS_URL as string | undefined;
        if (!url) return;
        try {
            const ws = new WebSocket(url);
            socket.current = ws;
            ws.onopen = () => setWsStatus('connected');
            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (
                        message.type === 'device_discovered' &&
                        typeof message.device_id === 'string'
                    ) {
                        const item: Device = {
                            id: message.device_id.toUpperCase(),
                            name: message.name || 'ESP32 belum diberi nama',
                            status: 'online',
                            lastSeen: 'Baru saja',
                            sensors: message.sensors || ['DHT22', 'LDR'],
                        };
                        setDiscovered((prev) =>
                            prev.some((d) => d.id === item.id)
                                ? prev.map((d) => (d.id === item.id ? item : d))
                                : [...prev, item],
                        );
                    }
                    if (
                        message.type === 'device_presence' &&
                        typeof message.device_id === 'string'
                    ) {
                        setDevices((prev) =>
                            prev.map((d) =>
                                d.id === message.device_id
                                    ? {
                                          ...d,
                                          status: message.online
                                              ? 'online'
                                              : 'offline',
                                          lastSeen: message.online
                                              ? 'Baru saja'
                                              : 'Tidak terhubung',
                                      }
                                    : d,
                            ),
                        );
                    }
                } catch {
                    /* Ignore malformed device announcements. */
                }
            };
            ws.onclose = () => setWsStatus('offline');
            ws.onerror = () => setWsStatus('offline');
            return () => ws.close();
        } catch {
            setWsStatus('offline');
        }
    }, []);

    const scan = () => {
        setScanning(true);
        setNotice('');
        if (socket.current?.readyState === WebSocket.OPEN) {
            socket.current.send(JSON.stringify({ type: 'discover_devices' }));
        }
        window.setTimeout(() => {
            setScanning(false);
            if (discovered.length === 0)
                setNotice(
                    'Belum ada perangkat yang mengumumkan diri. Pastikan ESP32 terhubung ke jaringan dan endpoint WebSocket aktif.',
                );
        }, 5000);
    };
    const register = async () => {
        if (!selected || !deviceName.trim()) return;
        let token = '';
        try {
            const response = await fetch('/api/devices', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN':
                        document.querySelector<HTMLMetaElement>(
                            'meta[name="csrf-token"]',
                        )?.content ?? '',
                },
                body: JSON.stringify({
                    device_id: selected.id,
                    name: deviceName.trim(),
                    sensors: selected.sensors,
                }),
            });
            const payload = await response.json();
            if (!response.ok)
                throw new Error(payload.message || 'Registrasi device gagal.');
            token = payload.device_token || '';
        } catch (error) {
            setNotice(
                error instanceof Error
                    ? error.message
                    : 'Tidak dapat menyimpan device. Coba lagi.',
            );
            return;
        }
        setIssuedToken(token);
        setDevices((prev) =>
            prev.some((d) => d.id === selected.id)
                ? prev.map((d) =>
                      d.id === selected.id
                          ? { ...selected, name: deviceName.trim() }
                          : d,
                  )
                : [{ ...selected, name: deviceName.trim() }, ...prev],
        );
        setDiscovered((prev) => prev.filter((d) => d.id !== selected.id));
        setSelected(null);
        setDeviceName('');
        setNotice(
            'Perangkat berhasil didaftarkan. Simpan token device yang baru diterbitkan untuk konfigurasi ESP32.',
        );
    };
    const visibleDevices = devices.filter((d) =>
        `${d.name} ${d.id}`.toLowerCase().includes(query.toLowerCase()),
    );

    return (
        <>
            <Head title="Kelola device" />
            <div className="min-h-full bg-[#f6f8fb] px-4 py-6 md:px-8 md:py-8">
                <div className="mx-auto max-w-[1440px] space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                                <span>Supathings</span>
                                <span>/</span>
                                <span>Kelola device</span>
                            </div>
                            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                                Kelola device
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Hubungkan ESP32, beri nama perangkat, dan pantau
                                status koneksi.
                            </p>
                        </div>
                        <button
                            onClick={scan}
                            disabled={scanning}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-60"
                        >
                            {scanning ? (
                                <RefreshCw className="size-4 animate-spin" />
                            ) : (
                                <Plus className="size-4" />
                            )}
                            {scanning ? 'Mencari perangkat…' : 'Tambah device'}
                        </button>
                    </div>
                    {notice && (
                        <div className="flex items-start justify-between gap-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                            <span>{notice}</span>
                            <button onClick={() => setNotice('')}>
                                <X className="size-4" />
                            </button>
                        </div>
                    )}
                    {issuedToken && (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                            <div className="flex items-start gap-3">
                                <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-amber-700">
                                    <Link2 className="size-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-slate-800">
                                        Token device — tampil sekali
                                    </p>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                        Salin token ini ke konfigurasi ESP32
                                        untuk autentikasi pengiriman telemetry.
                                        Token tidak disimpan dalam bentuk teks
                                        biasa oleh server.
                                    </p>
                                    <code className="mt-3 block rounded-lg border border-amber-100 bg-white p-3 text-xs break-all text-slate-700">
                                        {issuedToken}
                                    </code>
                                    <div className="mt-3 flex gap-2">
                                        <button
                                            onClick={() => {
                                                void navigator.clipboard?.writeText(
                                                    issuedToken,
                                                );
                                            }}
                                            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                                        >
                                            Salin token
                                        </button>
                                        <button
                                            onClick={() => setIssuedToken('')}
                                            className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                                        >
                                            Sembunyikan
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="grid gap-4 md:grid-cols-3">
                        {[
                            {
                                label: 'Total device',
                                value: devices.length,
                                Icon: Cpu,
                                tint: 'bg-blue-50 text-blue-700',
                            },
                            {
                                label: 'Online',
                                value: devices.filter(
                                    (d) => d.status === 'online',
                                ).length,
                                Icon: Wifi,
                                tint: 'bg-emerald-50 text-emerald-700',
                            },
                            {
                                label: 'Offline',
                                value: devices.filter(
                                    (d) => d.status === 'offline',
                                ).length,
                                Icon: Signal,
                                tint: 'bg-slate-100 text-slate-500',
                            },
                        ].map((item) => (
                            <div
                                key={item.label}
                                className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5"
                            >
                                <div
                                    className={`grid size-11 place-items-center rounded-xl ${item.tint}`}
                                >
                                    <item.Icon className="size-5" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-500">
                                        {item.label}
                                    </p>
                                    <p className="mt-0.5 text-2xl font-semibold text-slate-900">
                                        {item.value}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {scanning && (
                        <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
                            <div className="flex items-start gap-3">
                                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
                                    <Radio className="size-5 animate-pulse" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="font-semibold text-slate-900">
                                        Mencari ESP32 di jaringan
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">
                                        Halaman menunggu pengumuman perangkat
                                        melalui WebSocket. Pastikan ESP32 dan
                                        server menggunakan endpoint yang sama.
                                    </p>
                                    {discovered.length > 0 && (
                                        <div className="mt-4 space-y-2">
                                            {discovered.map((d) => (
                                                <div
                                                    key={d.id}
                                                    className="flex flex-col gap-3 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-semibold text-slate-800">
                                                            {d.name}
                                                        </p>
                                                        <p className="mt-1 font-mono text-xs text-slate-500">
                                                            {d.id}
                                                        </p>
                                                    </div>
                                                    <span className="text-xs text-emerald-700">
                                                        Terdeteksi
                                                    </span>
                                                    <button
                                                        onClick={() => {
                                                            setSelected(d);
                                                            setDeviceName(
                                                                d.name ===
                                                                    'ESP32 belum diberi nama'
                                                                    ? ''
                                                                    : d.name,
                                                            );
                                                        }}
                                                        className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                                                    >
                                                        Pilih device
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>
                    )}
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2 className="font-semibold text-slate-900">
                                    Perangkat terdaftar
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Identitas perangkat menggunakan MAC address
                                    ESP32.
                                </p>
                            </div>
                            <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
                                <Search className="size-4 text-slate-400" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Cari nama atau MAC address"
                                    className="w-full bg-transparent text-sm outline-none sm:w-56"
                                />
                            </label>
                        </div>
                        {visibleDevices.length === 0 ? (
                            <div className="p-12 text-center">
                                <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                                    <Cpu className="size-6" />
                                </div>
                                <h3 className="mt-4 font-semibold text-slate-900">
                                    Belum ada device
                                </h3>
                                <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
                                    Klik Tambah device untuk mencari ESP32 yang
                                    sedang terhubung.
                                </p>
                                <button
                                    onClick={scan}
                                    className="mt-4 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white"
                                >
                                    Cari device
                                </button>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100">
                                {visibleDevices.map((device) => (
                                    <div
                                        key={device.id}
                                        className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"
                                    >
                                        <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-600">
                                            <Cpu className="size-5" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-semibold text-slate-900">
                                                    {device.name}
                                                </h3>
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${device.status === 'online' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                                                >
                                                    <span
                                                        className={`size-1.5 rounded-full ${device.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'}`}
                                                    />
                                                    {device.status === 'online'
                                                        ? 'Online'
                                                        : 'Offline'}
                                                </span>
                                            </div>
                                            <p className="mt-1 font-mono text-xs text-slate-500">
                                                {device.id}
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {device.sensors.map(
                                                    (sensor) => (
                                                        <span
                                                            key={sensor}
                                                            className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600"
                                                        >
                                                            {sensor}
                                                        </span>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <Clock3 className="size-4" />
                                            {device.lastSeen}
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelected(device);
                                                setDeviceName(device.name);
                                            }}
                                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                                        >
                                            Ubah nama
                                        </button>
                                        <button
                                            onClick={() =>
                                                setDevices((prev) =>
                                                    prev.filter(
                                                        (d) =>
                                                            d.id !== device.id,
                                                    ),
                                                )
                                            }
                                            title="Hapus dari daftar"
                                            className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                                        >
                                            <Trash2 className="size-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                    <div className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4">
                        <Link2 className="mt-0.5 size-5 shrink-0 text-blue-700" />
                        <div>
                            <p className="text-sm font-semibold text-slate-800">
                                Cara menghubungkan perangkat
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                ESP32 perlu mengirim pesan{' '}
                                <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">
                                    device_discovered
                                </code>{' '}
                                berisi MAC address melalui WebSocket. Setelah
                                perangkat dipilih, aplikasi mengirim registrasi
                                ke server. Koneksi WebSocket yang aktif ditandai
                                di header halaman monitoring.
                            </p>
                            <p className="mt-2 text-xs text-slate-400">
                                Status transport:{' '}
                                {wsStatus === 'connected'
                                    ? 'WebSocket terhubung'
                                    : 'WebSocket belum terhubung'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            {selected && (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setSelected(null);
                    }}
                >
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex items-start justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    {devices.some((d) => d.id === selected.id)
                                        ? 'Ubah nama device'
                                        : 'Daftarkan device'}
                                </h2>
                                <p className="mt-1 font-mono text-xs text-slate-500">
                                    {selected.id}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelected(null)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                        <label className="block text-sm font-medium text-slate-700">
                            Nama device
                            <input
                                autoFocus
                                value={deviceName}
                                onChange={(e) => setDeviceName(e.target.value)}
                                placeholder="Contoh: Kumbung Utama"
                                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            />
                        </label>
                        <div className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                            Sensor terdeteksi: {selected.sensors.join(', ')}
                        </div>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={() => setSelected(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
                            >
                                Batal
                            </button>
                            <button
                                disabled={!deviceName.trim()}
                                onClick={() => void register()}
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                <Check className="size-4" />
                                Simpan device
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
