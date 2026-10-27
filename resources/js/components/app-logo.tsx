export default function AppLogo() {
    return (
        <div className="flex min-w-0 items-center gap-2">
            <img
                src="/brand/supathings-logo.jpg"
                alt="Supathings"
                className="h-12 w-36 shrink-0 object-contain object-left"
            />
            <span className="sr-only">Supathings IoT</span>
        </div>
    );
}
