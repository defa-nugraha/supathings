import type { ImgHTMLAttributes } from 'react';

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
    return (
        <img
            {...props}
            src="/brand/supathings-logo.jpg"
            alt={props.alt ?? 'Supathings'}
            className={props.className ?? 'size-9 object-contain'}
        />
    );
}
