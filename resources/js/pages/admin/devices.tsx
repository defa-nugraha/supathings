import { Head, router } from '@inertiajs/react';
import ActionModal from '@/components/action-modal';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

type Props = {
    devices: {
        data: Device[];
        links: PaginationLink[];
        current_page: number;
        last_page: number;
    };
    users: UserOption[];
    filters: { search: string };
};

const date = (value: string | null) =>
    value
        ? new Date(value).toLocaleString('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
          })
        : 'Belum ada data';

export default function AdminDevices({ devices, users, filters }: Props) {
    const [search, setSearch] = useState(filters.search);
    const [editing, setEditing] = useState<Device | null>(null);
    const [editName, setEditName] = useState('');
    const [editOwnerId, setEditOwnerId] = useState('');
    const [confirmSave, setConfirmSave] = useState(false);
    const [result, setResult] = useState<{
        variant: 'success' | 'error';
        title: string;
        description: string;
    } | null>(null);

    const applySearch = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        router.get(
            '/admin/devices',
            { search },
            { preserveState: true, preserveScroll: true },
        );
    };

    const editDevice = (device: Device) => {
        setEditing(device);
        setEditName(device.name);
        setEditOwnerId(String(device.user?.id ?? ''));
    };

    const requestSave = () => {
        if (!editing || !editName.trim()) {
            setResult({
                variant: 'error',
                title: 'Data belum lengkap',
                description: 'Nama perangkat wajib diisi.',
            });
            return;
        }
        const ownerId = Number(editOwnerId);
        if (!users.some((user) => user.id === ownerId)) {
            setResult({
                variant: 'error',
                title: 'Pemilik tidak valid',
                description: 'ID pemilik tidak valid atau akun tidak aktif.',
            });
            return;
        }
        setConfirmSave(true);
    };

    const saveDevice = () => {
        if (!editing) return;
        router.patch(
            '/admin/devices/' + editing.id,
            { name: editName.trim(), user_id: Number(editOwnerId) },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setEditing(null);
                    setConfirmSave(false);
                    setResult({
                        variant: 'success',
                        title: 'Perubahan berhasil disimpan',
                        description:
                            'Nama dan kepemilikan perangkat berhasil diperbarui.',
                    });
                },
                onError: () => {
                    setConfirmSave(false);
                    setResult({
                        variant: 'error',
                        title: 'Perubahan gagal',
                        description:
                            'Perubahan perangkat gagal disimpan. Periksa kembali data lalu coba lagi.',
                    });
                },
            },
        );
    };

    return (
        <>
            <ActionModal
                open={confirmSave}
                onOpenChange={setConfirmSave}
                variant="confirm"
                title="Simpan perubahan perangkat?"
                description={
                    editing
                        ? 'Simpan perubahan nama atau kepemilikan perangkat ' +
                          editing.mac_address +
                          '?'
                        : ''
                }
                confirmLabel="Simpan perubahan"
                onConfirm={saveDevice}
            />
            <ActionModal
                open={Boolean(result)}
                onOpenChange={(open) => !open && setResult(null)}
                variant={result?.variant}
                title={result?.title ?? ''}
                description={result?.description ?? ''}
            />
            <Dialog
                open={Boolean(editing)}
                onOpenChange={(open) => !open && setEditing(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit perangkat</DialogTitle>
                        <DialogDescription>
                            Perbarui nama dan pemilik perangkat.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid gap-2">
                            <Label htmlFor="admin-device-name">
                                Nama perangkat
                            </Label>
                            <Input
                                id="admin-device-name"
                                value={editName}
                                onChange={(event) =>
                                    setEditName(event.target.value)
                                }
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="admin-device-owner">Pemilik</Label>
                            <select
                                id="admin-device-owner"
                                value={editOwnerId}
                                onChange={(event) =>
                                    setEditOwnerId(event.target.value)
                                }
                                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">Pilih pemilik</option>
                                {users.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} ({user.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditing(null)}
                        >
                            Batal
                        </Button>
                        <Button onClick={requestSave}>Simpan perubahan</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Head title="Kelola Perangkat" />
            <main className="min-h-full bg-slate-50 px-4 py-6 md:px-8 md:py-8">
                <div className="mx-auto max-w-7xl space-y-6">
                    <header>
                        <p className="text-sm text-slate-500">
                            Supathings / Administrasi
                        </p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                            Kelola perangkat
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            Perangkat dapat dipindahkan ke akun aktif. Token
                            perangkat tidak ditampilkan di panel ini.
                        </p>
                    </header>

                    <form
                        onSubmit={applySearch}
                        className="flex gap-3 rounded-2xl border bg-white p-4"
                    >
                        <input
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Cari nama, MAC address, atau pemilik"
                            className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
                        />
                        <button
                            type="submit"
                            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white"
                        >
                            Cari
                        </button>
                    </form>

                    <section className="overflow-hidden rounded-2xl border bg-white">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[850px] text-left text-sm">
                                <thead className="bg-slate-50 text-xs tracking-wide text-slate-500 uppercase">
                                    <tr>
                                        <th className="px-4 py-3">Perangkat</th>
                                        <th className="px-4 py-3">Pemilik</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">
                                            Terakhir aktif
                                        </th>
                                        <th className="px-4 py-3">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {devices.data.map((device) => (
                                        <tr key={device.id}>
                                            <td className="px-4 py-4">
                                                <p className="font-medium">
                                                    {device.name}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {device.mac_address} · Mode{' '}
                                                    {device.control_mode}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4">
                                                <p>
                                                    {device.user?.name ??
                                                        'Pemilik tidak tersedia'}
                                                </p>
                                                <p className="text-xs text-slate-500">
                                                    {device.user?.email ?? '—'}
                                                </p>
                                            </td>
                                            <td className="px-4 py-4">
                                                {device.status === 'online'
                                                    ? 'Online'
                                                    : 'Offline'}
                                            </td>
                                            <td className="px-4 py-4">
                                                {date(device.last_seen_at)}
                                            </td>
                                            <td className="px-4 py-4">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        editDevice(device)
                                                    }
                                                    className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                                                >
                                                    Ubah / pindahkan
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {devices.data.length === 0 && (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="px-4 py-10 text-center text-slate-500"
                                            >
                                                Belum ada perangkat yang cocok.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4">
                            <p className="text-xs text-slate-500">
                                Halaman {devices.current_page} dari{' '}
                                {devices.last_page}
                            </p>
                            <nav
                                className="flex flex-wrap gap-1"
                                aria-label="Navigasi halaman perangkat"
                            >
                                {devices.links.map((link, index) => (
                                    <button
                                        key={index}
                                        type="button"
                                        disabled={!link.url}
                                        onClick={() =>
                                            link.url &&
                                            router.visit(link.url, {
                                                preserveScroll: true,
                                            })
                                        }
                                        className={`rounded-lg border px-3 py-2 text-xs disabled:opacity-40 ${
                                            link.active
                                                ? 'bg-blue-700 text-white'
                                                : 'bg-white'
                                        }`}
                                    >
                                        {link.label
                                            .replace(/&laquo;/g, '«')
                                            .replace(/&raquo;/g, '»')
                                            .replace(/&hellip;/g, '…')}
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

AdminDevices.layout = {
    breadcrumbs: [{ title: 'Kelola perangkat', href: '/admin/devices' }],
};
