import { Head, Link } from '@inertiajs/react';
import { Activity, ArrowUpRight, Droplets, Gauge, Lightbulb, Plus, RadioTower, Thermometer, Wind } from 'lucide-react';

const stats = [
    { label: 'Suhu kumbung', value: '28.4', unit: '°C', icon: Thermometer, note: 'Target 24–30°C', tone: 'blue' },
    { label: 'Kelembapan', value: '86', unit: '%', icon: Droplets, note: 'Target 80–90%', tone: 'green' },
    { label: 'Intensitas cahaya', value: '340', unit: 'lux*', icon: Lightbulb, note: 'Sensor LDR · relatif', tone: 'mint' },
    { label: 'Perangkat aktif', value: '0', unit: '/ 1', icon: RadioTower, note: 'Hubungkan ESP32 untuk data live', tone: 'blue' },
];
const toneClass: Record<string, string> = { blue: 'bg-blue-50 text-blue-700', green: 'bg-emerald-50 text-emerald-700', mint: 'bg-teal-50 text-teal-700' };

export default function Dashboard() {
    return <><Head title="Dashboard" />
        <main className="space-y-7 p-5 md:p-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div><p className="mb-2 text-sm font-medium text-emerald-700">RINGKASAN KUMBUNG</p><h1 className="text-3xl font-semibold tracking-tight text-slate-900">Dashboard</h1><p className="mt-2 text-sm text-slate-500">Pantau kondisi budidaya jamur tiram dalam satu tempat.</p></div>
                <Link href="/monitoring" className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"><Activity size={16}/> Buka monitoring <ArrowUpRight size={16}/></Link>
            </div>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((item) => <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><p className="text-sm font-medium text-slate-500">{item.label}</p><span className={`rounded-xl p-2 ${toneClass[item.tone]}`}><item.icon size={19}/></span></div><div className="mt-5 flex items-baseline gap-1"><span className="text-3xl font-semibold tracking-tight text-slate-900">{item.value}</span><span className="text-sm text-slate-500">{item.unit}</span></div><p className="mt-2 text-xs text-slate-500">{item.note}</p></article>)}</section>
            <section className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
                <article className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-900">Kondisi lingkungan</h2><p className="mt-1 text-sm text-slate-500">Ringkasan pembacaan sensor terbaru</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Menunggu device</span></div><div className="mt-8 flex min-h-48 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-center"><span className="rounded-2xl bg-white p-3 text-blue-700 shadow-sm"><RadioTower size={24}/></span><p className="mt-4 font-medium text-slate-800">Belum ada data realtime</p><p className="mt-1 max-w-sm text-sm text-slate-500">Hubungkan ESP32 untuk mulai menerima suhu, kelembapan, dan cahaya melalui WebSocket.</p><Link href="/devices" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800"><Plus size={16}/> Kelola device</Link></div></article>
                <article className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-slate-900">Kontrol aktuator</h2><p className="mt-1 text-sm text-slate-500">Status pompa dan blower</p></div><Wind size={19} className="text-emerald-700"/></div><div className="mt-5 space-y-3">{[{name:'Pompa mist',desc:'Pengabutan kumbung',icon:Droplets},{name:'Pompa water',desc:'Penyiraman',icon:Gauge},{name:'Blower',desc:'Sirkulasi udara',icon:Wind}].map(a=><div key={a.name} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3"><span className="rounded-lg bg-slate-50 p-2 text-slate-500"><a.icon size={18}/></span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-800">{a.name}</p><p className="text-xs text-slate-500">{a.desc}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">Offline</span></div>)}</div><Link href="/monitoring" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-700">Buka kontrol <ArrowUpRight size={15}/></Link></article>
            </section>
            <p className="text-xs text-slate-400">*Pembacaan LDR bersifat relatif sampai sensor dikalibrasi. Nilai contoh pada tampilan ini bukan data sensor aktual.</p>
        </main>
    </>;
}
