<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('feeder_status_points', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['pmt', 'apm', 'mw']);
            $table->integer('status_id');
            $table->foreignId('feeder_id')->constrained('feeders')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('feeder_status_points');
    }
};
