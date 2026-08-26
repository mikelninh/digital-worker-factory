# HausPilot 60-second quickstart

After a customer says yes:

```bash
cp packs/hauspilot/client.example.json client.json
# edit company + template + source filenames
node packs/hauspilot/compile.mjs client.json
node packs/hauspilot/eval.mjs
```

Or open `/setup.html` and generate the config through the browser preflight.

Default first pilot:

```text
template: repair_intake
mode: shadow
cases: 20–50 historical examples
master data: properties.csv
external writes: off
```

Decision after replay:

```text
KEEP → connect live read-only inbox
FIX  → adjust mapping/rules and replay
STOP → do not automate a weak workflow
```
