import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export interface Auth {
    user: User;
    roles: string[];
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href?: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    canAccess?: (roles: string[]) => boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    flash: {
        success: string;
        error: string;
        info: string;
        warning: string;
    };
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    roles: string;
    [key: string]: unknown; // This allows for additional properties...
}

export interface GarduInduk {
    id: number
    name: string
}

export interface DropdownBase {
    id: number
    name: string
}

export interface Keypoint {
    id?: number;
    feeder_id?: number;
    keypoint_id: number;
    name: string;
}

export interface StatusPoint {
    id?: number;
    type: string;
    status_id: number;
    name: string;
}


export interface Feeder {
    id?: number;
    name: string;
    description: string | null;
    gardu_induk_id: number;
    created_at?: string | undefined;
    gardu_induk?: GarduInduk;
    keypoints: Keypoint[];
    status_points: StatusPoint[];
}