import { FolderOpen, Plus, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
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
import type { HubCategory } from "./types";

function DocumentHubCategoriesPage() {
  const [categories, setCategories] = useState<HubCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState("");
  const [parentCategoryId, setParentCategoryId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState<Record<string, string>>({});

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
      await createHubCategory(name.trim(), parentCategoryId || undefined);
      setName("");
      setParentCategoryId("");
      toast.success("Category created.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create category");
    }
  }

  return (
    <AppLayout
      title="Document Categories"
      activeModule="Document Hub"
      activeSubItem="Categories"
      navbarIcon={<FolderOpen className="h-4 w-4 text-slate-500" />}
    >
      <div className="app-split font-app-sans">
        <section className="app-panel min-w-0 flex flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-xs">
          <div className="border-b border-[#f0ece6] px-5 py-4">
            <h1 className="text-[16px] font-semibold text-slate-800">Categories</h1>
            <p className="mt-1 text-[13px] text-slate-500">
              Controlled list used when uploading documents.
            </p>
          </div>
          <form
            onSubmit={handleCreate}
            className="flex flex-wrap items-end gap-3 border-b border-[#f0ece6] px-5 py-4"
          >
            <label className="min-w-[200px] flex-1">
              <span className="mb-1 block text-[12px] font-semibold text-slate-700">Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="app-control w-full rounded-md px-3 py-2 text-[13px]"
                placeholder="Sales Collateral"
                required
              />
            </label>
            <label className="min-w-[200px] flex-1">
              <span className="mb-1 block text-[12px] font-semibold text-slate-700">Parent</span>
              <Select
                value={parentCategoryId}
                onChange={setParentCategoryId}
                options={[
                  { label: "None", value: "" },
                  ...categories.map((item) => ({ label: item.name, value: item.id })),
                ]}
              />
            </label>
            <button
              type="submit"
              className="app-control inline-flex items-center gap-2 rounded-md bg-[#4f63ea] px-4 py-2 text-[13px] font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              Add
            </button>
          </form>
          <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar">
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
              <table className="min-w-full border-separate border-spacing-0">
                <thead className="sticky top-0 bg-white text-[12px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="border-b border-[#f0ece6] px-4 py-3 text-left font-medium">Name</th>
                    <th className="border-b border-[#f0ece6] px-4 py-3 text-left font-medium">Parent</th>
                    <th className="border-b border-[#f0ece6] px-4 py-3 text-left font-medium">Docs</th>
                    <th className="border-b border-[#f0ece6] px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((category) => (
                    <tr key={category.id} className="bg-white hover:bg-[#faf9f7]">
                      <td className="border-b border-[#f4f1ec] px-4 py-3 text-[13px] text-slate-700">
                        {editingId === category.id ? (
                          <input
                            value={editName}
                            onChange={(event) => setEditName(event.target.value)}
                            className="app-control w-full rounded-md px-2 py-1 text-[13px]"
                          />
                        ) : (
                          category.name
                        )}
                      </td>
                      <td className="border-b border-[#f4f1ec] px-4 py-3 text-[13px] text-slate-600">
                        {category.parentCategory?.name || "—"}
                      </td>
                      <td className="border-b border-[#f4f1ec] px-4 py-3 text-[13px] text-slate-600">
                        {category._count?.documentLinks ?? 0}
                      </td>
                      <td className="border-b border-[#f4f1ec] px-4 py-3 text-[13px]">
                        <div className="flex flex-wrap items-center gap-2">
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
                                className="inline-flex items-center gap-1 text-[#4f63ea]"
                              >
                                <Save className="h-3.5 w-3.5" /> Save
                              </button>
                              <button type="button" onClick={() => setEditingId(null)}>
                                <X className="h-3.5 w-3.5 text-slate-400" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="text-[#4f63ea]"
                              onClick={() => {
                                setEditingId(category.id);
                                setEditName(category.name);
                              }}
                            >
                              Rename
                            </button>
                          )}
                          <Select
                            value={mergeTargetId[category.id] || ""}
                            onChange={(value) =>
                              setMergeTargetId((prev) => ({ ...prev, [category.id]: value }))
                            }
                            options={[
                              { label: "Merge into...", value: "" },
                              ...categories
                                .filter((item) => item.id !== category.id)
                                .map((item) => ({ label: item.name, value: item.id })),
                            ]}
                          />
                          <button
                            type="button"
                            className="text-slate-600"
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
                            Merge
                          </button>
                          <button
                            type="button"
                            className="text-red-500"
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
                            <Trash2 className="inline h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}

export default DocumentHubCategoriesPage;
