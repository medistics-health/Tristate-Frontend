import {
  ChevronDown,
  ChevronLeft,
  Circle,
  ExternalLink,
  Home,
  CheckSquare,
  MoreHorizontal,
  RotateCcw,
  Sparkles,
  Trash2,
  Plus,
} from "lucide-react";
import { useRef, useState, useEffect, type ReactNode } from "react";
import type { NavbarAction } from "../layout/Navbar";
import { LOGOUT_ACTION } from "../layout/Navbar";

/**
 * Common tabs used in the DetailSidePanel
 */
export const DETAIL_TABS = [
  { id: "home", label: "Home", icon: <Home className="h-4 w-4" /> },
  { id: "tasks", label: "Tasks", icon: <CheckSquare className="h-4 w-4" /> },
  { id: "more", label: "+2 More", icon: null },
] as const;

export type DetailTabId = (typeof DETAIL_TABS)[number]["id"];

/**
 * Standard Avatar Pill for users
 */
export function AvatarPill({ name }: { name: string }) {
  if (!name) return null;
  return (
    <span className="inline-flex items-center gap-2 text-slate-700">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#fff1bd] text-[11px] font-semibold text-[#b78800]">
        {name.charAt(0).toUpperCase()}
      </span>
      {name}
    </span>
  );
}

/**
 * Standard Navbar Actions helper
 */
export function getStandardNavbarActions(onAddNew: () => void): NavbarAction[] {
  return [
    {
      label: "New record",
      icon: <Plus className="h-4 w-4" />,
      onClick: onAddNew,
    },
    LOGOUT_ACTION,
  ];
}

type DetailSidePanelProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  onTitleChange: (newTitle: string) => void;
  activeTab: DetailTabId;
  onTabChange: (tabId: DetailTabId) => void;
  metadata: {
    label: ReactNode;
    value: ReactNode;
  }[];
  children?: ReactNode;
  onDelete?: () => void;
  onRestore?: () => void;
  onExport?: () => void;
  onOpen?: () => void;
};

/**
 * Reusable Detail Side Panel component
 */
export function DetailSidePanel({
  isOpen,
  onClose,
  title,
  onTitleChange,
  activeTab,
  onTabChange,
  metadata,
  children,
  onDelete,
  onRestore,
  onExport,
  onOpen,
}: DetailSidePanelProps) {
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false);
      }
    }
    if (showOptionsMenu) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showOptionsMenu]);

  if (!isOpen) return null;

  return (
    <aside className="app-panel relative flex w-[340px] flex-col overflow-hidden rounded-2xl border border-[#f0ece6] bg-white shadow-sm font-app-sans">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[#f0ece6] px-4 py-3">
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="rounded-md bg-[#f7f5f1] px-1.5 py-1 text-slate-300"
        >
          <Circle className="h-3.5 w-3.5" />
        </button>
        <input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-0.5 text-[14px] font-medium text-slate-700 outline-none focus:border-[#9cb1f6] focus:bg-white"
          placeholder="Untitled"
        />
        <span className="text-[13px] text-slate-400">Now</span>
        <Sparkles className="h-4 w-4 text-slate-400" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-5 border-b border-[#f0ece6] px-4 pt-3">
        {DETAIL_TABS.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`inline-flex items-center gap-2 border-b pb-3 text-[13px] font-medium transition-colors ${
                isActive
                  ? "border-slate-500 text-slate-700"
                  : "border-transparent text-slate-400 hover:text-slate-500"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === "more" && <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-2 gap-x-5 gap-y-4 border-b border-[#f0ece6] px-4 py-4 text-[13px]">
          {metadata.map((item, idx) => (
            <div key={idx} className="contents">
              <div className="flex items-center gap-2 text-slate-400">
                {item.label}
              </div>
              <div className="text-slate-700 truncate">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="px-4 py-4">
          <div className="mb-3">
            <p className="text-[13px] font-medium text-slate-700">Details</p>
          </div>
          {children || (
            <div className="min-h-[240px] rounded-xl border border-dashed border-[#ece8e1] bg-white p-3 text-[13px] text-slate-500">
              No additional details provided.
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[#f0ece6] px-4 py-3">
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowOptionsMenu((prev) => !prev)}
            className="rounded-md border border-[#9cb1f6] px-3 py-2 text-[13px] font-medium text-slate-600 hover:bg-[#f7f5f1]"
          >
            Options
          </button>

          {showOptionsMenu && (
            <div className="absolute bottom-[calc(100%+8px)] left-0 z-20 w-[205px] rounded-xl border border-[#ece8e1] bg-white p-2 shadow-[0_8px_32px_rgba(15,23,42,0.12)]">
              <button
                type="button"
                onClick={() => {
                  onDelete?.();
                  setShowOptionsMenu(false);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] text-slate-500 hover:bg-[#f7f5f1]"
              >
                <Trash2 className="h-4 w-4" />
                Delete record
              </button>
              <button
                type="button"
                onClick={() => {
                  onRestore?.();
                  setShowOptionsMenu(false);
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] text-slate-500 hover:bg-[#f7f5f1]"
              >
                <RotateCcw className="h-4 w-4" />
                Restore record
              </button>
              <button
                type="button"
                onClick={() => {
                  onExport?.();
                  setShowOptionsMenu(false);
                }}
                className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] text-slate-500 hover:bg-[#f7f5f1]"
              >
                <ExternalLink className="h-4 w-4" />
                Export
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#3d4ed1]"
        >
          Open
        </button>
      </div>

      <button
        type="button"
        onClick={() => setShowOptionsMenu((prev) => !prev)}
        className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    </aside>
  );
}
