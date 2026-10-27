import { Head } from '@inertiajs/react';
import {
    Activity,
    AlertTriangle,
    ArrowDownToLine,
    ArrowUpRight,
    ChevronDown,
    Droplets,
    Gauge,
    GripVertical,
    Lightbulb,
    Plus,
    Power,
    RefreshCw,
    Settings2,
    Thermometer,
    Trash2,
    Wind,
    X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

type WidgetKind =
    | 'temperature'
    | 'humidity'
    | 'light'
    | 'history'
    | 'actuators'
    | 'thresholds'
    | 'table';
type Widget = {
    id: string;
    kind: WidgetKind;
    title: string;
    min?: number;
    max?: number;
};
type Reading = {
    temperature: number;
    humidity: number;
    light: number;
    at: string;
};

const initialWidgets: Widget[] = [
    {
        id: 'temperature',
        kind: 'temperature',
        title: 'Suhu kumbung',
        min: 0,
        max: 50,
    },
    {
        id: 'humidity',
        kind: 'humidity',
        title: 'Kelembapan udara',
        min: 0,
        max: 100,
    },
    {
        id: 'light',
        kind: 'light',
        title: 'Intensitas cahaya',
        min: 0,
        max: 100,
    },
    { id: 'history', kind: 'history', title: 'Riwayat lingkungan' },
    { id: 'actuators', kind: 'actuators', title: 'Kontrol aktuator' },
    { id: 'thresholds', kind: 'thresholds', title: 'Ambang batas' },
];
const initialReading: Reading = {
    temperature: 27.4,
    humidity: 86,
    light: 42,
    at: new Date().toISOString(),
};
const kinds: { kind: WidgetKind; label: string; hint: string }[] = [
    { kind: 'temperature', label: 'Gauge suhu', hint: 'Suhu °C' },
    { kind: 'humidity', label: 'Gauge kelembapan', hint: 'Kelembapan %' },
    { kind: 'light', label: 'Gauge cahaya', hint: 'Intensitas relatif %' },
    {
        kind: 'history',
        label: 'Grafik riwayat',
        hint: 'Tren suhu dan kelembapan',
    },
    { kind: 'actuators', label: 'Kontrol aktuator', hint: 'Pompa dan blower' },
    { kind: 'thresholds', label: 'Ambang batas', hint: 'Aturan otomatis' },
    { kind: 'table', label: 'Tabel sensor', hint: 'Nilai dan waktu pembacaan' },
];

function GaugeCard({
    value,
    min = 0,
    max,
    unit,
    color,
    label,
}: {
    value: number;
    min?: number;
    max: number;
    unit: string;
    color: string;
    label: string;
}) {
    const percentage = Math.max(
        0,
        Math.min(100, ((value - min) / (max - min || 1)) * 100),
    );
    return (
        <div className="flex flex-col items-center py-2">
            <div
                className="relative grid size-36 place-items-center rounded-full"
                style={{
                    background: `conic-gradient(${color} ${percentage * 3.6}deg, #edf1f5 0deg)`,
                }}
            >
                <div className="grid size-[116px] place-items-center rounded-full bg-white">
                    <div className="text-center">
                        <div className="text-3xl font-semibold tracking-tight text-slate-900">
                            {value.toFixed(1)}
                            <span className="ml-1 text-sm font-medium text-slate-500">
                                {unit}
                            </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                            {label}
                        </div>
                    </div>
                </div>
            </div>
            <div className="mt-3 flex w-full justify-between px-2 text-xs text-slate-400">
                <span>
                    {min} {unit}
                </span>
                <span>
                    {max} {unit}
                </span>
            </div>
        </div>
    );
}

function TrendChart({ readings }: { readings: Reading[] }) {
    const points = useMemo(() => readings.slice(-18), [readings]);
    const makePath = (
        key: 'temperature' | 'humidity',
        min: number,
        max: number,
    ) =>
        points
            .map(
                (p, i) =>
                    `${i === 0 ? 'M' : 'L'} ${(i / Math.max(1, points.length - 1)) * 580} ${110 - ((p[key] - min) / (max - min)) * 90}`,
            )
            .join(' ');
    return (
        <div className="min-w-0">
            <div className="mb-3 flex flex-wrap gap-4 text-xs">
                <span className="flex items-center gap-2 text-slate-600">
                    <i className="size-2.5 rounded-full bg-blue-600" />
                    Suhu (°C)
                </span>
                <span className="flex items-center gap-2 text-slate-600">
                    <i className="size-2.5 rounded-full bg-emerald-500" />
                    Kelembapan (%)
                </span>
            </div>
            <svg
                viewBox="0 0 580 125"
                role="img"
                aria-label="Grafik tren suhu dan kelembapan"
                className="h-40 w-full overflow-visible"
            >
                {[20, 45, 70, 95, 120].map((y) => (
                    <line
                        key={y}
                        x1="0"
                        y1={y}
                        x2="580"
                        y2={y}
                        stroke="#edf1f5"
                        strokeDasharray="4 5"
                    />
                ))}
                <path
                    d={makePath('temperature', 15, 40)}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d={makePath('humidity', 50, 100)}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                <span>60 menit lalu</span>
                <span>30 menit lalu</span>
                <span>Sekarang</span>
            </div>
        </div>
    );
}

export default function Monitoring() {
    const [device, setDevice] = useState('Kumbung Utama');
    const [deviceId, setDeviceId] = useState('AA:BB:CC:DD:EE:FF');
    const [reading, setReading] = useState(initialReading);
    const [readings, setReadings] = useState<Reading[]>(
        Array.from({ length: 12 }, (_, i) => ({
            temperature: 26.1 + i * 0.11,
            humidity: 82 + i * 0.35,
            light: 35 + i * 0.6,
            at: new Date(Date.now() - (11 - i) * 5 * 60_000).toISOString(),
        })),
    );
    const [connection, setConnection] = useState<
        'connecting' | 'connected' | 'offline'
    >('connecting');
    const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
    const [dragId, setDragId] = useState<string | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [editingLayout, setEditingLayout] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<Widget | null>(null);
    const [editing, setEditing] = useState<Widget | null>(null);
    const [thresholds, setThresholds] = useState({
        temperatureMin: '24',
        temperatureMax: '30',
        humidityMin: '80',
        humidityMax: '95',
        lightMin: '20',
        lightMax: '70',
    });
    const [actuators, setActuators] = useState({
        mist: false,
        water: false,
        blower: false,
    });
    const [manualMode, setManualMode] = useState(true);
    const [notice, setNotice] = useState('');
    const socket = useRef<WebSocket | null>(null);

    useEffect(() => {
        const url = import.meta.env.VITE_WS_URL as string | undefined;
        if (deviceId) {
            void fetch(
                `/api/devices/${encodeURIComponent(deviceId)}/readings`,
                { headers: { Accept: 'application/json' } },
            )
                .then((response) => (response.ok ? response.json() : null))
                .then((payload) => {
                    if (
                        !Array.isArray(payload?.data) ||
                        payload.data.length === 0
                    )
                        return;
                    const history = [...payload.data]
                        .reverse()
                        .map(
                            (item: {
                                temperature: number | null;
                                humidity: number | null;
                                light_percent: number | null;
                                measured_at: string;
                            }) => ({
                                temperature: Number(item.temperature ?? 0),
                                humidity: Number(item.humidity ?? 0),
                                light: Number(item.light_percent ?? 0),
                                at: item.measured_at,
                            }),
                        );
                    setReadings(history.slice(-60));
                    setReading(history[history.length - 1]);
                })
                .catch(() => undefined);
        }
        if (!url) {
            setConnection('offline');
            return;
        }
        let active = true;
        try {
            const ws = new WebSocket(url);
            socket.current = ws;
            ws.onopen = () => {
                if (active) {
                    setConnection('connected');
                    ws.send(
                        JSON.stringify({
                            type: 'subscribe',
                            device_id: deviceId || null,
                        }),
                    );
                }
            };
            ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    if (
                        message.type === 'telemetry' &&
                        (!deviceId || message.device_id === deviceId)
                    ) {
                        const next = {
                            temperature: Number(message.temperature),
                            humidity: Number(message.humidity),
                            light: Number(message.light),
                            at: message.timestamp || new Date().toISOString(),
                        };
                        if (
                            !Number.isFinite(next.temperature) ||
                            !Number.isFinite(next.humidity) ||
                            !Number.isFinite(next.light)
                        )
                            return;
                        setReading(next);
                        setReadings((prev) => [...prev.slice(-59), next]);
                    }
                    if (
                        message.type === 'device_discovered' &&
                        message.device_id
                    )
                        setNotice(`Perangkat terdeteksi: ${message.device_id}`);
                    if (message.type === 'actuator_state' && message.state)
                        setActuators((prev) => ({ ...prev, ...message.state }));
                } catch {
                    /* Ignore malformed messages without interrupting the live dashboard. */
                }
            };
            ws.onerror = () => {
                if (active) setConnection('offline');
            };
            ws.onclose = () => {
                if (active) setConnection('offline');
            };
            return () => {
                active = false;
                ws.close();
            };
        } catch {
            setConnection('offline');
        }
    }, [deviceId]);

    const addWidget = (kind: WidgetKind) => {
        const count = widgets.filter((w) => w.kind === kind).length + 1;
        const title =
            kinds.find((item) => item.kind === kind)?.label ?? 'Widget';
        setWidgets((prev) => [
            ...prev,
            {
                id: `${kind}-${Date.now()}`,
                kind,
                title: count > 1 ? `${title} ${count}` : title,
                min: 0,
                max: kind === 'temperature' ? 50 : 100,
            },
        ]);
        setShowAdd(false);
    };
    const moveWidget = (targetId: string) => {
        if (!dragId || dragId === targetId) return;
        setWidgets((prev) => {
            const next = [...prev];
            const from = next.findIndex((w) => w.id === dragId);
            const to = next.findIndex((w) => w.id === targetId);
            if (from < 0 || to < 0) return prev;
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
        setDragId(null);
    };
    const sendActuator = async (
        key: keyof typeof actuators,
        enabled: boolean,
    ) => {
        setActuators((prev) => ({ ...prev, [key]: enabled }));
        if (socket.current?.readyState === WebSocket.OPEN) {
            socket.current.send(
                JSON.stringify({
                    type: 'actuator_command',
                    device_id: deviceId || null,
                    actuator: key,
                    state: enabled ? 'on' : 'off',
                    mode: 'manual',
                }),
            );
        }
        try {
            await fetch('/api/actuator-commands', {
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
                    device_id: deviceId || null,
                    actuator: key,
                    state: enabled ? 'on' : 'off',
                    mode: 'manual',
                }),
            });
        } catch {
            /* The WebSocket transport remains usable when the API is unavailable. */
        }
        setNotice(
            `Perintah ${key === 'mist' ? 'pompa mist' : key === 'water' ? 'pompa water' : 'blower'} ${enabled ? 'ON' : 'OFF'} dikirim.`,
        );
    };
    const saveMode = async (mode: 'manual' | 'automatic') => {
        setManualMode(mode === 'manual');
        try {
            const response = await fetch('/api/control-mode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN':
                        document.querySelector<HTMLMetaElement>(
                            'meta[name="csrf-token"]',
                        )?.content ?? '',
                },
                body: JSON.stringify({ device_id: deviceId, mode }),
            });
            if (!response.ok)
                throw new Error('Server tidak dapat menyimpan mode kontrol.');
            if (socket.current?.readyState === WebSocket.OPEN) {
                socket.current.send(
                    JSON.stringify({
                        type: 'control_mode',
                        device_id: deviceId,
                        mode,
                    }),
                );
            }
            setNotice(
                `Mode kontrol ${mode === 'manual' ? 'manual' : 'otomatis'} dipilih.`,
            );
        } catch (error) {
            setNotice(
                error instanceof Error
                    ? error.message
                    : 'Mode kontrol belum tersimpan di server.',
            );
        }
    };
    const saveThresholds = async () => {
        try {
            await fetch('/api/control-rules', {
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
                    device_id: deviceId || null,
                    rules: thresholds,
                }),
            });
            if (socket.current?.readyState === WebSocket.OPEN) {
                socket.current.send(
                    JSON.stringify({
                        type: 'thresholds_update',
                        device_id: deviceId || null,
                        thresholds,
                    }),
                );
            }
            setNotice('Pengaturan ambang batas dikirim.');
        } catch {
            setNotice(
                'Pengaturan disimpan di tampilan ini, tetapi server belum dapat dijangkau.',
            );
        }
    };
    const saveWidget = () => {
        if (!editing) return;
        setWidgets((prev) =>
            prev.map((w) => (w.id === editing.id ? editing : w)),
        );
        setEditing(null);
    };

    return (
        <>
            <Head title="Monitoring & Kontrol" />
            <div className="min-h-full bg-[#f6f8fb] px-4 py-6 md:px-8 md:py-8">
                <div className="mx-auto max-w-[1600px] space-y-6">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                        <div>
                            <div className="mb-2 flex items-center gap-2 text-sm text-slate-500">
                                <span>Supathings</span>
                                <span>/</span>
                                <span>Monitoring & kontrol</span>
                            </div>
                            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                                Monitoring & kontrol
                            </h1>
                            <p className="mt-1 text-sm text-slate-500">
                                Pantau kondisi kumbung dan kelola aktuator dari
                                satu tempat.
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                onClick={() => setEditingLayout((value) => !value)}
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                <Settings2 className="size-4" />
                                {editingLayout ? 'Selesai edit layout' : 'Edit layout'}
                            </button>
                            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                                <span className="text-slate-500">Device</span>
                                <select
                                    value={device}
                                    onChange={(e) => {
                                        setDevice(e.target.value);
                                        setDeviceId(
                                            e.target.value === 'Kumbung Utama'
                                                ? 'AA:BB:CC:DD:EE:FF'
                                                : e.target.value,
                                        );
                                    }}
                                    className="max-w-44 bg-transparent font-medium text-slate-800 outline-none"
                                >
                                    <option>Kumbung Utama</option>
                                    <option value="AA:BB:CC:DD:EE:FF">
                                        ESP32 • AA:BB:CC:DD:EE:FF
                                    </option>
                                </select>
                                <ChevronDown className="size-4 text-slate-400" />
                            </label>
                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                                <span
                                    className={`size-2 rounded-full ${connection === 'connected' ? 'bg-emerald-500' : connection === 'connecting' ? 'bg-amber-400' : 'bg-slate-300'}`}
                                />
                                <span className="text-slate-600">
                                    {connection === 'connected'
                                        ? 'Realtime aktif'
                                        : connection === 'connecting'
                                          ? 'Menghubungkan…'
                                          : 'Offline / demo'}
                                </span>
                            </div>
                            {editingLayout && (
                                <button
                                    onClick={() => setShowAdd(true)}
                                    className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
                                >
                                    <Plus className="size-4" />
                                    Tambah card
                                </button>
                            )}
                        </div>
                    </div>
                    {notice && (
                        <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                            <span>{notice}</span>
                            <button
                                onClick={() => setNotice('')}
                                aria-label="Tutup notifikasi"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
                                <Activity className="size-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-slate-800">
                                    {device}
                                </p>
                                <p className="text-xs text-slate-500">
                                    ESP32 · DHT22 + LDR · Data terakhir{' '}
                                    {new Date(reading.at).toLocaleTimeString(
                                        'id-ID',
                                        {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                        },
                                    )}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <span className="size-2 rounded-full bg-emerald-500" />
                                DHT22
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="size-2 rounded-full bg-emerald-500" />
                                LDR
                            </span>
                            <button
                                onClick={() =>
                                    setNotice(
                                        'Status diperbarui dari koneksi WebSocket.',
                                    )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50"
                            >
                                <RefreshCw className="size-3.5" />
                                Perbarui status
                            </button>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
                            <div>
                                <p className="text-sm font-semibold text-slate-800">
                                    Mode kontrol
                                </p>
                                <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                                    Mode manual memberi kendali langsung. Dalam
                                    mode otomatis, server mengevaluasi ambang
                                    batas yang tersimpan. Pastikan aktuator
                                    memiliki batas waktu aman saat koneksi
                                    terputus.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white p-1">
                            <button
                                onClick={() => void saveMode('manual')}
                                className={`rounded-lg px-3 py-2 text-xs font-semibold ${manualMode ? 'bg-blue-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                Manual
                            </button>
                            <button
                                onClick={() => void saveMode('automatic')}
                                className={`rounded-lg px-3 py-2 text-xs font-semibold ${!manualMode ? 'bg-blue-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                            >
                                Otomatis
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                        {widgets.map((widget) => (
                            <section
                                key={widget.id}
                                draggable={editingLayout}
                                onDragStart={() => editingLayout && setDragId(widget.id)}
                                onDragOver={(e) => editingLayout && e.preventDefault()}
                                onDrop={() => editingLayout && moveWidget(widget.id)}
                                className="group min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.025)] transition hover:border-slate-300 hover:shadow-sm"
                            >
                                <header className="mb-4 flex items-start justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                        {editingLayout && <GripVertical className="size-4 shrink-0 cursor-grab text-slate-300" />}
                                        <div className="min-w-0">
                                            <h2 className="truncate font-semibold text-slate-800">
                                                {widget.title}
                                            </h2>
                                            <p className="mt-0.5 text-xs text-slate-400">
                                                {widget.kind === 'history'
                                                    ? '60 menit terakhir'
                                                    : widget.kind ===
                                                        'actuators'
                                                      ? 'Mode manual'
                                                      : widget.kind ===
                                                          'thresholds'
                                                        ? 'Aturan kontrol otomatis'
                                                        : 'Pembacaan terkini'}
                                            </p>
                                        </div>
                                    </div>
                                    {editingLayout && (
                                        <div className="flex shrink-0 items-center gap-1">
                                            <button
                                                title="Pengaturan card"
                                                onClick={() => setEditing(widget)}
                                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                            >
                                                <Settings2 className="size-4" />
                                            </button>
                                            <button
                                                title="Hapus card"
                                                onClick={() => setPendingDelete(widget)}
                                                className="rounded-lg p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </div>
                                    )}
                                </header>
                                {(widget.kind === 'temperature' ||
                                    widget.kind === 'humidity' ||
                                    widget.kind === 'light') && (
                                    <GaugeCard
                                        value={
                                            widget.kind === 'temperature'
                                                ? reading.temperature
                                                : widget.kind === 'humidity'
                                                  ? reading.humidity
                                                  : reading.light
                                        }
                                        min={widget.min ?? 0}
                                        max={
                                            widget.max ??
                                            (widget.kind === 'temperature'
                                                ? 50
                                                : 100)
                                        }
                                        unit={
                                            widget.kind === 'temperature'
                                                ? '°C'
                                                : '%'
                                        }
                                        color={
                                            widget.kind === 'temperature'
                                                ? '#2563eb'
                                                : widget.kind === 'humidity'
                                                  ? '#10b981'
                                                  : '#0d9488'
                                        }
                                        label={
                                            widget.kind === 'temperature'
                                                ? 'Suhu saat ini'
                                                : widget.kind === 'humidity'
                                                  ? 'Kelembapan relatif'
                                                  : 'Cahaya relatif'
                                        }
                                    />
                                )}
                                {widget.kind === 'history' && (
                                    <TrendChart readings={readings} />
                                )}
                                {widget.kind === 'actuators' && (
                                    <div className="space-y-3">
                                        {(
                                            [
                                                {
                                                    key: 'mist',
                                                    title: 'Pompa mist',
                                                    desc: 'Menjaga kelembapan',
                                                    Icon: Droplets,
                                                },
                                                {
                                                    key: 'water',
                                                    title: 'Pompa water',
                                                    desc: 'Penyiraman kumbung',
                                                    Icon: Droplets,
                                                },
                                                {
                                                    key: 'blower',
                                                    title: 'Blower',
                                                    desc: 'Sirkulasi udara',
                                                    Icon: Wind,
                                                },
                                            ] as const
                                        ).map((item) => (
                                            <div
                                                key={item.key}
                                                className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-3"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`grid size-9 place-items-center rounded-lg ${actuators[item.key] ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                                                    >
                                                        <item.Icon className="size-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-medium text-slate-800">
                                                            {item.title}
                                                        </p>
                                                        <p className="text-xs text-slate-500">
                                                            {item.desc}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    role="switch"
                                                    aria-checked={
                                                        actuators[item.key]
                                                    }
                                                    onClick={() =>
                                                        void sendActuator(
                                                            item.key,
                                                            !actuators[
                                                                item.key
                                                            ],
                                                        )
                                                    }
                                                    className={`relative h-6 w-11 rounded-full transition ${actuators[item.key] ? 'bg-emerald-500' : 'bg-slate-200'}`}
                                                >
                                                    <span
                                                        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${actuators[item.key] ? 'left-[22px]' : 'left-0.5'}`}
                                                    />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {widget.kind === 'thresholds' && (
                                    <div className="space-y-3">
                                        {[
                                            {
                                                label: 'Suhu',
                                                range: `${thresholds.temperatureMin}–${thresholds.temperatureMax} °C`,
                                                Icon: Thermometer,
                                            },
                                            {
                                                label: 'Kelembapan',
                                                range: `${thresholds.humidityMin}–${thresholds.humidityMax}%`,
                                                Icon: Droplets,
                                            },
                                            {
                                                label: 'Cahaya',
                                                range: `${thresholds.lightMin}–${thresholds.lightMax}%`,
                                                Icon: Lightbulb,
                                            },
                                        ].map((item) => (
                                            <div
                                                key={item.label}
                                                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-3"
                                            >
                                                <span className="flex items-center gap-2 text-sm text-slate-600">
                                                    <item.Icon className="size-4 text-slate-400" />
                                                    {item.label}
                                                </span>
                                                <span className="text-sm font-semibold text-slate-800">
                                                    {item.range}
                                                </span>
                                            </div>
                                        ))}
                                        <button
                                            onClick={() =>
                                                setEditing({
                                                    id: 'thresholds-editor',
                                                    kind: 'thresholds',
                                                    title: 'Pengaturan ambang batas',
                                                })
                                            }
                                            className="w-full rounded-xl border border-blue-100 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                                        >
                                            Atur ambang batas
                                        </button>
                                    </div>
                                )}
                                {widget.kind === 'table' && (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead className="text-xs text-slate-400">
                                                <tr>
                                                    <th className="pb-2 font-medium">
                                                        Parameter
                                                    </th>
                                                    <th className="pb-2 font-medium">
                                                        Nilai
                                                    </th>
                                                    <th className="pb-2 font-medium">
                                                        Satuan
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {[
                                                    {
                                                        name: 'Suhu',
                                                        value: reading.temperature.toFixed(
                                                            1,
                                                        ),
                                                        unit: '°C',
                                                    },
                                                    {
                                                        name: 'Kelembapan',
                                                        value: reading.humidity.toFixed(
                                                            1,
                                                        ),
                                                        unit: '%',
                                                    },
                                                    {
                                                        name: 'Cahaya',
                                                        value: reading.light.toFixed(
                                                            1,
                                                        ),
                                                        unit: '%',
                                                    },
                                                ].map((row) => (
                                                    <tr key={row.name}>
                                                        <td className="py-3 text-slate-600">
                                                            {row.name}
                                                        </td>
                                                        <td className="py-3 font-semibold text-slate-800">
                                                            {row.value}
                                                        </td>
                                                        <td className="py-3 text-slate-400">
                                                            {row.unit}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400">
                                    <span className="flex items-center gap-1">
                                        <span className="size-1.5 rounded-full bg-emerald-400" />
                                        {connection === 'connected'
                                            ? 'Data langsung'
                                            : 'Contoh tampilan'}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        Lihat detail{' '}
                                        <ArrowUpRight className="size-3" />
                                    </span>
                                </div>
                            </section>
                        ))}
                    </div>

                </div>
            </div>
            {pendingDelete && (
                <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/40 p-4" role="presentation">
                    <section role="alertdialog" aria-modal="true" aria-labelledby="delete-widget-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <h2 id="delete-widget-title" className="text-lg font-semibold text-slate-900">Hapus card?</h2>
                        <p className="mt-2 text-sm text-slate-600">Apakah Anda yakin ingin menghapus card “{pendingDelete.title}” dari layout perangkat ini?</p>
                        <div className="mt-6 flex justify-end gap-2">
                            <button onClick={() => setPendingDelete(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600">Batal</button>
                            <button onClick={() => {
                                setWidgets((prev) => prev.filter((widget) => widget.id !== pendingDelete.id));
                                setPendingDelete(null);
                                setNotice('Card berhasil dihapus dari layout.');
                            }} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700">Ya, hapus card</button>
                        </div>
                    </section>
                </div>
            )}
            {showAdd && (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setShowAdd(false);
                    }}
                >
                    <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex items-start justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    Tambah card
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Pilih komponen yang ingin ditampilkan.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowAdd(false)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {kinds.map((item) => (
                                <button
                                    key={item.kind}
                                    onClick={() => addWidget(item.kind)}
                                    className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/50"
                                >
                                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
                                        {item.kind.includes('temperature') ? (
                                            <Gauge className="size-4" />
                                        ) : item.kind === 'history' ? (
                                            <Activity className="size-4" />
                                        ) : item.kind === 'actuators' ? (
                                            <Power className="size-4" />
                                        ) : item.kind === 'light' ? (
                                            <Lightbulb className="size-4" />
                                        ) : item.kind === 'table' ? (
                                            <ArrowDownToLine className="size-4" />
                                        ) : (
                                            <Settings2 className="size-4" />
                                        )}
                                    </div>
                                    <span>
                                        <span className="block text-sm font-semibold text-slate-800">
                                            {item.label}
                                        </span>
                                        <span className="mt-1 block text-xs text-slate-500">
                                            {item.hint}
                                        </span>
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {editing && (
                <div
                    className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setEditing(null);
                    }}
                >
                    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
                        <div className="mb-5 flex items-start justify-between">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900">
                                    {editing.id === 'thresholds-editor' ||
                                    editing.kind === 'thresholds'
                                        ? 'Pengaturan ambang batas'
                                        : 'Pengaturan card'}
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Sesuaikan komponen untuk perangkat terpilih.
                                </p>
                            </div>
                            <button
                                onClick={() => setEditing(null)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                        {editing.kind === 'thresholds' ? (
                            <div className="space-y-4">
                                {(
                                    [
                                        {
                                            key: 'temperatureMin',
                                            label: 'Suhu minimum (°C)',
                                        },
                                        {
                                            key: 'temperatureMax',
                                            label: 'Suhu maksimum (°C)',
                                        },
                                        {
                                            key: 'humidityMin',
                                            label: 'Kelembapan minimum (%)',
                                        },
                                        {
                                            key: 'humidityMax',
                                            label: 'Kelembapan maksimum (%)',
                                        },
                                        {
                                            key: 'lightMin',
                                            label: 'Cahaya minimum (%)',
                                        },
                                        {
                                            key: 'lightMax',
                                            label: 'Cahaya maksimum (%)',
                                        },
                                    ] as const
                                ).map((field) => (
                                    <label
                                        key={field.key}
                                        className="block text-sm font-medium text-slate-700"
                                    >
                                        {field.label}
                                        <input
                                            type="number"
                                            value={thresholds[field.key]}
                                            onChange={(e) =>
                                                setThresholds((prev) => ({
                                                    ...prev,
                                                    [field.key]: e.target.value,
                                                }))
                                            }
                                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        />
                                    </label>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <label className="block text-sm font-medium text-slate-700">
                                    Nama card
                                    <input
                                        value={editing.title}
                                        onChange={(e) =>
                                            setEditing((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          title: e.target.value,
                                                      }
                                                    : prev,
                                            )
                                        }
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                                    />
                                </label>
                                {(editing.kind === 'temperature' ||
                                    editing.kind === 'humidity' ||
                                    editing.kind === 'light') && (
                                    <div className="grid grid-cols-2 gap-3">
                                        {(['min', 'max'] as const).map(
                                            (key) => (
                                                <label
                                                    key={key}
                                                    className="text-sm font-medium text-slate-700 capitalize"
                                                >
                                                    Nilai {key}
                                                    <input
                                                        type="number"
                                                        value={
                                                            editing[key] ??
                                                            (key === 'min'
                                                                ? 0
                                                                : 100)
                                                        }
                                                        onChange={(e) =>
                                                            setEditing(
                                                                (prev) =>
                                                                    prev
                                                                        ? {
                                                                              ...prev,
                                                                              [key]: Number(
                                                                                  e
                                                                                      .target
                                                                                      .value,
                                                                              ),
                                                                          }
                                                                        : prev,
                                                            )
                                                        }
                                                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-blue-500"
                                                    />
                                                </label>
                                            ),
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={() => setEditing(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    if (editing.kind === 'thresholds') {
                                        void saveThresholds();
                                        setEditing(null);
                                    } else saveWidget();
                                }}
                                className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                            >
                                Simpan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

Monitoring.layout = {
    breadcrumbs: [{ title: 'Monitoring & kontrol', href: '/monitoring' }],
};
