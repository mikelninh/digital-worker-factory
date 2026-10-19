"""RETURN LOOP: illustrative e-commerce operations demo. No real customer sends.

SQLite persistence and deterministic action gates are real; connector records
and policies are entirely synthetic. Not safe for multi-user production.
"""
from __future__ import annotations
import json
import os
import re
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from time import perf_counter
from typing import Literal

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .agent import prepare, rules_intent
from .seed import seed, TICKETS

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "return_loop.sqlite3"


def stamp():
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class ReviewInput(BaseModel):
    reviewer: str = Field(min_length=2, max_length=60)
    edited_reply: str | None = Field(default=None, max_length=2000)


class FeedbackInput(BaseModel):
    reviewer: str = Field(min_length=2, max_length=60)
    feedback: Literal["helpful", "needs_correction", "incorrect"]
    note: str = Field(default="", max_length=500)


def make_app(db_path: str | Path | None = None) -> FastAPI:
    db_path = str(db_path or os.environ.get("LOOP_DB_PATH") or DEFAULT_DB)
    app = FastAPI(title="RETURN LOOP · Unofficial AI Ops Proof", version="0.1.0", docs_url="/api/docs")

    @contextmanager
    def connection():
        db = sqlite3.connect(db_path, timeout=10)
        db.row_factory = sqlite3.Row
        db.execute("PRAGMA busy_timeout=10000")
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()

    with connection() as db:
        seed(db)

    def one(db, query, params=()):
        row = db.execute(query, params).fetchone()
        return dict(row) if row else None

    def audit(db, tid, event, detail):
        db.execute("INSERT INTO audit(ticket_id,event,detail,created_at) VALUES(?,?,?,?)", (tid, event, detail, stamp()))

    def context(db, tid):
        ticket = one(db, "SELECT * FROM tickets WHERE id=?", (tid,))
        if not ticket:
            raise HTTPException(404, "Unknown demo ticket")
        order = one(db, "SELECT * FROM orders WHERE order_id=? AND customer=?", (ticket["order_id"], ticket["customer"])) if ticket["order_id"] else None
        product = one(db, "SELECT * FROM products WHERE sku=?", (order["sku"],)) if order else None
        policies = [dict(p) for p in db.execute("SELECT * FROM policies ORDER BY id")]
        return ticket, order, product, policies

    def json_analysis(a):
        if not a:
            return None
        for k in ("actions", "evidence_json", "risk_json"):
            a[k] = json.loads(a[k])
        a["evidence"] = a.pop("evidence_json")
        a["risks"] = a.pop("risk_json")
        return a

    def signal_query(db):
        # Use product-level 30d order volumes (synthetic aggregate) as denominator.
        # Complaint counts are synthetic ticket records; this is a deliberately limited proxy.
        rows = db.execute("""
            SELECT p.sku,p.name,p.category,p.units_30d,
              COUNT(DISTINCT CASE WHEN t.gold_intent='quality' THEN t.id END) AS quality_reports
            FROM products p LEFT JOIN orders o ON o.sku=p.sku
            LEFT JOIN tickets t ON t.order_id=o.order_id
            GROUP BY p.sku,p.name,p.category,p.units_30d ORDER BY quality_reports DESC,p.sku
        """).fetchall()
        return [dict(r) | {"complaints_per_1k":round(1000*r["quality_reports"]/r["units_30d"],1),
                            "alert":r["quality_reports"]>=3 and 1000*r["quality_reports"]/r["units_30d"]>=30,
                            "basis":"synthetic annotated quality tickets / synthetic sold units · 30d"} for r in rows]

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Cache-Control"] = "no-store"
        response.headers["Referrer-Policy"] = "same-origin"
        return response

    @app.get("/api/health")
    def health():
        return {"ok":True,"mode":"synthetic-demo","llm":"live-opt-in" if os.getenv("LOOP_LLM_MODE")=="live" and os.getenv("OPENAI_API_KEY") else "deterministic-only",
                "external_writes":False,"auth":False}

    @app.get("/api/overview")
    def overview():
        with connection() as db:
            total = db.execute("SELECT COUNT(*) FROM tickets").fetchone()[0]
            analysed = db.execute("SELECT COUNT(*) FROM analysis").fetchone()[0]
            approved = db.execute("SELECT COUNT(*) FROM review WHERE approved_at IS NOT NULL").fetchone()[0]
            outbox = db.execute("SELECT COUNT(*) FROM outbox").fetchone()[0]
            signals = signal_query(db)
            feedback = {r["feedback"]:r["n"] for r in db.execute("SELECT feedback,COUNT(*) n FROM review WHERE feedback IS NOT NULL GROUP BY feedback")}
            return {"total_tickets":total,"analysed":analysed,"approved":approved,"simulated_sends":outbox,
                    "quality_alerts":sum(s["alert"] for s in signals),"feedback":feedback,
                    "project_mode":"SYNTHETIC / UNOFFICIAL", "integrations":"mock Shopify + mock Zendesk + SQLite SQL"}

    @app.get("/api/tickets")
    def tickets():
        with connection() as db:
            return [dict(r) for r in db.execute("""
                SELECT t.id,t.customer,t.subject,t.body,t.order_id,o.sku,p.name product_name,
                a.intent,a.status, r.approved_at, x.created_at sent_at
                FROM tickets t LEFT JOIN orders o ON o.order_id=t.order_id AND o.customer=t.customer
                LEFT JOIN products p ON p.sku=o.sku
                LEFT JOIN analysis a ON a.ticket_id=t.id
                LEFT JOIN review r ON r.ticket_id=t.id
                LEFT JOIN outbox x ON x.ticket_id=t.id ORDER BY t.id
            """)]

    @app.get("/api/tickets/{tid}")
    def ticket_detail(tid: str):
        with connection() as db:
            ticket, order, product, policies = context(db, tid)
            a = one(db,"SELECT * FROM analysis WHERE ticket_id=?",(tid,))
            review = one(db,"SELECT * FROM review WHERE ticket_id=?",(tid,))
            outbox = one(db,"SELECT * FROM outbox WHERE ticket_id=?",(tid,))
            audit_log = [dict(r) for r in db.execute("SELECT event,detail,created_at FROM audit WHERE ticket_id=? ORDER BY id",(tid,))]
            return {"ticket":ticket,"order":order,"product":product,"policies":policies,
                    "analysis":json_analysis(a),"review":review,"outbox":outbox,"audit":audit_log,
                    "signal":next((s for s in signal_query(db) if product and s["sku"]==product["sku"]),None)}

    @app.post("/api/tickets/{tid}/analyse")
    def analyse(tid: str):
        with connection() as db:
            ticket, order, product, policies = context(db, tid)
            old = one(db,"SELECT * FROM analysis WHERE ticket_id=?",(tid,))
            if old:
                return {"analysis":json_analysis(old),"replayed":True}
            result = prepare(ticket, order, product, policies)
            db.execute("""INSERT INTO analysis(ticket_id,intent,confidence,status,suggested_reply,actions,evidence_json,
                risk_json,source,elapsed_ms,prompt_tokens,output_tokens,cost_usd,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
                (tid,result["intent"],result["confidence"],result["status"],result["suggested_reply"],
                 json.dumps(result["actions"],ensure_ascii=False),json.dumps(result["evidence"],ensure_ascii=False),
                 json.dumps(result["risks"],ensure_ascii=False),result["source"],result["elapsed_ms"],
                 result["prompt_tokens"],result["output_tokens"],result["cost_usd"],stamp()))
            audit(db,tid,"ANALYSED",f"{result['intent']} · {result['status']} · {result['source']}")
            return {"analysis":result,"replayed":False}

    @app.post("/api/tickets/{tid}/approve")
    def approve(tid: str, payload: ReviewInput):
        with connection() as db:
            ticket, order, _, _ = context(db,tid)
            a = one(db,"SELECT * FROM analysis WHERE ticket_id=?",(tid,))
            if not a:
                raise HTTPException(409,"Run analysis first")
            if a["status"]!="READY_FOR_REVIEW" or not order:
                raise HTTPException(409,"Verified order and clean evidence required; escalate manually")
            if one(db,"SELECT * FROM outbox WHERE ticket_id=?",(tid,)):
                raise HTTPException(409,"Already sent to simulated outbox; editing locked")
            reply = (payload.edited_reply or a["suggested_reply"]).strip()
            if len(reply)<20:
                raise HTTPException(422,"Reply too short")
            # Reviewer edits must not smuggle in unsupported order IDs or decisive effects.
            # This is a narrow demonstration control, not a complete legal language policy.
            mentioned_order_ids = re.findall(r"\bD-\d{5}\b", reply)
            if any(mid != order["order_id"] for mid in mentioned_order_ids):
                raise HTTPException(422,"Reply contains an order ID not verified for this case")
            if re.search(r"\b(refund confirmed|refund approved|erstattung ist genehmigt|250\s*euros? erstatten|refundiert)\b", reply, re.I):
                raise HTTPException(422,"Unverified compensation promises are not permitted")
            # A human can only approve in this non-production simulator. No API identity verification here.
            db.execute("""INSERT INTO review(ticket_id,reviewer,edited_reply,approved_at) VALUES(?,?,?,?)
                ON CONFLICT(ticket_id) DO UPDATE SET reviewer=excluded.reviewer,edited_reply=excluded.edited_reply,
                approved_at=excluded.approved_at""",(tid,payload.reviewer,reply,stamp()))
            audit(db,tid,"HUMAN_APPROVED",f"Demo reviewer: {payload.reviewer}")
            return {"status":"APPROVED","ticket_id":tid,"live_external_send":False}

    @app.post("/api/tickets/{tid}/simulate-send")
    def simulated_send(tid: str):
        with connection() as db:
            context(db, tid)
            existing = one(db,"SELECT * FROM outbox WHERE ticket_id=?",(tid,))
            if existing:
                return {"status":"SIMULATED_SENT","replayed":True,"external_send":False,"outbox":existing}
            a = one(db,"SELECT status FROM analysis WHERE ticket_id=?",(tid,))
            rev = one(db,"SELECT * FROM review WHERE ticket_id=?",(tid,))
            if not a or a["status"]!="READY_FOR_REVIEW" or not rev or not rev["approved_at"]:
                raise HTTPException(409,"Human approval and safe evidence required")
            db.execute("INSERT INTO outbox(ticket_id,kind,content,created_at) VALUES(?,?,?,?)",
                       (tid,"SIMULATED_LOCAL_WRITE",rev["edited_reply"],stamp()))
            audit(db,tid,"SIMULATED_SENT","SQLite outbox only — no Zendesk/email request")
            return {"status":"SIMULATED_SENT","replayed":False,"external_send":False}

    @app.post("/api/tickets/{tid}/feedback")
    def feedback(tid: str,payload: FeedbackInput):
        with connection() as db:
            context(db,tid)
            existing=one(db,"SELECT * FROM analysis WHERE ticket_id=?",(tid,))
            if not existing:
                raise HTTPException(409,"Review the analysed ticket first")
            db.execute("""INSERT INTO review(ticket_id,reviewer,feedback) VALUES(?,?,?)
                ON CONFLICT(ticket_id) DO UPDATE SET feedback=excluded.feedback,reviewer=excluded.reviewer""",
                (tid,payload.reviewer,payload.feedback))
            audit(db,tid,"FEEDBACK",payload.feedback+(" · "+payload.note if payload.note else ""))
            return {"stored":True,"feedback":payload.feedback,"ticket_id":tid}

    @app.get("/api/signals")
    def signals():
        with connection() as db:
            return {"items":signal_query(db),"threshold":{"min_reports":3,"min_per_1k":30},
                    "limitations":"Synthetic 30-day units and annotated complaints; not real return rate, defect incidence or statistical significance.",
                    "sql":"SELECT p.sku, COUNT(DISTINCT CASE WHEN t.gold_intent='quality' THEN t.id END) / p.units_30d * 1000 FROM products p LEFT JOIN orders o ON o.sku=p.sku LEFT JOIN tickets t ON t.order_id=o.order_id GROUP BY p.sku"}

    @app.post("/api/evals/run")
    def run_evals():
        t0=perf_counter()
        # This is a synthetic intent-classification offline regression, not a live LLM benchmark.
        checks=[]
        for tid, customer, order_id, subject, body, expected, _ in TICKETS:
            predicted,_=rules_intent(body)
            checks.append({"name":tid+" · intent","pass":predicted==expected,"expected":expected,"observed":predicted})
        with connection() as db:
            missing=one(db,"SELECT * FROM tickets WHERE id='TK-1082'")
            abnormal=one(db,"SELECT * FROM tickets WHERE id='TK-1090'")
            order=one(db,"SELECT * FROM orders WHERE order_id='D-84128'")
            product=one(db,"SELECT * FROM products WHERE sku='SH-05'")
            policies=[dict(x) for x in db.execute("SELECT * FROM policies")]
            missing_case=prepare(missing,None,None,policies,allow_model=False)
            abnormal_case=prepare(abnormal,order,product,policies,allow_model=False)
            checks += [
                {"name":"No order → verification gate", "pass":missing_case["status"]=="NEEDS_VERIFICATION", "expected":"NEEDS_VERIFICATION","observed":missing_case["status"]},
                {"name":"Injection → security review", "pass":abnormal_case["status"]=="SECURITY_REVIEW", "expected":"SECURITY_REVIEW","observed":abnormal_case["status"]},
                {"name":"Quality cluster SQL signal", "pass":any(x["sku"]=="CR-02" and x["alert"] for x in signal_query(db)),"expected":"alert CR-02","observed":"signal SQL"},
            ]
        passed=sum(int(c["pass"]) for c in checks)
        return {"passed":passed,"total":len(checks),"checks":checks,"duration_ms":round((perf_counter()-t0)*1000,2),
                "scope":"Synthetic fixed-regression suite, deterministic rules + guard checks. No real-world AI accuracy claim.",
                "model_calls":0,"model_cost_usd":0,"model_latency_ms":None}

    @app.post("/api/demo/reset")
    def reset_demo():
        if os.getenv("LOOP_ALLOW_RESET","1")!="1":
            raise HTTPException(403,"Reset disabled")
        with connection() as db:
            for table in ("audit","outbox","review","analysis"):
                db.execute("DELETE FROM "+table)
        return {"reset":True,"synthetic_data_preserved":True}

    @app.get("/",include_in_schema=False)
    def home():
        return FileResponse(ROOT / "static" / "index.html")

    app.mount("/static",StaticFiles(directory=ROOT / "static"),name="static")
    return app


app=make_app()
