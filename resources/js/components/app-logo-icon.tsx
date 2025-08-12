import { ImgHTMLAttributes } from 'react';

interface AppLogoIconProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
    alt?: string;
}

export default function AppLogoIcon({ alt = "App Logo", ...props }: AppLogoIconProps) {
    return (
        <img
            src="/favicon.png"
            alt={alt}
            {...props}
        />
    );
}