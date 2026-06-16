import { AlertTriangle, User } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api";
import { SectionHeader } from "../../components/SectionHeader";

export function TeacherSchedule() {
  const [teacherView, setTeacherView] = useState({ teachers: [], schedule_by_teacher: {} });
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadView(teacher = "") {
    setLoading(true);
    try {
      const data = await api.getTeacherSchedule(teacher);
      setTeacherView(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadView();
  }, []);

  useEffect(() => {
    loadView(selectedTeacher);
  }, [selectedTeacher]);

  const conflictCount = useMemo(() => {
    let count = 0;
    for (const sessions of Object.values(teacherView.schedule_by_teacher)) {
      count += sessions.filter((s) => s.conflict).length;
    }
    return count;
  }, [teacherView]);

  const displayedTeachers = selectedTeacher
    ? [selectedTeacher]
    : teacherView.teachers;

  const groupedByDate = (sessions) => {
    const map = new Map();
    sessions.forEach((s) => {
      const list = map.get(s.date) || [];
      list.push(s);
      map.set(s.date, list);
    });
    return map;
  };

  return (
    <section className="module">
      <div className="toolbar-panel teacher-toolbar">
        <label>
          选择教师
          <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)}>
            <option value="">全部教师</option>
            {teacherView.teachers.map((t) => (
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
          const sessions = teacherView.schedule_by_teacher[teacher] || [];
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
