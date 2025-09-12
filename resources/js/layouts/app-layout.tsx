import useFlashToast from '@/hooks/useFlashToast';
import AppLayoutTemplate from '@/layouts/app/app-header-layout';
import AppChatBot from '@/components/app-chat-bot';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';
import { Toaster } from 'sonner';
import AppFooter from '@/layouts/app/app-footer';

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
    n8nWebhookUrl?: string;
    enableFloatingChat?: boolean;
}

export default ({
    children,
    breadcrumbs,
    n8nWebhookUrl,
    enableFloatingChat = true,
    ...props
}: AppLayoutProps) => {
    useFlashToast();
    n8nWebhookUrl = 'http://163.61.80.13:5678/webhook/cb6a2d7e-09f3-4498-b8d6-7f5c7df1d219/chat';

    return (
        <AppLayoutTemplate breadcrumbs={breadcrumbs} {...props}>
            {children}
            <Toaster position="bottom-center" />
            <AppFooter />

            {/* Floating Chat Bot - hanya tampil jika webhook URL tersedia dan diaktifkan */}
            {enableFloatingChat && n8nWebhookUrl && (
                <AppChatBot
                    webhookUrl={n8nWebhookUrl}
                    allowUploads={true}
                    allowedMimeTypes="image/*,application/pdf"
                    showWelcome={true}
                />
            )}
        </AppLayoutTemplate>
    );
};