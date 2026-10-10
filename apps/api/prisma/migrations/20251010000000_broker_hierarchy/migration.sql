-- Restructure broker_profiles into a self-referencing broker tree and remove
-- the master broker layer.

-- Remove the master broker link from broker_profiles.
ALTER TABLE `broker_profiles` DROP FOREIGN KEY `fk_broker_master_broker`;
ALTER TABLE `broker_profiles` DROP INDEX `idx_broker_master_broker`;

DROP TABLE IF EXISTS `broker_referrals`;
DROP TABLE IF EXISTS `master_broker_profiles`;

-- Add the tree columns to broker_profiles.
ALTER TABLE `broker_profiles`
  DROP COLUMN `master_broker_id`,
  ADD COLUMN `parent_broker_id` BIGINT UNSIGNED NULL AFTER `user_id`,
  ADD COLUMN `created_by_user_id` BIGINT UNSIGNED NULL AFTER `parent_broker_id`,
  ADD COLUMN `commission_percentage` DECIMAL(5, 2) NOT NULL DEFAULT 0 AFTER `rera_number`,
  ADD INDEX `idx_broker_parent_broker` (`parent_broker_id`),
  ADD INDEX `idx_broker_creator` (`created_by_user_id`);

ALTER TABLE `broker_profiles`
  ADD CONSTRAINT `fk_broker_parent_broker` FOREIGN KEY (`parent_broker_id`) REFERENCES `broker_profiles` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  ADD CONSTRAINT `fk_broker_creator` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Recreate broker_referrals keyed to the inviting broker.
CREATE TABLE `broker_referrals` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `broker_id` BIGINT UNSIGNED NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `expires_at` DATETIME(0) NOT NULL,
  `revoked_at` DATETIME(0) NULL,
  `created_at` DATETIME(0) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_broker_referrals_token` (`token_hash`),
  KEY `idx_broker_referrals_broker` (`broker_id`, `revoked_at`, `expires_at`),
  CONSTRAINT `fk_broker_referrals_broker` FOREIGN KEY (`broker_id`) REFERENCES `broker_profiles` (`id`) ON DELETE CASCADE ON UPDATE NO ACTION
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Remove the master broker role and its users.
DELETE FROM `users` WHERE `role_id` IN (SELECT `id` FROM `roles` WHERE `code` = 'MASTER_BROKER');
DELETE FROM `role_permissions` WHERE `role_id` IN (SELECT `id` FROM `roles` WHERE `code` = 'MASTER_BROKER');
DELETE FROM `roles` WHERE `code` = 'MASTER_BROKER';