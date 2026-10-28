import { Head, router } from '@inertiajs/react';
import { useState } from 'react';

type ManagedUser = {
    id: number;
    name: string;
    email: string;
    role: 'admin' | 'user';
    is_active: boolean;
    created_at: string;
    email_verified_at: string | null;
};

type PaginationLink = { url: string | null; label: string; active: boolean };
type PageData = { data: ManagedUser[]; links: PaginationLink[]; current_page: number; last_page: number };
type Props = {
    users: PageData;
    filters: { search: string; role: string; status: string };
    activeAdminCount: number;
};

const date = (value: string) => new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

export default function AdminUsers({ users, filters, activeAdminCount }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [role, setRole] = useState(filters.role);
    const [status, setStatus] = useState(filters.status);

    const applyFilters = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get('/admin/users', { search, role, status }, { preserveState: true, preserveScroll: true });
    };

    const updateUser = (user: ManagedUser) => {
        const nextRole = window.prompt('Role pengguna: admin atau user', user.role);
        if (nextRole === null) return;
        if (nextRole !== 'admin' && nextRole !== 'user') {
            window.alert('Role harus admin atau user.');
            return;
        }
        const activeInput = window.prompt('Status akun: aktif atau nonaktif', user.is_active ? 'aktif' : 'nonaktif');
        if (activeInput === null) return;
        if (activeInput !== 'aktif' && activeInput !== 'nonaktif') {
            window.alert('Status harus aktif atau nonaktif.');
            return;
        }
        if (!window.confirm(`Simpan perubahan akses untuk ${user.name}?`)) return;
        router.patch(`/admin/users/${user.id}`, {
            role: nextRole,
            is_active: activeInput === 'aktif',
        }, { preserveScroll: true });
    };

    return (
        <>
            <Head title="Kelola Pengguna" />
            <main className="min-h-full bg-slate-50 px-4 py-6 md:px-8 md:py-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <header>
                        <p className="text-sm text-slate-500">Supathings / Administrasi</p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Kelola pengguna</h1>
                        <p className="mt-1 text-sm text-slate-500">Atur role dan status akun. Perubahan akses dicatat ke audit log.</p>
                    </header>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                        Terdapat {activeAdminCount} admin aktif. Sistem harus selalu memiliki setidaknya satu admin aktif.
                    </div>
                    <form onSubmit={applyFilters} className="flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row">
                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama atau email" className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm" />
                        <select value={role} onChange={(event) => setRole(event.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                            <option value="">Semua role</option>
                            <option value="admin">Admin</option>
                            <option value="user">User</option>
                        </select>
                        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border px-3 py-2 text-sm">
                            <option value="">Semua status</option>
                            <option value="active">Aktif</option>
                            <option value="inactive">Nonaktif</option>
                        </select>
                        <button type="submit" className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">Terapkan</button>
                    </form>
                    <section className="overflow-hidden rounded-2xl border bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">Pengguna</th>
                                        <th className="px-4 py-3">Role</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Verifikasi email</th>
                                        <th className="px-4 py-3">Terdaftar</th>
                                        <th className="px-4 py-3">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {users.data.map((user) => (
                                        <tr key={user.id}>
                                            <td className="px-4 py-4">
                                                <p className="font-medium text-slate-900">{user.name}</p>
                                                <p className="text-xs text-slate-500">{user.email}</p>
                                            </td>
                                            <td className="px-4 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium">{user.role === 'admin' ? 'Admin' : 'User'}</span></td>
                                            <td className="px-4 py-4">{user.is_active ? 'Aktif' : 'Nonaktif'}</td>
                                            <td className="px-4 py-4">{user.email_verified_at ? 'Terverifikasi' : 'Belum'}</td>
                                            <td className="px-4 py-4">{date(user.created_at)}</td>
                                            <td className="px-4 py-4"><button type="button" onClick={() => updateUser(user)} className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-slate-50">Ubah akses</button></td>
                                        </tr>
                                    ))}
                                    {users.data.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Tidak ada pengguna yang cocok dengan filter.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
                            <p className="text-xs text-slate-500">Halaman {users.current_page} dari {users.last_page}</p>
                            <nav className="flex flex-wrap gap-1" aria-label="Navigasi halaman pengguna">
                                {users.links.map((link, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        disabled={!link.url}
                                        onClick={() => link.url && router.visit(link.url, { preserveScroll: true })}
                                        className={`rounded-lg border px-3 py-2 text-xs disabled:opacity-40 ${link.active ? 'bg-blue-700 text-white' : 'bg-white'}`}
                                    >
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

AdminUsers.layout = {
    breadcrumbs: [{ title: 'Kelola pengguna', href: '/admin/users' }],
};
