import { usePage } from '@inertiajs/react';

export default function AppLogo() {
    const { branding } = usePage().props;

    return (
        <div className="flex min-w-0 items-center gap-2">
            <img
                src={branding.logoUrl ?? '/brand/supathings-logo.jpg'}
                alt={branding.name}
                className="h-12 w-36 shrink-0 object-contain object-left"
            />
            <span className="sr-only">{branding.name}</span>
        </div>
    );
}
