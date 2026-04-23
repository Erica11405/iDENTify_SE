-- iDENTify-Web migration: Backfill Tenant Data
-- Date: 2026-04-23
-- Description: Assigns legacy (NULL) clinic/branch IDs to the first available clinic to ensure visibility under strict isolation.

-- 1. Resolve default clinic (oldest/first)
SET @default_clinic_id = (SELECT id FROM clinics ORDER BY id ASC LIMIT 1);

-- 2. Resolve default branch for that clinic
SET @default_branch_id = (SELECT id FROM clinic_branches WHERE clinic_id = @default_clinic_id ORDER BY id ASC LIMIT 1);

-- 3. Backfill Patients
UPDATE patients SET clinic_id = @default_clinic_id WHERE clinic_id IS NULL AND @default_clinic_id IS NOT NULL;
UPDATE patients SET branch_id = @default_branch_id WHERE branch_id IS NULL AND clinic_id = @default_clinic_id AND @default_branch_id IS NOT NULL;

-- 4. Backfill Treatment Timeline
UPDATE treatment_timeline t
JOIN patients p ON p.id = t.patient_id
SET t.clinic_id = COALESCE(p.clinic_id, @default_clinic_id),
    t.branch_id = COALESCE(p.branch_id, @default_branch_id)
WHERE t.clinic_id IS NULL AND @default_clinic_id IS NOT NULL;

-- 5. Backfill Appointments
UPDATE appointments a
JOIN patients p ON p.id = a.patient_id
SET a.clinic_id = COALESCE(p.clinic_id, @default_clinic_id),
    a.branch_id = COALESCE(p.branch_id, @default_branch_id)
WHERE a.clinic_id IS NULL AND @default_clinic_id IS NOT NULL;

-- 6. Backfill Walk-in Queue
UPDATE walk_in_queue q
JOIN patients p ON p.id = q.patient_id
SET q.clinic_id = COALESCE(p.clinic_id, @default_clinic_id),
    q.branch_id = COALESCE(p.branch_id, @default_branch_id)
WHERE q.clinic_id IS NULL AND @default_clinic_id IS NOT NULL;

-- 7. Backfill Tooth Conditions
UPDATE tooth_conditions tc
JOIN patients p ON p.id = tc.patient_id
SET tc.clinic_id = COALESCE(p.clinic_id, @default_clinic_id)
WHERE tc.clinic_id IS NULL AND @default_clinic_id IS NOT NULL;

-- 8. Backfill Payment Records
UPDATE payment_records pr
LEFT JOIN walk_in_queue q ON q.id = pr.queue_id
LEFT JOIN patients p ON p.id = q.patient_id
SET pr.clinic_id = COALESCE(p.clinic_id, @default_clinic_id),
    pr.branch_id = COALESCE(p.branch_id, @default_branch_id)
WHERE pr.clinic_id IS NULL AND @default_clinic_id IS NOT NULL;
