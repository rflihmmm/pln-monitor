import { Link } from '@inertiajs/react';
import AppLogo from '@/components/app-logo-icon';
import { HTMLAttributes } from 'react';

export default function AppFooter({ className, ...props }: HTMLAttributes<HTMLElement>) {
    return (
        <footer className={`bg-background border-t md:py-0 w-full ${className}`} {...props}>
            <div className="flex flex-row items-center py-2 px-2">
                <AppLogo className="w-42" />
                <div className='flex flex-col'>
                    <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                        © 2025 <Link href="/" className="font-medium underline underline-offset-4">PLN Monitoring Dashboard</Link>. Support by Jubir.ai
                    </p>
                    <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                        All Rights Reserved.
                    </p>

                </div>
            </div>
        </footer>
    );
}
