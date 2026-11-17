import { useState } from "react";
import { GlassCard } from "@/components/GlassCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, GripVertical, MessageSquare, Pencil, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
// Using the academic types for consistency with the backend
import type { Task, TaskStatus } from "@/types/academic";
import { mockTeamMembers } from "@/stores/mockData";
import { Label } from "@/components/ui/label";

interface KanbanBoardProps {
  tasks: Task[];
  onMoveTask: (taskId: string, status: TaskStatus) => void;
  onSelectTask: (task: Task) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
}

const columns: { status: TaskStatus; label: string; color: string }[] = [
  // Aligning exactly with Backend STATUS_CHOICES
  { status: "to_do" as TaskStatus, label: "To Do", color: "border-status-pending/40" },
  { status: "in_progress" as TaskStatus, label: "In Progress", color: "border-primary/40" },
  { status: "review", label: "In Review", color: "border-status-pending/40" },
  { status: "done" as TaskStatus, label: "Done", color: "border-status-graded/40" },
];

/**
 *  DEFENSIVE: Prevents the "White Screen" crash if date is missing
 */
function getCountdownText(dateInput: string | undefined) {
  if (!dateInput) return { text: "No Date", urgent: false };
  
  try {
    const deadline = new Date(dateInput);
    if (isNaN(deadline.getTime())) return { text: "Invalid Date", urgent: false };

    const diff = deadline.getTime() - Date.now();
    if (diff <= 0) return { text: "Overdue", urgent: true };
    
    const hours = Math.floor(diff / 3600_000);
    if (hours < 24) return { text: `${hours}h left`, urgent: true };
    return { text: `${Math.floor(hours / 24)}d left`, urgent: false };
  } catch (e) {
    return { text: "Date Error", urgent: false };
  }
}

const priorityDot: Record<string, string> = {
  high: "bg-destructive",
  medium: "bg-status-pending",
  low: "bg-status-graded",
};

function getMember(id: string) {
  return mockTeamMembers.find((m) => m.id === id);
}

