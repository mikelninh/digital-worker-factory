const templates = [
  ["integration_failure", "DATEV connection failed and documents are not being forwarded.", "normal"],
  ["integration_failure", "Urgent: our SFTP forwarding is down in production.", "high"],
  ["integration_failure", "Google Drive Verbindung funktioniert seit heute nicht.", "normal"],
  ["document_routing", "A document was routed to the wrong destination.", "normal"],
  ["document_routing", "Wie kann ich einen Brief automatisch weiterleiten?", "normal"],
  ["access", "I cannot login after enabling 2FA.", "normal"],
  ["access", "Urgent access problem: nobody in ops can login.", "high"],
  ["billing", "We have a question about our latest invoice.", "normal"],
  ["billing", "Die Rechnung scheint doppelt zu sein.", "normal"],
  ["other", "Can you tell me where to change the company name?", "normal"]
];

export const cases = Array.from({ length: 30 }, (_, index) => {
  const [expected_intent, message, expected_urgency] = templates[index % templates.length];
  const requested_action = [4, 14, 24].includes(index) ? "change account settings" : "";
  return {
    id: `case-${String(index + 1).padStart(2, "0")}`,
    ticket_id: `T-${1000 + index}`,
    event_id: `E-${2000 + index}`,
    customer_id: `C-${(index % 6) + 1}`,
    message,
    expected_intent,
    expected_urgency,
    requested_action,
    expect_human_approval: Boolean(requested_action)
  };
});
