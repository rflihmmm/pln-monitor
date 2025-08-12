import AiChatBot from '@/components/ai-chat-bot';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Chat Bot',
        href: '/chat-bot',
    },
];

interface ChatBotPageProps {
    n8nWebhookUrl?: string;
}

export default function ChatBot({ n8nWebhookUrl }: ChatBotPageProps) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Chat Bot" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="grid grid-cols-1">
                    <div className="space-y-6">
                        <AiChatBot n8nWebhookUrl={n8nWebhookUrl} />
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}