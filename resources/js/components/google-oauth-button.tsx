import { usePage } from '@inertiajs/react';
import InputError from '@/components/input-error';

type Props = {
    mode: 'login' | 'register';
};

export default function GoogleOAuthButton({ mode }: Props) {
    const page = usePage();
    const errors = (
        page.props as typeof page.props & {
            errors?: Record<string, string>;
        }
    ).errors;
    const separator =
        mode === 'login' ? 'atau masuk dengan email' : 'atau daftar dengan email';

    return (
        <>
            <a
                href="/auth/google"
                className="flex min-h-11 w-full items-center justify-center gap-3 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none"
            >
                <span
                    aria-hidden="true"
                    className="font-bold text-lg"
                    style={{
                        background:
                            'conic-gradient(from -45deg, #4285F4 0deg 90deg, #34A853 90deg 180deg, #FBBC05 180deg 270deg, #EA4335 270deg)',
                        backgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    G
                </span>
                Lanjutkan dengan Google
            </a>
            {errors?.google && (
                <InputError message={errors.google} className="mt-2 text-center" />
            )}
            <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                        {separator}
                    </span>
                </div>
            </div>
        </>
    );
}
