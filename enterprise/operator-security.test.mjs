import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { assessBoundedOperators } from './operator-security.mjs'

function fixture(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'trustready-operator-'))
  for (const [relative, content] of Object.entries(files)) {
    const absolute = path.join(root, relative)
    fs.mkdirSync(path.dirname(absolute), { recursive: true })
    fs.writeFileSync(absolute, content)
  }
  return root
}

test('dynamic external write requires explicit opt-in and exact per-action confirmation', () => {
  const root = fixture({
    'operator.py': `
import argparse

def request_json(base, method, path, body=None): return {}

def submit(item):
    token = f"SEND {item['id']}"
    answer = input(f"Type {token}: ").strip()
    if answer != token:
        return None
    return request_json('https://example.test', 'POST', f"items/{item['id']}", body=item)

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--base-url', default='https://example.test')
    p.add_argument('--execute', action='store_true')
    args = p.parse_args()
    items = [{'id': 'a'}]
    if not args.execute:
        return 0
    for item in items:
        submit(item)
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
`,
  })
  try {
    const result = assessBoundedOperators(root)
    assert.equal(result.applicable, true)
    assert.equal(result.release.decision, 'TECHNICAL_GO')
    assert.equal(result.operatorSecurity.summary.boundedActions, 1)
    const action = result.operatorSecurity.actions[0]
    assert.equal(action.flag, '--execute')
    assert.equal(action.gate.hardFailClosed, true)
    assert.equal(action.effects.length, 1)
    assert.equal(action.effects[0].dynamicTarget, true)
    assert.equal(action.effects[0].humanConfirmation.proven, true)
    assert.equal(action.effects[0].guarded, true)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('dynamic external write without per-action confirmation fails closed', () => {
  const root = fixture({
    'operator.py': `
import argparse

def request_json(base, method, path, body=None): return {}

def submit(item):
    return request_json('https://example.test', 'POST', f"items/{item['id']}", body=item)

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--execute', action='store_true')
    args = p.parse_args()
    if not args.execute:
        return 0
    submit({'id': 'selected-by-code'})
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
`,
  })
  try {
    const result = assessBoundedOperators(root)
    assert.equal(result.release.decision, 'TECHNICAL_NO_GO')
    assert.equal(result.operatorSecurity.actions[0].reason, 'dynamic_consequential_effect_missing_per_action_confirmation')
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('fixed one-shot write may be authorized by an explicit positive CLI branch', () => {
  const root = fixture({
    'publish.py': `
import argparse

def request_json(base, method, path, body=None): return {}

def publish():
    return request_json('https://example.test', 'POST', 'listings', body={'title': 'launch'})

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--publish', action='store_true')
    args = p.parse_args()
    if args.publish:
        publish()
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
`,
  })
  try {
    const result = assessBoundedOperators(root)
    assert.equal(result.release.decision, 'TECHNICAL_GO')
    const action = result.operatorSecurity.actions[0]
    assert.equal(action.gate.positiveBranch, true)
    assert.equal(action.effects[0].dynamicTarget, false)
    assert.equal(action.effects[0].guarded, true)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

test('process execution remains deny-by-default behind a propagated allow-exec flag even with duplicate main functions elsewhere', () => {
  const root = fixture({
    'cli.py': `
import argparse

def run_check(allow_exec):
    if not allow_exec:
        return {'status': 'unknown'}
    import subprocess
    subprocess.run(['echo', 'ok'], check=False)
    return {'status': 'pass'}

def verify(allow_exec=False):
    return run_check(allow_exec)

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--allow-exec', action='store_true')
    args = p.parse_args()
    verify(allow_exec=args.allow_exec)

if __name__ == '__main__':
    main()
`,
    'other.py': `
import argparse

def main():
    p = argparse.ArgumentParser()
    p.add_argument('--json', action='store_true')
    p.parse_args()

if __name__ == '__main__':
    main()
`,
  })
  try {
    const result = assessBoundedOperators(root)
    assert.equal(result.release.decision, 'TECHNICAL_GO')
    const action = result.operatorSecurity.actions.find((item) => item.flag === '--allow-exec')
    assert.ok(action)
    assert.equal(action.gate.propagated, true)
    assert.deepEqual(action.startFunctions, ['verify'])
    assert.equal(action.effects[0].kind, 'process_execution')
    assert.equal(action.effects[0].propagatedFailClosed, true)
    assert.equal(action.effects[0].guarded, true)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
