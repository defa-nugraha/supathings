import { Head, Link } from '@inertiajs/react';
import { Activity, Cpu, Sprout, Users } from 'lucide-react';

type Stats = {
    users: number;
    activeUsers: number;
    devices: number;
    onlineDevices: number;
    batches: number;
    harvests: number;
    pendingCommands: number;
};

export default function AdminDashboard({ stats }: { stats: Stats }) {
    const cards = [
        { label: 'Total pengguna', value: stats.users, detail: `${stats.activeUsers} akun aktif`, Icon: Users },
        { label: 'Perangkat IoT', value: stats.devices, detail: `${stats.onlineDevices} perangkat online`, Icon: Cpu },
        { label: 'Batch budidaya', value: stats.batches, detail: 'Seluruh pengguna', Icon: Sprout },
        { label: 'Perintah menunggu', value: stats.pendingCommands, detail: `${stats.harvests} catatan panen tersimpan`, Icon: Activity },
    ];

    return (
        <>
            <Head title="Dashboard Admin" />
            <main className="min-h-full bg-slate-50 px-4 py-6 md:px-8 md:py-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <header>
                        <p className="text-sm text-slate-500">Supathings / Administrasi</p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Dashboard Admin</h1>
                        <p className="mt-1 text-sm text-slate-500">Ringkasan operasional seluruh pengguna dan perangkat.</p>
                    </header>
                    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {cards.map(({ label, value, detail, Icon }) => (
                            <article key={label} className="rounded-2xl border bg-white p-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-slate-500">{label}</p>
                                    <Icon className="size-5 text-blue-700" />
                                </div>
                                <p className="mt-4 text-3xl font-semibold">{value.toLocaleString('id-ID')}</p>
                                <p className="mt-2 text-xs text-slate-500">{detail}</p>
                            </article>
                        ))}
                    </section>
                    <section className="rounded-2xl border bg-white p-5">
                        <h2 className="text-lg font-semibold">Administrasi</h2>
                        <p className="mt-1 text-sm text-slate-500">Kelola akses pengguna dengan prinsip least privilege.</p>
                        <Link href="/admin/users" className="mt-4 inline-flex rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">
                            Kelola pengguna
                        </Link>
                    </section>
                </div>
            </main>
        </>
    );
}

AdminDashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard Admin', href: '/admin/dashboard' }],
};
