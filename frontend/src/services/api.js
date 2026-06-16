const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { error: `请求失败 (${response.status})` };
    }
    const err = new Error(errorData.error || `API request failed: ${response.status}`);
    err.error = errorData.error;
    err.status = response.status;
    throw err;
  }

  return response.json();
}

export const api = {
  getClasses: () => request("/classes"),
  createClass: (payload) =>
    request("/classes", { method: "POST", body: JSON.stringify(payload) }),
  addStudent: (classId, payload) =>
    request(`/classes/${classId}/students`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getCourses: () => request("/courses"),
  getSchedule: () => request("/schedule"),
  getTeacherSchedule: (teacher = "") =>
    request(`/schedule/teacher-view${teacher ? `?teacher=${encodeURIComponent(teacher)}` : ""}`),
  deleteSchedule: (sessionId) =>
    request(`/schedule/${sessionId}`, { method: "DELETE" }),
  updateSchedule: (sessionId, payload) =>
    request(`/schedule/${sessionId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  generateSchedule: (payload) =>
    request("/schedule/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getAttendance: () => request("/attendance"),
  recordAttendance: (payload) =>
    request("/attendance", { method: "POST", body: JSON.stringify(payload) }),
  getHourStats: () => request("/stats/hours"),
};
