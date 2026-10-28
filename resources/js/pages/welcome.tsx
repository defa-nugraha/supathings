import { Head, Link, usePage } from '@inertiajs/react';
import {
    Activity,
    ArrowDownRight,
    ArrowRight,
    Check,
    ChevronDown,
    Cpu,
    Droplets,
    Gauge,
    Leaf,
    Lightbulb,
    ShieldCheck,
    Sparkles,
    Sprout,
    Thermometer,
    Wind,
} from 'lucide-react';
import { dashboard, login, register } from '@/routes';

const features = [
    {
        number: '01',
        title: 'Pantau kondisi kumbung',
        detail: 'Lihat ringkasan suhu, kelembapan, dan kondisi lingkungan dari satu dashboard.',
        Icon: Activity,
        tone: 'blue',
    },
    {
        number: '02',
        title: 'Kontrol perangkat',
        detail: 'Kelola perangkat pendukung budidaya seperti pompa dan blower dari aplikasi.',
        Icon: Wind,
        tone: 'green',
    },
    {
        number: '03',
        title: 'Atur batas kondisi',
        detail: 'Sesuaikan ambang batas pemantauan dengan kebutuhan kumbung Anda.',
        Icon: Gauge,
        tone: 'amber',
    },
    {
        number: '04',
        title: 'Pantau dalam satu tempat',
        detail: 'Susun tampilan informasi agar hal penting lebih mudah ditemukan.',
        Icon: Lightbulb,
        tone: 'violet',
    },
];

const steps = [
    {
        number: '01',
        title: 'Hubungkan perangkat',
        detail: 'Mulai dari perangkat pemantauan yang sesuai dengan kebutuhan kumbung.',
        Icon: Cpu,
    },
    {
        number: '02',
        title: 'Pantau kondisi',
        detail: 'Periksa ringkasan pembacaan sensor melalui dashboard Supathings.',
        Icon: Activity,
    },
    {
        number: '03',
        title: 'Ambil tindakan',
        detail: 'Gunakan informasi yang tersedia untuk membantu mengelola kondisi budidaya.',
        Icon: Sprout,
    },
];

const faqs = [
    {
        question: 'Supathings digunakan untuk apa?',
        answer: 'Supathings membantu pemilik budidaya jamur memantau kondisi kumbung dan mengelola perangkat pendukung melalui satu aplikasi.',
    },
    {
        question: 'Kondisi apa saja yang dapat dipantau?',
        answer: 'Tampilan pemantauan dirancang untuk informasi lingkungan seperti suhu, kelembapan, dan cahaya, sesuai sensor yang dipasang pada perangkat Anda.',
    },
    {
        question: 'Apakah saya harus selalu berada di dekat kumbung?',
        answer: 'Aplikasi membantu Anda melihat informasi dari dashboard selama perangkat dan koneksi yang dibutuhkan tersedia. Kondisi koneksi dapat memengaruhi pembaruan data.',
    },
    {
        question: 'Apakah Supathings menjamin hasil panen?',
        answer: 'Tidak. Supathings adalah alat bantu pemantauan dan pengelolaan. Hasil budidaya tetap dipengaruhi bibit, kebersihan, lingkungan, perawatan, dan faktor lainnya.',
    },
];

