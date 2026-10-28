import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

type Owner = { id: number; name: string; email: string };
type Device = {
    id: number;
    name: string;
    mac_address: string;
    status: string;
    control_mode: string;
    last_seen_at: string | null;
    updated_at: string;
    user: Owner | null;
};
type UserOption = { id: number; name: string; email: string };
type PaginationLink = { url: string | null; label: string; active: boolean };
type Props = {
    devices: { data: Device[]; links: PaginationLink[]; current_page: number; last_page: number };
    users: UserOption[];
    filters: { search: string };
};
const date = (value: string | null) => value ? new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : 'Belum ada data';

export default function AdminDevices({ devices, users, filters }: Props) {
    const [search, setSearch] = useState(filters.search);
    const applySearch = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get('/admin/devices', { search }, { preserveState: true, preserveScroll: true });
    };
    const editDevice = (device: Device) => {
        const name = window.prompt('Nama perangkat', device.name);
        if (name === null) return;
        if (!name.trim()) {
            window.alert('Nama perangkat wajib diisi.');
            return;
        }
        const ownerText = window.prompt(
            'Masukkan ID pemilik baru. Pemilik saat ini: ' + (device.user?.name ?? 'Tidak diketahui') + '. ID tersedia: ' + users.map((user) => user.id + ' (' + user.name + ')').join(', '),
            String(device.user?.id ?? ''),
        );
        if (ownerText === null) return;
        const ownerId = Number(ownerText);
        if (!users.some((user) => user.id === ownerId)) {
            window.alert('ID pemilik tidak valid atau akun tidak aktif.');
            return;
        }
        if (!window.confirm('Simpan perubahan nama atau kepemilikan perangkat ' + device.mac_address + '?')) return;
        router.patch('/admin/devices/' + device.id, { name: name.trim(), user_id: ownerId }, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Kelola Perangkat" />
            <main className="min-h-full bg-slate-50 px-4 py-6 md:px-8 md:py-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <header>
                        <p className="text-sm text-slate-500">Supathings / Administrasi</p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Kelola perangkat</h1>
                        <p className="mt-1 text-sm text-slate-500">Perangkat dapat dipindahkan ke akun aktif. Token perangkat tidak ditampilkan di panel ini.</p>
                    </header>
                    <form onSubmit={applySearch} className="flex gap-3 rounded-2xl border bg-white p-4">
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama, MAC address, atau pemilik" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" />
                        <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Cari</button>
                    </form>
                    <section className="overflow-hidden rounded-2xl border bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[850px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                    <tr><th className="px-4 py-3">Perangkat</th><th className="px-4 py-3">Pemilik</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Terakhir aktif</th><th className="px-4 py-3">Aksi</th></tr>
                                </thead>
                                <tbody className="divide-y">
                                    {devices.data.map((device) => (
                                        <tr key={device.id}>
                                            <td className="px-4 py-4"><p className="font-medium">{device.name}</p><p className="text-xs text-slate-500">{device.mac_address} · Mode {device.control_mode}</p></td>
                                            <td className="px-4 py-4"><p>{device.user?.name ?? 'Pemilik tidak tersedia'}</p><p className="text-xs text-slate-500">{device.user?.email ?? '—'}</p></td>
                                            <td className="px-4 py-4">{device.status === 'online' ? 'Online' : 'Offline'}</td>
                                            <td className="px-4 py-4">{date(device.last_seen_at)}</td>
                                            <td className="px-4 py-4"><button type="button" onClick={() => editDevice(device)} className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-slate-50">Ubah / pindahkan</button></td>
                                        </tr>
                                    ))}
                                    {devices.data.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Belum ada perangkat yang cocok.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
                            <p className="text-xs text-slate-500">Halaman {devices.current_page} dari {devices.last_page}</p>
                            <nav className="flex flex-wrap gap-1" aria-label="Navigasi halaman perangkat">
                                {devices.links.map((link, index) => (
                                    <button key={index} type="button" disabled={!link.url} onClick={() => link.url && router.visit(link.url, { preserveScroll: true })} className={`rounded-lg border px-3 py-2 text-xs disabled:opacity-40 ${link.active ? 'bg-blue-700 text-white' : 'bg-white'}`}>
                                        {link.label.replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&hellip;/g, '…')}
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </section>
                </div>
            </main>
        </>
    );
}
AdminDevices.layout = { breadcrumbs: [{ title: 'Kelola perangkat', href: '/admin/devices' }] };
