const express = require('express');
const router = express.Router();
const db = require('../db');
const {
  actorRole,
  actorUserId,
  normalizeApprovalStatus,
  getActorUserRow,
  enforceAdminAccess,
  hasUsersApprovalStatusColumn,
} = require('../utils/accessControl');
const { sendEmail } = require('../utils/mailer');

let hasRequestsTableCache = null;
let usersApprovalColumnsSupportCache = null;

function sanitizeText(value, max = 255) {
  const text = String(value || '').trim();
  return text ? text.slice(0, max) : '';
}

function sanitizeLongText(value, max = 2000) {
  const text = String(value || '').trim();
  return text ? text.slice(0, max) : '';
}

function toPositiveInt(value, fallback = null) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function sanitizeDocumentData(value, maxChars = 2_500_000) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.length > maxChars) return '';
  return text;
}

function normalizeRequestStatus(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'pendingreview') return 'pending_review';
  if (normalized === 'pending_review' || normalized === 'approved' || normalized === 'declined') {
    return normalized;
  }
  return 'pending_review';
}

async function hasRequestsTable() {
  if (hasRequestsTableCache !== null) {
    return hasRequestsTableCache;
  }

  try {
    const [rows] = await db.query("SHOW TABLES LIKE 'superadmin_access_requests'");
    hasRequestsTableCache = rows.length > 0;
  } catch (_err) {
    hasRequestsTableCache = false;
  }

  return hasRequestsTableCache;
}

