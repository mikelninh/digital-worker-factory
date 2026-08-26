# HTTP contract

Synthetic proof endpoint:

- `POST /support`
- `Content-Type: application/json`
- required: `ticket_id`, `message`
- optional: `event_id`, `customer_id`, `requested_action`

The CI end-to-end test sends requests over a real loopback HTTP socket and verifies:

1. a valid integration incident returns `200` and a prepared action,
2. replaying the same event returns `duplicate_ignored`,
3. a consequential account-setting request requires `human_approval`,
4. an invalid payload returns `400`,
5. only non-duplicate successful requests are audited.

This proves the HTTP/runtime contract independently of any external vendor account.
