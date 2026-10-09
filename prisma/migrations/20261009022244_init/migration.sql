-- CreateTable
CREATE TABLE `recently_played` (
    `id` SMALLINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `video_id` VARCHAR(12) NOT NULL,
    `title` VARCHAR(100) NOT NULL,
    `played_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `unique_video_id`(`video_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
