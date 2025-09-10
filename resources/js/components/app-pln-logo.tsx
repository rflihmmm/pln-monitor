import { ImgHTMLAttributes } from 'react';

interface AppLogoIconProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
    alt?: string;
}

export default function AppPlnLogo({ alt = "App Logo", ...props }: AppLogoIconProps) {
    return (
        <img
            src="/pln.png"
            alt={alt}
            {...props}
        />
    );
}