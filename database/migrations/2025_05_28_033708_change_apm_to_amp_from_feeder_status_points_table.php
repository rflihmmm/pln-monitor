<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop existing enum constraint and recreate with uppercase values
        DB::statement("ALTER TABLE feeder_status_points DROP CONSTRAINT IF EXISTS feeder_status_points_type_check");
        DB::statement("ALTER TABLE feeder_status_points ADD CONSTRAINT feeder_status_points_type_check CHECK (type IN ('PMT', 'AMP', 'MW'))");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Revert back to lowercase
        DB::statement("ALTER TABLE feeder_status_points DROP CONSTRAINT IF EXISTS feeder_status_points_type_check");
        DB::statement("ALTER TABLE feeder_status_points ADD CONSTRAINT feeder_status_points_type_check CHECK (type IN ('PMT', 'APM', 'MW'))");
    }
};