"""Clera-style FDE vertical slice: synthetic data only, FastAPI + SQLite.

No production auth, external customer integration, real LLM, or live GitLaw.
"""
import os
import sqlite3
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

HERE = Path(__file__).resolve().parent


def clock():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class Approval(BaseModel):
    actor_id: str = Field(min_length=2, max_length=80)
    role: str


def create_app(db_path=None):
    db_path = str(db_path or os.getenv("FDE_DB_PATH") or (HERE / "demo.sqlite3"))
    app = FastAPI(title="Evidence to Action · FDE proof", version="0.1.0")

    def connect():
        db = sqlite3.connect(db_path)
        db.row_factory = sqlite3.Row
        return db

    def case_or_404(db, cid):
        row = db.execute("SELECT * FROM cases WHERE id=?", (cid,)).fetchone()
        if not row:
            raise HTTPException(404, "Unknown synthetic case")
        return row

    def verified(db, cid):
        row = db.execute(
            "SELECT COUNT(*) n FROM evidence WHERE case_id=? AND verified=1 "
            "AND length(trim(excerpt))>0 AND length(trim(locator))>0", (cid,)
        ).fetchone()
        return row["n"] > 0

    def audit(db, cid, event, detail, actor="system"):
        db.execute("INSERT INTO audit(case_id,event,detail,actor,at) VALUES(?,?,?,?,?)",
                   (cid, event, detail, actor, clock()))

    with closing(connect()) as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS cases(id TEXT PRIMARY KEY,title TEXT,request TEXT);
        CREATE TABLE IF NOT EXISTS evidence(id TEXT PRIMARY KEY,case_id TEXT,source_id TEXT,
            source_version TEXT,locator TEXT,excerpt TEXT,verified INTEGER);
        CREATE TABLE IF NOT EXISTS proposals(id TEXT PRIMARY KEY,case_id TEXT UNIQUE,
            action TEXT,status TEXT,summary TEXT,reviewer TEXT);
        CREATE TABLE IF NOT EXISTS actions(id INTEGER PRIMARY KEY AUTOINCREMENT,
            proposal_id TEXT UNIQUE,case_id TEXT,effect TEXT,at TEXT);
        CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT,
            case_id TEXT,event TEXT,detail TEXT,actor TEXT,at TEXT);
        """)
        db.executemany("INSERT OR IGNORE INTO cases VALUES(?,?,?)", [
            ("CASE-001", "Supplier document review", "Prepare a sourced customer follow-up."),
            ("CASE-002", "Missing source", "Consequential customer request without evidence.")
        ])
        db.execute("INSERT OR IGNORE INTO evidence VALUES(?,?,?,?,?,?,?)",
                   ("E-001","CASE-001","synthetic-gitlaw-shaped-source","demo-v1","p.1",
                    "This is a synthetic, independently marked source span.",1))
        db.commit()

    @app.get("/", include_in_schema=False)
    def page():
        return FileResponse(HERE / "index.html")

    @app.get("/api/cases")
    def cases():
        with closing(connect()) as db:
            rows = db.execute(
                "SELECT c.id,c.title,c.request,COALESCE(p.status,'NOT_STARTED') status "
                "FROM cases c LEFT JOIN proposals p ON c.id=p.case_id ORDER BY c.id"
            ).fetchall()
            return [dict(row) for row in rows]

    @app.get("/api/cases/{cid}/trace")
    def trace(cid: str):
        with closing(connect()) as db:
            case_or_404(db, cid)
            return {"case_id":cid,
                    "events":[dict(r) for r in db.execute(
                        "SELECT event,detail,actor,at FROM audit WHERE case_id=? ORDER BY id",(cid,))],
                    "evidence":[dict(r) for r in db.execute(
                        "SELECT source_id,source_version,locator,excerpt,verified FROM evidence WHERE case_id=?",(cid,))]}

    @app.post("/api/cases/{cid}/propose")
    def propose(cid: str):
        with closing(connect()) as db:
            case_or_404(db,cid)
            existing = db.execute("SELECT * FROM proposals WHERE case_id=?",(cid,)).fetchone()
            if existing:
                return {"proposal_id":existing["id"],"status":existing["status"],"replayed":True}
            if not verified(db,cid):
                audit(db,cid,"BLOCKED_MISSING_EVIDENCE","No verified source; no proposal or effect")
                db.commit()
                return {"status":"BLOCKED_MISSING_EVIDENCE","replayed":False}
            pid="p-"+uuid4().hex[:12]
            db.execute("INSERT INTO proposals(id,case_id,action,status,summary) VALUES(?,?,?,?,?)",
                       (pid,cid,"PREPARE_FOLLOWUP","PENDING_REVIEW",
                        "Prepare a reviewer-visible follow-up using synthetic source E-001."))
            audit(db,cid,"DRAFT_CREATED",pid)
            db.commit()
            return {"proposal_id":pid,"status":"PENDING_REVIEW","replayed":False}

    @app.post("/api/cases/{cid}/approve")
    def approve(cid: str, req: Approval):
        # This demo role field is NOT identity/authentication.
        if req.role != "reviewer":
            raise HTTPException(403,"Reviewer role required")
        with closing(connect()) as db:
            case_or_404(db,cid)
            row=db.execute("SELECT * FROM proposals WHERE case_id=?",(cid,)).fetchone()
            if not row or row["status"] not in ("PENDING_REVIEW","APPROVED"):
                raise HTTPException(409,"No reviewable proposal")
            if not verified(db,cid):
                raise HTTPException(409,"Evidence no longer verified")
            db.execute("UPDATE proposals SET status='APPROVED',reviewer=? WHERE id=?",
                       (req.actor_id,row["id"]))
            audit(db,cid,"HUMAN_APPROVED",row["id"],req.actor_id)
            db.commit()
            return {"status":"APPROVED","proposal_id":row["id"]}

    @app.post("/api/cases/{cid}/execute")
    def execute(cid: str):
        with closing(connect()) as db:
            case_or_404(db,cid)
            p=db.execute("SELECT * FROM proposals WHERE case_id=?",(cid,)).fetchone()
            if not p or p["status"] not in ("APPROVED","EXECUTED"):
                raise HTTPException(409,"Human approval required")
            if not verified(db,cid):
                raise HTTPException(409,"Source unavailable; fail closed")
            if p["status"] == "EXECUTED":
                return {"status":"EXECUTED","effect":"SIMULATED_LOCAL_WRITE","replayed":True}
            db.execute("INSERT INTO actions(proposal_id,case_id,effect,at) VALUES(?,?,?,?)",
                       (p["id"],cid,"SIMULATED_LOCAL_WRITE",clock()))
            db.execute("UPDATE proposals SET status='EXECUTED' WHERE id=?",(p["id"],))
            audit(db,cid,"SIMULATED_ACTION_WRITTEN",p["id"],p["reviewer"] or "unknown")
            db.commit()
            return {"status":"EXECUTED","effect":"SIMULATED_LOCAL_WRITE","replayed":False}

    return app


app = create_app()
