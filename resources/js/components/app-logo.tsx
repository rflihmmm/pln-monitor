import AppLogoIcon from './app-logo-icon';

export default function AppLogo() {
    return (
        <div className="flex items-center">
            <div className="text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-md mr-1">
                <AppLogoIcon className="size-10" />
            </div>
            <div className="ml-1 grid flex-1 text-left text-sm">
                <span className="mb-0.5 truncate leading-none font-semibold text-yellow-500">PT PLN (PERSERO) </span>
                <span className="mb-0.5 truncate leading-none font-semibold">UID SulselraBar</span>
                <span className="mb-0.5 truncate leading-none font-semibold">UP2D SulselraBar</span>
            </div>
        </div>
    );
}
