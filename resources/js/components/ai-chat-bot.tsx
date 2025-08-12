import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Bot } from 'lucide-react';

// Definisikan tipe props untuk komponen
interface AiChatBotProps {
    n8nWebhookUrl?: string;
}

export default function AiChatBot({ n8nWebhookUrl }: AiChatBotProps) {
    // Menampilkan pesan error jika URL webhook tidak disediakan
    if (!n8nWebhookUrl) {
        return (
            <Card className="w-full">
                <CardHeader>
                    <CardTitle>Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Konfigurasi n8n webhook URL tidak ditemukan.</p>
                </CardContent>
            </Card>
        );
    }

    // Karena URL tersebut adalah halaman web yang sudah jadi,
    // cara terbaik untuk menampilkannya adalah dengan <iframe>.
    return (
        <Card className="h-[500px] w-full rounded-lg overflow-hidden p-0">

            <iframe
                src={n8nWebhookUrl}
                width="100%"
                height="100%"
                style={{ border: 'none', borderRadius: '0.5rem' }} // Style agar menyatu dengan UI shadcn
                title="AI Chat Bot"
            ></iframe>
        </Card>
    );
}