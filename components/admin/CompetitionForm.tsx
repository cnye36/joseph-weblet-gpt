"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Save, Loader2 } from "lucide-react";

interface Bot {
  id: string;
  name: string;
  description: string;
  avatar_url?: string;
}

interface Sponsor {
  name: string;
  logo_url: string;
  website_url: string;
  description: string;
  display_order: number;
}

interface EvaluationCriterion {
  name: string;
  weight: number;
  description: string;
}

type CompetitionStatus = "draft" | "active" | "closed" | "judging" | "completed";

interface CompetitionData {
  id: string;
  bot_id?: string;
  title?: string;
  description?: string;
  rules?: string;
  instructions?: string;
  status?: CompetitionStatus;
  start_date?: string;
  end_date?: string;
  submission_deadline?: string;
  results_date?: string | null;
  max_submissions_per_user?: number;
  allow_team_submissions?: boolean;
  reward_description?: string;
  top_winners_count?: number;
  baseline_title?: string;
  baseline_description?: string;
  baseline_prompts?: string;
  baseline_output?: unknown;
  baseline_evaluation_notes?: string;
  cover_image_url?: string;
  banner_url?: string;
  allowed_bot_ids?: string[];
  sponsors?: Sponsor[];
  evaluation_criteria?: EvaluationCriterion[];
}

interface Props {
  bots: Bot[];
  competition?: CompetitionData; // For editing existing competition
}

