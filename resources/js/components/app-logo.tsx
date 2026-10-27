import { usePage } from '@inertiajs/react';
export default function AppLogo() {
 const { name } = usePage().props;
 return <><div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white"><img src="/images/supathings-logo.jpg" alt="Logo Supathings" className="size-full object-contain" /></div><div className="ml-1 grid flex-1 text-left text-sm"><span className="truncate font-semibold leading-tight text-slate-900">Supathings</span><span className="text-[10px] text-slate-500">Smart cultivation system</span><span className="sr-only">{String(name ?? 'Supathings')}</span></div></>;
}
