const INTENT_RULES = [
  ["integration_failure", ["datev", "dropbox", "google drive", "sftp", "ftp", "forward", "weiterleitung", "connection", "verbindung"]],
  ["document_routing", ["document", "dokument", "mail", "brief", "route", "routing", "weiterleiten"]],
  ["access", ["login", "password", "passwort", "zugriff", "access", "2fa"]],
  ["billing", ["invoice", "rechnung", "billing", "price", "preis"]],
];

const HIGH_URGENCY = ["outage", "down", "critical", "dringend", "urgent", "production", "produktiv", "security", "sicherheit"];

export function classifyRequest(text) {
  const normalized = String(text || "").toLowerCase();
  let intent = "other";
  for (const [candidate, needles] of INTENT_RULES) {
    if (needles.some((needle) => normalized.includes(needle))) {
      intent = candidate;
      break;
    }
  }

  const urgency = HIGH_URGENCY.some((needle) => normalized.includes(needle)) ? "high" : "normal";
  return { intent, urgency };
}

export function policyFor({ intent, requestedAction = "" }) {
  const action = String(requestedAction).toLowerCase();
  const consequential = [
    "change account", "delete", "refund", "send externally", "reset credentials",
    "konto ändern", "löschen", "erstatten", "extern senden", "zugang zurücksetzen"
  ].some((needle) => action.includes(needle));

  if (consequential) {
    return {
      mode: "human_approval",
      reason: "Consequential external/account action requires explicit approval."
    };
  }

  if (intent === "integration_failure" || intent === "access") {
    return {
      mode: "draft_only",
      reason: "Prepare diagnosis and response; do not execute account-changing action automatically."
    };
  }

  return {
    mode: "draft_only",
    reason: "Automation may prepare work, but external communication remains reviewable in this proof."
  };
}
