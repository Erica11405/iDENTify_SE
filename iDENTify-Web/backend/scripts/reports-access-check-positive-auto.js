#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const db = require("../db");
const DEFAULT_REPORTS_BASE_URL = "http://localhost:8080/api";
const reportsBaseUrl = String(process.env.REPORTS_BASE_URL || DEFAULT_REPORTS_BASE_URL).replace(/\/$/, "");
const LOOKUP_TIMEOUT_MS = (() => {
  const parsed = Number.parseInt(String(process.env.REPORTS_LOOKUP_TIMEOUT_MS || "12000"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 12000;
})();
const LOOKUP_RETRY_COUNT = (() => {
  const parsed = Number.parseInt(String(process.env.REPORTS_LOOKUP_RETRY_COUNT || "2"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
})();
const USER_ID_SCAN_MAX = (() => {
  const parsed = Number.parseInt(String(process.env.REPORTS_POSITIVE_USER_ID_SCAN_MAX || "0"), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(parsed, 200);
})();
const DENTIST_ID_SCAN_MAX = (() => {
  const parsed = Number.parseInt(String(process.env.REPORTS_POSITIVE_DENTIST_ID_SCAN_MAX || "0"), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(parsed, 200);
})();

function toPositiveString(value) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return String(parsed);
}

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase().replace(/_/g, "");
}

function todayDateOnly() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function hasMissingPositiveIdentities(envUpdates) {
  return !envUpdates.REPORTS_POSITIVE_GLOBALADMIN_USER_ID
    || !envUpdates.REPORTS_POSITIVE_AIDE_USER_ID
    || !envUpdates.REPORTS_POSITIVE_DENTIST_USER_ID
    || !envUpdates.REPORTS_POSITIVE_DENTIST_ID;
}

function parsePositiveIdCandidates(envName) {
  const raw = String(process.env[envName] || "").trim();
  if (!raw) return [];

  const values = raw
    .split(",")
    .map((part) => toPositiveString(part))
    .filter(Boolean);

  return Array.from(new Set(values));
}

function normalizeCandidateList(value) {
  const values = [];

  if (Array.isArray(value)) {
    value.forEach((item) => {
      const parsed = toPositiveString(item);
      if (parsed) {
        values.push(parsed);
      }
    });
  } else if (value !== undefined && value !== null) {
    String(value)
      .split(",")
      .forEach((item) => {
        const parsed = toPositiveString(item);
        if (parsed) {
          values.push(parsed);
        }
      });
  }

  return Array.from(new Set(values));
}

function resolveScanLimit(configValue, fallback) {
  const parsed = Number.parseInt(String(configValue || ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 200);
}

function readPositiveConfig() {
  const notes = [];
  const candidatePaths = [];

  const explicitConfigPath = String(process.env.REPORTS_POSITIVE_CONFIG_PATH || "").trim();
  if (explicitConfigPath) {
    candidatePaths.push(path.resolve(explicitConfigPath));
  }

  candidatePaths.push(path.join(__dirname, "reports-access-check-positive.config.json"));
  candidatePaths.push(path.join(__dirname, "..", ".reports-access-check-positive.json"));

  const dedupedPaths = Array.from(new Set(candidatePaths));

  for (const filePath of dedupedPaths) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    try {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = JSON.parse(raw);

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        notes.push(`Ignoring invalid positive-check config in ${filePath} (expected a JSON object).`);
        continue;
      }

      notes.push(`Loaded positive-check config from ${filePath}.`);
      return { config: parsed, notes };
    } catch (error) {
      notes.push(`Failed to parse positive-check config ${filePath}: ${error && error.message ? error.message : String(error)}`);
    }
  }

  return { config: {}, notes };
}

function buildSequentialCandidates(maxCount) {
  const candidates = [];
  for (let index = 1; index <= maxCount; index += 1) {
    candidates.push(String(index));
  }
  return candidates;
}

function readExistingPositiveEnv(config = {}) {
  const env = {};

  const globalAdminUserId = toPositiveString(process.env.REPORTS_POSITIVE_GLOBALADMIN_USER_ID)
    || toPositiveString(config.globalAdminUserId);
  if (globalAdminUserId) {
    env.REPORTS_POSITIVE_GLOBALADMIN_USER_ID = globalAdminUserId;
  }

  const aideUserId = toPositiveString(process.env.REPORTS_POSITIVE_AIDE_USER_ID)
    || toPositiveString(config.aideUserId);
  if (aideUserId) {
    env.REPORTS_POSITIVE_AIDE_USER_ID = aideUserId;
  }

  const dentistUserId = toPositiveString(process.env.REPORTS_POSITIVE_DENTIST_USER_ID)
    || toPositiveString(config.dentistUserId);
  if (dentistUserId) {
    env.REPORTS_POSITIVE_DENTIST_USER_ID = dentistUserId;
  }

  const dentistId = toPositiveString(process.env.REPORTS_POSITIVE_DENTIST_ID)
    || toPositiveString(config.dentistId);
  if (dentistId) {
    env.REPORTS_POSITIVE_DENTIST_ID = dentistId;
  }

  return env;
}

async function querySingleRow(sql, params = []) {
  const [rows] = await db.query(sql, params);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

async function resolvePositiveIdentities(existingEnv) {
  const notes = [];
  const envUpdates = {
    ...existingEnv,
  };

  const needsGlobalAdmin = !envUpdates.REPORTS_POSITIVE_GLOBALADMIN_USER_ID;
  const needsAide = !envUpdates.REPORTS_POSITIVE_AIDE_USER_ID;
  const needsDentistUser = !envUpdates.REPORTS_POSITIVE_DENTIST_USER_ID;
  const needsDentistId = !envUpdates.REPORTS_POSITIVE_DENTIST_ID;

  if (needsGlobalAdmin) {
    const globalAdminRow = await querySingleRow(
      `SELECT id
       FROM users
       WHERE LOWER(REPLACE(COALESCE(role, ''), '_', '')) = 'globaladmin'
       ORDER BY id ASC
       LIMIT 1`
    );

    const globalAdminUserId = toPositiveString(globalAdminRow && globalAdminRow.id);
    if (globalAdminUserId) {
      envUpdates.REPORTS_POSITIVE_GLOBALADMIN_USER_ID = globalAdminUserId;
    }
  }

  if (needsAide) {
    const aideRow = await querySingleRow(
      `SELECT id
       FROM users
       WHERE LOWER(REPLACE(COALESCE(role, ''), '_', '')) = 'aide'
       ORDER BY id ASC
       LIMIT 1`
    );

    const aideUserId = toPositiveString(aideRow && aideRow.id);
    if (aideUserId) {
      envUpdates.REPORTS_POSITIVE_AIDE_USER_ID = aideUserId;
    }
  }

  if (needsDentistUser || needsDentistId) {
    const dentistRow = await querySingleRow(
      `SELECT id, dentist_id
       FROM users
       WHERE LOWER(REPLACE(COALESCE(role, ''), '_', '')) = 'dentist'
         AND dentist_id IS NOT NULL
         AND dentist_id > 0
       ORDER BY id ASC
       LIMIT 1`
    );

    if (needsDentistUser) {
      const dentistUserId = toPositiveString(dentistRow && dentistRow.id);
      if (dentistUserId) {
        envUpdates.REPORTS_POSITIVE_DENTIST_USER_ID = dentistUserId;
      }
    }

    if (needsDentistId) {
      const dentistId = toPositiveString(dentistRow && dentistRow.dentist_id);
      if (dentistId) {
        envUpdates.REPORTS_POSITIVE_DENTIST_ID = dentistId;
      }
    }
  }

  if (!envUpdates.REPORTS_POSITIVE_GLOBALADMIN_USER_ID) {
    notes.push("No globaladmin user was found for REPORTS_POSITIVE_GLOBALADMIN_USER_ID.");
  }

  if (!envUpdates.REPORTS_POSITIVE_AIDE_USER_ID) {
    notes.push("No aide user was found for REPORTS_POSITIVE_AIDE_USER_ID.");
  }

  if (!envUpdates.REPORTS_POSITIVE_DENTIST_USER_ID || !envUpdates.REPORTS_POSITIVE_DENTIST_ID) {
    notes.push("No dentist user with a dentist_id was found for dentist positive checks.");
  }

  return { envUpdates, notes };
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = LOOKUP_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJsonWithRetries(url, options = {}, { label = url, notes } = {}) {
  let lastError = null;

  for (let attempt = 1; attempt <= LOOKUP_RETRY_COUNT; attempt += 1) {
    const timeoutMs = LOOKUP_TIMEOUT_MS * attempt;

    try {
      return await fetchJsonWithTimeout(url, options, timeoutMs);
    } catch (error) {
      lastError = error;

      if (attempt < LOOKUP_RETRY_COUNT && notes) {
        const message = error && error.message ? error.message : String(error);
        notes.push(`Retry ${attempt}/${LOOKUP_RETRY_COUNT} failed for ${label} (${message}).`);
      }
    }
  }

  throw lastError || new Error(`Failed to load ${label}`);
}

async function probeGlobalAdminUserId(candidateUserId) {
  const userId = toPositiveString(candidateUserId);
  if (!userId) return false;

  const reportDate = todayDateOnly();

  for (let attempt = 1; attempt <= LOOKUP_RETRY_COUNT; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS * attempt);

    try {
      const response = await fetch(`${reportsBaseUrl}/reports?date=${reportDate}`, {
        method: "GET",
        headers: {
          "x-user-role": "globaladmin",
          "x-user-id": userId,
        },
        signal: controller.signal,
      });

      if (response.status === 200) {
        return true;
      }
    } catch (_error) {
      // Best effort probing only.
    } finally {
      clearTimeout(timeout);
    }
  }

  return false;
}

async function probeAideUserId(candidateUserId) {
  const userId = toPositiveString(candidateUserId);
  if (!userId) return false;

  const reportDate = todayDateOnly();
  for (let attempt = 1; attempt <= LOOKUP_RETRY_COUNT; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS * attempt);

    try {
      const response = await fetch(`${reportsBaseUrl}/reports?date=${reportDate}`, {
        method: "GET",
        headers: {
          "x-user-role": "aide",
          "x-user-id": userId,
        },
        signal: controller.signal,
      });

      if (response.status === 200) {
        return true;
      }
    } catch (_error) {
      // Best effort probing only.
    } finally {
      clearTimeout(timeout);
    }
  }

  return false;
}

async function probeDentistAccess(candidateUserId, candidateDentistId) {
  const userId = toPositiveString(candidateUserId);
  const dentistId = toPositiveString(candidateDentistId);
  if (!userId || !dentistId) return false;

  const reportDate = todayDateOnly();
  for (let attempt = 1; attempt <= LOOKUP_RETRY_COUNT; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS * attempt);

    try {
      const response = await fetch(`${reportsBaseUrl}/reports/dentist/${dentistId}/summary?date=${reportDate}`, {
        method: "GET",
        headers: {
          "x-user-role": "dentist",
          "x-user-id": userId,
          "x-user-dentist-id": dentistId,
        },
        signal: controller.signal,
      });

      if (response.status === 200) {
        return true;
      }
    } catch (_error) {
      // Best effort probing only.
    } finally {
      clearTimeout(timeout);
    }
  }

  return false;
}

async function resolvePositiveIdentitiesFromApi(existingEnv, options = {}) {
  const notes = [];
  const envUpdates = {
    ...existingEnv,
  };

  const config = options && options.config && typeof options.config === "object"
    ? options.config
    : {};

  const extraGlobalCandidates = parsePositiveIdCandidates("REPORTS_POSITIVE_GLOBALADMIN_CANDIDATES");
  const extraAideCandidates = parsePositiveIdCandidates("REPORTS_POSITIVE_AIDE_CANDIDATES");
  const extraDentistUserCandidates = parsePositiveIdCandidates("REPORTS_POSITIVE_DENTIST_USER_CANDIDATES");
  const extraDentistIdCandidates = parsePositiveIdCandidates("REPORTS_POSITIVE_DENTIST_ID_CANDIDATES");
  const configGlobalCandidates = normalizeCandidateList(config.globalAdminCandidates);
  const configAideCandidates = normalizeCandidateList(config.aideCandidates);
  const configDentistUserCandidates = normalizeCandidateList(config.dentistUserCandidates);
  const configDentistIdCandidates = normalizeCandidateList(config.dentistIdCandidates);
  const effectiveUserScanMax = resolveScanLimit(config.userIdScanMax, USER_ID_SCAN_MAX);
  const effectiveDentistIdScanMax = resolveScanLimit(config.dentistIdScanMax, DENTIST_ID_SCAN_MAX);
  const sequentialUserCandidates = buildSequentialCandidates(effectiveUserScanMax);
  const sequentialDentistIdCandidates = buildSequentialCandidates(effectiveDentistIdScanMax);

  if (typeof fetch !== "function") {
    notes.push("API fallback is unavailable because fetch is not supported by the current Node runtime.");
    return { envUpdates, notes };
  }

  let userRows = [];
  try {
    const users = await fetchJsonWithRetries(
      `${reportsBaseUrl}/admin/users?role=all&archived=false`,
      {},
      { label: "/admin/users", notes }
    );
    userRows = Array.isArray(users) ? users : [];
    if (userRows.length === 0) {
      notes.push("API fallback returned no users from /admin/users.");
    }
  } catch (error) {
    notes.push(`API fallback failed to load /admin/users: ${error && error.message ? error.message : String(error)}`);
  }

  if (!envUpdates.REPORTS_POSITIVE_AIDE_USER_ID) {
    const aideUser = userRows.find((row) => (
      normalizeRole(row && row.role) === "aide"
      && toPositiveString(row && row.id)
    ));

    const aideUserId = toPositiveString(aideUser && aideUser.id);
    if (aideUserId) {
      envUpdates.REPORTS_POSITIVE_AIDE_USER_ID = aideUserId;
    }
  }

  if (!envUpdates.REPORTS_POSITIVE_AIDE_USER_ID && extraAideCandidates.length > 0) {
    for (const candidateId of extraAideCandidates) {
      if (await probeAideUserId(candidateId)) {
        envUpdates.REPORTS_POSITIVE_AIDE_USER_ID = candidateId;
        notes.push(`Resolved REPORTS_POSITIVE_AIDE_USER_ID via /reports probe using user id ${candidateId}.`);
        break;
      }
    }
  }

  if (!envUpdates.REPORTS_POSITIVE_AIDE_USER_ID || !envUpdates.REPORTS_POSITIVE_DENTIST_USER_ID) {
    const userProbeCandidates = new Set();

    const addUserCandidate = (value) => {
      const parsed = toPositiveString(value);
      if (parsed) {
        userProbeCandidates.add(parsed);
      }
    };

    addUserCandidate(envUpdates.REPORTS_POSITIVE_AIDE_USER_ID);
    addUserCandidate(envUpdates.REPORTS_POSITIVE_DENTIST_USER_ID);
    extraAideCandidates.forEach(addUserCandidate);
    configAideCandidates.forEach(addUserCandidate);
    extraDentistUserCandidates.forEach(addUserCandidate);
    configDentistUserCandidates.forEach(addUserCandidate);
    sequentialUserCandidates.forEach(addUserCandidate);

    for (const candidateUserId of userProbeCandidates) {
      if (await probeAideUserId(candidateUserId)) {
        if (!envUpdates.REPORTS_POSITIVE_AIDE_USER_ID) {
          envUpdates.REPORTS_POSITIVE_AIDE_USER_ID = candidateUserId;
          notes.push(`Resolved REPORTS_POSITIVE_AIDE_USER_ID via scoped-user probe using id ${candidateUserId}.`);
        }

        if (!envUpdates.REPORTS_POSITIVE_DENTIST_USER_ID) {
          envUpdates.REPORTS_POSITIVE_DENTIST_USER_ID = candidateUserId;
          notes.push(`Resolved REPORTS_POSITIVE_DENTIST_USER_ID via scoped-user probe using id ${candidateUserId}.`);
        }

        break;
      }
    }
  }

  if (!envUpdates.REPORTS_POSITIVE_DENTIST_USER_ID || !envUpdates.REPORTS_POSITIVE_DENTIST_ID) {
    const dentistUser = userRows.find((row) => (
      normalizeRole(row && row.role) === "dentist"
      && toPositiveString(row && row.id)
      && toPositiveString(row && row.dentist_id)
    ));

    const dentistUserId = toPositiveString(dentistUser && dentistUser.id);
    const dentistId = toPositiveString(dentistUser && dentistUser.dentist_id);

    if (!envUpdates.REPORTS_POSITIVE_DENTIST_USER_ID && dentistUserId) {
      envUpdates.REPORTS_POSITIVE_DENTIST_USER_ID = dentistUserId;
    }

    if (!envUpdates.REPORTS_POSITIVE_DENTIST_ID && dentistId) {
      envUpdates.REPORTS_POSITIVE_DENTIST_ID = dentistId;
    }
  }

  if (!envUpdates.REPORTS_POSITIVE_DENTIST_USER_ID || !envUpdates.REPORTS_POSITIVE_DENTIST_ID) {
    const dentistUserProbeCandidates = new Set();
    const dentistIdProbeCandidates = new Set();

    const addDentistUserCandidate = (value) => {
      const parsed = toPositiveString(value);
      if (parsed) {
        dentistUserProbeCandidates.add(parsed);
      }
    };

    const addDentistIdCandidate = (value) => {
      const parsed = toPositiveString(value);
      if (parsed) {
        dentistIdProbeCandidates.add(parsed);
      }
    };

    addDentistUserCandidate(envUpdates.REPORTS_POSITIVE_DENTIST_USER_ID);
    addDentistUserCandidate(envUpdates.REPORTS_POSITIVE_AIDE_USER_ID);
    extraDentistUserCandidates.forEach(addDentistUserCandidate);
    configDentistUserCandidates.forEach(addDentistUserCandidate);
    extraAideCandidates.forEach(addDentistUserCandidate);
    configAideCandidates.forEach(addDentistUserCandidate);
    sequentialUserCandidates.forEach(addDentistUserCandidate);

    addDentistIdCandidate(envUpdates.REPORTS_POSITIVE_DENTIST_ID);
    extraDentistIdCandidates.forEach(addDentistIdCandidate);
    configDentistIdCandidates.forEach(addDentistIdCandidate);
    sequentialDentistIdCandidates.forEach(addDentistIdCandidate);

    for (const userId of dentistUserProbeCandidates) {
      let resolved = false;
      for (const dentistId of dentistIdProbeCandidates) {
        if (await probeDentistAccess(userId, dentistId)) {
          envUpdates.REPORTS_POSITIVE_DENTIST_USER_ID = userId;
          envUpdates.REPORTS_POSITIVE_DENTIST_ID = dentistId;
          notes.push(`Resolved dentist positive identities via summary probe (user_id=${userId}, dentist_id=${dentistId}).`);
          resolved = true;
          break;
        }
      }

      if (resolved) {
        break;
      }
    }
  }

  if (!envUpdates.REPORTS_POSITIVE_GLOBALADMIN_USER_ID) {
    const candidateIds = new Set();

    const addCandidate = (value) => {
      const parsed = toPositiveString(value);
      if (parsed) {
        candidateIds.add(parsed);
      }
    };

    addCandidate(envUpdates.REPORTS_POSITIVE_AIDE_USER_ID);
    addCandidate(envUpdates.REPORTS_POSITIVE_DENTIST_USER_ID);
    extraGlobalCandidates.forEach(addCandidate);
    configGlobalCandidates.forEach(addCandidate);
    extraAideCandidates.forEach(addCandidate);
    configAideCandidates.forEach(addCandidate);
    extraDentistUserCandidates.forEach(addCandidate);
    configDentistUserCandidates.forEach(addCandidate);
    sequentialUserCandidates.forEach(addCandidate);

    userRows.forEach((row) => {
      addCandidate(row && row.id);
    });

    addCandidate(1);

    for (const candidateId of candidateIds) {
      // Probe clinic-wide report access with globaladmin role to find a usable user id.
      if (await probeGlobalAdminUserId(candidateId)) {
        envUpdates.REPORTS_POSITIVE_GLOBALADMIN_USER_ID = candidateId;
        notes.push(`Resolved REPORTS_POSITIVE_GLOBALADMIN_USER_ID via /reports probe using user id ${candidateId}.`);
        break;
      }
    }
  }

  if (!envUpdates.REPORTS_POSITIVE_GLOBALADMIN_USER_ID) {
    notes.push("API fallback could not resolve REPORTS_POSITIVE_GLOBALADMIN_USER_ID.");
  }

  if (!envUpdates.REPORTS_POSITIVE_AIDE_USER_ID) {
    notes.push("API fallback could not resolve REPORTS_POSITIVE_AIDE_USER_ID.");
  }

  if (!envUpdates.REPORTS_POSITIVE_DENTIST_USER_ID || !envUpdates.REPORTS_POSITIVE_DENTIST_ID) {
    notes.push("API fallback could not resolve both dentist positive-check identities.");
  }

  return { envUpdates, notes };
}

async function closeDbPool() {
  if (db && typeof db.end === "function") {
    try {
      await db.end();
    } catch (_error) {
      // Best effort: checker execution does not depend on pool shutdown success.
    }
  }
}

function runPositiveChecker(envUpdates) {
  const checkerPath = path.join(__dirname, "reports-access-check.js");
  const child = spawnSync(process.execPath, [checkerPath, "--include-positive"], {
    stdio: "inherit",
    env: {
      ...process.env,
      ...envUpdates,
    },
  });

  if (child.error) {
    console.error("Failed to run reports-access-check.js:", child.error.message || child.error);
    return 1;
  }

  if (typeof child.status === "number") {
    return child.status;
  }

  return 1;
}

async function main() {
  console.log("Resolving report positive-check identities from database (with API fallback)...");

  const configLoad = readPositiveConfig();
  const positiveConfig = configLoad.config;
  const existingEnv = readExistingPositiveEnv(positiveConfig);
  let envUpdates = {};
  let notes = [...configLoad.notes];

  const existingEnvVars = Object.entries(existingEnv)
    .filter(([, value]) => Boolean(value))
    .map(([key, value]) => `${key}=${value}`);
  if (existingEnvVars.length > 0) {
    notes.push(`Using existing positive-check env values: ${existingEnvVars.join(", ")}`);
  }

  try {
    const resolved = await resolvePositiveIdentities(existingEnv);
    envUpdates = resolved.envUpdates;
    notes = notes.concat(resolved.notes);
  } catch (error) {
    notes.push(`Failed to resolve positive identities from DB: ${error && error.message ? error.message : String(error)}`);
    envUpdates = existingEnv;
  } finally {
    await closeDbPool();
  }

  if (hasMissingPositiveIdentities(envUpdates)) {
    notes.push("Running API fallback to resolve remaining positive-check identities.");
    try {
      const fallbackResolved = await resolvePositiveIdentitiesFromApi(envUpdates, {
        config: positiveConfig,
      });
      envUpdates = fallbackResolved.envUpdates;
      notes = notes.concat(fallbackResolved.notes);
    } catch (error) {
      notes.push(`Failed to resolve positive identities from API fallback: ${error && error.message ? error.message : String(error)}`);
    }
  }

  console.log("Resolved positive-check environment values:");
  console.log(`- REPORTS_POSITIVE_GLOBALADMIN_USER_ID=${envUpdates.REPORTS_POSITIVE_GLOBALADMIN_USER_ID || "<unset>"}`);
  console.log(`- REPORTS_POSITIVE_AIDE_USER_ID=${envUpdates.REPORTS_POSITIVE_AIDE_USER_ID || "<unset>"}`);
  console.log(`- REPORTS_POSITIVE_DENTIST_USER_ID=${envUpdates.REPORTS_POSITIVE_DENTIST_USER_ID || "<unset>"}`);
  console.log(`- REPORTS_POSITIVE_DENTIST_ID=${envUpdates.REPORTS_POSITIVE_DENTIST_ID || "<unset>"}`);

  if (notes.length) {
    console.log("Resolution notes:");
    notes.forEach((note) => console.log(`- ${note}`));
  }

  const exitCode = runPositiveChecker(envUpdates);
  process.exitCode = exitCode;
}

main().catch((error) => {
  console.error("Unexpected auto positive-check error:", error);
  process.exitCode = 1;
});
