import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.APP_SUPABASE_URL;
const supabaseAnonKey = process.env.APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase URL and anon key are required.");
}

// Definisikan tipe untuk database Anda untuk mendapatkan intellisense
export interface Database {
    public: {
        Tables: {
            alarms: {
                Row: { // Tipe baris data yang ada di tabel
                    id: string;
                    created_at: string;
                    text: string;
                };
                Insert: { // Tipe data saat menyisipkan baris baru
                    id?: string;
                    created_at?: string;
                    text: string;
                };
                Update: { // Tipe data saat memperbarui
                    // ... bisa ditambahkan jika perlu
                };
            };
        };
    };
}


export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);