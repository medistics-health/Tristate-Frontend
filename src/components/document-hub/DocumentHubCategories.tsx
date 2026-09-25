import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  FolderTree,
  GitMerge,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import AppLayout from "../layout/AppLayout";
import { EmptyStateIllustration } from "../shared/tablePageUtils";
import Select from "../shared/Select";
import {
  createHubCategory,
  deleteHubCategory,
  listHubCategories,
  mergeHubCategories,
  updateHubCategory,
} from "../../services/operations/documentHub";
import { hubCategoryParentId, type HubCategory } from "./types";

function categoryCreatedLabel(category: HubCategory) {
  const createdAt = category.createdAt
    ? new Date(category.createdAt).toLocaleString()
    : null;
  const createdBy = category.createdBy
    ? `${category.createdBy.firstName || ""} ${category.createdBy.lastName || ""}`.trim() ||
      category.createdBy.email
    : null;
  if (createdAt && createdBy) return `Created ${createdAt} by ${createdBy}`;
  if (createdAt) return `Created ${createdAt}`;
  if (createdBy) return `Created by ${createdBy}`;
  return null;
}

type CategoryNode = HubCategory & { children: CategoryNode[]; depth: number };

function buildCategoryTree(categories: HubCategory[]): CategoryNode[] {
  const byId = new Map(categories.map((item) => [item.id, item]));
  const childrenByParent = new Map<string | null, HubCategory[]>();

  for (const category of categories) {
    const rawParent = hubCategoryParentId(category);
    const parentId =
      rawParent && rawParent !== category.id && byId.has(rawParent) ? rawParent : null;
    const list = childrenByParent.get(parentId) || [];
    list.push(category);
    childrenByParent.set(parentId, list);
  }

  function nest(parentId: string | null, depth: number): CategoryNode[] {
    return (childrenByParent.get(parentId) || [])
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((category) => ({
        ...category,
        parentCategoryId: parentId,
        parentCategory: parentId
          ? category.parentCategory || {
              id: parentId,
              name: byId.get(parentId)?.name || "Parent",
            }
          : null,
        depth,
        children: nest(category.id, depth + 1),
      }));
  }

  return nest(null, 0);
}

function flattenTree(nodes: CategoryNode[]): CategoryNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

