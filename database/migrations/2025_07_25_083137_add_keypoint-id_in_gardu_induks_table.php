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
        Schema::table('gardu_induks', function (Blueprint $table) {
            $table->unsignedBigInteger('keypoint_id')->nullable()->after('id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gardu_induks', function (Blueprint $table) {
            $table->dropColumn('keypoint_id');
        });
    }
};
