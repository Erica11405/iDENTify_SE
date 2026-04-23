-- iDENTify-Web migration: Backfill Tenant Data
-- Date: 2026-04-23
-- Description: Assigns legacy (NULL) clinic/branch IDs to the first available clinic to ensure visibility under strict isolation.

DROP PROCEDURE IF EXISTS BackfillTenantData;
DELIMITER //
CREATE PROCEDURE BackfillTenantData()
BEGIN
    DECLARE default_clinic_id INT;
    DECLARE default_branch_id INT;

    -- 1. Resolve default clinic (oldest/first)
    SELECT id INTO default_clinic_id FROM clinics ORDER BY id ASC LIMIT 1;
    
    IF default_clinic_id IS NOT NULL THEN
        -- 2. Resolve default branch for that clinic
        SELECT id INTO default_branch_id FROM clinic_branches WHERE clinic_id = default_clinic_id ORDER BY id ASC LIMIT 1;

        -- 3. Backfill Patients
        UPDATE patients SET clinic_id = default_clinic_id WHERE clinic_id IS NULL;
        IF default_branch_id IS NOT NULL THEN
            UPDATE patients SET branch_id = default_branch_id WHERE branch_id IS NULL AND clinic_id = default_clinic_id;
        END IF;

        -- 4. Backfill Treatment Timeline
        -- Try to match patient's clinic first, fallback to default_clinic_id
        UPDATE treatment_timeline t
        JOIN patients p ON p.id = t.patient_id
        SET t.clinic_id = COALESCE(p.clinic_id, default_clinic_id),
            t.branch_id = COALESCE(p.branch_id, default_branch_id)
        WHERE t.clinic_id IS NULL;

        -- 5. Backfill Appointments
        UPDATE appointments a
        JOIN patients p ON p.id = a.patient_id
        SET a.clinic_id = COALESCE(p.clinic_id, default_clinic_id),
            a.branch_id = COALESCE(p.branch_id, default_branch_id)
        WHERE a.clinic_id IS NULL;

        -- 6. Backfill Walk-in Queue
        UPDATE walk_in_queue q
        JOIN patients p ON p.id = q.patient_id
        SET q.clinic_id = COALESCE(p.clinic_id, default_clinic_id),
            q.branch_id = COALESCE(p.branch_id, default_branch_id)
        WHERE q.clinic_id IS NULL;
        
        -- 7. Backfill Tooth Conditions
        UPDATE tooth_conditions tc
        JOIN patients p ON p.id = tc.patient_id
        SET tc.clinic_id = COALESCE(p.clinic_id, default_clinic_id)
        WHERE tc.clinic_id IS NULL;

        -- 8. Backfill Payment Records
        UPDATE payment_records pr
        LEFT JOIN walk_in_queue q ON q.id = pr.queue_id
        LEFT JOIN patients p ON p.id = q.patient_id
        SET pr.clinic_id = COALESCE(p.clinic_id, default_clinic_id),
            pr.branch_id = COALESCE(p.branch_id, default_branch_id)
        WHERE pr.clinic_id IS NULL;

    END IF;
END //
DELIMITER ;

CALL BackfillTenantData();
DROP PROCEDURE BackfillTenantData;
