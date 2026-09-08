# TRUSTREADY_RUNTIME_CONTRACT: python-agent-v1
from dataclasses import dataclass
from typing import Any, Callable

_executor_calls = 0

@dataclass
class ToolDef:
    name: str
    description: str
    schema: dict
    handler: Callable[[dict], Any]


def _read_profile(args: dict) -> dict:
    global _executor_calls
    _executor_calls += 1
    return {"ok": True, "user": args.get("userId", "user-1")}


def _send_payment(args: dict) -> dict:
    global _executor_calls
    _executor_calls += 1
    return {"ok": True, "amount": args.get("amount", 100)}


tools = [
    ToolDef(name="read_profile", description="read", schema={}, handler=_read_profile),
    ToolDef(name="send_payment", description="pay", schema={}, handler=_send_payment),
]

tenant_id = "tenant-a"


def reset_executor_calls():
    global _executor_calls
    _executor_calls = 0


def get_executor_calls():
    return _executor_calls


def run_agent(*, model_proposal: dict, context: dict | None = None) -> dict:
    tool_calls = [model_proposal]
    call = tool_calls[0]
    tool_name = call["tool"]
    args = call.get("args") or {}
    tool_def = next((tool for tool in tools if tool.name == tool_name), None)
    if tool_def is None:
        return {"ok": False, "status": "blocked", "reason": "unknown_tool"}
    input_payload = {"_trustready_security_context": context or {}}
    try:
        tool_output = tool_def.handler(args)
        err = None
        cached = False
    except Exception as exc:
        tool_output = {"error": str(exc)}
        err = str(exc)
        cached = False
    if err:
        return {"ok": False, "status": "failed", "reason": err, "cached": cached}
    return {"ok": True, "status": "executed", "output": tool_output, "cached": cached}
