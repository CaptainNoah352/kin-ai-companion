import { Brain, CheckCircle2, FileCheck2, Play, Wrench } from "lucide-react";
import { AdhdTasksCenter } from "../adhdTasks/AdhdTasksCenter.jsx";
import { GoalsCenter } from "../goals/GoalsCenter.jsx";
import { InterventionRunner } from "../interventions/InterventionRunner.jsx";
import { StartCenter } from "../start/StartCenter.jsx";
import { normalizeToolView } from "../navigation/unifiedNavigation.js";

const toolViews = [
  {
    id: "exercises",
    label: "Exercises",
    icon: Wrench,
    copy: "Grounding, breathing, thought, sleep, and communication tools.",
  },
  {
    id: "tasks",
    label: "Tasks",
    icon: FileCheck2,
    copy: "Break down tasks into visible next steps.",
  },
  {
    id: "goals",
    label: "Goals",
    icon: CheckCircle2,
    copy: "Track tiny steps and recovery plans.",
  },
  {
    id: "start",
    label: "Start",
    icon: Play,
    copy: "Launch a five-minute task or body double.",
  },
];

export function ToolsCenter({
  activeToolView = "exercises",
  onSelectToolView,
  selectedModuleId,
  onSelectModule,
  moduleDrafts,
  setModuleDrafts,
  onCompleteModule,
  taskState,
  setTaskState,
  setGoals,
  goals,
  onOpenChatMode,
  onOpenStart,
  userOpenRouter,
  apiMode,
  startSessions,
  setStartSessions,
  startSuggestedTask,
}) {
  const selectedToolView = normalizeToolView(activeToolView);

  function selectToolView(viewId) {
    onSelectToolView?.(normalizeToolView(viewId));
  }

  return (
    <section className="tools-center" aria-label="Tools">
      <div className="tools-center__header">
        <div className="section-heading">
          <h2>Tools</h2>
          <p>Exercises, task breakdowns, goals, and task starts live in one place.</p>
        </div>
        <div className="tools-center__switcher" role="tablist" aria-label="Tool type">
          {toolViews.map((view) => {
            const Icon = view.icon;
            return (
              <button
                className={selectedToolView === view.id ? "tool-view-tab active" : "tool-view-tab"}
                type="button"
                role="tab"
                aria-selected={selectedToolView === view.id}
                key={view.id}
                onClick={() => selectToolView(view.id)}
              >
                <Icon size={17} />
                <span>
                  <strong>{view.label}</strong>
                  <small>{view.copy}</small>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedToolView === "exercises" && (
        <InterventionRunner
          selectedModuleId={selectedModuleId}
          onSelectModule={onSelectModule}
          drafts={moduleDrafts}
          setDrafts={setModuleDrafts}
          onComplete={onCompleteModule}
        />
      )}

      {selectedToolView === "tasks" && (
        <AdhdTasksCenter
          taskState={taskState}
          setTaskState={setTaskState}
          setGoals={setGoals}
          onOpenStart={onOpenStart}
          userOpenRouter={userOpenRouter}
          apiMode={apiMode}
        />
      )}

      {selectedToolView === "goals" && (
        <GoalsCenter goals={goals} setGoals={setGoals} onOpenChatMode={onOpenChatMode} onOpenStart={onOpenStart} />
      )}

      {selectedToolView === "start" && (
        <StartCenter sessions={startSessions} setSessions={setStartSessions} suggestedTask={startSuggestedTask} onOpenChatMode={onOpenChatMode} />
      )}

      {selectedToolView && !toolViews.some((view) => view.id === selectedToolView) && (
        <section className="surface-section">
          <div className="empty-state">
            <Brain size={26} />
            <p>Select a tool to begin.</p>
          </div>
        </section>
      )}
    </section>
  );
}
