-- iDENTify-Web migration: Link services to branches
-- Date: 2026-04-24

CREATE TABLE IF NOT EXISTS `clinic_service_branches` (
  `service_id` INT NOT NULL,
  `branch_id` INT NOT NULL,
  PRIMARY KEY (`service_id`, `branch_id`),
  CONSTRAINT `fk_csb_service` FOREIGN KEY (`service_id`) REFERENCES `clinic_services`(`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_csb_branch` FOREIGN KEY (`branch_id`) REFERENCES `clinic_branches`(`id`) ON DELETE CASCADE
);
