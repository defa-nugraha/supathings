import { CheckCircle2, CircleAlert, TriangleAlert } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type ActionModalVariant = 'success' | 'error' | 'confirm' | 'info';

type ActionModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    variant?: ActionModalVariant;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void | Promise<void>;
    busy?: boolean;
};

const variantConfig: Record<
    ActionModalVariant,
    {
        icon: typeof CheckCircle2;
        iconClass: string;
        confirmClass?: string;
    }
> = {
    success: {
        icon: CheckCircle2,
        iconClass: 'bg-emerald-50 text-emerald-600',
    },
    error: {
        icon: CircleAlert,
        iconClass: 'bg-rose-50 text-rose-600',
    },
    confirm: {
        icon: TriangleAlert,
        iconClass: 'bg-amber-50 text-amber-600',
        confirmClass: 'bg-rose-600 text-white hover:bg-rose-700',
    },
    info: {
        icon: CircleAlert,
        iconClass: 'bg-blue-50 text-blue-600',
    },
};

export default function ActionModal({
    open,
    onOpenChange,
    variant = 'info',
    title,
    description,
    confirmLabel = 'Ya, lanjutkan',
    cancelLabel = 'Batal',
    onConfirm,
    busy = false,
}: ActionModalProps) {
    const config = variantConfig[variant];
    const Icon = config.icon;
    const isConfirmation = variant === 'confirm';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="text-left">
                    <div className="flex items-start gap-3">
                        <div
                            className={`grid size-10 shrink-0 place-items-center rounded-full ${config.iconClass}`}
                        >
                            <Icon className="size-5" />
                        </div>
                        <div className="min-w-0">
                            <DialogTitle>{title}</DialogTitle>
                            <DialogDescription className="mt-2 leading-relaxed">
                                {description}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <DialogFooter>
                    {isConfirmation && (
                        <Button
                            type="button"
                            variant="outline"
                            disabled={busy}
                            onClick={() => onOpenChange(false)}
                        >
                            {cancelLabel}
                        </Button>
                    )}
                    {isConfirmation ? (
                        <Button
                            type="button"
                            disabled={busy}
                            className={config.confirmClass}
                            onClick={() => void onConfirm?.()}
                        >
                            {busy ? 'Memproses...' : confirmLabel}
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={() => onOpenChange(false)}
                        >
                            Tutup
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
