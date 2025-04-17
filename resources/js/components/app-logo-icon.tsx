import { SVGAttributes } from 'react';

export default function AppLogoIcon(props: SVGAttributes<SVGElement>) {
    return (
        <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" />
            <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M277.28 445.439C373.334 432.144 447.318 349.731 447.318 249.999V0H500V249.999C500 388.083 388.085 499.999 250.001 499.999L277.28 445.439Z"
                fill="url(#paint0_linear_4167_15587)"
            />
            <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M249.999 499.999C111.915 499.999 0 388.083 0 249.999H52.6819C52.6819 349.731 126.666 432.145 222.72 445.44L249.999 499.999Z"
                fill="url(#paint1_linear_4167_15587)"
            />
            <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M382.07 0V258.16C382.07 330.765 322.644 390.229 250.001 390.229C177.357 390.229 117.932 330.804 117.932 258.16V250.038H170.614V258.16C170.614 301.723 206.438 337.547 250.001 337.547C293.564 337.547 329.388 301.723 329.388 258.16V0H382.07Z"
                fill="url(#paint2_linear_4167_15587)"
            />
            <defs>
                <linearGradient id="paint0_linear_4167_15587" x1="338.928" y1="359.769" x2="494.291" y2="237.126" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#3F83F8" />
                    <stop offset="1" stop-color="#84E1BC" />
                </linearGradient>
                <linearGradient id="paint1_linear_4167_15587" x1="125" y1="249.999" x2="125" y2="499.999" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#16BDCA" />
                    <stop offset="1" stop-color="#6875F5" />
                </linearGradient>
                <linearGradient id="paint2_linear_4167_15587" x1="382.07" y1="73.678" x2="144.292" y2="73.678" gradientUnits="userSpaceOnUse">
                    <stop stop-color="#6875F5" />
                    <stop offset="1" stop-color="#16BDCA" />
                </linearGradient>
            </defs>
        </svg>
    );
}
