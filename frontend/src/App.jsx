import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ClipboardCheck, GraduationCap, Users, UserCheck } from "lucide-react";
import { api } from "./services/api";
import { ClassManager } from "./features/classes/ClassManager";
import { ScheduleBoard } from "./features/schedule/ScheduleBoard";
import { TeacherSchedule } from "./features/schedule/TeacherSchedule";
import { AttendancePanel } from "./features/attendance/AttendancePanel";
import { HourStats } from "./features/stats/HourStats";

const tabs = [
  { id: "classes", label: "班级管理", icon: Users },
  { id: "schedule", label: "课程表", icon: CalendarDays },
  { id: "teacher-schedule", label: "教师课表", icon: UserCheck },
  { id: "attendance", label: "学员考勤", icon: ClipboardCheck },
  { id: "stats", label: "课时统计", icon: GraduationCap },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("classes");
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [teacherSchedule, setTeacherSchedule] = useState({
    teachers: [],
    schedule_by_teacher: {},
  });
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");

  const studentMap = useMemo(() => {
    const map = new Map();
    classes.forEach((item) => {
      item.students.forEach((student) => {
        map.set(student.id, { ...student, className: item.name });
      });
    });
    return map;
  }, [classes]);

  async function refreshAll() {
    setError("");
    const [classData, courseData, scheduleData, teacherData, attendanceData, statsData] =
      await Promise.all([
        api.getClasses(),
        api.getCourses(),
        api.getSchedule(),
        api.getTeacherSchedule(),
        api.getAttendance(),
        api.getHourStats(),
      ]);
    setClasses(classData);
    setCourses(courseData);
    setSchedule(scheduleData);
    setTeacherSchedule(teacherData);
    setAttendance(attendanceData);
    setStats(statsData);
  }

  useEffect(() => {
    refreshAll()
      .catch(() => setError("后端服务暂不可用，请确认 Flask API 已启动。"))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreateClass(payload) {
    await api.createClass(payload);
    await refreshAll();
  }

  async function handleAddStudent(classId, payload) {
    await api.addStudent(classId, payload);
    await refreshAll();
  }

  async function handleGenerateSchedule(payload) {
    await api.generateSchedule(payload);
    await refreshAll();
  }

  async function handleRecordAttendance(payload) {
    await api.recordAttendance(payload);
    await refreshAll();
  }

  const ActiveIcon = tabs.find((tab) => tab.id === activeTab)?.icon || Users;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <GraduationCap size={28} />
          <div>
            <strong>培训机构排课系统</strong>
            <span>ClassOps</span>
          </div>
        </div>
        <nav className="nav-tabs" aria-label="主要模块">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "active" : ""}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Training Scheduler</span>
            <h1>
              <ActiveIcon size={30} />
              {tabs.find((tab) => tab.id === activeTab)?.label}
            </h1>
          </div>
          <button className="secondary-action" onClick={refreshAll} type="button">
            刷新数据
          </button>
        </header>

        {error && <div className="notice error">{error}</div>}
        {loading ? (
          <div className="notice">加载业务数据中...</div>
        ) : (
          <>
            {activeTab === "classes" && (
              <ClassManager
                classes={classes}
                onCreateClass={handleCreateClass}
                onAddStudent={handleAddStudent}
              />
            )}
            {activeTab === "schedule" && (
              <ScheduleBoard
                classes={classes}
                courses={courses}
                schedule={schedule}
                onGenerate={handleGenerateSchedule}
              />
            )}
            {activeTab === "teacher-schedule" && (
              <TeacherSchedule
                teacherSchedule={teacherSchedule}
                onRefresh={refreshAll}
                loading={loading}
                selectedTeacher={selectedTeacher}
                onSelectedTeacherChange={setSelectedTeacher}
              />
            )}
            {activeTab === "attendance" && (
              <AttendancePanel
                schedule={schedule}
                classes={classes}
                attendance={attendance}
                studentMap={studentMap}
                onRecord={handleRecordAttendance}
              />
            )}
            {activeTab === "stats" && <HourStats stats={stats} />}
          </>
        )}
      </main>
    </div>
  );
}
