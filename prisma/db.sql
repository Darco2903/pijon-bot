CREATE DATABASE pijon_bot;

USE pijon_bot;

----------------------------------------------------

DROP TABLE IF EXISTS pijon_bot.recently_played;

CREATE TABLE pijon_bot.recently_played (
    id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    video_id VARCHAR(12) NOT NULL,
    title VARCHAR(100) NOT NULL,
    played_at TIMESTAMP NOT NULL,
    UNIQUE KEY unique_video_id (video_id)
);