export default function Welcome() {
    const { auth, branding } = usePage().props;

    return (
        <>
            <Head title={branding.name} />
            <div className="landing-page min-h-screen overflow-hidden bg-[#f8fafc] text-slate-900">
                <header className="landing-nav sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-xl">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 md:px-8">
                        <a href="#beranda" aria-label={branding.name} className="shrink-0">
                            <img
                                src={branding.logoUrl ?? '/brand/supathings-logo.jpg'}
                                alt={branding.name}
                                className="h-11 w-36 object-contain object-left sm:w-40"
                            />
                        </a>
                        <nav aria-label="Navigasi utama" className="hidden items-center gap-7 md:flex">
                            <a className="landing-nav-link" href="#fitur">Fitur</a>
                            <a className="landing-nav-link" href="#cara-kerja">Cara kerja</a>
                            <a className="landing-nav-link" href="#faq">FAQ</a>
                        </nav>
                        <div className="flex items-center gap-2">
                            {auth.user ? (
                                <Link href={dashboard()} className="landing-button landing-button-primary">
                                    Buka dashboard <ArrowRight className="size-4" />
                                </Link>
                            ) : (
                                <>
                                    <Link href={login()} className="hidden rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:text-blue-700 sm:inline-flex">
                                        Masuk
                                    </Link>
                                    <Link href={register()} className="landing-button landing-button-primary">
                                        Mulai sekarang <ArrowRight className="size-4" />
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                <main>
                    <section id="beranda" className="landing-hero relative isolate">
                        <div className="landing-orb landing-orb-one" aria-hidden="true" />
                        <div className="landing-orb landing-orb-two" aria-hidden="true" />
                        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-16 md:px-8 md:py-24 lg:grid-cols-[1.02fr_.98fr] lg:gap-10 lg:py-28">
                            <div className="landing-reveal relative z-10">
                                <div className="landing-eyebrow">
                                    <span className="landing-pulse-dot" />
                                    IoT untuk budidaya jamur
                                </div>
                                <h1 className="mt-6 max-w-2xl text-4xl leading-[1.08] font-semibold tracking-[-0.045em] text-slate-950 sm:text-5xl md:text-6xl xl:text-[4.35rem]">
                                    Kumbung lebih terpantau.
                                    <span className="landing-gradient-text mt-1 block">Budidaya lebih terarah.</span>
                                </h1>
                                <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 md:text-lg">
                                    Kenali kondisi lingkungan kumbung dan kelola perangkat pendukung dari satu dashboard yang mudah dipahami.
                                </p>
                                <div className="mt-8 flex flex-wrap gap-3">
                                    <Link href={auth.user ? dashboard() : register()} className="landing-button landing-button-primary landing-button-large">
                                        Kenali Supathings <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                                    </Link>
                                    <a href="#fitur" className="landing-button landing-button-secondary landing-button-large">
                                        Jelajahi fitur <ArrowDownRight className="size-4" />
                                    </a>
                                </div>
                                <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-600">
                                    <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-600" /> Informasi terpusat</span>
                                    <span className="inline-flex items-center gap-2"><Activity className="size-4 text-blue-600" /> Pemantauan praktis</span>
                                </div>
                            </div>

                            <div className="landing-dashboard-wrap landing-reveal landing-reveal-delay relative mx-auto w-full max-w-[590px]">
                                <div className="landing-dashboard-glow" aria-hidden="true" />
                                <div className="landing-dashboard relative rounded-[1.7rem] border border-white/90 bg-white/95 p-4 shadow-[0_30px_100px_rgba(30,64,175,0.16)] sm:rounded-[2rem] sm:p-6">
                                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
                                        <div>
                                            <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400">PRATINJAU DASHBOARD</p>
                                            <h2 className="mt-2 text-lg font-semibold text-slate-900 sm:text-xl">Ringkasan kumbung</h2>
                                            <p className="mt-1 text-xs text-slate-500">Contoh tampilan pemantauan</p>
                                        </div>
                                        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                                            <span className="landing-pulse-dot" /> Contoh
                                        </span>
                                    </div>
                                    <div className="mt-5 grid grid-cols-2 gap-3">
                                        <div className="landing-metric-card bg-blue-50/80">
                                            <div className="flex items-center justify-between text-blue-700">
                                                <Thermometer className="size-5" />
                                                <span className="text-xs font-medium">Suhu</span>
                                            </div>
                                            <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">27.4<span className="ml-1 text-sm font-medium text-slate-500">°C</span></p>
                                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-blue-100"><div className="landing-meter h-full w-[68%] rounded-full bg-blue-600" /></div>
                                        </div>
                                        <div className="landing-metric-card bg-emerald-50/80">
                                            <div className="flex items-center justify-between text-emerald-700">
                                                <Droplets className="size-5" />
                                                <span className="text-xs font-medium">Kelembapan</span>
                                            </div>
                                            <p className="mt-5 text-3xl font-semibold tracking-tight text-slate-900">86<span className="ml-1 text-sm font-medium text-slate-500">%</span></p>
                                            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-100"><div className="landing-meter landing-meter-delay h-full w-[86%] rounded-full bg-emerald-500" /></div>
                                        </div>
                                    </div>
                                    <div className="mt-3 rounded-2xl border border-slate-100 p-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-sm font-semibold text-slate-800">Perangkat pendukung</p>
                                                <p className="mt-1 text-xs text-slate-500">Ilustrasi kelompok kontrol</p>
                                            </div>
                                            <div className="flex -space-x-2">
                                                <span className="grid size-9 place-items-center rounded-full border-2 border-white bg-blue-50 text-blue-700"><Droplets className="size-4" /></span>
                                                <span className="grid size-9 place-items-center rounded-full border-2 border-white bg-emerald-50 text-emerald-700"><Wind className="size-4" /></span>
                                                <span className="grid size-9 place-items-center rounded-full border-2 border-white bg-violet-50 text-violet-700"><Cpu className="size-4" /></span>
                                            </div>
                                        </div>
                                        <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-3 text-xs leading-5 text-slate-500">
                                            <Sparkles className="size-4 shrink-0 text-blue-600" />
                                            Tampilan ilustratif, bukan data sensor langsung.
                                        </div>
                                    </div>
                                </div>
                                <div className="landing-float-card landing-float-card-top hidden items-center gap-3 rounded-2xl border border-white bg-white p-3.5 shadow-xl sm:flex">
                                    <span className="grid size-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Leaf className="size-5" /></span>
                                    <span><span className="block text-xs text-slate-500">Fokus utama</span><span className="mt-0.5 block text-sm font-semibold text-slate-800">Kondisi kumbung</span></span>
                                </div>
                                <div className="landing-float-card landing-float-card-bottom hidden items-center gap-3 rounded-2xl border border-white bg-white p-3.5 shadow-xl sm:flex">
                                    <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700"><Gauge className="size-5" /></span>
                                    <span><span className="block text-xs text-slate-500">Dari satu tempat</span><span className="mt-0.5 block text-sm font-semibold text-slate-800">Pantau & kelola</span></span>
                                </div>
                            </div>
                        </div>
                        <div className="landing-marquee border-y border-blue-100/80 bg-white/70 py-4">
                            <div className="landing-marquee-track" aria-hidden="true">
                                {[0, 1].map((item) => (
                                    <div key={item} className="flex shrink-0 items-center gap-8 px-4">
                                        {['Suhu lingkungan', 'Kelembapan', 'Kontrol perangkat', 'Ambang batas', 'Ringkasan budidaya'].map((label) => (
                                            <span key={label} className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-semibold tracking-wide text-slate-500 sm:text-sm"><span className="size-1.5 rounded-full bg-emerald-500" />{label}</span>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
                        <div className="landing-reveal mx-auto max-w-3xl text-center">
                            <p className="landing-section-kicker">Mengelola dengan lebih jelas</p>
                            <h2 className="landing-section-title">Informasi yang tepat, saat Anda membutuhkannya.</h2>
                            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">
                                Budidaya punya banyak hal untuk diperhatikan. Supathings membantu merangkum informasi lingkungan dan pengelolaan perangkat agar Anda dapat mengambil keputusan dengan lebih terarah.
                            </p>
                        </div>
                        <div id="fitur" className="mt-12 grid gap-4 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
                            {features.map((feature, index) => (
                                <article key={feature.number} className="landing-feature-card landing-reveal group" style={{ animationDelay: `${index * 100}ms` }}>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold tracking-[0.18em] text-slate-400">{feature.number}</span>
                                        <span className={`landing-feature-icon landing-tone-${feature.tone}`}><feature.Icon className="size-5" /></span>
                                    </div>
                                    <h3 className="mt-8 text-lg font-semibold tracking-tight text-slate-900">{feature.title}</h3>
                                    <p className="mt-3 text-sm leading-7 text-slate-600">{feature.detail}</p>
                                    <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-blue-700 transition-all group-hover:gap-3">Dirancang untuk kemudahan <ArrowRight className="size-3.5" /></div>
                                </article>
                            ))}
                        </div>
                    </section>

                    <section id="cara-kerja" className="landing-process-section relative overflow-hidden">
                        <div className="landing-process-grid" aria-hidden="true" />
                        <div className="relative mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
                            <div className="grid gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-end">
                                <div className="landing-reveal">
                                    <p className="landing-section-kicker landing-kicker-light">Mulai dengan sederhana</p>
                                    <h2 className="landing-section-title text-white">Dari pemantauan, menuju keputusan yang lebih baik.</h2>
                                </div>
                                <p className="landing-reveal max-w-xl text-base leading-8 text-blue-100/75 lg:justify-self-end">
                                    Alur yang mudah dipahami membantu Anda berfokus pada kondisi budidaya, bukan pada kerumitan membaca banyak informasi yang terpisah.
                                </p>
                            </div>
                            <div className="mt-12 grid gap-4 md:grid-cols-3 lg:mt-16">
                                {steps.map((step, index) => (
                                    <article key={step.number} className="landing-step-card landing-reveal" style={{ animationDelay: `${index * 130}ms` }}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm font-semibold tracking-[0.16em] text-blue-200/70">{step.number}</span>
                                            <span className="grid size-11 place-items-center rounded-2xl border border-white/15 bg-white/10 text-emerald-300"><step.Icon className="size-5" /></span>
                                        </div>
                                        <h3 className="mt-8 text-xl font-semibold text-white">{step.title}</h3>
                                        <p className="mt-3 text-sm leading-7 text-blue-100/70">{step.detail}</p>
                                        <div className="mt-7 h-px bg-gradient-to-r from-emerald-300/70 via-blue-200/20 to-transparent" />
                                    </article>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-2">
                        <div className="landing-reveal">
                            <div className="landing-story-visual relative overflow-hidden rounded-[2rem] p-7 sm:p-10">
                                <div className="landing-story-ring landing-story-ring-one" aria-hidden="true" />
                                <div className="landing-story-ring landing-story-ring-two" aria-hidden="true" />
                                <div className="relative z-10">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"><Sprout className="size-3.5" /> Budidaya lebih terarah</span>
                                    <p className="mt-8 max-w-sm text-3xl leading-tight font-semibold tracking-tight text-white sm:text-4xl">Lebih mudah melihat gambaran kondisi kumbung.</p>
                                    <p className="mt-4 max-w-sm text-sm leading-7 text-blue-100/75">Bawa informasi penting ke satu tampilan yang bisa Anda pahami dengan cepat.</p>
                                    <div className="mt-10 flex items-center gap-3">
                                        <div className="flex -space-x-2">
                                            <span className="grid size-9 place-items-center rounded-full border-2 border-[#142f54] bg-emerald-300 text-emerald-950"><Thermometer className="size-4" /></span>
                                            <span className="grid size-9 place-items-center rounded-full border-2 border-[#142f54] bg-sky-300 text-sky-950"><Droplets className="size-4" /></span>
                                            <span className="grid size-9 place-items-center rounded-full border-2 border-[#142f54] bg-violet-300 text-violet-950"><Wind className="size-4" /></span>
                                        </div>
                                        <span className="text-xs font-medium text-blue-100/80">Lingkungan · Perangkat · Ringkasan</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="landing-reveal">
                            <p className="landing-section-kicker">Dirancang untuk aktivitas nyata</p>
                            <h2 className="landing-section-title">Bukan sekadar melihat angka.</h2>
                            <p className="mt-5 text-base leading-8 text-slate-600">
                                Pemantauan akan lebih berguna ketika informasinya mudah dibaca dan dapat menjadi bagian dari rutinitas perawatan kumbung.
                            </p>
                            <ul className="mt-7 space-y-4">
                                {[
                                    'Kenali perubahan kondisi lingkungan lebih mudah.',
                                    'Kelola perangkat pendukung dari alur yang lebih terpusat.',
                                    'Sesuaikan informasi yang ingin diprioritaskan di dashboard.',
                                ].map((item) => (
                                    <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-700"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-3.5" /></span>{item}</li>
                                ))}
                            </ul>
                            <Link href={auth.user ? dashboard() : register()} className="landing-button landing-button-primary mt-8">
                                Coba Supathings <ArrowRight className="size-4" />
                            </Link>
                        </div>
                    </section>

                    <section id="faq" className="border-y border-slate-200/80 bg-white">
                        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:px-8 md:py-24 lg:grid-cols-[.75fr_1.25fr]">
                            <div className="landing-reveal">
                                <p className="landing-section-kicker">Pertanyaan umum</p>
                                <h2 className="landing-section-title">Yang perlu Anda ketahui.</h2>
                                <p className="mt-5 max-w-md text-sm leading-7 text-slate-600">Gambaran singkat tentang cara Supathings membantu aktivitas pemantauan budidaya.</p>
                            </div>
                            <div className="landing-reveal divide-y divide-slate-200">
                                {faqs.map((faq) => (
                                    <details key={faq.question} className="landing-faq group py-5">
                                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-slate-800">
                                            {faq.question}
                                            <ChevronDown className="size-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
                                        </summary>
                                        <p className="max-w-2xl pt-4 pr-8 text-sm leading-7 text-slate-600">{faq.answer}</p>
                                    </details>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="mx-auto max-w-7xl px-5 py-16 md:px-8 md:py-24">
                        <div className="landing-cta landing-reveal relative overflow-hidden rounded-[2rem] px-6 py-12 text-center sm:px-12 sm:py-16">
                            <div className="landing-cta-orb" aria-hidden="true" />
                            <div className="relative z-10 mx-auto max-w-2xl">
                                <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50"><Sparkles className="size-3.5" /> Kenali cara kerja Supathings</span>
                                <h2 className="mt-6 text-3xl leading-tight font-semibold tracking-tight text-white sm:text-4xl md:text-5xl">Saatnya mengelola kumbung dengan lebih terarah.</h2>
                                <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-blue-100/80 sm:text-base">Mulai kenali fitur pemantauan dan pengelolaan perangkat dalam satu aplikasi.</p>
                                <div className="mt-8 flex flex-wrap justify-center gap-3">
                                    <Link href={auth.user ? dashboard() : register()} className="landing-button rounded-xl bg-white px-5 py-3 text-sm font-semibold text-blue-800 shadow-lg transition hover:-translate-y-0.5 hover:bg-blue-50">
                                        {auth.user ? 'Buka dashboard' : 'Mulai sekarang'} <ArrowRight className="size-4" />
                                    </Link>
                                    {!auth.user && <Link href={login()} className="landing-button rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15">Saya sudah punya akun</Link>}
                                </div>
                            </div>
                        </div>
                    </section>
                </main>

                <footer className="border-t border-slate-200 bg-white">
                    <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-7 text-sm text-slate-500 md:flex-row md:items-center md:justify-between md:px-8">
                        <div className="flex items-center gap-3">
                            <img src={branding.logoUrl ?? '/brand/supathings-logo.jpg'} alt="" className="h-8 w-24 object-contain object-left" />
                            <span className="text-xs">Pemantauan dan kontrol untuk budidaya jamur.</span>
                        </div>
                        <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs">
                            <a href="#fitur" className="transition hover:text-blue-700">Fitur</a>
                            <a href="#cara-kerja" className="transition hover:text-blue-700">Cara kerja</a>
                            <a href="#faq" className="transition hover:text-blue-700">FAQ</a>
                            <span>© {new Date().getFullYear()} {branding.name}</span>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
