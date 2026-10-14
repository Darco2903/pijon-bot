-- CreateTable
CREATE TABLE `ai_channel_state` (
    `channel_id` VARCHAR(20) NOT NULL,
    `summary` TEXT NOT NULL,
    `cursor_id` VARCHAR(20) NULL,
    `updated_at` TIMESTAMP(0) NOT NULL,

    PRIMARY KEY (`channel_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ai_memory` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `scope_id` VARCHAR(20) NOT NULL,
    `user_id` VARCHAR(20) NULL,
    `content` VARCHAR(500) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `ai_memory_scope_id_idx`(`scope_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
