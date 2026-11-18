import type { Task } from "./model";

export function localDate(date = new Date()): string {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function dateObject(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  const result = new Date(0);
  result.setFullYear(year, month - 1, date);
  result.setHours(12, 0, 0, 0);
  return result;
}
export function validDate(day: unknown): day is string {
  return (
    typeof day === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    day.slice(0, 4) !== "0000" &&
    localDate(dateObject(day)) === day
  );
}
export function addDays(day: string, amount: number): string {
  const date = dateObject(day);
  date.setDate(date.getDate() + amount);
  return localDate(date);
}
export function weekDays(day: string): string[] {
  const date = dateObject(day);
  const monday = addDays(day, -((date.getDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}
export const formatDay = (
  day: string,
  options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" },
) => dateObject(day).toLocaleDateString(undefined, options);
export const overdue = (task: Task, today: string) =>
  task.status !== "done" && !!task.dueDate && task.dueDate < today;
export const carried = (task: Task, today: string) =>
  task.status !== "done" && !!task.plannedDate && task.plannedDate < today;
export const completedOn = (task: Task, day: string) =>
  task.status === "done" &&
  !!task.completedAt &&
  localDate(new Date(task.completedAt)) === day;
export function todayGroups(tasks: Task[], today: string) {
  const active = tasks.filter((task) => task.status !== "done");
  return {
    attention: active.filter(
      (task) => overdue(task, today) || carried(task, today),
    ),
    planned: active.filter(
      (task) => task.plannedDate === today && !overdue(task, today),
    ),
    deadlines: active.filter(
      (task) =>
        task.dueDate === today &&
        task.plannedDate !== today &&
        !carried(task, today),
    ),
    blocked: active.filter(
      (task) =>
        task.status === "blocked" &&
        !task.plannedDate &&
        (!task.dueDate || task.dueDate > today),
    ),
  };
}
