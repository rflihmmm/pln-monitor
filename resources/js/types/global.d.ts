import type { route as routeFn } from 'ziggy-js';

declare global {
    interface Window {
        axios: AxiosInstance;
        kendo: any
    }
    const route: typeof routeFn;
}
