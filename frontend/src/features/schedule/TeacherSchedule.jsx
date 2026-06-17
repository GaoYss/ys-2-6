import { AlertTriangle, Trash2, Edit3, X, Check, User } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../services/api";
import { SectionHeader } from "../../components/SectionHeader";

const TIME_SLOTS = ["09:00-11:00", "14:00-16:00", "19:00-21:00"];

export function TeacherSchedule({
  teacherSchedule,
  onRefresh,
  loading,
  selectedTeacher,
  onSelectedTeacherChange,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ date: "", time: "", room: "", teacher: "" });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const teachers = teacherSchedule?.teachers || [];
  const scheduleByTeacher = teacherSchedule?.schedule_by_teacher || {};

  const conflictCount = useMemo(() => {
    let count = 0;
    for (const sessions of Object.values(scheduleByTeacher)) {
      count += sessions.filter((s) => s.conflict).length;
    }
    return count;
  }, [scheduleByTeacher]);

  const displayedTeachers = selectedTeacher
    ? [selectedTeacher]
    : teachers;

  const groupedByDate = (sessions) => {
    const map = new Map();
    sessions.forEach((s) => {
      const list = map.get(s.date) || [];
      list.push(s);
      map.set(s.date, list);
    });
    return map;
  };

  function startEdit(session) {
    setEditingId(session.id);
    setErrorMsg("");
    setEditForm({
      date: session.date,
      time: session.time,
      room: session.room,
      teacher: session.teacher,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setErrorMsg("");
  }

  function handleFieldChange(field, value) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
    if (errorMsg) setErrorMsg("");
  }

  async function handleDelete(sessionId) {
    if (!confirm("确定要删除这条课表吗？")) return;
    try {
      await api.deleteSchedule(sessionId);
      await onRefresh();
    } catch (err) {
      alert("删除失败");
    }
  }

  async function handleSave(sessionId) {
    setSaving(true);
    try {
      await api.updateSchedule(sessionId, editForm);
      setEditingId(null);
      setErrorMsg("");
      await onRefresh();
    } catch (err) {
      setErrorMsg(err?.error || "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="module">
      <div className="toolbar-panel teacher-toolbar">
        <label>
          选择教师
          <select
            value={selectedTeacher}
            onChange={(e) => onSelectedTeacherChange(e.target.value)}
          >
            <option value="">全部教师</option>
            {teachers.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {conflictCount > 0 && (
          <div className="conflict-summary">
            <AlertTriangle size={18} />
            <span>发现 {conflictCount} 条时段冲突</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="notice">加载教师课表中...</div>
      ) : displayedTeachers.length === 0 ? (
        <div className="notice">暂无教师排课数据</div>
      ) : (
        displayedTeachers.map((teacher) => {
          const sessions = scheduleByTeacher[teacher] || [];
          const byDate = groupedByDate(sessions);
          return (
            <div className="table-panel" key={teacher}>
              <SectionHeader
                eyebrow="Teacher"
                title={
                  <span className="teacher-title">
                    <User size={20} />
                    {teacher}
                    <span className="session-count">{sessions.length} 节课</span>
                  </span>
                }
              />
              <div className="teacher-schedule-grid">
                {[...byDate.entries()].map(([dateStr, daySessions]) => (
                  <div className="teacher-day-block" key={dateStr}>
                    <div className="teacher-day-header">{dateStr}</div>
                    <div className="teacher-day-sessions">
                      {daySessions.map((s) => (
                        <div
                          className={`teacher-session-card${s.conflict ? " has-conflict" : ""}`}
                          key={s.id}
                        >
                          {editingId === s.id ? (
                            <div className="session-edit-form">
                              <div className="edit-row">
                                <label>
                                  日期
                                  <input
                                    type="date"
                                    value={editForm.date}
                                    onChange={(e) => handleFieldChange("date", e.target.value)}
                                  />
                                </label>
                              </div>
                              <div className="edit-row">
                                <label>
                                  时段
                                  <select
                                    value={editForm.time}
                                    onChange={(e) => handleFieldChange("time", e.target.value)}
                                  >
                                    {TIME_SLOTS.map((t) => (
                                      <option key={t} value={t}>{t}</option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                              <div className="edit-row">
                                <label>
                                  教室
                                  <input
                                    type="text"
                                    value={editForm.room}
                                    onChange={(e) => handleFieldChange("room", e.target.value)}
                                  />
                                </label>
                              </div>
                              {errorMsg && (
                                <div className="edit-error">{errorMsg}</div>
                              )}
                              <div className="edit-actions">
                                <button
                                  className="primary-action"
                                  onClick={() => handleSave(s.id)}
                                  disabled={saving}
                                  type="button"
                                >
                                  <Check size={16} />
                                  保存
                                </button>
                                <button
                                  className="secondary-action"
                                  onClick={cancelEdit}
                                  type="button"
                                >
                                  <X size={16} />
                                  取消
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="session-time">{s.time}</div>
                              <div className="session-body">
                                <strong>{s.course_title}</strong>
                                <span>{s.class_name}</span>
                                <span>{s.room}</span>
                              </div>
                              {s.conflict && (
                                <div className="conflict-badge">
                                  <AlertTriangle size={14} />
                                  时段冲突
                                </div>
                              )}
                              <div className="session-actions">
                                <button
                                  className="icon-btn"
                                  onClick={() => startEdit(s)}
                                  type="button"
                                  title="调整"
                                >
                                  <Edit3 size={14} />
                                </button>
                                <button
                                  className="icon-btn danger"
                                  onClick={() => handleDelete(s.id)}
                                  type="button"
                                  title="删除"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })
      )}
    </section>
  );
}
