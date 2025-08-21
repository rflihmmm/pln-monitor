import { Link } from '@inertiajs/react';
import { Separator } from '@/components/ui/separator';

export default function AppFooter() {
    return (
        <footer className="bg-background border-t py-6 md:py-0 mt-auto">
            <div className="container flex flex-col items-center justify-between py-2">
                <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                    © 2025 <Link href="/" className="font-medium underline underline-offset-4">PLN Monitoring Dashboard</Link>. Support by Jubir.ai
                </p>
                <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
                    All Rights Reserved.
                </p>
                {/* <ul className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground sm:mt-0">
                    <li>
                        <Link href="#" className="font-medium underline-offset-4 hover:underline">About</Link>
                    </li>
                    <li>
                        <Link href="#" className="font-medium underline-offset-4 hover:underline">Privacy Policy</Link>
                    </li>
                    <li>
                        <Link href="#" className="font-medium underline-offset-4 hover:underline">Licensing</Link>
                    </li>
                    <li>
                        <Link href="#" className="font-medium underline-offset-4 hover:underline">Contact</Link>
                    </li>
                </ul> */}
            </div>
        </footer>
    );
}
