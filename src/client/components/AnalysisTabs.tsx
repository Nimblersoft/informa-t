import React, { useRef } from "react";

export type TabId = "evidence" | "models" | "logs";

interface TabItem {
  id: TabId;
  label: string;
  badge?: string;
}

const TABS: readonly TabItem[] = [
  { id: "evidence", label: "Evidencia" },
  { id: "models", label: "Modelos" },
  { id: "logs", label: "Logs" },
];

interface AnalysisTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: {
    evidence: React.ReactNode;
    models: React.ReactNode;
    logs: React.ReactNode;
  };
}

export const AnalysisTabs: React.FC<AnalysisTabsProps> = ({
  activeTab,
  onTabChange,
  children,
}) => {
  const tabRefs = useRef<Map<TabId, HTMLButtonElement>>(new Map());

  const handleKeyDown = (e: React.KeyboardEvent, currentTabId: TabId) => {
    const currentIndex = TABS.findIndex((t) => t.id === currentTabId);
    if (currentIndex === -1) return;

    let nextIndex = -1;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        nextIndex = (currentIndex + 1) % TABS.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        nextIndex = (currentIndex - 1 + TABS.length) % TABS.length;
        break;
      case "Home":
        e.preventDefault();
        nextIndex = 0;
        break;
      case "End":
        e.preventDefault();
        nextIndex = TABS.length - 1;
        break;
      default:
        return;
    }

    if (nextIndex >= 0) {
      const nextTab = TABS[nextIndex];
      onTabChange(nextTab.id);
      const button = tabRefs.current.get(nextTab.id);
      button?.focus();
    }
  };

  return (
    <div className="analysis-tabs-container" data-testid="analysis-tabs">
      <div
        role="tablist"
        aria-label="Secciones de análisis"
        className="tabs-nav"
        data-testid="tablist"
      >
        {TABS.map((tab) => {
          const isSelected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                if (node) {
                  tabRefs.current.set(tab.id, node);
                } else {
                  tabRefs.current.delete(tab.id);
                }
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={isSelected ? 0 : -1}
              className={`tab-btn ${isSelected ? "active" : ""}`}
              data-testid={`tab-${tab.id}`}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, tab.id)}
            >
              <span className="tab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="tabpanels-wrapper">
        <div
          role="tabpanel"
          id="panel-evidence"
          aria-labelledby="tab-evidence"
          tabIndex={0}
          hidden={activeTab !== "evidence"}
          className="tabpanel"
          data-testid="panel-evidence"
        >
          {activeTab === "evidence" && children.evidence}
        </div>

        <div
          role="tabpanel"
          id="panel-models"
          aria-labelledby="tab-models"
          tabIndex={0}
          hidden={activeTab !== "models"}
          className="tabpanel"
          data-testid="panel-models"
        >
          {activeTab === "models" && children.models}
        </div>

        <div
          role="tabpanel"
          id="panel-logs"
          aria-labelledby="tab-logs"
          tabIndex={0}
          hidden={activeTab !== "logs"}
          className="tabpanel"
          data-testid="panel-logs"
        >
          {activeTab === "logs" && children.logs}
        </div>
      </div>
    </div>
  );
};
