from datetime import date, timedelta

from app.data.store import store


TIME_SLOTS = ["09:00-11:00", "14:00-16:00", "19:00-21:00"]


def _teacher_slot_occupied(teacher, slot_date, slot_time):
    return any(
        s["teacher"] == teacher and s["date"] == slot_date and s["time"] == slot_time
        for s in store.schedule
    )


def _find_available_slot(teacher, slot_date, start_index):
    total_slots = len(TIME_SLOTS)
    for offset in range(total_slots):
        idx = (start_index + offset) % total_slots
        slot_time = TIME_SLOTS[idx]
        if not _teacher_slot_occupied(teacher, slot_date, slot_time):
            return idx
    return None


def generate_schedule(class_id=None, days=10):
    classes = store.classes
    if class_id:
        classes = [item for item in classes if item["id"] == int(class_id)]

    if not classes:
        return []

    generated = []
    cursor = date.today() + timedelta(days=1)
    course_index = 0

    while len(generated) < days:
        if cursor.weekday() < 5:
            for training_class in classes:
                slot_idx = _find_available_slot(
                    training_class["teacher"],
                    cursor.isoformat(),
                    course_index % len(TIME_SLOTS),
                )
                if slot_idx is None:
                    continue
                course = store.courses[course_index % len(store.courses)]
                session = {
                    "id": store.next_id("schedule"),
                    "class_id": training_class["id"],
                    "course_id": course["id"],
                    "date": cursor.isoformat(),
                    "time": TIME_SLOTS[slot_idx],
                    "room": training_class["room"],
                    "teacher": training_class["teacher"],
                }
                store.schedule.append(session)
                generated.append(session)
                course_index += 1
                if len(generated) >= days:
                    break
        cursor += timedelta(days=1)

    return generated


def enrich_session(session):
    training_class = next(
        (item for item in store.classes if item["id"] == session["class_id"]), None
    )
    course = next((item for item in store.courses if item["id"] == session["course_id"]), None)
    return {
        **session,
        "class_name": training_class["name"] if training_class else "未知班级",
        "course_title": course["title"] if course else "未知课程",
        "duration": course["duration"] if course else 0,
    }
