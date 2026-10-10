-- Grant existing employee accounts permission to create and view their brokers.
INSERT INTO `permissions` (`code`, `name`, `created_at`, `updated_at`)
VALUES
  ('broker.create', 'broker.create', NOW(), NOW()),
  ('broker.view_assigned', 'broker.view_assigned', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `updated_at` = VALUES(`updated_at`);

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT `roles`.`id`, `permissions`.`id`
FROM `roles`
JOIN `permissions`
  ON `permissions`.`code` IN ('broker.create', 'broker.view_assigned')
WHERE `roles`.`code` = 'EMPLOYEE';