function DocumentHubCategoriesPage() {
  const [categories, setCategories] = useState<HubCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const tree = useMemo(() => buildCategoryTree(categories), [categories]);
  const flattened = useMemo(() => flattenTree(tree), [tree]);
  const visibleRows = useMemo(
    () =>
      flattened.filter((node) => {
        const seen = new Set<string>();
        let parentId = hubCategoryParentId(node);
        while (parentId && !seen.has(parentId)) {
          if (collapsed[parentId]) return false;
          seen.add(parentId);
          const parent = categories.find((item) => item.id === parentId);
          parentId = parent ? hubCategoryParentId(parent) : null;
        }
        return true;
      }),
    [flattened, collapsed, categories],
  );

  const parentOptions = flattened.map((node) => ({
    value: node.id,
    label: `${"— ".repeat(node.depth)}${node.name}`,
  }));

  async function refresh() {
    try {
      setIsLoading(true);
      setCategories(await listHubCategories());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load categories");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      const parentId = parentCategoryId || undefined;
      await createHubCategory(name.trim(), parentId);
      if (parentId) {
        setCollapsed((prev) => {
          const next = { ...prev };
          delete next[parentId];
          return next;
        });
      }
      setName("");
      setParentCategoryId("");
      toast.success("Category created.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create category");
    }
  }

  const rootCount = tree.length;
  const childCount = categories.length - rootCount;

  return (
    <AppLayout
      title="Document Categories"
      activeModule="Document Hub"
      activeSubItem="Categories"
      navbarIcon={<FolderOpen className="h-4 w-4 text-slate-500" />}
    >
      <div className="app-split min-h-0 font-app-sans">
        <section className="app-panel flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#f0ece6] px-5 py-4">
            <div>
              <h1 className="text-[16px] font-semibold text-slate-800">Category tree</h1>
              <p className="mt-1 text-[13px] text-slate-500">
                Parents group related types. Nest a category under a parent when you create it.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#f4f2ee] px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {rootCount} parent{rootCount === 1 ? "" : "s"}
              </span>
              <span className="rounded-full bg-[#eef1fb] px-2.5 py-1 text-[11px] font-semibold text-[#4f63ea]">
                {childCount} nested
              </span>
            </div>
          </div>

          <form
            onSubmit={handleCreate}
            className="flex flex-wrap items-end gap-3 border-b border-[#f0ece6] bg-[#fbfaf8] px-5 py-4"
          >
            <label className="min-w-[200px] flex-1">
              <span className="mb-1 block text-[12px] font-semibold text-slate-700">Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="app-control w-full rounded-md bg-white px-3 py-2 text-[13px]"
                placeholder="e.g. Spanish flyers"
                required
              />
            </label>
            <label className="min-w-[240px] flex-1">
              <span className="mb-1 block text-[12px] font-semibold text-slate-700">
                Nest under
              </span>
              <Select
                value={parentCategoryId}
                onChange={setParentCategoryId}
                options={[
                  { label: "Top level (no parent)", value: "" },
                  ...parentOptions,
                ]}
              />
            </label>
            <button
              type="submit"
              className="app-control inline-flex items-center gap-2 rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              Add category
            </button>
          </form>

          <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
            {isLoading ? (
              <div className="p-6 text-[13px] text-slate-400">Loading...</div>
            ) : categories.length === 0 ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <div className="text-center">
                  <EmptyStateIllustration />
                  <p className="mt-3 text-[14px] text-slate-500">No categories yet</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[#f4f1ec]">
                {visibleRows.map((category) => {
                  const hasChildren = category.children.length > 0;
                  const isCollapsed = Boolean(collapsed[category.id]);
                  const createdLabel = categoryCreatedLabel(category);
                  const path =
                    category.depth > 0
                      ? `${category.parentCategory?.name || "Parent"} / ${category.name}`
                      : category.name;

                  return (
                    <div
                      key={category.id}
                      className={`group px-4 py-3 hover:bg-[#faf9f7] ${
                        category.depth === 0 ? "bg-white" : "bg-[#f7f6ff]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-2">
                          <span
                            className="mt-3 shrink-0 border-t border-slate-200"
                            style={{ width: category.depth * 20 }}
                            aria-hidden
                          />
                          {hasChildren ? (
                            <button
                              type="button"
                              onClick={() =>
                                setCollapsed((prev) => ({
                                  ...prev,
                                  [category.id]: !prev[category.id],
                                }))
                              }
                              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#ece8e1] bg-white text-slate-500"
                              title={isCollapsed ? "Expand" : "Collapse"}
                            >
                              {isCollapsed ? (
                                <ChevronRight className="h-3.5 w-3.5" />
                              ) : (
                                <ChevronDown className="h-3.5 w-3.5" />
                              )}
                            </button>
                          ) : (
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center text-slate-300">
                              {category.depth > 0 ? (
                                <span className="h-3 w-3 rounded-full border border-slate-300" />
                              ) : (
                                <Folder className="h-3.5 w-3.5 text-slate-400" />
                              )}
                            </span>
                          )}

                          <div className="min-w-0 pt-0.5">
                            {editingId === category.id ? (
                              <input
                                value={editName}
                                onChange={(event) => setEditName(event.target.value)}
                                className="app-control w-full max-w-sm rounded-md px-2 py-1 text-[13px]"
                              />
                            ) : (
                              <>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-[14px] font-semibold text-slate-800">
                                    {category.name}
                                  </p>
                                  {category.depth === 0 ? (
                                    <span className="rounded-full bg-[#f4f2ee] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                      Parent
                                    </span>
                                  ) : (
                                    <span className="rounded-full bg-[#eef1fb] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#4f63ea]">
                                      Child
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 flex items-center gap-1 text-[12px] text-slate-400">
                                  <FolderTree className="h-3 w-3" />
                                  {path}
                                  {hasChildren
                                    ? ` · ${category.children.length} nested`
                                    : ""}
                                </p>
                                {createdLabel ? (
                                  <p className="mt-0.5 text-[11px] text-slate-400">
                                    {createdLabel}
                                  </p>
                                ) : null}
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-[12px] text-slate-500">
                          <span className="rounded-lg border border-[#ece8e1] bg-white px-2 py-1">
                            {category._count?.documentLinks ?? 0} docs
                          </span>
                          {hasChildren ? (
                            <span className="rounded-lg border border-[#ece8e1] bg-white px-2 py-1">
                              {category.children.length} nested
                            </span>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                          {editingId === category.id ? (
                            <>
                              <button
                                type="button"
                                onClick={async () => {
                                  await updateHubCategory(category.id, { name: editName });
                                  setEditingId(null);
                                  toast.success("Category renamed.");
                                  await refresh();
                                }}
                                className="inline-flex items-center gap-1 rounded-md bg-[#4f63ea] px-2.5 py-1.5 text-[12px] font-medium text-white"
                              >
                                <Save className="h-3.5 w-3.5" /> Save
                              </button>
                              <button type="button" onClick={() => setEditingId(null)}>
                                <X className="h-4 w-4 text-slate-400" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-md border border-[#ece8e1] bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-600"
                              onClick={() => {
                                setEditingId(category.id);
                                setEditName(category.name);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Rename
                            </button>
                          )}

                          <div className="flex min-w-[180px] items-center gap-1">
                            <Select
                              value={mergeTargetId[category.id] || ""}
                              onChange={(value) =>
                                setMergeTargetId((prev) => ({ ...prev, [category.id]: value }))
                              }
                              options={[
                                { label: "Merge into...", value: "" },
                                ...flattened
                                  .filter((item) => item.id !== category.id)
                                  .map((item) => ({
                                    label: `${"— ".repeat(item.depth)}${item.name}`,
                                    value: item.id,
                                  })),
                              ]}
                            />
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 rounded-md border border-[#ece8e1] bg-white px-2.5 py-1.5 text-[12px] font-medium text-slate-600"
                              onClick={async () => {
                                const target = mergeTargetId[category.id];
                                if (!target) {
                                  toast.error("Choose a category to merge into.");
                                  return;
                                }
                                await mergeHubCategories(category.id, target);
                                toast.success("Categories merged.");
                                await refresh();
                              }}
                            >
                              <GitMerge className="h-3.5 w-3.5" />
                              Merge
                            </button>
                          </div>

                          <button
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50"
                            onClick={async () => {
                              if (!window.confirm(`Delete ${category.name}?`)) return;
                              try {
                                await deleteHubCategory(category.id);
                                toast.success("Category deleted.");
                                await refresh();
                              } catch (error) {
                                toast.error(
                                  error instanceof Error ? error.message : "Unable to delete",
                                );
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

export default DocumentHubCategoriesPage;
