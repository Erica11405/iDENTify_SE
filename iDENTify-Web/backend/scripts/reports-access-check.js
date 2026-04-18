#!/usr/bin/env node
"use strict";

const DEFAULT_BASE_URL = "http://localhost:8080/api";
const baseUrl = String(process.env.REPORTS_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
const args = new Set(process.argv.slice(2));
const includePositiveChecks = args.has("--include-positive") || args.has("--include-success");

const now = new Date();
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

const negativeChecks = [
  {
    name: "reports rejects missing role context",
    path: `/reports?date=${today}`,
    headers: {},
    expectedStatuses: [401],
  },
  {
    name: "reports rejects missing user context",
    path: `/reports?date=${today}`,
    headers: {
      "x-user-role": "aide",
    },
    expectedStatuses: [403],
  },
  {
    name: "clinic-wide reports rejects invalid date range",
    path: "/reports?startDate=2026-04-30&endDate=2026-04-01",
    headers: {
      "x-user-role": "aide",
      "x-user-id": "1",
    },
    expectedStatuses: [400],
  },
  {
    name: "clinic-wide reports rejects malformed date",
    path: "/reports?date=2026-02-30",
    headers: {
      "x-user-role": "aide",
      "x-user-id": "1",
    },
    expectedStatuses: [400],
  },
  {
    name: "clinic-wide reports block dentist role",
    path: `/reports?date=${today}`,
    headers: {
      "x-user-role": "dentist",
      "x-user-id": "1",
      "x-user-dentist-id": "1",
    },
    expectedStatuses: [403],
  },
  {
    name: "service popularity rejects dentist missing dentist context",
    path: `/reports/services/popularity?date=${today}`,
    headers: {
      "x-user-role": "dentist",
      "x-user-id": "1",
    },
    expectedStatuses: [403],
  },
  {
    name: "service popularity rejects dentist target mismatch",
    path: `/reports/services/popularity?date=${today}&dentistId=2`,
    headers: {
      "x-user-role": "dentist",
      "x-user-id": "1",
      "x-user-dentist-id": "1",
    },
    expectedStatuses: [403],
  },
  {
    name: "dentist summary rejects missing role context",
    path: `/reports/dentist/1/summary?date=${today}`,
    headers: {},
    expectedStatuses: [401],
  },
  {
    name: "dentist summary rejects missing dentist context",
    path: `/reports/dentist/1/summary?date=${today}`,
    headers: {
      "x-user-role": "dentist",
      "x-user-id": "1",
    },
    expectedStatuses: [403],
  },
  {
    name: "dentist summary rejects dentist target mismatch",
    path: `/reports/dentist/2/summary?date=${today}`,
    headers: {
      "x-user-role": "dentist",
      "x-user-id": "1",
      "x-user-dentist-id": "1",
    },
    expectedStatuses: [403],
  },
  {
    name: "service popularity rejects invalid date range",
    path: "/reports/services/popularity?startDate=2026-04-30&endDate=2026-04-01",
    headers: {
      "x-user-role": "aide",
      "x-user-id": "1",
    },
    expectedStatuses: [400],
  },
  {
    name: "service popularity rejects malformed start date",
    path: "/reports/services/popularity?startDate=not-a-date&endDate=2026-04-18",
    headers: {
      "x-user-role": "aide",
      "x-user-id": "1",
    },
    expectedStatuses: [400],
  },
  {
    name: "service popularity rejects invalid dentist id",
    path: `/reports/services/popularity?date=${today}&dentistId=abc`,
    headers: {
      "x-user-role": "aide",
      "x-user-id": "1",
    },
    expectedStatuses: [400],
  },
  {
    name: "dentist summary rejects invalid date range",
    path: "/reports/dentist/1/summary?startDate=2026-04-30&endDate=2026-04-01",
    headers: {
      "x-user-role": "dentist",
      "x-user-id": "1",
      "x-user-dentist-id": "1",
    },
    expectedStatuses: [400],
  },
  {
    name: "dentist summary rejects malformed date",
    path: "/reports/dentist/1/summary?date=invalid-date",
    headers: {
      "x-user-role": "dentist",
      "x-user-id": "1",
      "x-user-dentist-id": "1",
    },
    expectedStatuses: [400],
  },
  {
    name: "dentist patients rejects missing role context",
    path: `/reports/dentist/1/patients?date=${today}`,
    headers: {},
    expectedStatuses: [401],
  },
  {
    name: "dentist patients rejects missing dentist context",
    path: `/reports/dentist/1/patients?date=${today}`,
    headers: {
      "x-user-role": "dentist",
      "x-user-id": "1",
    },
    expectedStatuses: [403],
  },
  {
    name: "dentist patients rejects dentist target mismatch",
    path: `/reports/dentist/2/patients?date=${today}`,
    headers: {
      "x-user-role": "dentist",
      "x-user-id": "1",
      "x-user-dentist-id": "1",
    },
    expectedStatuses: [403],
  },
  {
    name: "dentist patients rejects invalid date range",
    path: "/reports/dentist/1/patients?startDate=2026-04-30&endDate=2026-04-01",
    headers: {
      "x-user-role": "dentist",
      "x-user-id": "1",
      "x-user-dentist-id": "1",
    },
    expectedStatuses: [400],
  },
  {
    name: "dentist patients rejects malformed end date",
    path: "/reports/dentist/1/patients?startDate=2026-04-01&endDate=bad-date",
    headers: {
      "x-user-role": "dentist",
      "x-user-id": "1",
      "x-user-dentist-id": "1",
    },
    expectedStatuses: [400],
  },
];

function envValue(name) {
  const value = String(process.env[name] || "").trim();
  return value || null;
}

function buildPositiveChecks() {
  const checks = [];
  const skipped = [];

  const globalAdminUserId = envValue("REPORTS_POSITIVE_GLOBALADMIN_USER_ID");
  if (globalAdminUserId) {
    checks.push({
      name: "clinic-wide reports allows configured global admin",
      path: `/reports?date=${today}`,
      headers: {
        "x-user-role": "globaladmin",
        "x-user-id": globalAdminUserId,
      },
      expectedStatuses: [200],
    });
  } else {
    skipped.push("REPORTS_POSITIVE_GLOBALADMIN_USER_ID not set (skipping global admin success check)");
  }

  const aideUserId = envValue("REPORTS_POSITIVE_AIDE_USER_ID");
  if (aideUserId) {
    checks.push({
      name: "clinic-wide reports allows configured aide",
      path: `/reports?date=${today}`,
      headers: {
        "x-user-role": "aide",
        "x-user-id": aideUserId,
      },
      expectedStatuses: [200],
    });
  } else {
    skipped.push("REPORTS_POSITIVE_AIDE_USER_ID not set (skipping aide success check)");
  }

  const dentistUserId = envValue("REPORTS_POSITIVE_DENTIST_USER_ID");
  const dentistId = envValue("REPORTS_POSITIVE_DENTIST_ID");
  if (dentistUserId && dentistId) {
    checks.push({
      name: "dentist summary allows configured dentist self-access",
      path: `/reports/dentist/${dentistId}/summary?date=${today}`,
      headers: {
        "x-user-role": "dentist",
        "x-user-id": dentistUserId,
        "x-user-dentist-id": dentistId,
      },
      expectedStatuses: [200],
    });

    checks.push({
      name: "dentist patients allows configured dentist self-access",
      path: `/reports/dentist/${dentistId}/patients?date=${today}`,
      headers: {
        "x-user-role": "dentist",
        "x-user-id": dentistUserId,
        "x-user-dentist-id": dentistId,
      },
      expectedStatuses: [200],
    });

    checks.push({
      name: "service popularity allows configured dentist self-filter",
      path: `/reports/services/popularity?date=${today}&dentistId=${dentistId}`,
      headers: {
        "x-user-role": "dentist",
        "x-user-id": dentistUserId,
        "x-user-dentist-id": dentistId,
      },
      expectedStatuses: [200],
    });
  } else {
    skipped.push("REPORTS_POSITIVE_DENTIST_USER_ID and REPORTS_POSITIVE_DENTIST_ID must both be set (skipping dentist success checks)");
  }

  return { checks, skipped };
}

async function runCheck(check) {
  const url = `${baseUrl}${check.path}`;
  const response = await fetch(url, {
    method: "GET",
    headers: check.headers,
  });

  const ok = check.expectedStatuses.includes(response.status);
  const bodyText = await response.text();
  return {
    ok,
    status: response.status,
    bodyText,
    ...check,
    url,
  };
}

function printResult(result) {
  const statusList = result.expectedStatuses.join("/");
  const prefix = result.ok ? "PASS" : "FAIL";
  console.log(`[${prefix}] ${result.name}`);
  console.log(`  url: ${result.url}`);
  console.log(`  expected: ${statusList} | got: ${result.status}`);

  const trimmedBody = String(result.bodyText || "").trim();
  if (!result.ok && trimmedBody) {
    const preview = trimmedBody.length > 280 ? `${trimmedBody.slice(0, 280)}...` : trimmedBody;
    console.log(`  response: ${preview}`);
  }
}

async function main() {
  console.log(`Running reports access checks against ${baseUrl}`);

  let checks = [...negativeChecks];
  if (includePositiveChecks) {
    const positive = buildPositiveChecks();
    checks = checks.concat(positive.checks);

    if (positive.skipped.length) {
      console.log("Positive-check setup notes:");
      positive.skipped.forEach((message) => console.log(`- ${message}`));
    }

    if (positive.checks.length === 0) {
      console.log("No positive checks were configured; only denial/validation checks will run.");
    }
  }

  const results = [];
  for (const check of checks) {
    try {
      const result = await runCheck(check);
      results.push(result);
      printResult(result);
    } catch (error) {
      const failed = {
        ok: false,
        ...check,
        status: "request-error",
        bodyText: error?.message || String(error),
        url: `${baseUrl}${check.path}`,
      };
      results.push(failed);
      printResult(failed);
    }
  }

  const failedCount = results.filter((result) => !result.ok).length;
  const passedCount = results.length - failedCount;

  console.log(`\nSummary: ${passedCount} passed, ${failedCount} failed, ${results.length} total`);

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Unexpected checker error:", error);
  process.exitCode = 1;
});