export default function CompetitionForm({ bots, competition }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = !!competition;

  // Determine if competition uses multiple bots
  const initialAllowedBotIds = competition?.allowed_bot_ids && Array.isArray(competition.allowed_bot_ids) && competition.allowed_bot_ids.length > 0
    ? competition.allowed_bot_ids
    : [];
  const useMultipleBots = initialAllowedBotIds.length > 0;

  // Form state
  const [formData, setFormData] = useState({
    bot_id: competition?.bot_id || "",
    title: competition?.title || "",
    description: competition?.description || "",
    rules: competition?.rules || "",
    instructions: competition?.instructions || "",
    status: competition?.status || "draft",
    start_date: competition?.start_date?.split("T")[0] || "",
    end_date: competition?.end_date?.split("T")[0] || "",
    submission_deadline: competition?.submission_deadline?.split("T")[0] || "",
    results_date: competition?.results_date?.split("T")[0] || "",
    max_submissions_per_user: competition?.max_submissions_per_user || 3,
    allow_team_submissions: competition?.allow_team_submissions || false,
    reward_description: competition?.reward_description || "",
    top_winners_count: competition?.top_winners_count || 10,
    baseline_title: competition?.baseline_title || "",
    baseline_description: competition?.baseline_description || "",
    baseline_prompts: competition?.baseline_prompts || "",
    baseline_output: competition?.baseline_output ? JSON.stringify(competition.baseline_output, null, 2) : "",
    baseline_evaluation_notes: competition?.baseline_evaluation_notes || "",
    cover_image_url: competition?.cover_image_url || "",
    banner_url: competition?.banner_url || "",
  });

  const [botSelectionMode, setBotSelectionMode] = useState<"single" | "multiple">(
    useMultipleBots ? "multiple" : "single"
  );
  const [allowedBotIds, setAllowedBotIds] = useState<string[]>(initialAllowedBotIds);

  const [sponsors, setSponsors] = useState<Sponsor[]>(competition?.sponsors || []);
  const [evaluationCriteria, setEvaluationCriteria] = useState<EvaluationCriterion[]>(
    competition?.evaluation_criteria || []
  );

  const [coverInputMode, setCoverInputMode] = useState<"url" | "upload">("url");
  const [bannerInputMode, setBannerInputMode] = useState<"url" | "upload">("url");
  const [coverUploading, setCoverUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  const [coverUploadMessage, setCoverUploadMessage] = useState<string | null>(null);
  const [bannerUploadMessage, setBannerUploadMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const addSponsor = () => {
    setSponsors([
      ...sponsors,
      { name: "", logo_url: "", website_url: "", description: "", display_order: sponsors.length },
    ]);
  };

  const updateSponsor = (index: number, field: keyof Sponsor, value: string | number) => {
    const updated = [...sponsors];
    updated[index] = { ...updated[index], [field]: value };
    setSponsors(updated);
  };

  const removeSponsor = (index: number) => {
    setSponsors(sponsors.filter((_, i) => i !== index));
  };

  const addCriterion = () => {
    setEvaluationCriteria([
      ...evaluationCriteria,
      { name: "", weight: 0, description: "" },
    ]);
  };

  const updateCriterion = (index: number, field: keyof EvaluationCriterion, value: string | number) => {
    const updated = [...evaluationCriteria];
    updated[index] = { ...updated[index], [field]: value };
    setEvaluationCriteria(updated);
  };

  const removeCriterion = (index: number) => {
    setEvaluationCriteria(evaluationCriteria.filter((_, i) => i !== index));
  };

  const submitForm = async (overrideStatus?: "draft" | "active") => {
    setSaving(true);
    setError(null);

    // Validate form
    if (botSelectionMode === "multiple" && allowedBotIds.length === 0) {
      setError("Please select at least one bot when using multiple bot selection.");
      setSaving(false);
      return;
    }
    if (botSelectionMode === "single" && !formData.bot_id) {
      setError("Please select a bot.");
      setSaving(false);
      return;
    }

    const getErrorMessage = (error: unknown): string => {
      if (error instanceof Error) return error.message;
      return "Failed to save competition";
    };

    try {
      // Parse baseline_output if it's a JSON string
      let baseline_output = null;
      if (formData.baseline_output) {
        try {
          baseline_output = JSON.parse(formData.baseline_output);
        } catch {
          setError("Invalid JSON in baseline output");
          setSaving(false);
          return;
        }
      }

      // Prepare allowed_bot_ids based on selection mode
      const allowed_bot_ids = botSelectionMode === "multiple" && allowedBotIds.length > 0
        ? allowedBotIds
        : [];

      const effectiveStatus = overrideStatus || formData.status;

      const payload = {
        ...formData,
        status: effectiveStatus,
        allowed_bot_ids,
        baseline_output,
        evaluation_criteria: evaluationCriteria,
        sponsors,
      };

      const url = competition
        ? `/api/competitions/${competition.id}`
        : "/api/competitions";

      const method = competition ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save competition");
      }

      router.push("/app/admin/competitions");
      router.refresh();
    } catch (error: unknown) {
      setError(getErrorMessage(error));
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitForm();
  };

  const handleSubmitWithStatus = async (status: "draft" | "active") => {
    await submitForm(status);
  };

  const validateImageFile = (file: File, kind: "cover" | "banner"): boolean => {
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      const msg = "Invalid file type. Only PNG, JPG, and WebP are allowed.";
      if (kind === "cover") {
        setCoverUploadMessage(msg);
      } else {
        setBannerUploadMessage(msg);
      }
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      const msg = "File too large. Maximum size is 5MB.";
      if (kind === "cover") {
        setCoverUploadMessage(msg);
      } else {
        setBannerUploadMessage(msg);
      }
      return false;
    }

    return true;
  };

  const uploadImage = async (file: File, kind: "cover" | "banner") => {
    if (!validateImageFile(file, kind)) return;

    if (kind === "cover") {
      setCoverUploading(true);
      setCoverUploadMessage(null);
    } else {
      setBannerUploading(true);
      setBannerUploadMessage(null);
    }

    const getUploadErrorMessage = (error: unknown): string => {
      if (error instanceof Error) return error.message;
      return "Failed to upload image";
    };

    try {
      const body = new FormData();
      body.append("banner", file);

      const response = await fetch("/api/admin/competitions/upload-banner", {
        method: "POST",
        body,
      });

      type UploadResponse = {
        imageUrl?: string;
        bannerUrl?: string;
        error?: string;
      };

      const data: UploadResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      const imageUrl = data.imageUrl || data.bannerUrl;
      if (!imageUrl) {
        throw new Error("Upload succeeded but no image URL was returned");
      }

      setFormData((prev) => ({
        ...prev,
        ...(kind === "cover"
          ? { cover_image_url: imageUrl }
          : { banner_url: imageUrl }),
      }));

      const successMessage =
        kind === "cover"
          ? "Cover image uploaded. Remember to save the competition to persist this change."
          : "Banner image uploaded. Remember to save the competition to persist this change.";

      if (kind === "cover") {
        setCoverUploadMessage(successMessage);
      } else {
        setBannerUploadMessage(successMessage);
      }
    } catch (error: unknown) {
      const msg = getUploadErrorMessage(error);
      if (kind === "cover") {
        setCoverUploadMessage(msg);
      } else {
        setBannerUploadMessage(msg);
      }
    } finally {
      if (kind === "cover") {
        setCoverUploading(false);
      } else {
        setBannerUploading(false);
      }
    }
  };

  const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImage(file, "cover");
  };

  const handleBannerFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadImage(file, "banner");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <section className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Basic Information</h2>

        <div>
          <label className="block text-sm font-medium mb-2">Bot/Weblet Selection *</label>
          
          {/* Selection Mode Toggle */}
          <div className="mb-4 flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="bot_selection_mode"
                value="single"
                checked={botSelectionMode === "single"}
                onChange={() => {
                  setBotSelectionMode("single");
                  setAllowedBotIds([]);
                }}
                className="w-4 h-4"
              />
              <span className="text-sm">Single Bot</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="bot_selection_mode"
                value="multiple"
                checked={botSelectionMode === "multiple"}
                onChange={() => {
                  setBotSelectionMode("multiple");
                  if (formData.bot_id && !allowedBotIds.includes(formData.bot_id)) {
                    setAllowedBotIds([formData.bot_id]);
                  }
                }}
                className="w-4 h-4"
              />
              <span className="text-sm">Multiple Bots (User Choice)</span>
            </label>
          </div>

          {botSelectionMode === "single" ? (
            <div>
              <select
                name="bot_id"
                value={formData.bot_id}
                onChange={handleChange}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a bot...</option>
                {bots.map((bot) => (
                  <option key={bot.id} value={bot.id}>
                    {bot.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                All participants will use this bot for the competition.
              </p>
            </div>
          ) : (
            <div>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {bots.map((bot) => (
                  <label key={bot.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                    <input
                      type="checkbox"
                      checked={allowedBotIds.includes(bot.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAllowedBotIds([...allowedBotIds, bot.id]);
                        } else {
                          setAllowedBotIds(allowedBotIds.filter((id) => id !== bot.id));
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">{bot.name}</span>
                    {bot.description && (
                      <span className="text-xs text-gray-500">- {bot.description}</span>
                    )}
                  </label>
                ))}
              </div>
              {allowedBotIds.length === 0 && (
                <p className="text-xs text-red-500 mt-1">Please select at least one bot.</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Participants can choose from any of the selected bots when submitting.
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Scientific Poster Excellence Challenge"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description *</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows={4}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe the competition..."
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Cover Image */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Cover Image (cards & featured sections)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Large marketing image used on the competitions list and homepage hero.
              Recommended: wide (16:9) graphic or photo.
            </p>

            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setCoverInputMode("url")}
                className={`px-3 py-1 text-xs rounded border ${
                  coverInputMode === "url"
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                Use Image URL
              </button>
              <button
                type="button"
                onClick={() => setCoverInputMode("upload")}
                className={`px-3 py-1 text-xs rounded border ${
                  coverInputMode === "upload"
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                Upload Image
              </button>
            </div>

            {coverInputMode === "url" && (
              <div>
                <input
                  type="url"
                  name="cover_image_url"
                  value={formData.cover_image_url}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/cover.jpg"
                />
              </div>
            )}

            {coverInputMode === "upload" && (
              <div className="space-y-2">
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  onChange={handleCoverFileChange}
                  disabled={coverUploading}
                  className="block w-full text-sm text-gray-700
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100 disabled:opacity-60"
                />
                {coverUploading && (
                  <div className="inline-flex items-center gap-2 text-xs text-gray-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Uploading cover image...
                  </div>
                )}
                {coverUploadMessage && (
                  <p
                    className={`text-xs ${
                      coverUploadMessage.toLowerCase().includes("error") ||
                      coverUploadMessage.toLowerCase().includes("fail") ||
                      coverUploadMessage.toLowerCase().includes("invalid") ||
                      coverUploadMessage.toLowerCase().includes("large")
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {coverUploadMessage}
                  </p>
                )}
              </div>
            )}

            {formData.cover_image_url && (
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-1">Cover image preview</div>
                <div className="h-40 rounded-lg overflow-hidden border bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.cover_image_url}
                    alt="Competition cover preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Banner Image */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Banner Image (competition detail page)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Shown at the top of the individual competition page. This can be a
              thinner header-style image or reuse your cover graphic.
            </p>

            <div className="flex items-center gap-2 mb-3">
              <button
                type="button"
                onClick={() => setBannerInputMode("url")}
                className={`px-3 py-1 text-xs rounded border ${
                  bannerInputMode === "url"
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                Use Image URL
              </button>
              <button
                type="button"
                onClick={() => setBannerInputMode("upload")}
                className={`px-3 py-1 text-xs rounded border ${
                  bannerInputMode === "upload"
                    ? "bg-blue-50 border-blue-500 text-blue-700"
                    : "border-gray-300 text-gray-600"
                }`}
              >
                Upload Image
              </button>
            </div>

            {bannerInputMode === "url" && (
              <div>
                <input
                  type="url"
                  name="banner_url"
                  value={formData.banner_url}
                  onChange={handleChange}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://example.com/banner.jpg"
                />
              </div>
            )}

            {bannerInputMode === "upload" && (
              <div className="space-y-2">
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.webp"
                  onChange={handleBannerFileChange}
                  disabled={bannerUploading}
                  className="block w-full text-sm text-gray-700
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100 disabled:opacity-60"
                />
                {bannerUploading && (
                  <div className="inline-flex items-center gap-2 text-xs text-gray-600">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Uploading banner image...
                  </div>
                )}
                {bannerUploadMessage && (
                  <p
                    className={`text-xs ${
                      bannerUploadMessage.toLowerCase().includes("error") ||
                      bannerUploadMessage.toLowerCase().includes("fail") ||
                      bannerUploadMessage.toLowerCase().includes("invalid") ||
                      bannerUploadMessage.toLowerCase().includes("large")
                        ? "text-red-600"
                        : "text-green-600"
                    }`}
                  >
                    {bannerUploadMessage}
                  </p>
                )}
              </div>
            )}

            {formData.banner_url && (
              <div className="mt-3">
                <div className="text-xs text-gray-500 mb-1">Banner preview</div>
                <div className="h-32 rounded-lg overflow-hidden border bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.banner_url}
                    alt="Competition banner preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Rules & Instructions */}
      <section className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Rules & Instructions</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Rules</label>
          <textarea
            name="rules"
            value={formData.rules}
            onChange={handleChange}
            rows={6}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
            placeholder="1. Use only the specified bot&#10;2. Submit your final output and all prompts&#10;3. Maximum 3 submissions per participant"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Instructions</label>
          <textarea
            name="instructions"
            value={formData.instructions}
            onChange={handleChange}
            rows={6}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
            placeholder="Step-by-step instructions for participants..."
          />
        </div>
      </section>

      {/* Timeline & Status */}
      <section className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Timeline & Status</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status *</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="judging">Judging</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Max Submissions Per User</label>
            <input
              type="number"
              name="max_submissions_per_user"
              value={formData.max_submissions_per_user}
              onChange={handleChange}
              min="1"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date *</label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleChange}
              required
              min={new Date().toISOString().split("T")[0]}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">Click to open calendar picker</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">End Date *</label>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleChange}
              required
              min={formData.start_date || new Date().toISOString().split("T")[0]}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">Click to open calendar picker</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Submission Deadline *</label>
            <input
              type="date"
              name="submission_deadline"
              value={formData.submission_deadline}
              onChange={handleChange}
              required
              min={formData.start_date || new Date().toISOString().split("T")[0]}
              max={formData.end_date || undefined}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">Click to open calendar picker</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Results Date</label>
            <input
              type="date"
              name="results_date"
              value={formData.results_date}
              onChange={handleChange}
              min={formData.end_date || new Date().toISOString().split("T")[0]}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
            />
            <p className="text-xs text-gray-500 mt-1">Click to open calendar picker</p>
          </div>
        </div>
      </section>

      {/* Rewards */}
      <section className="bg-white rounded-lg border p-6 space-y-4">
        <h2 className="text-lg font-semibold">Rewards</h2>

        <div>
          <label className="block text-sm font-medium mb-1">Reward Description</label>
          <textarea
            name="reward_description"
            value={formData.reward_description}
            onChange={handleChange}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="$500 for 1st place, $300 for 2nd place, $200 for 3rd place..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Top Winners Count</label>
          <input
            type="number"
            name="top_winners_count"
            value={formData.top_winners_count}
            onChange={handleChange}
            min="1"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            How many top submissions receive rewards?
          </p>
        </div>
      </section>

      {/* Baseline Evaluation (visible to all participants) */}
      <section className="bg-white rounded-lg border p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Baseline Evaluation</h2>
          <p className="text-sm text-gray-600 mt-1">
            Provide an example of good submissions. This is visible to all participants.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Baseline Title</label>
          <input
            type="text"
            name="baseline_title"
            value={formData.baseline_title}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Example: High-Quality Submission"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Baseline Description</label>
          <textarea
            name="baseline_description"
            value={formData.baseline_description}
            onChange={handleChange}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe what makes a good submission..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Example Prompts</label>
          <textarea
            name="baseline_prompts"
            value={formData.baseline_prompts}
            onChange={handleChange}
            rows={4}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
            placeholder="Example prompts that produce good results..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Baseline Output (JSON)</label>
          <textarea
            name="baseline_output"
            value={formData.baseline_output}
            onChange={handleChange}
            rows={6}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
            placeholder='{"type": "chart", "data": {...}}'
          />
          <p className="text-xs text-gray-500 mt-1">
            JSON representation of the baseline output
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Evaluation Notes</label>
          <textarea
            name="baseline_evaluation_notes"
            value={formData.baseline_evaluation_notes}
            onChange={handleChange}
            rows={4}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="What makes a good submission? Key criteria to focus on..."
          />
        </div>
      </section>

      {/* Evaluation Criteria */}
      <section className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Evaluation Criteria</h2>
            <p className="text-sm text-gray-600 mt-1">
              Define how submissions will be scored
            </p>
          </div>
          <button
            type="button"
            onClick={addCriterion}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Criterion
          </button>
        </div>

        {evaluationCriteria.map((criterion, index) => (
          <div key={index} className="flex gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={criterion.name}
                onChange={(e) => updateCriterion(index, "name", e.target.value)}
                placeholder="Criterion name (e.g., Scientific Accuracy)"
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={criterion.weight}
                onChange={(e) => updateCriterion(index, "weight", parseFloat(e.target.value))}
                placeholder="Weight (0-1)"
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <textarea
                value={criterion.description}
                onChange={(e) => updateCriterion(index, "description", e.target.value)}
                placeholder="Description..."
                rows={2}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => removeCriterion(index)}
              className="p-2 h-fit text-red-600 hover:bg-red-50 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {evaluationCriteria.length > 0 && (
          <div className="text-xs text-gray-600">
            Total weight:{" "}
            {evaluationCriteria.reduce((sum, c) => sum + c.weight, 0).toFixed(2)}{" "}
            {evaluationCriteria.reduce((sum, c) => sum + c.weight, 0) !== 1 && (
              <span className="text-amber-600">(should equal 1.0)</span>
            )}
          </div>
        )}
      </section>

      {/* Sponsors */}
      <section className="bg-white rounded-lg border p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Sponsors</h2>
          <button
            type="button"
            onClick={addSponsor}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Add Sponsor
          </button>
        </div>

        {sponsors.map((sponsor, index) => (
          <div key={index} className="flex gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1 grid grid-cols-2 gap-3">
              <input
                type="text"
                value={sponsor.name}
                onChange={(e) => updateSponsor(index, "name", e.target.value)}
                placeholder="Sponsor name"
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="url"
                value={sponsor.logo_url}
                onChange={(e) => updateSponsor(index, "logo_url", e.target.value)}
                placeholder="Logo URL"
                className="border rounded px-3 py-2 text-sm"
              />
              <input
                type="url"
                value={sponsor.website_url}
                onChange={(e) => updateSponsor(index, "website_url", e.target.value)}
                placeholder="Website URL"
                className="border rounded px-3 py-2 text-sm col-span-2"
              />
              <textarea
                value={sponsor.description}
                onChange={(e) => updateSponsor(index, "description", e.target.value)}
                placeholder="Description..."
                rows={2}
                className="border rounded px-3 py-2 text-sm col-span-2"
              />
            </div>
            <button
              type="button"
              onClick={() => removeSponsor(index)}
              className="p-2 h-fit text-red-600 hover:bg-red-50 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </section>

      {/* Submit Button */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
        <div className="flex flex-wrap gap-3">
          {!isEditing ? (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSubmitWithStatus("draft")}
                className="inline-flex items-center gap-2 px-5 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-800 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save as Draft
                  </>
                )}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSubmitWithStatus("active")}
                className="inline-flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save &amp; Activate Competition
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 border rounded-lg text-sm hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
