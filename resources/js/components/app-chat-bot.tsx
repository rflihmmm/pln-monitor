import React, { useEffect, useState } from 'react';
import '@n8n/chat/style.css';
import { createChat } from '@n8n/chat';
import { Card } from './ui/card';
import { MessageCircle, X } from 'lucide-react';

// Floating Chat component
export default function AppChatBot({
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
    const [isOpen, setIsOpen] = useState(false);
    const [chatInitialized, setChatInitialized] = useState(false);

    useEffect(() => {
        if (!webhookUrl || !isOpen || chatInitialized) return;

        // Small delay to ensure DOM element exists
        setTimeout(() => {
            createChat({
                webhookUrl,
                mode: 'fullscreen',
                target: '#floating-n8n-chat',
                loadPreviousSession: true,
                initialMessages: [
                    'Halo, Saya Asisten Jubir.ai Scada anda, ayo tanya-tanya mengenai station points ?'
                ],
                i18n: {
                    en: {
                        title: '',
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
            setChatInitialized(true);
        }, 100);
    }, [webhookUrl, allowUploads, allowedMimeTypes, showWelcome, isOpen, chatInitialized]);

    const toggleChat = () => {
        setIsOpen(!isOpen);
    };

    return (
        <>
            {/* Floating Chat Button */}
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={toggleChat}
                    className="bg-primary hover:bg-primary/90 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
                    aria-label={isOpen ? 'Tutup chat' : 'Buka chat'}
                >
                    {isOpen ? (
                        <X size={24} />
                    ) : (
                        <MessageCircle size={24} />
                    )}
                </button>
            </div>

            {/* Floating Chat Window */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-40 w-96 h-[500px]">
                    <Card className="h-full w-full p-0 overflow-hidden shadow-2xl border-2">
                        <div className="flex items-center justify-between p-4 bg-primary text-white">
                            <h3 className="font-semibold">SCADA Chat Bot</h3>
                            <button
                                onClick={toggleChat}
                                className="text-white hover:text-gray-200 transition-colors"
                                aria-label="Tutup chat"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ margin: 0, padding: 0, height: 'calc(100% - 64px)' }}>
                            <style
                                dangerouslySetInnerHTML={{
                                    __html: `
                                        :root {
                                            --chat--color-primary: #16a34a;
                                            --chat--color-secondary: #2563eb;
                                            --chat--border-radius: 14px;
                                        }
                                        #floating-n8n-chat {
                                            height: 100% !important;
                                        }
                                        .chat-header{
                                            display: none !important;
                                        }
                                        .chat-body {
                                            background-color: #fff !important;    
                                        }
                                        .chat-get-started-footer {
                                            display: none !important;
                                        }
                                    `,
                                }}
                            />
                            <div
                                id="floating-n8n-chat"
                                style={{
                                    width: '100%',
                                    height: '100%'
                                }}
                            />
                        </div>
                    </Card>
                </div>
            )}

            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-25 z-30 md:hidden"
                    onClick={toggleChat}
                />
            )}
        </>
    );
}