export function KanbanBoard({ tasks, onMoveTask, onSelectTask, onEditTask, onDeleteTask }: KanbanBoardProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);

  /**
   * 🛡️ NORMALIZATION: Matches "To Do" (Backend) with "todo" (Frontend)
   */
  const normalizeStatus = (status: string): string => {
    if (!status) return "to_do";
    const s = status.toLowerCase().trim();
    // Ensure the output matches our column status exactly: "to_do"
    if (s === "to_do" || s === "to do" || s === "todo") return "to_do";
    if (s === "in_progress" || s === "in progress") return "in_progress";
    return s;
  };

  const filteredTasks = tasks.filter((task) => {
    const text = `${task.title} ${task.description} ${task.unit_code ?? ""}`.toLowerCase();
    const assignees = Array.isArray(task.assignedTo)
      ? task.assignedTo
      : task.assignedTo ? [task.assignedTo] : [];
    const dueDate = task.due_date || task.dueDate;
    const isOverdue = normalizeStatus(task.status) !== "done" && !!dueDate && new Date(dueDate).getTime() < Date.now();
    const normalizedStatus = normalizeStatus(task.status) === "to_do" ? "todo" : normalizeStatus(task.status);

    return (!query || text.includes(query.toLowerCase()))
      && (statusFilter === "all" || normalizedStatus === statusFilter)
      && (priorityFilter === "all" || task.priority === priorityFilter)
      && (assigneeFilter === "all" || assignees.includes(assigneeFilter))
      && (!overdueOnly || isOverdue);
  });
  const visibleColumns = statusFilter === "all"
    ? columns
    : columns.filter((column) => (column.status === "to_do" ? "todo" : column.status) === statusFilter);

  const handleDrop = (status: TaskStatus) => {
    if (draggedTaskId) {
      onMoveTask(draggedTaskId, status);
      setDraggedTaskId(null);
    }
  };

  return (
    <div>
      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tasks" className="pl-9" aria-label="Search tasks" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger aria-label="Filter by status"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="review">In Review</SelectItem>
            <SelectItem value="done">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger aria-label="Filter by priority"><SelectValue placeholder="All priorities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="high">High priority</SelectItem>
            <SelectItem value="medium">Medium priority</SelectItem>
            <SelectItem value="low">Low priority</SelectItem>
          </SelectContent>
        </Select>
        <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
          <SelectTrigger aria-label="Filter by assignee"><SelectValue placeholder="All assignees" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All assignees</SelectItem>
            {mockTeamMembers.map((member) => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 rounded-md border px-3 text-sm text-muted-foreground">
          <Checkbox checked={overdueOnly} onCheckedChange={(checked) => setOverdueOnly(checked === true)} />
          <span>Overdue only</span>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {visibleColumns.map((col) => {
        // Safe filter: uses normalization to avoid empty columns
        const colTasks = filteredTasks.filter((t) => normalizeStatus(t.status) === col.status);
        
        return (
          <div
            key={col.status}
            className={cn("rounded-xl border-2 border-dashed p-3 min-h-[500px]", col.color)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.status)}
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <h4 className="text-sm font-semibold">{col.label}</h4>
              <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {colTasks.length}
              </span>
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {colTasks.map((task) => {
                  // 🛠️ Check for both due_date (API) and deadline (Mock)
                  const rawDate = task.due_date || task.dueDate;
                  const cd = getCountdownText(rawDate);
                  
                  // Safe access for assignees
                  const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : [];

                  return (
                    <motion.div
                      key={task.id}
                      layout
                      draggable
                      onDragStart={() => setDraggedTaskId(task.id)}
                      onClick={() => onSelectTask(task)}
                      className="cursor-pointer"
                    >
                      <GlassCard variant="strong" className="space-y-2.5 p-3">
                        <div className="flex items-start gap-2">
                          <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-muted-foreground/40" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold leading-tight truncate">{task.title}</p>
                            <p className="mt-0.5 text-[10px] text-muted-foreground uppercase tracking-wider">
                              {task.unit_code || "Task"}
                            </p>
                          </div>
                          <span className={cn("h-2 w-2 shrink-0 rounded-full", priorityDot[task.priority?.toLowerCase()] || priorityDot.medium)} />
                          {onEditTask && (
                            <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Edit ${task.title}`} onClick={(event) => { event.stopPropagation(); onEditTask(task); }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {onDeleteTask && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label={`Delete ${task.title}`} onClick={(event) => { event.stopPropagation(); setPendingDelete(task); }}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className={cn("inline-flex items-center gap-1 text-[11px] font-medium", cd.urgent ? "text-destructive" : "text-muted-foreground")}>
                            <Clock className="h-3 w-3" />
                            {cd.text}
                          </span>
                          {task.comments && task.comments.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
                              <MessageSquare className="h-3 w-3" />
                              {task.comments.length}
                            </span>
                          )}
                        </div>

                        <div className="flex -space-x-1.5">
                          {assignees.slice(0, 3).map((uid: string) => {
                            const m = getMember(uid);
                            if (!m) return null;
                            return (
                              <Avatar key={uid} className="h-6 w-6 border-2 border-card">
                                <AvatarFallback className="text-[10px]" style={{ backgroundColor: m.color, color: "#fff" }}>
                                  {m.initials}
                                </AvatarFallback>
                              </Avatar>
                            );
                          })}
                        </div>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {colTasks.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No matching tasks
                </p>
              )}
            </div>
          </div>
        );
      })}
      </div>
      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this task?</AlertDialogTitle>
            <AlertDialogDescription>This removes “{pendingDelete?.title}” and its submissions from the local workspace.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (pendingDelete) onDeleteTask?.(pendingDelete.id); setPendingDelete(null); }}>Delete task</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}