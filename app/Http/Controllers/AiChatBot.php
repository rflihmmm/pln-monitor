<?php

namespace App\Http\Controllers;

use Inertia\Inertia;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Routing\Controller;

class AiChatBot extends Controller
{
    public function show()
    {
        // Ambil data sensitif dari .env
        $n8nWebhookUrl = env('N8N_WEBHOOK_URL');

        // Validasi webhook URL
        if (!$n8nWebhookUrl) {
            // Log error jika diperlukan
            Log::warning('N8N_WEBHOOK_URL not configured in environment');
        }

        // Kirimkan data yang telah diproses sebagai props ke komponen React
        return Inertia::render('chat-bot', [
            'n8nWebhookUrl' => $n8nWebhookUrl,
        ]);
    }
}
