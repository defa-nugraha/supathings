import { usePage } from '@inertiajs/react';

export default function AppLogoIcon() {
    const { branding } = usePage().props;

    return (
        <img
            src={branding.logoUrl ?? '/brand/supathings-logo.jpg'}
            alt={branding.name}
            className="size-9 object-contain"
        />
    );
}
