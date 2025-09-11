import AppPlnLogo from '@/components/app-pln-logo';
import { Link } from '@inertiajs/react';
import { type PropsWithChildren } from 'react';
import AppFooter from '../app/app-footer';

interface AuthLayoutProps {
    name?: string;
    title?: string;
    description?: string;
}

export default function AuthSimpleLayout({ children, title, description }: PropsWithChildren<AuthLayoutProps>) {
    return (
        <div className="bg-background flex min-h-svh flex-col">
            <div className="flex flex-grow flex-col items-center justify-center mb-6">
                <div className="w-full max-w-sm">
                    <div className="flex flex-col gap-8">
                        <div className="flex flex-col items-center gap-4">
                            <Link href={route('home')} className="flex flex-col items-center gap-2 font-medium">
                                <div className="mb-1 flex items-center justify-center rounded-md">
                                    <AppPlnLogo className="scale-60 fill-current text-[var(--foreground)] dark:text-white" />
                                </div>
                                <span className="sr-only">{title}</span>
                            </Link>

                            <div className="text-center">
                                <h1 className="text-xl font-bold">{title}</h1>
                                <h1 className="text-xl font-bold">UP2D SULSELRABAR</h1>
                                <h1 className="text-xl font-bold">DASHBOARD MONITORING SCADA</h1>
                                <p className="text-muted-foreground text-center text-sm">{description}</p>
                            </div>
                        </div>
                        {children}
                    </div>
                </div>
            </div>
            <AppFooter className="mt-auto pt-6" />
        </div>
    );
}
