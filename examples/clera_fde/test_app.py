"""End-to-end local API + SQLite contract tests."""
from pathlib import Path
from tempfile import TemporaryDirectory
from fastapi.testclient import TestClient
from app import create_app


def test_approval_and_idempotent_write():
    with TemporaryDirectory() as folder:
        c=TestClient(create_app(Path(folder)/"test.db"))
        assert len(c.get("/api/cases").json()) == 2
        assert c.post("/api/cases/CASE-001/execute").status_code == 409
        assert c.post("/api/cases/CASE-001/propose").json()["status"] == "PENDING_REVIEW"
        assert c.post("/api/cases/CASE-001/execute").status_code == 409
        assert c.post("/api/cases/CASE-001/approve",json={
            "actor_id":"demo-user","role":"guest"}).status_code == 403
        assert c.post("/api/cases/CASE-001/approve",json={
            "actor_id":"reviewer-demo","role":"reviewer"}).json()["status"] == "APPROVED"
        assert c.post("/api/cases/CASE-001/execute").json()["replayed"] is False
        assert c.post("/api/cases/CASE-001/execute").json()["replayed"] is True
        events=[e["event"] for e in c.get("/api/cases/CASE-001/trace").json()["events"]]
        assert events==["DRAFT_CREATED","HUMAN_APPROVED","SIMULATED_ACTION_WRITTEN"]


def test_missing_evidence_fails_closed():
    with TemporaryDirectory() as folder:
        c=TestClient(create_app(Path(folder)/"test.db"))
        assert c.post("/api/cases/CASE-002/propose").json()["status"] == "BLOCKED_MISSING_EVIDENCE"
        assert c.post("/api/cases/CASE-002/approve",json={
            "actor_id":"reviewer-demo","role":"reviewer"}).status_code == 409
        assert c.post("/api/cases/CASE-002/execute").status_code == 409
