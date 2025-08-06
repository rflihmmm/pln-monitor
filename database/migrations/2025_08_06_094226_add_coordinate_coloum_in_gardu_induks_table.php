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
            $table->string("coordinate")->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('gardu_induks', function (Blueprint $table) {
            $table->dropColumn("coordinate");
        });
    }
};
