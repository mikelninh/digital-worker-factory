from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import pytest
from fastapi.testclient import TestClient
from app.main import make_app

@pytest.fixture
def client(tmp_path,monkeypatch):
    monkeypatch.setenv("LOOP_LLM_MODE","off")
    with TestClient(make_app(tmp_path / "test.sqlite3")) as c:
        yield c
