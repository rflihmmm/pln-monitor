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
        Schema::table('feeder_keypoints', function (Blueprint $table) {
            $table->unique('keypoint_id');
        });

        Schema::create('maps_data', function (Blueprint $table) {
            $table->id(); // Primary key auto increment
            $table->string('no')->nullable();
            $table->unsignedBigInteger('keypoint_id'); // Foreign key ke table feeder_keypoints
            $table->string('ulp')->nullable();
            $table->string('up3')->nullable();
            $table->string('dcc')->nullable();
            $table->string('lokasi')->nullable();
            $table->timestamps();

            // Foreign key constraint
            $table->foreign('keypoint_id')
                ->references('keypoint_id')
                ->on('feeder_keypoints')
                ->onDelete('cascade');

            // Index untuk performa query
            $table->index('keypoint_id');
            $table->index('no');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('feeder_keypoints', function (Blueprint $table) {
            $table->dropUnique('feeder_keypoints_keypoint_id_unique');
        });
        Schema::dropIfExists('maps_data');
    }
};
