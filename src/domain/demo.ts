import { addDays, localDate } from "./dates";
import { identity, makeTask, type Workspace } from "./model";

export function demoWorkspace(today = localDate()): Workspace {
  const projects = [
    {
      ...identity(),
      name: "Thesis planning",
      description: "Make room for the next question.",
      archivedAt: null,
    },
    {
      ...identity(),
      name: "Literature review",
      description: "Read, connect, and keep moving.",
      archivedAt: null,
    },
    {
      ...identity(),
      name: "Lab & coursework",
      description: "The small things that keep research moving.",
      archivedAt: null,
    },
  ];
  const tasks = [
    {
      ...makeTask("Outline the next research question", today, projects[0].id),
      estimateMinutes: 45,
      priority: "high" as const,
      status: "doing" as const,
    },
    {
      ...makeTask("Read two papers for the review", today, projects[1].id),
      estimateMinutes: 60,
      dueDate: addDays(today, 2),
    },
    {
      ...makeTask(
        "Prepare questions for the lab meeting",
        today,
        projects[2].id,
      ),
      estimateMinutes: 20,
    },
    {
      ...makeTask("Follow up on feedback", addDays(today, -1), projects[0].id),
      dueDate: addDays(today, -1),
      status: "blocked" as const,
      description: "Waiting for comments before revising the outline.",
    },
    {
      ...makeTask(
        "Sketch next week’s priorities",
        addDays(today, 2),
        projects[0].id,
      ),
      estimateMinutes: 25,
    },
    makeTask("Explore a new idea for the review", null, projects[1].id),
  ];
  return {
    schemaVersion: 1,
    projects,
    tasks,
    notes: [
      {
        ...identity(),
        title: "A place to start",
        body: "What is the one question this project needs to answer?\n\nKeep the next step small enough to schedule.",
        projectId: projects[0].id,
        taskId: tasks[0].id,
      },
    ],
  };
}