async function getUsersApprovalColumnsSupport() {
  if (usersApprovalColumnsSupportCache) {
    return usersApprovalColumnsSupportCache;
  }

  const support = {
    approval_status: false,
    approved_at: false,
    approved_by_user_id: false,
    declined_at: false,
    decline_reason: false,
  };

  try {
    const [rows] = await db.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = DATABASE()
         AND table_name = 'users'
         AND column_name IN ('approval_status', 'approved_at', 'approved_by_user_id', 'declined_at', 'decline_reason')`
    );

    rows.forEach((row) => {
      const key = String(row.column_name || '').trim().toLowerCase();
      if (Object.prototype.hasOwnProperty.call(support, key)) {
        support[key] = true;
      }
    });
  } catch (_err) {
    // Keep defaults.
  }

  usersApprovalColumnsSupportCache = support;
  return support;
}

async function updateUserApprovalState(userId, state, { reviewerUserId = null, declineReason = '' } = {}) {
  const support = await getUsersApprovalColumnsSupport();
  if (!support.approval_status) {
    throw new Error('Approval status column is not available on users table. Run latest migration first.');
  }

  const sets = [];
  const values = [];

  const normalizedState = normalizeApprovalStatus(state);

  sets.push('approval_status = ?');
  values.push(normalizedState);

  if (normalizedState === 'approved') {
    if (support.approved_at) sets.push('approved_at = NOW()');
    if (support.approved_by_user_id) {
      sets.push('approved_by_user_id = ?');
      values.push(reviewerUserId || null);
    }
    if (support.declined_at) sets.push('declined_at = NULL');
    if (support.decline_reason) sets.push('decline_reason = NULL');
  } else if (normalizedState === 'declined') {
    if (support.approved_at) sets.push('approved_at = NULL');
    if (support.approved_by_user_id) sets.push('approved_by_user_id = NULL');
    if (support.declined_at) sets.push('declined_at = NOW()');
    if (support.decline_reason) {
      sets.push('decline_reason = ?');
      values.push(sanitizeLongText(declineReason, 500));
    }
  } else {
    if (support.approved_at) sets.push('approved_at = NULL');
    if (support.approved_by_user_id) sets.push('approved_by_user_id = NULL');
    if (support.declined_at) sets.push('declined_at = NULL');
    if (support.decline_reason) sets.push('decline_reason = NULL');
  }

  values.push(userId);

  await db.query(
    `UPDATE users
     SET ${sets.join(', ')}
     WHERE id = ?`,
    values
  );
}

function validateSubmissionPayload(body) {
  const payload = {
    clinic_name: sanitizeText(body?.clinic_name),
    branch_count: toPositiveInt(body?.branch_count, 1),
    clinic_address: sanitizeLongText(body?.clinic_address, 2000),
    contact_phone: sanitizeText(body?.contact_phone, 64),
    business_permit_or_license_number: sanitizeText(body?.business_permit_or_license_number),
    owner_valid_id_name: sanitizeText(body?.owner_valid_id_name),
    owner_valid_id_data: sanitizeDocumentData(body?.owner_valid_id_data),
    doh_lto_number: sanitizeText(body?.doh_lto_number),
    doh_lto_doc_name: sanitizeText(body?.doh_lto_doc_name),
    doh_lto_doc_data: sanitizeDocumentData(body?.doh_lto_doc_data),
    sec_dti_number: sanitizeText(body?.sec_dti_number),
    sec_dti_doc_name: sanitizeText(body?.sec_dti_doc_name),
    sec_dti_doc_data: sanitizeDocumentData(body?.sec_dti_doc_data),
    bir_2303_number: sanitizeText(body?.bir_2303_number),
    bir_2303_doc_name: sanitizeText(body?.bir_2303_doc_name),
    bir_2303_doc_data: sanitizeDocumentData(body?.bir_2303_doc_data),
  };

  const requiredMessages = [];

  if (!payload.clinic_name) requiredMessages.push('Clinic name is required.');
  if (!payload.branch_count) requiredMessages.push('Branch count is required.');
  if (!payload.clinic_address) requiredMessages.push('Clinic address is required.');
  if (!payload.contact_phone) requiredMessages.push('Contact phone is required.');
  if (!payload.business_permit_or_license_number) requiredMessages.push('Business permit/license number is required.');
  if (!payload.owner_valid_id_name) requiredMessages.push('Owner valid ID name is required.');
  if (!payload.owner_valid_id_data) requiredMessages.push('Owner valid ID file is required.');
  if (!payload.doh_lto_number) requiredMessages.push('DOH LTO number is required.');
  if (!payload.doh_lto_doc_name) requiredMessages.push('DOH LTO document name is required.');
  if (!payload.doh_lto_doc_data) requiredMessages.push('DOH LTO document file is required.');
  if (!payload.sec_dti_number) requiredMessages.push('SEC/DTI number is required.');
  if (!payload.sec_dti_doc_name) requiredMessages.push('SEC/DTI document name is required.');
  if (!payload.sec_dti_doc_data) requiredMessages.push('SEC/DTI document file is required.');
  if (!payload.bir_2303_number) requiredMessages.push('BIR Form 2303 number is required.');
  if (!payload.bir_2303_doc_name) requiredMessages.push('BIR Form 2303 document name is required.');
  if (!payload.bir_2303_doc_data) requiredMessages.push('BIR Form 2303 document file is required.');

  if (payload.branch_count > 500) {
    requiredMessages.push('Branch count is too high.');
  }

  return {
    payload,
    errors: requiredMessages,
  };
}

function mapRequestSummary(row) {
  if (!row) return null;

  return {
    id: row.id,
    user_id: row.user_id,
    user_email: row.user_email,
    user_name: row.user_name,
    clinic_name: row.clinic_name,
    branch_count: Number(row.branch_count || 0),
    clinic_address: row.clinic_address,
    contact_phone: row.contact_phone,
    business_permit_or_license_number: row.business_permit_or_license_number,
    owner_valid_id_name: row.owner_valid_id_name,
    doh_lto_number: row.doh_lto_number,
    doh_lto_doc_name: row.doh_lto_doc_name,
    sec_dti_number: row.sec_dti_number,
    sec_dti_doc_name: row.sec_dti_doc_name,
    bir_2303_number: row.bir_2303_number,
    bir_2303_doc_name: row.bir_2303_doc_name,
    status: normalizeRequestStatus(row.status),
    submitted_at: row.submitted_at,
    reviewed_at: row.reviewed_at,
    reviewed_by_user_id: row.reviewed_by_user_id,
    review_notes: row.review_notes,
    resubmission_count: Number(row.resubmission_count || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapRequestDetail(row) {
  if (!row) return null;

  return {
    ...mapRequestSummary(row),
    owner_valid_id_data: row.owner_valid_id_data || '',
    doh_lto_doc_data: row.doh_lto_doc_data || '',
    sec_dti_doc_data: row.sec_dti_doc_data || '',
    bir_2303_doc_data: row.bir_2303_doc_data || '',
  };
}

async function notifyGlobalAdminsAboutSubmission(requester, requestRow) {
  try {
    const [admins] = await db.query(
      `SELECT email
       FROM users
       WHERE LOWER(REPLACE(COALESCE(role, ''), '_', '')) = 'globaladmin'
         AND COALESCE(is_archived, 0) = 0
         AND COALESCE(email, '') <> ''`
    );

    const emails = admins
      .map((item) => String(item.email || '').trim())
      .filter(Boolean);

    if (!emails.length) return;

    const to = emails.join(', ');
    const subject = 'New Super Admin Access Request Pending Approval';
    const text = [
      'A new super admin request has been submitted.',
      '',
      `Applicant: ${requester.full_name || requester.email}`,
      `Email: ${requester.email}`,
      `Clinic Name: ${requestRow.clinic_name}`,
      `Branch Count: ${requestRow.branch_count}`,
      '',
      'Please review the request in the admin approval page.',
    ].join('\n');

    await sendEmail({ to, subject, text });
  } catch (error) {
    console.error('Failed to send global admin submission notification email:', error);
  }
}

async function notifyApplicantDecision({ email, name, approved, reason }) {
  if (!email) return;

  const subject = approved
    ? 'Your iDENTify Super Admin Request Was Approved'
    : 'Your iDENTify Super Admin Request Was Declined';

  const text = approved
    ? [
      `Hello ${name || 'there'},`,
      '',
      'Your request to use iDENTify as Super Admin has been approved.',
      'You can now log in and start managing your clinic branches and staff.',
    ].join('\n')
    : [
      `Hello ${name || 'there'},`,
      '',
      'Your request to use iDENTify as Super Admin was declined.',
      reason ? `Reason: ${reason}` : 'Reason: Not specified.',
      'You may update your requirements and resubmit your request.',
    ].join('\n');

  try {
    await sendEmail({ to: email, subject, text });
  } catch (error) {
    console.error('Failed to send applicant decision email:', error);
  }
}

async function requireSuperAdminRequester(req, res) {
  const role = actorRole(req);
  const userId = actorUserId(req);

  if (role !== 'superadmin' || !userId) {
    res.status(403).json({ message: 'Only signed-in super admins can access this endpoint.' });
    return null;
  }

  let actor;
  try {
    actor = await getActorUserRow(userId);
  } catch (error) {
    console.error('Failed to resolve super admin actor context:', error);
    res.status(500).json({ message: 'Failed to verify actor context.' });
    return null;
  }

  if (!actor || actor.role !== 'superadmin') {
    res.status(403).json({ message: 'Actor context is invalid. Please sign in again.' });
    return null;
  }

  if (actor.is_archived) {
    res.status(403).json({ message: 'This account has been archived.' });
    return null;
  }

  return actor;
}

router.get('/me', async (req, res) => {
  const actor = await requireSuperAdminRequester(req, res);
  if (!actor) return;

  const hasApprovalColumn = await hasUsersApprovalStatusColumn();
  const hasTable = await hasRequestsTable();

  if (!hasApprovalColumn || !hasTable) {
    return res.status(500).json({
      message: 'Approval workflow is not configured on this environment yet. Run latest migration first.',
    });
  }

  try {
    const [rows] = await db.query(
      `SELECT
         r.*,
         u.email AS user_email,
         u.full_name AS user_name
       FROM superadmin_access_requests r
       INNER JOIN users u ON u.id = r.user_id
       WHERE r.user_id = ?
       LIMIT 1`,
      [actor.id]
    );

    const request = rows.length ? mapRequestDetail(rows[0]) : null;

    return res.json({
      user: {
        id: actor.id,
        email: actor.email,
        name: actor.full_name || actor.email,
        role: actor.role,
        approval_status: normalizeApprovalStatus(actor.approval_status),
      },
      request,
    });
  } catch (error) {
    console.error('Failed to load superadmin request:', error);
    return res.status(500).json({ message: 'Failed to load request details.' });
  }
});

router.post('/me/submit', async (req, res) => {
  const actor = await requireSuperAdminRequester(req, res);
  if (!actor) return;

  const hasApprovalColumn = await hasUsersApprovalStatusColumn();
  const hasTable = await hasRequestsTable();

  if (!hasApprovalColumn || !hasTable) {
    return res.status(500).json({
      message: 'Approval workflow is not configured on this environment yet. Run latest migration first.',
    });
  }

  const { payload, errors } = validateSubmissionPayload(req.body || {});
  if (errors.length > 0) {
    return res.status(400).json({ message: errors[0] });
  }

  const actorApprovalStatus = normalizeApprovalStatus(actor.approval_status);
  if (actorApprovalStatus === 'approved') {
    return res.status(400).json({ message: 'This super admin account is already approved.' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [existingRows] = await connection.query(
      `SELECT id, status, resubmission_count
       FROM superadmin_access_requests
       WHERE user_id = ?
       LIMIT 1`,
      [actor.id]
    );

    const existing = existingRows[0] || null;
    const existingStatus = existing ? normalizeRequestStatus(existing.status) : null;

    if (existing && existingStatus === 'pending_review') {
      await connection.rollback();
      return res.status(409).json({ message: 'Your request is already pending review.' });
    }

    if (existing) {
      const nextResubmissionCount = existingStatus === 'declined'
        ? Number(existing.resubmission_count || 0) + 1
        : Number(existing.resubmission_count || 0);

      await connection.query(
        `UPDATE superadmin_access_requests
         SET clinic_name = ?,
             branch_count = ?,
             clinic_address = ?,
             contact_phone = ?,
             business_permit_or_license_number = ?,
             owner_valid_id_name = ?,
             owner_valid_id_data = ?,
             doh_lto_number = ?,
             doh_lto_doc_name = ?,
             doh_lto_doc_data = ?,
             sec_dti_number = ?,
             sec_dti_doc_name = ?,
             sec_dti_doc_data = ?,
             bir_2303_number = ?,
             bir_2303_doc_name = ?,
             bir_2303_doc_data = ?,
             status = 'pending_review',
             submitted_at = NOW(),
             reviewed_at = NULL,
             reviewed_by_user_id = NULL,
             review_notes = NULL,
             resubmission_count = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [
          payload.clinic_name,
          payload.branch_count,
          payload.clinic_address,
          payload.contact_phone,
          payload.business_permit_or_license_number,
          payload.owner_valid_id_name,
          payload.owner_valid_id_data,
          payload.doh_lto_number,
          payload.doh_lto_doc_name,
          payload.doh_lto_doc_data,
          payload.sec_dti_number,
          payload.sec_dti_doc_name,
          payload.sec_dti_doc_data,
          payload.bir_2303_number,
          payload.bir_2303_doc_name,
          payload.bir_2303_doc_data,
          nextResubmissionCount,
          existing.id,
        ]
      );
    } else {
      await connection.query(
        `INSERT INTO superadmin_access_requests (
           user_id,
           clinic_name,
           branch_count,
           clinic_address,
           contact_phone,
           business_permit_or_license_number,
           owner_valid_id_name,
           owner_valid_id_data,
           doh_lto_number,
           doh_lto_doc_name,
           doh_lto_doc_data,
           sec_dti_number,
           sec_dti_doc_name,
           sec_dti_doc_data,
           bir_2303_number,
           bir_2303_doc_name,
           bir_2303_doc_data,
           status,
           submitted_at,
           reviewed_at,
           reviewed_by_user_id,
           review_notes,
           resubmission_count
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', NOW(), NULL, NULL, NULL, 0)`,
        [
          actor.id,
          payload.clinic_name,
          payload.branch_count,
          payload.clinic_address,
          payload.contact_phone,
          payload.business_permit_or_license_number,
          payload.owner_valid_id_name,
          payload.owner_valid_id_data,
          payload.doh_lto_number,
          payload.doh_lto_doc_name,
          payload.doh_lto_doc_data,
          payload.sec_dti_number,
          payload.sec_dti_doc_name,
          payload.sec_dti_doc_data,
          payload.bir_2303_number,
          payload.bir_2303_doc_name,
          payload.bir_2303_doc_data,
        ]
      );
    }

    const support = await getUsersApprovalColumnsSupport();
    if (!support.approval_status) {
      throw new Error('Approval status column is not available on users table. Run latest migration first.');
    }

    const pendingSets = ['approval_status = ?'];
    const pendingValues = ['pending_review'];

    if (support.approved_at) pendingSets.push('approved_at = NULL');
    if (support.approved_by_user_id) pendingSets.push('approved_by_user_id = NULL');
    if (support.declined_at) pendingSets.push('declined_at = NULL');
    if (support.decline_reason) pendingSets.push('decline_reason = NULL');

    pendingValues.push(actor.id);

    await connection.query(
      `UPDATE users
       SET ${pendingSets.join(', ')}
       WHERE id = ?`,
      pendingValues
    );

    await connection.commit();

    await notifyGlobalAdminsAboutSubmission(actor, payload);

    return res.status(200).json({
      message: 'Requirements submitted successfully. Please wait for global admin review.',
      approval_status: 'pending_review',
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_rollbackErr) {
        // Ignore rollback errors and return original failure.
      }
    }
    console.error('Failed to submit superadmin request:', error);
    return res.status(500).json({ message: 'Failed to submit request.' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.get('/review', async (req, res) => {
  const access = await enforceAdminAccess(req, res, {
    allowGlobalAdmin: true,
    allowSuperAdmin: false,
    requireApprovedSuperAdmin: false,
  });
  if (!access.ok) return;

  const hasTable = await hasRequestsTable();
  if (!hasTable) {
    return res.status(500).json({ message: 'Approval workflow is not configured yet. Run latest migration first.' });
  }

  const statusFilter = String(req.query?.status || 'pending_review').trim().toLowerCase();
  const where = [];
  const params = [];

  if (statusFilter !== 'all') {
    const normalizedStatus = normalizeRequestStatus(statusFilter);
    where.push('r.status = ?');
    params.push(normalizedStatus);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  try {
    const [rows] = await db.query(
      `SELECT
         r.id,
         r.user_id,
         r.clinic_name,
         r.branch_count,
         r.contact_phone,
         r.business_permit_or_license_number,
         r.owner_valid_id_name,
         r.doh_lto_number,
         r.doh_lto_doc_name,
         r.sec_dti_number,
         r.sec_dti_doc_name,
         r.bir_2303_number,
         r.bir_2303_doc_name,
         r.status,
         r.submitted_at,
         r.reviewed_at,
         r.reviewed_by_user_id,
         r.review_notes,
         r.resubmission_count,
         r.created_at,
         r.updated_at,
         u.email AS user_email,
         u.full_name AS user_name
       FROM superadmin_access_requests r
       INNER JOIN users u ON u.id = r.user_id
       ${whereSql}
       ORDER BY r.submitted_at DESC, r.id DESC`,
      params
    );

    return res.json(rows.map(mapRequestSummary));
  } catch (error) {
    console.error('Failed to list superadmin requests for review:', error);
    return res.status(500).json({ message: 'Failed to load approval requests.' });
  }
});

router.get('/review/:requestId', async (req, res) => {
  const access = await enforceAdminAccess(req, res, {
    allowGlobalAdmin: true,
    allowSuperAdmin: false,
    requireApprovedSuperAdmin: false,
  });
  if (!access.ok) return;

  const hasTable = await hasRequestsTable();
  if (!hasTable) {
    return res.status(500).json({ message: 'Approval workflow is not configured yet. Run latest migration first.' });
  }

  const requestId = toPositiveInt(req.params.requestId);
  if (!requestId) {
    return res.status(400).json({ message: 'Invalid request id.' });
  }

  try {
    const [rows] = await db.query(
      `SELECT
         r.*,
         u.email AS user_email,
         u.full_name AS user_name
       FROM superadmin_access_requests r
       INNER JOIN users u ON u.id = r.user_id
       WHERE r.id = ?
       LIMIT 1`,
      [requestId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: 'Request not found.' });
    }

    return res.json(mapRequestDetail(rows[0]));
  } catch (error) {
    console.error('Failed to load superadmin request detail:', error);
    return res.status(500).json({ message: 'Failed to load request details.' });
  }
});

router.patch('/review/:requestId/approve', async (req, res) => {
  const access = await enforceAdminAccess(req, res, {
    allowGlobalAdmin: true,
    allowSuperAdmin: false,
    requireApprovedSuperAdmin: false,
  });
  if (!access.ok) return;

  const hasTable = await hasRequestsTable();
  if (!hasTable) {
    return res.status(500).json({ message: 'Approval workflow is not configured yet. Run latest migration first.' });
  }

  const requestId = toPositiveInt(req.params.requestId);
  if (!requestId) {
    return res.status(400).json({ message: 'Invalid request id.' });
  }

  const reviewNotes = sanitizeLongText(req.body?.review_notes, 500);

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT
         r.id,
         r.user_id,
         r.status,
         u.email AS user_email,
         u.full_name AS user_name
       FROM superadmin_access_requests r
       INNER JOIN users u ON u.id = r.user_id
       WHERE r.id = ?
       LIMIT 1`,
      [requestId]
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Request not found.' });
    }

    const requestRow = rows[0];

    await connection.query(
      `UPDATE superadmin_access_requests
       SET status = 'approved',
           reviewed_at = NOW(),
           reviewed_by_user_id = ?,
           review_notes = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [access.userId, reviewNotes || null, requestId]
    );

    const support = await getUsersApprovalColumnsSupport();
    if (!support.approval_status) {
      throw new Error('Approval status column is not available on users table. Run latest migration first.');
    }

    const userSets = ['approval_status = ?'];
    const userValues = ['approved'];

    if (support.approved_at) userSets.push('approved_at = NOW()');
    if (support.approved_by_user_id) {
      userSets.push('approved_by_user_id = ?');
      userValues.push(access.userId);
    }
    if (support.declined_at) userSets.push('declined_at = NULL');
    if (support.decline_reason) userSets.push('decline_reason = NULL');

    userValues.push(requestRow.user_id);

    await connection.query(
      `UPDATE users
       SET ${userSets.join(', ')}
       WHERE id = ?`,
      userValues
    );

    await connection.commit();

    await notifyApplicantDecision({
      email: requestRow.user_email,
      name: requestRow.user_name,
      approved: true,
      reason: '',
    });

    return res.json({
      message: 'Request approved successfully.',
      approval_status: 'approved',
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_rollbackErr) {
        // Ignore rollback errors and return original failure.
      }
    }
    console.error('Failed to approve superadmin request:', error);
    return res.status(500).json({ message: 'Failed to approve request.' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.patch('/review/:requestId/decline', async (req, res) => {
  const access = await enforceAdminAccess(req, res, {
    allowGlobalAdmin: true,
    allowSuperAdmin: false,
    requireApprovedSuperAdmin: false,
  });
  if (!access.ok) return;

  const hasTable = await hasRequestsTable();
  if (!hasTable) {
    return res.status(500).json({ message: 'Approval workflow is not configured yet. Run latest migration first.' });
  }

  const requestId = toPositiveInt(req.params.requestId);
  if (!requestId) {
    return res.status(400).json({ message: 'Invalid request id.' });
  }

  const declineReason = sanitizeLongText(req.body?.reason || req.body?.review_notes, 500);
  if (!declineReason) {
    return res.status(400).json({ message: 'Decline reason is required.' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.query(
      `SELECT
         r.id,
         r.user_id,
         r.status,
         u.email AS user_email,
         u.full_name AS user_name
       FROM superadmin_access_requests r
       INNER JOIN users u ON u.id = r.user_id
       WHERE r.id = ?
       LIMIT 1`,
      [requestId]
    );

    if (!rows.length) {
      await connection.rollback();
      return res.status(404).json({ message: 'Request not found.' });
    }

    const requestRow = rows[0];

    await connection.query(
      `UPDATE superadmin_access_requests
       SET status = 'declined',
           reviewed_at = NOW(),
           reviewed_by_user_id = ?,
           review_notes = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [access.userId, declineReason, requestId]
    );

    const support = await getUsersApprovalColumnsSupport();
    if (!support.approval_status) {
      throw new Error('Approval status column is not available on users table. Run latest migration first.');
    }

    const userSets = ['approval_status = ?'];
    const userValues = ['declined'];

    if (support.approved_at) userSets.push('approved_at = NULL');
    if (support.approved_by_user_id) userSets.push('approved_by_user_id = NULL');
    if (support.declined_at) userSets.push('declined_at = NOW()');
    if (support.decline_reason) {
      userSets.push('decline_reason = ?');
      userValues.push(declineReason);
    }

    userValues.push(requestRow.user_id);

    await connection.query(
      `UPDATE users
       SET ${userSets.join(', ')}
       WHERE id = ?`,
      userValues
    );

    await connection.commit();

    await notifyApplicantDecision({
      email: requestRow.user_email,
      name: requestRow.user_name,
      approved: false,
      reason: declineReason,
    });

    return res.json({
      message: 'Request declined successfully.',
      approval_status: 'declined',
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (_rollbackErr) {
        // Ignore rollback errors and return original failure.
      }
    }
    console.error('Failed to decline superadmin request:', error);
    return res.status(500).json({ message: 'Failed to decline request.' });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

module.exports = router;
