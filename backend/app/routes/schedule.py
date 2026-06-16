from flask import Blueprint, jsonify, request

from app.data.store import store
from app.services.scheduler import (
    TIME_SLOTS,
    enrich_session,
    generate_schedule,
    _teacher_slot_occupied,
)


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
            conflict_keys.add(
                (seen[key].get("teacher"), seen[key].get("date"), seen[key].get("time"))
            )
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


@schedule_bp.get("/<int:session_id>")
def get_session(session_id):
    session = next((s for s in store.schedule if s["id"] == session_id), None)
    if not session:
        return jsonify({"error": "课表条目不存在"}), 404
    return jsonify(enrich_session(session))


@schedule_bp.delete("/<int:session_id>")
def delete_session(session_id):
    for idx, s in enumerate(store.schedule):
        if s["id"] == session_id:
            store.schedule.pop(idx)
            return jsonify({"success": True, "deleted_id": session_id})
    return jsonify({"error": "课表条目不存在"}), 404


@schedule_bp.put("/<int:session_id>")
def update_session(session_id):
    session = next((s for s in store.schedule if s["id"] == session_id), None)
    if not session:
        return jsonify({"error": "课表条目不存在"}), 404

    payload = request.get_json() or {}

    new_date = payload.get("date", session["date"])
    new_time = payload.get("time", session["time"])
    new_teacher = payload.get("teacher", session["teacher"])
    new_room = payload.get("room", session["room"])
    new_course_id = payload.get("course_id", session["course_id"])

    if new_time not in TIME_SLOTS:
        return jsonify({"error": "时段不合法"}), 400

    conflicting = any(
        s["teacher"] == new_teacher
        and s["date"] == new_date
        and s["time"] == new_time
        and s["id"] != session_id
        for s in store.schedule
    )

    if conflicting:
        return (
            jsonify({"error": "该时段已被占用，请选择其他时段"}),
            409,
        )

    session["date"] = new_date
    session["time"] = new_time
    session["teacher"] = new_teacher
    session["room"] = new_room
    session["course_id"] = int(new_course_id)

    return jsonify(enrich_session(session))


@schedule_bp.post("/generate")
def generate():
    payload = request.get_json() or {}
    generated = generate_schedule(
        class_id=payload.get("class_id"),
        days=int(payload.get("days", 8)),
    )
    return jsonify([enrich_session(item) for item in generated]), 201
