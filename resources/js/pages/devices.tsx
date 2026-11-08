import { Head } from '@inertiajs/react';
import {
    Check,
    Clock3,
    Copy,
    Cpu,
    Eye,
    KeyRound,
    Link2,
    Plus,
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
const seedDevices: Device[] = [];

export default function Devices() {
    const [devices, setDevices] = useState<Device[]>(seedDevices);
    const [discovered, setDiscovered] = useState<Device[]>([]);
    const [scanning, setScanning] = useState(false);
    const [selected, setSelected] = useState<Device | null>(null);
    const [pendingDelete, setPendingDelete] = useState<Device | null>(null);
    const [deviceName, setDeviceName] = useState('');
    const [query, setQuery] = useState('');
    const [notice, setNotice] = useState('');
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [selectedDiscovered, setSelectedDiscovered] = useState<Device | null>(
        null,
    );
    const [formError, setFormError] = useState('');
    const [registering, setRegistering] = useState(false);
    const [connectionDevice, setConnectionDevice] = useState<Device | null>(
        null,
    );
    const [deviceTokens, setDeviceTokens] = useState<Record<string, string>>(
        {},
    );
    const [visibleTokens, setVisibleTokens] = useState<Set<string>>(
        new Set(),
    );
    const tokenRequests = useRef(new Set<string>());
    const [rotatingToken, setRotatingToken] = useState<string | null>(null);
    const [copyStatus, setCopyStatus] = useState('');
    const socket = useRef<WebSocket | null>(null);
    const [wsStatus, setWsStatus] = useState<'connected' | 'offline'>(
        'offline',
    );

    const loadDeviceToken = async (deviceId: string) => {
        if (tokenRequests.current.has(deviceId)) return;

        tokenRequests.current.add(deviceId);
        try {
            const response = await fetch(
                '/api/devices/' + encodeURIComponent(deviceId) + '/token',
                { headers: { Accept: 'application/json' } },
            );
            const payload = await response.json();

            if (response.ok && typeof payload.device_token === 'string') {
                setDeviceTokens((prev) => ({
                    ...prev,
                    [deviceId]: payload.device_token,
                }));
            }
        } catch {
            // Token status is intentionally non-blocking for device management.
        } finally {
            tokenRequests.current.delete(deviceId);
        }
    };

    const copyDeviceToken = async (deviceId: string) => {
        const token = deviceTokens[deviceId];
        if (!token) return;

        try {
            await navigator.clipboard.writeText(token);
            setCopyStatus(deviceId);
            window.setTimeout(
                () => setCopyStatus((current) => (current === deviceId ? '' : current)),
                2000,
            );
        } catch {
            setNotice('Clipboard tidak tersedia. Salin token secara manual.');
        }
    };

    const rotateDeviceToken = async (deviceId: string) => {
        const confirmed = window.confirm(
            'Regenerate token? Token lama akan langsung tidak berlaku dan ESP32 harus diperbarui menggunakan token baru.',
        );
        if (!confirmed) return;

        setRotatingToken(deviceId);
        try {
            const response = await fetch(
                '/api/devices/' +
                    encodeURIComponent(deviceId) +
                    '/token/rotate',
                {
                    method: 'POST',
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-TOKEN':
                            document.querySelector<HTMLMetaElement>(
                                'meta[name="csrf-token"]',
                            )?.content ?? '',
                    },
                },
            );
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.message || 'Token baru gagal dibuat.');
            }

            setDeviceTokens((prev) => ({
                ...prev,
                [deviceId]: payload.device_token,
            }));
            setVisibleTokens((prev) => new Set(prev).add(deviceId));
            setNotice('Token baru berhasil dibuat. Perbarui token pada ESP32.');
        } catch (error) {
            setNotice(
                error instanceof Error
                    ? error.message
                    : 'Token baru gagal dibuat.',
            );
        } finally {
            setRotatingToken(null);
        }
    };

    useEffect(() => {
        if (!isAddOpen || selectedDiscovered) return;

        const candidate = discovered.find(
            (item) => !devices.some((device) => device.id === item.id),
        );

        if (candidate) setSelectedDiscovered(candidate);
    }, [isAddOpen, discovered, devices, selectedDiscovered]);

    useEffect(() => {
        void fetch('/api/devices', { headers: { Accept: 'application/json' } })
            .then((response) => (response.ok ? response.json() : null))
            .then(async (payload) => {
                if (!Array.isArray(payload?.data)) return;

                const mappedDevices = payload.data.map(
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
                    );
                    setDevices(mappedDevices);
                    await Promise.all(
                        mappedDevices.map((device: Device) =>
                            loadDeviceToken(device.id),
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
                        if (!/^[0-9A-F]{2}(:[0-9A-F]{2}){5}$/.test(item.id))
                            return;
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
        if (socket.current?.readyState !== WebSocket.OPEN) {
            setWsStatus('offline');
            setFormError(
                'Koneksi WebSocket belum tersedia. Periksa VITE_WS_URL dan server discovery.',
            );
            return;
        }

        setFormError('');
        setScanning(true);
        socket.current.send(JSON.stringify({ type: 'discover_devices' }));
        window.setTimeout(() => setScanning(false), 5000);
    };

    const openAddDeviceModal = () => {
        setSelected(null);
        setSelectedDiscovered(
            discovered.find(
                (item) => !devices.some((device) => device.id === item.id),
            ) ?? null,
        );
        setDeviceName('');
        setFormError('');
        setIsAddOpen(true);
        scan();
    };

    const register = async () => {
        const isEditing = selected !== null;
        const targetMac = (selected?.id ?? selectedDiscovered?.id ?? '')
            .trim()
            .toUpperCase();

        if (!deviceName.trim()) {
            setFormError('Nama device wajib diisi.');
            return;
        }
        if (!isEditing && !targetMac) {
            setFormError(
                'Belum ada ESP32 yang terdeteksi. Hubungkan ESP32 ke jaringan lalu cari perangkat lagi.',
            );
            return;
        }

        setRegistering(true);
        setFormError('');

        try {
            const response = await fetch(
                isEditing
                    ? '/api/devices/' + encodeURIComponent(targetMac)
                    : '/api/devices',
                {
                    method: isEditing ? 'PATCH' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN':
                            document.querySelector<HTMLMetaElement>(
                                'meta[name="csrf-token"]',
                            )?.content ?? '',
                    },
                    body: JSON.stringify(
                        isEditing
                            ? { name: deviceName.trim() }
                            : {
                                  device_id: targetMac,
                                  name: deviceName.trim(),
                                  sensors: selectedDiscovered?.sensors ?? [
                                      'DHT22',
                                      'LDR',
                                  ],
                              },
                    ),
                },
            );
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.message || 'Registrasi device gagal.');
            }

            const savedDevice: Device = {
                id: targetMac,
                name: deviceName.trim(),
                status: isEditing ? selected.status : 'offline',
                lastSeen: isEditing
                    ? selected.lastSeen
                    : 'Belum pernah terhubung',
                sensors: selectedDiscovered?.sensors ??
                    selected?.sensors ?? ['DHT22', 'LDR'],
            };

            setDevices((prev) =>
                prev.some((item) => item.id === targetMac)
                    ? prev.map((item) =>
                          item.id === targetMac ? savedDevice : item,
                      )
                    : [savedDevice, ...prev],
            );

            if (isEditing) {
                setSelected(null);
                setNotice('Nama perangkat berhasil diperbarui.');
            } else {
                setIsAddOpen(false);
                setDeviceName('');
                setSelectedDiscovered(null);
                setDiscovered((prev) =>
                    prev.filter((item) => item.id !== targetMac),
                );
                setNotice(
                    'Perangkat berhasil didaftarkan. Token dapat dibuat dari menu Token & Hubungkan di Kelola device.',
                );
            }
        } catch (error) {
            setFormError(
                error instanceof Error
                    ? error.message
                    : 'Tidak dapat menyimpan device. Coba lagi.',
            );
        } finally {
            setRegistering(false);
        }
    };

    const openDeviceConnection = (device: Device) => {
        setConnectionDevice(device);
    };

    const deletePendingDevice = async () => {
        if (!pendingDelete) return;

        try {
            const response = await fetch(
                `/api/devices/${encodeURIComponent(pendingDelete.id)}`,
                {
                    method: 'DELETE',
                    headers: {
                        Accept: 'application/json',
                        'X-CSRF-TOKEN':
                            document.querySelector<HTMLMetaElement>(
                                'meta[name="csrf-token"]',
                            )?.content ?? '',
                    },
                },
            );
            const payload = await response.json();

            if (!response.ok) {
                throw new Error(payload.message ?? 'Perangkat gagal dihapus.');
            }

            setDevices((prev) =>
                prev.filter((item) => item.id !== pendingDelete.id),
            );
            setPendingDelete(null);
            setNotice('Perangkat berhasil dihapus dari akun.');
        } catch (cause) {
            setNotice(
                cause instanceof Error
                    ? cause.message
                    : 'Perangkat gagal dihapus.',
            );
        }
    };

    const visibleDevices = devices.filter((d) =>
        `${d.name} ${d.id}`.toLowerCase().includes(query.toLowerCase()),
    );
    const availableDiscovered = discovered.filter(
        (item) => !devices.some((device) => device.id === item.id),
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
                                Kelola identitas device, token API, dan koneksi ESP32.
                            </p>
                        </div>
                        <button
                            data-tour="devices-scan"
                            onClick={openAddDeviceModal}
                            disabled={registering}
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
                        <div
                            className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/40 p-4"
                            role="presentation"
                        >
                            <section
                                role="alertdialog"
                                aria-modal="true"
                                aria-labelledby="device-result-title"
                                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700">
                                        <Check className="size-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h2
                                            id="device-result-title"
                                            className="font-semibold text-slate-900"
                                        >
                                            Status aksi
                                        </h2>
                                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                                            {notice}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={() => setNotice('')}
                                        className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white"
                                    >
                                        Tutup
                                    </button>
                                </div>
                            </section>
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
                    <section
                        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                        aria-labelledby="device-token-title"
                    >
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2
                                    id="device-token-title"
                                    className="font-semibold text-slate-900"
                                >
                                    Token API device
                                </h2>
                                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                                    Token adalah kredensial Bearer yang digunakan
                                    ESP32 untuk mengirim telemetry dan mengambil
                                    perintah. Token tidak berubah sampai Anda
                                    memilih Regenerate.
                                </p>
                            </div>
                            <KeyRound className="hidden size-5 text-slate-400 sm:block" />
                        </div>

                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {devices.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500 md:col-span-2">
                                    Daftarkan device terlebih dahulu untuk
                                    mendapatkan token API.
                                </div>
                            ) : (
                                devices.map((device) => {
                                    const token = deviceTokens[device.id];
                                    const isVisible = visibleTokens.has(device.id);
                                    const isRotating = rotatingToken === device.id;

                                    return (
                                        <div
                                            key={device.id}
                                            className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-900">
                                                        {device.name}
                                                    </p>
                                                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                                                        {device.id}
                                                    </p>
                                                </div>
                                                <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                                                    API credential
                                                </span>
                                            </div>

                                            <div className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5">
                                                <KeyRound className="size-4 shrink-0 text-slate-400" />
                                                <code className="min-w-0 flex-1 truncate text-xs text-slate-700">
                                                    {token
                                                        ? isVisible
                                                            ? token
                                                            : token.slice(0, 8) + '••••••••' + token.slice(-4)
                                                        : 'Memuat token…'}
                                                </code>
                                                {token && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            setVisibleTokens((prev) => {
                                                                const next = new Set(prev);
                                                                if (next.has(device.id)) {
                                                                    next.delete(device.id);
                                                                } else {
                                                                    next.add(device.id);
                                                                }
                                                                return next;
                                                            })
                                                        }
                                                        className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                                                        title={isVisible ? 'Sembunyikan token' : 'Tampilkan token'}
                                                        aria-label={isVisible ? 'Sembunyikan token' : 'Tampilkan token'}
                                                    >
                                                        <Eye className="size-4" />
                                                    </button>
                                                )}
                                            </div>

                                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => void copyDeviceToken(device.id)}
                                                    disabled={!token}
                                                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
                                                >
                                                    <Copy className="size-3.5" />
                                                    {copyStatus === device.id
                                                        ? 'Tersalin'
                                                        : 'Copy token'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => void rotateDeviceToken(device.id)}
                                                    disabled={isRotating}
                                                    className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50"
                                                >
                                                    {isRotating ? (
                                                        <RefreshCw className="size-3.5 animate-spin" />
                                                    ) : (
                                                        <RefreshCw className="size-3.5" />
                                                    )}
                                                    Regenerate token
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openDeviceConnection(device)}
                                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                                                >
                                                    <Link2 className="size-3.5" />
                                                    Hubungkan device
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    <section
                        data-tour="devices-list"
                        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h2
                                    data-tour="devices-list"
                                    className="font-semibold text-slate-900"
                                >
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
                                    onClick={openAddDeviceModal}
                                    className="mt-4 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white"
                                >
                                    Tambah device
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
                                            onClick={() =>
                                                void openDeviceConnection(
                                                    device,
                                                )
                                            }
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                                        >
                                            <Eye className="size-4" />
                                            Token & Hubungkan
                                        </button>
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
                                                setPendingDelete(device)
                                            }
                                            title="Hapus dari daftar"
                                            aria-label={`Hapus perangkat ${device.name}`}
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
            {pendingDelete && (
                <div
                    className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/40 p-4"
                    role="presentation"
                >
                    <section
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="delete-device-title"
                        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                    >
                        <h2
                            id="delete-device-title"
                            className="text-lg font-semibold text-slate-900"
                        >
                            Hapus device dari daftar?
                        </h2>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            Apakah Anda yakin ingin menghapus “
                            {pendingDelete.name}” dari daftar perangkat pada
                            tampilan ini?
                        </p>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={() => setPendingDelete(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => void deletePendingDevice()}
                                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
                            >
                                Ya, hapus
                            </button>
                        </div>
                    </section>
                </div>
            )}
            {isAddOpen && (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (
                            event.target === event.currentTarget &&
                            !registering
                        ) {
                            setIsAddOpen(false);
                        }
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-device-title"
                        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
                    >
                        <div className="mb-5 flex items-start justify-between gap-3">
                            <div>
                                <h2
                                    id="add-device-title"
                                    className="text-lg font-semibold text-slate-900"
                                >
                                    Tambah device
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Pilih ESP32 yang sudah mengirim MAC address,
                                    lalu berikan nama perangkat.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsAddOpen(false)}
                                disabled={registering}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 disabled:opacity-50"
                                aria-label="Tutup modal"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-slate-700">
                                Nama device
                                <input
                                    autoFocus
                                    value={deviceName}
                                    onChange={(event) =>
                                        setDeviceName(event.target.value)
                                    }
                                    placeholder="Contoh: Kumbung Utama"
                                    maxLength={100}
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                            </label>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">
                                            ESP32 terdeteksi
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            MAC address dikirim otomatis oleh
                                            ESP32. Pilih perangkat yang akan
                                            didaftarkan.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={scan}
                                        disabled={scanning}
                                        className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-blue-700 disabled:opacity-50"
                                    >
                                        <RefreshCw
                                            className={`size-3.5 ${scanning ? 'animate-spin' : ''}`}
                                        />
                                        Cari lagi
                                    </button>
                                </div>

                                {availableDiscovered.length > 0 ? (
                                    <div className="space-y-2">
                                        {availableDiscovered.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() =>
                                                    setSelectedDiscovered(item)
                                                }
                                                aria-pressed={
                                                    selectedDiscovered?.id ===
                                                    item.id
                                                }
                                                className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${selectedDiscovered?.id === item.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}
                                            >
                                                <span className="min-w-0">
                                                    <span className="block text-sm font-semibold text-slate-800">
                                                        ESP32
                                                    </span>
                                                    <span className="mt-1 block font-mono text-xs text-slate-500">
                                                        {item.id}
                                                    </span>
                                                    <span className="mt-1 block text-xs text-slate-400">
                                                        Sensor:{' '}
                                                        {item.sensors.join(
                                                            ', ',
                                                        )}
                                                    </span>
                                                </span>
                                                {selectedDiscovered?.id ===
                                                item.id ? (
                                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-blue-700 px-2.5 py-1.5 text-xs font-semibold text-white">
                                                        <Check className="size-3.5" />
                                                        Dipilih
                                                    </span>
                                                ) : (
                                                    <span className="shrink-0 text-xs font-medium text-blue-700">
                                                        Pilih
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
                                        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                            {scanning ? (
                                                <RefreshCw className="size-4 animate-spin text-blue-700" />
                                            ) : (
                                                <Wifi className="size-4 text-slate-400" />
                                            )}
                                            {scanning
                                                ? 'Mencari ESP32…'
                                                : 'Belum ada ESP32 terdeteksi'}
                                        </div>
                                        <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                            Hubungkan ESP32 ke Wi-Fi dan
                                            pastikan firmware mengirim pesan
                                            device_discovered ke server
                                            WebSocket.
                                        </p>
                                        <p className="mt-2 text-xs text-slate-400">
                                            WebSocket:{' '}
                                            {wsStatus === 'connected'
                                                ? 'Terhubung'
                                                : 'Tidak terhubung'}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {formError && (
                                <div
                                    role="alert"
                                    className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
                                >
                                    {formError}
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                onClick={() => setIsAddOpen(false)}
                                disabled={registering}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 disabled:opacity-50"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => void register()}
                                disabled={
                                    registering ||
                                    !deviceName.trim() ||
                                    !selectedDiscovered
                                }
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {registering ? (
                                    <RefreshCw className="size-4 animate-spin" />
                                ) : (
                                    <Check className="size-4" />
                                )}
                                {registering ? 'Menyimpan…' : 'Simpan device'}
                            </button>
                        </div>
                    </section>
                </div>
            )}
            {connectionDevice && (
                <div
                    className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/50 p-4"
                    role="presentation"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            setConnectionDevice(null);
                        }
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="device-connection-title"
                        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <div className="mb-2 inline-flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                                    <Link2 className="size-5" />
                                </div>
                                <h2
                                    id="device-connection-title"
                                    className="text-lg font-semibold text-slate-900"
                                >
                                    Hubungkan device
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    {connectionDevice.name} ·{' '}
                                    <span className="font-mono">
                                        {connectionDevice.id}
                                    </span>
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setConnectionDevice(null);
                                }}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                                aria-label="Tutup modal token"
                            >
                                <X className="size-4" />
                            </button>
                        </div>

                        <div className="mt-6 space-y-4">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <p className="text-sm font-semibold text-slate-900">
                                    Hubungkan ESP32
                                </p>
                                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                                    Token autentikasi dikelola terpisah pada kartu
                                    <strong> Token API</strong> di halaman Kelola
                                    device. Salin token dari kartu tersebut ke
                                    konfigurasi ESP32.
                                </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 p-4">
                                <p className="text-sm font-semibold text-slate-800">
                                    Konfigurasi koneksi ESP32
                                </p>
                                <div className="mt-3 space-y-2">
                                    <div>
                                        <p className="text-xs text-slate-500">
                                            Alamat aplikasi
                                        </p>
                                        <code className="mt-1 block rounded-lg bg-white p-2 text-xs break-all text-slate-700">
                                            {window.location.origin}
                                        </code>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">
                                            Header autentikasi API
                                        </p>
                                        <code className="mt-1 block rounded-lg bg-slate-950 p-3 text-xs break-all leading-relaxed text-slate-100">
                                            Authorization: Bearer &lt;DEVICE_TOKEN&gt;
                                        </code>
                                    </div>
                                </div>
                                <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
                                    <li>Salin token API dari kartu Token API.</li>
                                    <li>Masukkan token tersebut ke firmware ESP32.</li>
                                    <li>
                                        ESP32 mengirim telemetry ke{' '}
                                        <code className="rounded bg-slate-100 px-1">
                                            /api/telemetry
                                        </code>{' '}
                                        dan mengambil perintah dari{' '}
                                        <code className="rounded bg-slate-100 px-1">
                                            /api/device/commands
                                        </code>
                                        .
                                    </li>
                                </ol>
                            </div>
                            <p className="text-xs leading-relaxed text-slate-500">
                                Status device berubah menjadi Online setelah
                                server menerima telemetry yang valid. Membuka
                                dialog ini tidak otomatis menghubungkan perangkat.
                            </p>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => {
                                    setConnectionDevice(null);
                                }}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
                            >
                                Selesai
                            </button>
                        </div>
                    </section>
                </div>
            )}
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
                                disabled={!deviceName.trim() || registering}
                                onClick={() => void register()}
                                className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                                {registering ? (
                                    <RefreshCw className="size-4 animate-spin" />
                                ) : (
                                    <Check className="size-4" />
                                )}
                                {registering
                                    ? 'Menyimpan…'
                                    : 'Simpan perubahan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

Devices.layout = {
    breadcrumbs: [{ title: 'Kelola device', href: '/devices' }],
};
