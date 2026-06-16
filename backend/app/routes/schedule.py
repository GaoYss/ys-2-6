from flask import Blueprint, jsonify, request

from app.data.store import store
from app.services.scheduler import enrich_session, generate_schedule


schedule_bp = Blueprint("schedule", __name__)


@schedule_bp.get("")
def list_schedule():
    return jsonify([enrich_session(item) for item in store.schedule])


@schedule_bp.get("/teacher-view")
def teacher_view():
    teacher_name = request.args.get("teacher", "")
    sessions = [enrich_session(item) for item in store.schedule]

    conflict_keys = set()
    seen = {}
    for s in sessions:
        key = (s.get("teacher"), s.get("date"), s.get("time"))
        if key in seen:
            conflict_keys.add(key)
            conflict_keys.add((seen[key].get("teacher"), seen[key].get("date"), seen[key].get("time")))
        else:
            seen[key] = s

    enriched = []
    for s in sessions:
        key = (s.get("teacher"), s.get("date"), s.get("time"))
        enriched.append({**s, "conflict": key in conflict_keys})

    if teacher_name:
        enriched = [s for s in enriched if s.get("teacher") == teacher_name]

    teachers = sorted({s.get("teacher") for s in sessions if s.get("teacher")})

    by_teacher = {}
    for s in enriched:
        t = s.get("teacher", "未知")
        by_teacher.setdefault(t, []).append(s)

    for t in by_teacher:
        by_teacher[t].sort(key=lambda x: (x.get("date", ""), x.get("time", "")))

    return jsonify({"teachers": teachers, "schedule_by_teacher": by_teacher})


@schedule_bp.post("/generate")
def generate():
    payload = request.get_json() or {}
    generated = generate_schedule(
        class_id=payload.get("class_id"),
        days=int(payload.get("days", 8)),
    )
    return jsonify([enrich_session(item) for item in generated]), 201
