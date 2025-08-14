import React, { useEffect } from 'react';
import '@n8n/chat/style.css';
import { createChat } from '@n8n/chat';
import { Card } from './ui/card';

// Chat component
export default function AiChatBot({
    webhookUrl,
    allowUploads = false,
    allowedMimeTypes = '',
    showWelcome = true,
}: {
    webhookUrl: string;
    allowUploads?: boolean;
    allowedMimeTypes?: string;
    showWelcome?: boolean;
}) {
    useEffect(() => {
        if (!webhookUrl) return;

        createChat({
            webhookUrl,
            mode: 'fullscreen',
            target: '#n8n-chat',
            //showWelcomeScreen: showWelcome,
            loadPreviousSession: true,
            initialMessages: [
                'Halo, Saya Asisten Jubir.ai Scada anda, ayo tanya-tanya mengenai station points ?'
            ],
            i18n: {
                en: {
                    title: 'SCADA Chat Bot',
                    subtitle: '',
                    footer: '',
                    getStarted: 'Percakapan Baru',
                    inputPlaceholder: 'Ketik pertanyaan…',
                    closeButtonTooltip: 'Tutup',
                },
            },
            allowFileUploads: allowUploads,
            allowedFilesMimeTypes: allowedMimeTypes,
            enableStreaming: false,
        });
    }, [webhookUrl, allowUploads, allowedMimeTypes, showWelcome]);

    const containerStyle: React.CSSProperties = {
        width: '100%',
        height: '84vh',
    };

    return (
        <Card className="h-full w-full p-0 overflow-hidden">
            <div style={{ margin: 0, padding: 0 }}>
                <style
                    dangerouslySetInnerHTML={{
                        __html: `
          :root {
            --chat--color-primary: #16a34a;
            --chat--color-secondary: #2563eb;
            --chat--border-radius: 14px;
          }
        `,
                    }}
                />
                <div id="n8n-chat" style={containerStyle} />
            </div>
        </Card>
    );
}