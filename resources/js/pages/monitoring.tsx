import { Head } from '@inertiajs/react';
import {
    Activity,
    CalendarClock,
    AlertTriangle,
    ArrowDownToLine,
    ArrowUpRight,
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type WidgetKind =
    | 'temperature'
    | 'humidity'
    | 'light'
    | 'history'
    | 'actuators'
    | 'thresholds'
    | 'schedules'
    | 'table';
type Widget = {
    id: string;
    kind: WidgetKind;
    title: string;
    min?: number;
    max?: number;
};
type DeviceOption = { id: string; name: string };
type Reading = {
    temperature: number;
    humidity: number;
    light: number;
    at: string;
};
type ActuatorKey = 'mist' | 'water' | 'blower' | 'lamp';
type ActuatorSchedule = {
    id: number;
    iot_device_id: number;
    actuator: ActuatorKey;
    state: 'on' | 'off';
    time: string;
    days: number[];
    enabled: boolean;
    last_run_at: string | null;
};
type ScheduleForm = {
    id?: number;
    actuator: ActuatorKey;
    state: 'on' | 'off';
    time: string;
    days: number[];
    enabled: boolean;
};
type RuleActuators = Record<
    'temperature' | 'humidity' | 'light',
    ActuatorKey[]
>;
const actuatorOptions: {
    key: ActuatorKey;
    title: string;
    desc: string;
    Icon: typeof Droplets;
}[] = [
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
        title: 'Exhaust',
        desc: 'Sirkulasi udara',
        Icon: Wind,
    },
    {
        key: 'lamp',
        title: 'Lampu',
        desc: 'Pencahayaan kumbung',
        Icon: Lightbulb,
    },
];

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
    { id: 'schedules', kind: 'schedules', title: 'Jadwal aktuator' },
];
const defaultThresholds = {
    temperatureMin: '24',
    temperatureMax: '30',
    humidityMin: '80',
    humidityMax: '95',
    lightMin: '20',
    lightMax: '70',
};
const defaultRuleActuators: RuleActuators = {
    temperature: ['blower'],
    humidity: ['mist'],
    light: [],
};
const initialReading: Reading = {
    temperature: Number.NaN,
    humidity: Number.NaN,
    light: Number.NaN,
    at: '',
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
    const percentage = Number.isFinite(value)
        ? Math.max(0, Math.min(100, ((value - min) / (max - min || 1)) * 100))
        : 0;
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
                            {Number.isFinite(value) ? value.toFixed(1) : '—'}
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
    const [device, setDevice] = useState('');
    const [deviceId, setDeviceId] = useState('');
    const [availableDevices, setAvailableDevices] = useState<DeviceOption[]>(
        [],
    );
    const [reading, setReading] = useState(initialReading);
    const [readings, setReadings] = useState<Reading[]>([]);
    const [connection, setConnection] = useState<
        'connecting' | 'connected' | 'offline'
    >('connecting');
    const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
    const [dragId, setDragId] = useState<string | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [editingLayout, setEditingLayout] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<Widget | null>(null);
    const [editing, setEditing] = useState<Widget | null>(null);
    const [thresholds, setThresholds] = useState(defaultThresholds);
    const [ruleActuators, setRuleActuators] =
        useState<RuleActuators>(defaultRuleActuators);
    const [actuators, setActuators] = useState<Record<ActuatorKey, boolean>>({
        mist: false,
        water: false,
        blower: false,
        lamp: false,
    });
    const [actuatorConfirmed, setActuatorConfirmed] = useState<
        Record<ActuatorKey, boolean>
    >({
        mist: false,
        water: false,
        blower: false,
        lamp: false,
    });
    const [actuatorPending, setActuatorPending] = useState<
        Record<ActuatorKey, 'on' | 'off' | null>
    >({
        mist: null,
        water: null,
        blower: null,
        lamp: null,
    });
    const [manualMode, setManualMode] = useState(true);
    const [modeSaving, setModeSaving] = useState(false);
    const [thresholdSaving, setThresholdSaving] = useState(false);
    const [schedules, setSchedules] = useState<ActuatorSchedule[]>([]);
    const [scheduleForm, setScheduleForm] = useState<ScheduleForm | null>(null);
    const [scheduleSaving, setScheduleSaving] = useState(false);
    const [scheduleDeleting, setScheduleDeleting] = useState<number | null>(
        null,
    );
    const [notice, setNotice] = useState('');
    const socket = useRef<WebSocket | null>(null);

    useEffect(() => {
        void fetch('/api/devices', { headers: { Accept: 'application/json' } })
            .then((response) => (response.ok ? response.json() : null))
            .then((payload) => {
                if (!Array.isArray(payload?.data)) return;
                const devices = payload.data
                    .filter(
                        (item: { mac_address?: string; name?: string }) =>
                            item.mac_address && item.name,
                    )
                    .map((item: { mac_address: string; name: string }) => ({
                        id: item.mac_address,
                        name: item.name,
                    }));
                if (devices.length > 0) {
                    setAvailableDevices(devices);
                    if (!devices.some((item) => item.id === deviceId)) {
                        setDeviceId(devices[0].id);
                        setDevice(devices[0].name);
                    }
                }
            })
            .catch(() => undefined);
    }, [deviceId]);

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
                    if (
                        message.type === 'actuator_state' &&
                        message.state &&
                        (!message.device_id || message.device_id === deviceId)
                    ) {
                        setActuators((prev) => ({ ...prev, ...message.state }));
                        setActuatorConfirmed((prev) => ({
                            ...prev,
                            ...Object.fromEntries(
                                Object.keys(message.state).map((key) => [
                                    key,
                                    true,
                                ]),
                            ),
                        }));
                        setActuatorPending((prev) => ({
                            ...prev,
                            ...Object.fromEntries(
                                Object.keys(message.state).map((key) => [
                                    key,
                                    null,
                                ]),
                            ),
                        }));
                    }
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
        const count =
            widgets.filter((widget) => widget.kind === kind).length + 1;
        const title =
            kinds.find((item) => item.kind === kind)?.label ?? 'Widget';
        setWidgets((prev) => {
            const next = [
                ...prev,
                {
                    id: `${kind}-${Date.now()}`,
                    kind,
                    title: count > 1 ? `${title} ${count}` : title,
                    min: 0,
                    max: kind === 'temperature' ? 50 : 100,
                },
            ];
            window.localStorage.setItem(
                `supathings:${deviceId}:widgets`,
                JSON.stringify(next),
            );
            return next;
        });
        setShowAdd(false);
        setNotice('Card berhasil ditambahkan ke layout.');
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
            window.localStorage.setItem(
                `supathings:${deviceId}:widgets`,
                JSON.stringify(next),
            );
            return next;
        });
        setDragId(null);
        setNotice('Urutan card berhasil diperbarui.');
    };
    const sendActuator = async (key: ActuatorKey, enabled: boolean) => {
        if (actuatorPending[key] !== null) return;
        const previousState = actuators[key];
        setActuators((previous) => ({ ...previous, [key]: enabled }));
        setActuatorConfirmed((previous) => ({ ...previous, [key]: false }));
        setActuatorPending((previous) => ({
            ...previous,
            [key]: enabled ? 'on' : 'off',
        }));
        try {
            const response = await fetch('/api/actuator-commands', {
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
            if (!response.ok)
                throw new Error('Server gagal menerima perintah aktuator.');
            const actuatorLabel =
                actuatorOptions.find((item) => item.key === key)?.title ?? key;
            setNotice(
                `${actuatorLabel} ${enabled ? 'dinyalakan' : 'dimatikan'}. Menunggu konfirmasi ESP32.`,
            );
        } catch (error) {
            setActuators((previous) => ({ ...previous, [key]: previousState }));
            setActuatorConfirmed((previous) => ({ ...previous, [key]: true }));
            setActuatorPending((previous) => ({ ...previous, [key]: null }));
            setNotice(
                error instanceof Error
                    ? error.message
                    : 'Perintah aktuator gagal dikirim.',
            );
        }
    };
    const saveMode = async (mode: 'manual' | 'automatic') => {
        if (modeSaving) return;
        setModeSaving(true);
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
            setManualMode(mode === 'manual');
            window.localStorage.setItem(`supathings:${deviceId}:mode`, mode);
            setNotice(
                `Mode kontrol ${mode === 'manual' ? 'manual' : 'otomatis'} berhasil disimpan.`,
            );
        } catch (error) {
            setNotice(
                error instanceof Error
                    ? error.message
                    : 'Mode kontrol belum tersimpan di server.',
            );
        } finally {
            setModeSaving(false);
        }
    };
    const saveThresholds = async () => {
        if (thresholdSaving) return;
        const ranges = [
            ['Suhu', thresholds.temperatureMin, thresholds.temperatureMax],
            ['Kelembapan', thresholds.humidityMin, thresholds.humidityMax],
            ['Cahaya', thresholds.lightMin, thresholds.lightMax],
        ] as const;
        const invalidRange = ranges.find(
            ([, minimum, maximum]) =>
                minimum === '' ||
                maximum === '' ||
                Number(minimum) >= Number(maximum),
        );
        if (invalidRange) {
            setNotice(
                `${invalidRange[0]}: nilai minimum harus lebih kecil dari maksimum.`,
            );
            return;
        }
        setThresholdSaving(true);
        try {
            const response = await fetch('/api/control-rules', {
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
                    rules: { ...thresholds, actuators: ruleActuators },
                }),
            });
            if (!response.ok) {
                throw new Error('Server gagal menyimpan ambang batas.');
            }
            window.localStorage.setItem(
                `supathings:${deviceId}:thresholds`,
                JSON.stringify(thresholds),
            );
            if (socket.current?.readyState === WebSocket.OPEN) {
                socket.current.send(
                    JSON.stringify({
                        type: 'thresholds_update',
                        device_id: deviceId || null,
                        thresholds,
                        actuators: ruleActuators,
                    }),
                );
            }
            window.localStorage.setItem(
                `supathings:${deviceId}:rule-actuators`,
                JSON.stringify(ruleActuators),
            );
            setNotice(
                'Pengaturan ambang batas dan aktuator berhasil disimpan.',
            );
            setEditing(null);
        } catch (error) {
            setNotice(
                error instanceof Error
                    ? error.message
                    : 'Pengaturan ambang batas gagal disimpan.',
            );
        } finally {
            setThresholdSaving(false);
        }
    };
    const saveWidget = () => {
        if (!editing) return;
        setWidgets((prev) => {
            const next = prev.map((widget) =>
                widget.id === editing.id ? editing : widget,
            );
            window.localStorage.setItem(
                `supathings:${deviceId}:widgets`,
                JSON.stringify(next),
            );
            return next;
        });
        setEditing(null);
        setNotice('Pengaturan card berhasil disimpan.');
    };

    const defaultScheduleForm = (): ScheduleForm => ({
        actuator: 'mist',
        state: 'on',
        time: '07:00',
        days: [0, 1, 2, 3, 4, 5, 6],
        enabled: true,
    });

    const loadSchedules = async () => {
        if (!deviceId) {
            setSchedules([]);
            return;
        }

        try {
            const response = await fetch(
                '/api/actuator-schedules?device_id=' +
                    encodeURIComponent(deviceId),
                { headers: { Accept: 'application/json' } },
            );
            if (!response.ok) return;
            const payload = await response.json();
            if (Array.isArray(payload?.data)) setSchedules(payload.data);
        } catch {
            // Keep the last schedule state when refresh fails.
        }
    };

    const saveSchedule = async () => {
        if (!scheduleForm || !deviceId || scheduleSaving) return;
        if (scheduleForm.days.length === 0) {
            setNotice('Pilih minimal satu hari untuk jadwal.');
            return;
        }

        setScheduleSaving(true);
        try {
            const response = await fetch(
                scheduleForm.id
                    ? `/api/actuator-schedules/${scheduleForm.id}`
                    : '/api/actuator-schedules',
                {
                    method: scheduleForm.id ? 'PATCH' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-CSRF-TOKEN':
                            document.querySelector<HTMLMetaElement>(
                                'meta[name="csrf-token"]',
                            )?.content ?? '',
                    },
                    body: JSON.stringify({
                        device_id: deviceId,
                        actuator: scheduleForm.actuator,
                        state: scheduleForm.state,
                        time: scheduleForm.time,
                        days: scheduleForm.days,
                        enabled: scheduleForm.enabled,
                    }),
                },
            );
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(
                    payload?.message ?? 'Jadwal aktuator gagal disimpan.',
                );
            }

            setScheduleForm(null);
            await loadSchedules();
            setNotice(
                scheduleForm.id
                    ? 'Jadwal aktuator berhasil diperbarui.'
                    : 'Jadwal aktuator berhasil ditambahkan.',
            );
        } catch (error) {
            setNotice(
                error instanceof Error
                    ? error.message
                    : 'Jadwal aktuator gagal disimpan.',
            );
        } finally {
            setScheduleSaving(false);
        }
    };

    const deleteSchedule = async (schedule: ActuatorSchedule) => {
        if (scheduleDeleting !== null) return;
        setScheduleDeleting(schedule.id);
        try {
            const response = await fetch(
                `/api/actuator-schedules/${schedule.id}`,
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
            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                throw new Error(
                    payload?.message ?? 'Jadwal aktuator gagal dihapus.',
                );
            }
            await loadSchedules();
            setNotice('Jadwal aktuator berhasil dihapus.');
        } catch (error) {
            setNotice(
                error instanceof Error
                    ? error.message
                    : 'Jadwal aktuator gagal dihapus.',
            );
        } finally {
            setScheduleDeleting(null);
        }
    };

    const toggleScheduleDay = (day: number) => {
        setScheduleForm((previous) => {
            if (!previous) return previous;
            const selected = previous.days.includes(day);
            const days = selected
                ? previous.days.filter((value) => value !== day)
                : [...previous.days, day].sort((a, b) => a - b);
            return { ...previous, days };
        });
    };

    useEffect(() => {
        void loadSchedules();
    }, [deviceId]);

    useEffect(() => {
        if (!deviceId) {
            setActuators({
                mist: false,
                water: false,
                blower: false,
                lamp: false,
            });
            setActuatorConfirmed({
                mist: false,
                water: false,
                blower: false,
                lamp: false,
            });
            setActuatorPending({
                mist: null,
                water: null,
                blower: null,
                lamp: null,
            });
            return;
        }

        let active = true;
        const refreshActuatorStatus = async () => {
            try {
                const response = await fetch(
                    '/api/actuator-status?device_id=' +
                        encodeURIComponent(deviceId),
                    { headers: { Accept: 'application/json' } },
                );
                if (!response.ok) return;
                const payload = await response.json();
                if (!active || !payload.data) return;

                setActuators((previous) => {
                    const next = { ...previous };
                    for (const key of [
                        'mist',
                        'water',
                        'blower',
                        'lamp',
                    ] as const) {
                        const status = payload.data[key];
                        const state = status?.actual_state;
                        if (
                            !status?.is_pending &&
                            (status?.command_status === 'acknowledged' ||
                                status?.command_status === 'failed') &&
                            (state === 'on' || state === 'off')
                        ) {
                            next[key] = state === 'on';
                        }
                    }
                    return next;
                });
                setActuatorConfirmed((previous) => {
                    const next = { ...previous };
                    for (const key of [
                        'mist',
                        'water',
                        'blower',
                        'lamp',
                    ] as const) {
                        const status = payload.data[key];
                        const state = status?.actual_state;
                        if (status?.is_pending) {
                            continue;
                        }
                        next[key] =
                            (status?.command_status === 'acknowledged' ||
                                status?.command_status === 'failed') &&
                            (state === 'on' || state === 'off');
                    }
                    return next;
                });
            } catch {
                // Keep the last confirmed state when status polling fails.
            }
        };

        void refreshActuatorStatus();
        const timer = window.setInterval(
            () => void refreshActuatorStatus(),
            2000,
        );
        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, [deviceId]);

    useEffect(() => {
        try {
            const savedThresholds = window.localStorage.getItem(
                `supathings:${deviceId}:thresholds`,
            );
            const savedMode = window.localStorage.getItem(
                `supathings:${deviceId}:mode`,
            );
            const savedWidgets = window.localStorage.getItem(
                `supathings:${deviceId}:widgets`,
            );
            setThresholds(
                savedThresholds
                    ? (JSON.parse(savedThresholds) as typeof thresholds)
                    : defaultThresholds,
            );
            const savedRuleActuators = window.localStorage.getItem(
                `supathings:${deviceId}:rule-actuators`,
            );
            if (savedRuleActuators) {
                const parsed = JSON.parse(
                    savedRuleActuators,
                ) as Partial<RuleActuators>;
                setRuleActuators({
                    temperature:
                        parsed.temperature ?? defaultRuleActuators.temperature,
                    humidity: parsed.humidity ?? defaultRuleActuators.humidity,
                    light: parsed.light ?? defaultRuleActuators.light,
                });
            } else {
                setRuleActuators(defaultRuleActuators);
            }
            setManualMode(savedMode !== 'automatic');
            if (savedWidgets) {
                const widgetIds = JSON.parse(savedWidgets) as Widget[];
                if (widgetIds.length > 0) {
                    setWidgets(
                        widgetIds.some((widget) => widget.kind === 'schedules')
                            ? widgetIds
                            : [
                                  ...widgetIds,
                                  {
                                      id: 'schedules',
                                      kind: 'schedules' as const,
                                      title: 'Jadwal aktuator',
                                  },
                              ],
                    );
                } else setWidgets(initialWidgets);
            } else {
                setWidgets(initialWidgets);
            }
        } catch {
            setWidgets(initialWidgets);
        }
    }, [deviceId]);

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
                                data-tour="monitoring-layout"
                                onClick={() =>
                                    setEditingLayout((value) => !value)
                                }
                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                <Settings2 className="size-4" />
                                {editingLayout
                                    ? 'Selesai edit layout'
                                    : 'Edit layout'}
                            </button>
                            <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
                                <span className="text-slate-500">Device</span>
                                <Select
                                    value={deviceId}
                                    onValueChange={(value) => {
                                        const selectedDevice =
                                            availableDevices.find(
                                                (item) => item.id === value,
                                            );
                                        if (!selectedDevice) return;
                                        setDevice(selectedDevice.name);
                                        setDeviceId(selectedDevice.id);
                                    }}
                                >
                                    <SelectTrigger
                                        data-tour="monitoring-device"
                                        className="h-9 w-auto min-w-[180px] border-0 bg-transparent px-2 font-medium shadow-none"
                                    >
                                        <SelectValue placeholder="Pilih device" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableDevices.map((item) => (
                                            <SelectItem
                                                key={item.id}
                                                value={item.id}
                                            >
                                                {item.name} · {item.id}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
                        <div
                            className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/40 p-4"
                            role="presentation"
                        >
                            <section
                                role="alertdialog"
                                aria-modal="true"
                                aria-labelledby="monitoring-result-title"
                                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="grid size-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700">
                                        <Activity className="size-5" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h2
                                            id="monitoring-result-title"
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
                                    {reading.at
                                        ? new Date(
                                              reading.at,
                                          ).toLocaleTimeString('id-ID', {
                                              hour: '2-digit',
                                              minute: '2-digit',
                                              second: '2-digit',
                                          })
                                        : 'Belum ada data'}
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
                        <div
                            data-tour="monitoring-mode"
                            className="flex items-center gap-2 rounded-xl border border-amber-200 bg-white p-1"
                        >
                            <button
                                disabled={modeSaving}
                                onClick={() => void saveMode('manual')}
                                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${manualMode ? 'bg-blue-700 text-white' : 'text-slate-500 hover:bg-slate-50'} disabled:cursor-wait disabled:opacity-60`}
                            >
                                {modeSaving && manualMode
                                    ? 'Menyimpan…'
                                    : 'Manual'}
                            </button>
                            <button
                                disabled={modeSaving}
                                onClick={() => void saveMode('automatic')}
                                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${!manualMode ? 'bg-blue-700 text-white' : 'text-slate-500 hover:bg-slate-50'} disabled:cursor-wait disabled:opacity-60`}
                            >
                                {modeSaving && !manualMode
                                    ? 'Menyimpan…'
                                    : 'Otomatis'}
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
                        {widgets.map((widget, index) => (
                            <section
                                data-tour={
                                    index === 0
                                        ? 'monitoring-controls'
                                        : undefined
                                }
                                key={widget.id}
                                draggable={editingLayout}
                                onDragStart={() =>
                                    editingLayout && setDragId(widget.id)
                                }
                                onDragOver={(event) =>
                                    editingLayout && event.preventDefault()
                                }
                                onDrop={() =>
                                    editingLayout && moveWidget(widget.id)
                                }
                                className="group min-w-0 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.025)] transition hover:border-slate-300 hover:shadow-sm"
                            >
                                <header className="mb-4 flex items-start justify-between gap-2">
                                    <div className="flex min-w-0 items-center gap-2">
                                        {editingLayout && (
                                            <GripVertical className="size-4 shrink-0 cursor-grab text-slate-300" />
                                        )}
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
                                                onClick={() =>
                                                    setEditing(widget)
                                                }
                                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                            >
                                                <Settings2 className="size-4" />
                                            </button>
                                            <button
                                                title="Hapus card"
                                                onClick={() =>
                                                    setPendingDelete(widget)
                                                }
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
                                        <p className="text-xs leading-relaxed text-slate-500">
                                            Tombol langsung menampilkan perintah
                                            yang sedang dikirim. Status menjadi
                                            terkonfirmasi setelah ESP32 mengirim
                                            ACK.
                                        </p>
                                        {actuatorOptions.map((item) => {
                                            const pending =
                                                actuatorPending[item.key];
                                            return (
                                                <div
                                                    key={item.key}
                                                    className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-3"
                                                >
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <div
                                                            className={`grid size-9 shrink-0 place-items-center rounded-lg ${actuators[item.key] ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                                                        >
                                                            <item.Icon className="size-4" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-slate-800">
                                                                {item.title}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {item.desc}
                                                            </p>
                                                            <p className="mt-1 text-[11px] font-medium text-slate-500">
                                                                {pending
                                                                    ? `Mengirim: ${pending === 'on' ? 'ON' : 'OFF'}…`
                                                                    : actuatorConfirmed[
                                                                            item
                                                                                .key
                                                                        ]
                                                                      ? `Terkonfirmasi: ${actuators[item.key] ? 'aktif' : 'mati'}`
                                                                      : 'Belum ada konfirmasi dari ESP32'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        role="switch"
                                                        aria-label={`${item.title}: ${actuators[item.key] ? 'matikan' : 'nyalakan'}`}
                                                        aria-checked={
                                                            actuators[item.key]
                                                        }
                                                        disabled={
                                                            pending !== null
                                                        }
                                                        onClick={() =>
                                                            void sendActuator(
                                                                item.key,
                                                                !actuators[
                                                                    item.key
                                                                ],
                                                            )
                                                        }
                                                        className={`relative h-7 w-12 shrink-0 rounded-full transition ${actuators[item.key] ? 'bg-emerald-500' : 'bg-slate-200'} disabled:cursor-wait disabled:opacity-70`}
                                                    >
                                                        <span
                                                            className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${actuators[item.key] ? 'left-6' : 'left-1'}`}
                                                        />
                                                        {pending && (
                                                            <span className="absolute inset-0 grid place-items-center">
                                                                <RefreshCw className="size-3 animate-spin text-slate-600" />
                                                            </span>
                                                        )}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                                {widget.kind === 'schedules' && (
                                    <div className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <p className="text-xs leading-relaxed text-slate-500">
                                                Atur kapan aktuator dinyalakan
                                                atau dimatikan. Satu perangkat
                                                dapat memiliki banyak jadwal.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setScheduleForm(
                                                        defaultScheduleForm(),
                                                    )
                                                }
                                                disabled={!deviceId}
                                                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                <Plus className="size-3.5" />
                                                Tambah
                                            </button>
                                        </div>
                                        {schedules.length === 0 ? (
                                            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center">
                                                <CalendarClock className="mx-auto size-7 text-slate-300" />
                                                <p className="mt-2 text-sm font-medium text-slate-700">
                                                    Belum ada jadwal
                                                </p>
                                                <p className="mt-1 text-xs text-slate-400">
                                                    Tambahkan jadwal pertama
                                                    untuk perangkat ini.
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="space-y-2">
                                                {schedules.map((schedule) => {
                                                    const days =
                                                        schedule.days ?? [];
                                                    const everyDay =
                                                        days.length === 7;
                                                    const dayLabels = [
                                                        'Min',
                                                        'Sen',
                                                        'Sel',
                                                        'Rab',
                                                        'Kam',
                                                        'Jum',
                                                        'Sab',
                                                    ];
                                                    const selectedDays =
                                                        everyDay
                                                            ? 'Setiap hari'
                                                            : dayLabels
                                                                  .filter(
                                                                      (
                                                                          _,
                                                                          index,
                                                                      ) =>
                                                                          days.includes(
                                                                              index,
                                                                          ),
                                                                  )
                                                                  .join(', ');
                                                    const actuatorLabel =
                                                        actuatorOptions.find(
                                                            (item) =>
                                                                item.key ===
                                                                schedule.actuator,
                                                        )?.title ??
                                                        schedule.actuator;
                                                    return (
                                                        <div
                                                            key={schedule.id}
                                                            className="rounded-xl border border-slate-100 px-3 py-3"
                                                        >
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span
                                                                            className={`size-2 rounded-full ${schedule.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                                        />
                                                                        <span className="text-lg font-semibold tracking-tight text-slate-900">
                                                                            {schedule.time.slice(
                                                                                0,
                                                                                5,
                                                                            )}
                                                                        </span>
                                                                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                                                                            {schedule.state.toUpperCase()}
                                                                        </span>
                                                                    </div>
                                                                    <p className="mt-1 text-xs font-medium text-slate-700">
                                                                        {
                                                                            actuatorLabel
                                                                        }
                                                                    </p>
                                                                    <p className="mt-0.5 text-[11px] text-slate-400">
                                                                        {
                                                                            selectedDays
                                                                        }
                                                                    </p>
                                                                </div>
                                                                <div className="flex shrink-0 items-center gap-1">
                                                                    <button
                                                                        type="button"
                                                                        title="Edit jadwal"
                                                                        onClick={() =>
                                                                            setScheduleForm(
                                                                                {
                                                                                    id: schedule.id,
                                                                                    actuator:
                                                                                        schedule.actuator,
                                                                                    state: schedule.state,
                                                                                    time: schedule.time.slice(
                                                                                        0,
                                                                                        5,
                                                                                    ),
                                                                                    days: [
                                                                                        ...days,
                                                                                    ],
                                                                                    enabled:
                                                                                        schedule.enabled,
                                                                                },
                                                                            )
                                                                        }
                                                                        className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                                                    >
                                                                        <Settings2 className="size-4" />
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        title="Hapus jadwal"
                                                                        onClick={() =>
                                                                            void deleteSchedule(
                                                                                schedule,
                                                                            )
                                                                        }
                                                                        disabled={
                                                                            scheduleDeleting ===
                                                                            schedule.id
                                                                        }
                                                                        className="rounded-lg p-2 text-slate-300 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                                                                    >
                                                                        {scheduleDeleting ===
                                                                        schedule.id ? (
                                                                            <RefreshCw className="size-4 animate-spin" />
                                                                        ) : (
                                                                            <Trash2 className="size-4" />
                                                                        )}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                                {widget.kind === 'thresholds' && (
                                    <div className="space-y-3">
                                        {(
                                            [
                                                [
                                                    'temperature',
                                                    'Suhu',
                                                    `${thresholds.temperatureMin}–${thresholds.temperatureMax} °C`,
                                                    Thermometer,
                                                ],
                                                [
                                                    'humidity',
                                                    'Kelembapan',
                                                    `${thresholds.humidityMin}–${thresholds.humidityMax}%`,
                                                    Droplets,
                                                ],
                                                [
                                                    'light',
                                                    'Cahaya',
                                                    `${thresholds.lightMin}–${thresholds.lightMax}%`,
                                                    Lightbulb,
                                                ],
                                            ] as const
                                        ).map(([key, label, range, Icon]) => (
                                            <div
                                                key={key}
                                                className="rounded-xl bg-slate-50 px-3 py-3"
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="flex items-center gap-2 text-sm text-slate-600">
                                                        <Icon className="size-4 text-slate-400" />
                                                        {label}
                                                    </span>
                                                    <span className="text-sm font-semibold text-slate-800">
                                                        {range}
                                                    </span>
                                                </div>
                                                <p className="mt-2 text-[11px] text-slate-500">
                                                    {ruleActuators[key].length >
                                                    0
                                                        ? `Aktuator: ${ruleActuators[key].map((item) => actuatorOptions.find((option) => option.key === item)?.title ?? item).join(', ')}`
                                                        : 'Belum ada aktuator otomatis'}
                                                </p>
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
                                            Atur ambang batas & aktuator
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
                                                        value: (Number.isFinite(
                                                            reading.temperature,
                                                        )
                                                            ? reading.temperature
                                                            : 0
                                                        ).toFixed(1),
                                                        unit: '°C',
                                                    },
                                                    {
                                                        name: 'Kelembapan',
                                                        value: (Number.isFinite(
                                                            reading.humidity,
                                                        )
                                                            ? reading.humidity
                                                            : 0
                                                        ).toFixed(1),
                                                        unit: '%',
                                                    },
                                                    {
                                                        name: 'Cahaya',
                                                        value: (Number.isFinite(
                                                            reading.light,
                                                        )
                                                            ? reading.light
                                                            : 0
                                                        ).toFixed(1),
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
            {scheduleForm && (
                <div
                    className="fixed inset-0 z-[65] grid place-items-center bg-slate-950/40 p-4"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setScheduleForm(null);
                    }}
                >
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="schedule-title"
                        className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2
                                    id="schedule-title"
                                    className="text-lg font-semibold text-slate-900"
                                >
                                    {scheduleForm.id
                                        ? 'Edit jadwal aktuator'
                                        : 'Tambah jadwal aktuator'}
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Jadwal berjalan otomatis sesuai waktu dan
                                    hari yang dipilih.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setScheduleForm(null)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            <label className="text-sm font-medium text-slate-700">
                                Aktuator
                                <select
                                    value={scheduleForm.actuator}
                                    onChange={(e) =>
                                        setScheduleForm((previous) =>
                                            previous
                                                ? {
                                                      ...previous,
                                                      actuator: e.target
                                                          .value as ActuatorKey,
                                                  }
                                                : previous,
                                        )
                                    }
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                                >
                                    {actuatorOptions.map((item) => (
                                        <option key={item.key} value={item.key}>
                                            {item.title}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-sm font-medium text-slate-700">
                                Waktu
                                <input
                                    type="time"
                                    value={scheduleForm.time}
                                    onChange={(e) =>
                                        setScheduleForm((previous) =>
                                            previous
                                                ? {
                                                      ...previous,
                                                      time: e.target.value,
                                                  }
                                                : previous,
                                        )
                                    }
                                    className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-900 focus:ring-2 focus:ring-slate-100"
                                />
                            </label>
                        </div>
                        <div className="mt-4">
                            <p className="text-sm font-medium text-slate-700">
                                Aksi
                            </p>
                            <div className="mt-1.5 grid grid-cols-2 gap-2">
                                {(['on', 'off'] as const).map((state) => (
                                    <button
                                        key={state}
                                        type="button"
                                        onClick={() =>
                                            setScheduleForm((previous) =>
                                                previous
                                                    ? { ...previous, state }
                                                    : previous,
                                            )
                                        }
                                        className={`rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${scheduleForm.state === state ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {state === 'on'
                                            ? 'Nyalakan'
                                            : 'Matikan'}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="mt-5">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-medium text-slate-700">
                                        Hari
                                    </p>
                                    <p className="mt-0.5 text-xs text-slate-400">
                                        Pilih setiap hari atau hari tertentu.
                                        Waktu mengikuti Asia/Jakarta.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setScheduleForm((previous) =>
                                            previous
                                                ? {
                                                      ...previous,
                                                      days:
                                                          previous.days
                                                              .length === 7
                                                              ? []
                                                              : [
                                                                    0, 1, 2, 3,
                                                                    4, 5, 6,
                                                                ],
                                                  }
                                                : previous,
                                        )
                                    }
                                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${scheduleForm.days.length === 7 ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                >
                                    Setiap hari
                                </button>
                            </div>
                            <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                                {[
                                    ['Min', 0],
                                    ['Sen', 1],
                                    ['Sel', 2],
                                    ['Rab', 3],
                                    ['Kam', 4],
                                    ['Jum', 5],
                                    ['Sab', 6],
                                ].map(([label, day]) => {
                                    const selected = scheduleForm.days.includes(
                                        day as number,
                                    );
                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() =>
                                                toggleScheduleDay(day as number)
                                            }
                                            className={`rounded-xl border px-2 py-2.5 text-xs font-semibold transition ${selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        <label className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-3">
                            <span>
                                <span className="block text-sm font-medium text-slate-700">
                                    Jadwal aktif
                                </span>
                                <span className="mt-0.5 block text-xs text-slate-400">
                                    Nonaktifkan sementara tanpa menghapus.
                                </span>
                            </span>
                            <input
                                type="checkbox"
                                checked={scheduleForm.enabled}
                                onChange={(e) =>
                                    setScheduleForm((previous) =>
                                        previous
                                            ? {
                                                  ...previous,
                                                  enabled: e.target.checked,
                                              }
                                            : previous,
                                    )
                                }
                                className="size-4 accent-slate-900"
                            />
                        </label>
                        <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-5">
                            <button
                                type="button"
                                onClick={() => setScheduleForm(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                disabled={
                                    scheduleSaving ||
                                    !scheduleForm.time ||
                                    scheduleForm.days.length === 0
                                }
                                onClick={() => void saveSchedule()}
                                className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-wait disabled:opacity-50"
                            >
                                {scheduleSaving
                                    ? 'Menyimpan…'
                                    : 'Simpan jadwal'}
                            </button>
                        </div>
                    </section>
                </div>
            )}

            {pendingDelete && (
                <div
                    className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/40 p-4"
                    role="presentation"
                >
                    <section
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="delete-widget-title"
                        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
                    >
                        <h2
                            id="delete-widget-title"
                            className="text-lg font-semibold text-slate-900"
                        >
                            Hapus card?
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Apakah Anda yakin ingin menghapus card “
                            {pendingDelete.title}” dari layout perangkat ini?
                        </p>
                        <div className="mt-6 flex justify-end gap-2">
                            <button
                                onClick={() => setPendingDelete(null)}
                                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    setWidgets((prev) => {
                                        const next = prev.filter(
                                            (widget) =>
                                                widget.id !== pendingDelete.id,
                                        );
                                        window.localStorage.setItem(
                                            `supathings:${deviceId}:widgets`,
                                            JSON.stringify(next),
                                        );
                                        return next;
                                    });
                                    setPendingDelete(null);
                                    setNotice(
                                        'Card berhasil dihapus dari layout.',
                                    );
                                }}
                                className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700"
                            >
                                Ya, hapus card
                            </button>
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
                                        ) : item.kind === 'schedules' ? (
                                            <CalendarClock className="size-4" />
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
                    <div
                        className={`w-full rounded-2xl bg-white shadow-2xl ${editing.kind === 'thresholds' ? 'max-h-[92vh] max-w-6xl overflow-hidden' : 'max-w-md p-6'}`}
                    >
                        <div
                            className={`flex items-start justify-between border-b border-slate-100 ${editing.kind === 'thresholds' ? 'px-6 py-5' : 'mb-5'}`}
                        >
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
                            <div className="max-h-[calc(92vh-88px)] overflow-y-auto px-6 py-6">
                                <div className="mb-5 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700">
                                            <Settings2 className="size-4" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">
                                                Atur kondisi otomatis
                                            </p>
                                            <p className="mt-1 text-xs leading-relaxed text-slate-600">
                                                Tentukan rentang aman untuk
                                                setiap sensor, kemudian pilih
                                                actuator yang akan dijalankan
                                                ketika kondisi keluar dari
                                                rentang tersebut.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid gap-5 lg:grid-cols-3">
                                    {(
                                        [
                                            [
                                                'temperature',
                                                'Suhu',
                                                '°C',
                                                'temperatureMin',
                                                'temperatureMax',
                                                'Di atas maksimum',
                                            ],
                                            [
                                                'humidity',
                                                'Kelembapan',
                                                '%',
                                                'humidityMin',
                                                'humidityMax',
                                                'Di bawah minimum',
                                            ],
                                            [
                                                'light',
                                                'Cahaya',
                                                '%',
                                                'lightMin',
                                                'lightMax',
                                                'Di bawah minimum',
                                            ],
                                        ] as const
                                    ).map(
                                        ([
                                            key,
                                            label,
                                            unit,
                                            minKey,
                                            maxKey,
                                            trigger,
                                        ]) => (
                                            <div
                                                key={key}
                                                className="rounded-2xl border border-slate-200 p-4"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">
                                                            {label}
                                                        </p>
                                                        <p className="mt-0.5 text-xs text-slate-500">
                                                            Pemicu: {trigger}
                                                        </p>
                                                    </div>
                                                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                                        {thresholds[minKey]}–
                                                        {thresholds[maxKey]}{' '}
                                                        {unit}
                                                    </span>
                                                </div>
                                                <div className="mt-3 grid grid-cols-2 gap-3">
                                                    <label className="text-xs font-medium text-slate-600">
                                                        Minimum
                                                        <input
                                                            type="number"
                                                            value={
                                                                thresholds[
                                                                    minKey
                                                                ]
                                                            }
                                                            onChange={(e) =>
                                                                setThresholds(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        [minKey]:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    }),
                                                                )
                                                            }
                                                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                        />
                                                    </label>
                                                    <label className="text-xs font-medium text-slate-600">
                                                        Maksimum
                                                        <input
                                                            type="number"
                                                            value={
                                                                thresholds[
                                                                    maxKey
                                                                ]
                                                            }
                                                            onChange={(e) =>
                                                                setThresholds(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        [maxKey]:
                                                                            e
                                                                                .target
                                                                                .value,
                                                                    }),
                                                                )
                                                            }
                                                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                                        />
                                                    </label>
                                                </div>
                                                <div className="mt-4">
                                                    <p className="mb-2 text-xs font-semibold text-slate-700">
                                                        Aktuator yang
                                                        dikendalikan
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                                        {actuatorOptions.map(
                                                            (item) => {
                                                                const selected =
                                                                    ruleActuators[
                                                                        key
                                                                    ].includes(
                                                                        item.key,
                                                                    );
                                                                return (
                                                                    <button
                                                                        key={
                                                                            item.key
                                                                        }
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setRuleActuators(
                                                                                (
                                                                                    prev,
                                                                                ) => ({
                                                                                    ...prev,
                                                                                    [key]: selected
                                                                                        ? prev[
                                                                                              key
                                                                                          ].filter(
                                                                                              (
                                                                                                  value,
                                                                                              ) =>
                                                                                                  value !==
                                                                                                  item.key,
                                                                                          )
                                                                                        : [
                                                                                              ...prev[
                                                                                                  key
                                                                                              ],
                                                                                              item.key,
                                                                                          ],
                                                                                }),
                                                                            )
                                                                        }
                                                                        className={`rounded-xl border px-3 py-2.5 text-left transition ${selected ? 'border-blue-500 bg-blue-50 text-blue-800 ring-1 ring-blue-200' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                                                                    >
                                                                        <span className="flex items-center gap-2 text-xs font-semibold">
                                                                            <item.Icon className="size-4 shrink-0" />
                                                                            {
                                                                                item.title
                                                                            }
                                                                        </span>
                                                                    </button>
                                                                );
                                                            },
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>
                                <div className="mt-6 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                                    <p className="text-xs text-slate-500">
                                        Perubahan akan diterapkan pada mode
                                        otomatis perangkat.
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setEditing(null)}
                                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                        >
                                            Batal
                                        </button>
                                        <button
                                            type="button"
                                            disabled={thresholdSaving}
                                            onClick={() =>
                                                void saveThresholds()
                                            }
                                            className="rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-wait disabled:opacity-60"
                                        >
                                            {thresholdSaving
                                                ? 'Menyimpan…'
                                                : 'Simpan pengaturan'}
                                        </button>
                                    </div>
                                </div>
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
