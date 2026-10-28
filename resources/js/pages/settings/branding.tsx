import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useRef } from 'react';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type BrandingSettings = {
    appName: string;
    logoUrl: string | null;
};

type PageProps = {
    brandingSettings: BrandingSettings;
};

export default function BrandingSettingsPage() {
    const { brandingSettings } = usePage<PageProps>().props;
    const logoInput = useRef<HTMLInputElement>(null);
    const { data, setData, post, processing, errors, progress } = useForm<{
        app_name: string;
        logo: File | null;
    }>({
        app_name: brandingSettings.appName,
        logo: null,
    });

    function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        post('/settings/branding', {
            forceFormData: true,
            preserveScroll: true,
        });
    }

    function removeLogo() {
        router.delete('/settings/branding/logo', {
            preserveScroll: true,
            onSuccess: () => {
                setData('logo', null);
                if (logoInput.current) {
                    logoInput.current.value = '';
                }
            },
        });
    }

    return (
        <>
            <Head title="Identitas aplikasi" />
            <div className="space-y-6">
                <Heading
                    variant="small"
                    title="Identitas aplikasi"
                    description="Atur nama dan logo yang digunakan di seluruh halaman aplikasi."
                />

                <form onSubmit={submit} className="space-y-6">
                    <div className="grid gap-2">
                        <Label htmlFor="app_name">Nama aplikasi</Label>
                        <Input
                            id="app_name"
                            name="app_name"
                            value={data.app_name}
                            onChange={(event) =>
                                setData('app_name', event.target.value)
                            }
                            maxLength={60}
                            required
                            autoComplete="off"
                            placeholder="Masukkan nama aplikasi"
                        />
                        <p className="text-sm text-muted-foreground">
                            Nama ini digunakan sebagai identitas aplikasi dan
                            judul halaman.
                        </p>
                        <InputError message={errors.app_name} />
                    </div>

                    <div className="grid gap-3">
                        <Label htmlFor="logo">Logo aplikasi</Label>
                        <div className="flex min-h-28 items-center gap-4 rounded-lg border border-dashed p-4">
                            <img
                                src={
                                    brandingSettings.logoUrl ??
                                    '/brand/supathings-logo.jpg'
                                }
                                alt={`Pratinjau logo ${
                                    data.app_name || brandingSettings.appName
                                }`}
                                className="h-20 w-32 object-contain"
                            />
                            <div className="min-w-0 flex-1 space-y-2">
                                <Input
                                    ref={logoInput}
                                    id="logo"
                                    name="logo"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={(event) =>
                                        setData(
                                            'logo',
                                            event.target.files?.[0] ?? null,
                                        )
                                    }
                                />
                                <p className="text-xs text-muted-foreground">
                                    JPG, PNG, atau WEBP. Maksimal 2 MB.
                                </p>
                                <InputError message={errors.logo} />
                            </div>
                        </div>
                        {progress && (
                            <p className="text-sm text-muted-foreground">
                                Mengunggah logo: {progress.percentage}%
                            </p>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button type="submit" disabled={processing}>
                            {processing ? 'Menyimpan...' : 'Simpan perubahan'}
                        </Button>
                        {brandingSettings.logoUrl && (
                            <Button
                                type="button"
                                variant="outline"
                                disabled={processing}
                                onClick={removeLogo}
                            >
                                Hapus logo khusus
                            </Button>
                        )}
                    </div>
                </form>
            </div>
        </>
    );
}

BrandingSettingsPage.layout = {
    breadcrumbs: [
        {
            title: 'Identitas aplikasi',
            href: '/settings/branding',
        },
    ],
};
