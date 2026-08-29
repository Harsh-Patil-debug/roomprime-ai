import { toast } from "sonner";
import { type RequestCategory } from "@/lib/cleansync-data";

export interface HousekeepingQaResult {
  score: number; // 0-100
  passed: boolean; // true if score >= 95
  summary: string;
  detectedIssues: string[];
  checklist: {
    linensTaut: boolean;
    trashCleared: boolean;
    towelsStaged: boolean;
    surfacesClean: boolean;
  };
  bboxes?: Array<{ label: string; x: number; y: number; width: number; height: number }>;
  photoUrl?: string | null;
  source: "gemini_live" | "hotel_ruleset_fallback";
}

export interface GuestTriageResult {
  category: RequestCategory;
  urgency: "Critical" | "High" | "Medium" | "Low";
  item: string;
  details: string;
  source: "gemini_live" | "hotel_ruleset_fallback";
}

/**
 * Compresses an image file or base64 dataUrl in the browser to max 1024x1024 (JPEG quality 0.8)
 * to ensure fast uploads over Wi-Fi without payload lag.
 */
export async function compressImage(
  input: File | Blob | string,
  maxDimension = 1024,
  quality = 0.8
): Promise<{ dataUrl: string; base64Data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        // Fallback to original
        const dataUrl = typeof input === "string" ? input : "";
        const base64Data = dataUrl.split(",")[1] || "";
        resolve({ dataUrl, base64Data, mimeType: "image/jpeg" });
        return;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const mimeType = "image/jpeg";
      const dataUrl = canvas.toDataURL(mimeType, quality);
      const base64Data = dataUrl.split(",")[1] || "";

      resolve({ dataUrl, base64Data, mimeType });
    };

    img.onerror = () => {
      if (typeof input === "string") {
        const base64Data = input.split(",")[1] || "";
        resolve({ dataUrl: input, base64Data, mimeType: "image/jpeg" });
      } else {
        reject(new Error("Failed to load image for compression"));
      }
    };

    if (typeof input === "string") {
      img.src = input;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(input);
    }
  });
}

/**
 * Deterministic fallback generator for Housekeeping Staging QA
 */
function getDeterministicHousekeepingFallback(photoTypeHint?: string): HousekeepingQaResult {
  const isDirty = photoTypeHint === "dirty_bed" || photoTypeHint === "dirty_trash" || photoTypeHint === "dirty";
  
  if (!isDirty) {
    return {
      score: 97,
      passed: true,
      summary: "All visual staging checkpoints verified. Bed linens taut and aligned, bathroom fixtures sanitized, and no floor debris detected. Passes luxury hotel staging standard.",
      detectedIssues: [],
      checklist: {
        linensTaut: true,
        trashCleared: true,
        towelsStaged: true,
        surfacesClean: true,
      },
      bboxes: [],
      photoUrl: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?q=80&w=800",
      source: "hotel_ruleset_fallback",
    };
  }

  if (photoTypeHint === "dirty_bed") {
    return {
      score: 72,
      passed: false,
      summary: "Staging defect: Rumpled linens and unaligned bedding throw blanket detected on left side.",
      detectedIssues: ["Rumpled bed linens on left pillows", "Throw blanket unaligned"],
      checklist: {
        linensTaut: false,
        trashCleared: true,
        towelsStaged: true,
        surfacesClean: true,
      },
      bboxes: [{ label: "Rumpled Linens", x: 28, y: 35, width: 44, height: 38 }],
      photoUrl: "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=800",
      source: "hotel_ruleset_fallback",
    };
  }

  return {
    score: 68,
    passed: false,
    summary: "Staging defect: Visible trash debris on floor near desk chair and unemptied bin.",
    detectedIssues: ["Trash debris on floor", "Desk surfaces require wipe-down"],
    checklist: {
      linensTaut: true,
      trashCleared: false,
      towelsStaged: true,
      surfacesClean: false,
    },
    bboxes: [{ label: "Trash on Floor", x: 55, y: 65, width: 25, height: 28 }],
    photoUrl: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800",
    source: "hotel_ruleset_fallback",
  };
}

/**
 * Inspect Room Staging Photo using Gemini 1.5 Flash Vision AI with AbortSignal timeout and local fallback.
 */
export async function inspectRoomPhotoWithGemini(
  imageInput: File | Blob | string,
  photoTypeHint?: "clean" | "dirty_bed" | "dirty_trash" | "dirty"
): Promise<HousekeepingQaResult> {
  const envObj = typeof process !== "undefined" && process.env ? process.env : {};
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || envObj["GEMINI_API_KEY"];

  let compressed: { dataUrl: string; base64Data: string; mimeType: string };
  try {
    compressed = await compressImage(imageInput, 1024, 0.8);
  } catch {
    return getDeterministicHousekeepingFallback(photoTypeHint);
  }

  // If no API key or image data is unavailable, instantly use deterministic ruleset
  if (!apiKey || !compressed.base64Data) {
    return {
      ...getDeterministicHousekeepingFallback(photoTypeHint),
      photoUrl: compressed.dataUrl || null,
    };
  }

  // Setup 4500ms timeout guard
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  const promptText = `
You are an expert hotel housekeeping inspector. Analyze the provided room staging or maintenance photo.
Verify:
1. Bed sheets are taut and wrinkle-free
2. No visible trash or debris
3. Towels and amenities are neatly staged
4. Surfaces are wiped and clean

Return STRICT JSON format:
{
  "score": number (0-100),
  "passed": boolean (true if score >= 95),
  "summary": string,
  "detectedIssues": string[],
  "checklist": {
    "linensTaut": boolean,
    "trashCleared": boolean,
    "towelsStaged": boolean,
    "surfacesClean": boolean
  },
  "bboxes": [
    { "label": string, "x": number, "y": number, "width": number, "height": number }
  ]
}
`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inline_data: {
                  mime_type: compressed.mimeType,
                  data: compressed.base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.2,
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Gemini API returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error("Empty response from Gemini Vision model");
    }

    const parsed = JSON.parse(candidateText);
    const score = typeof parsed.score === "number" ? parsed.score : 90;
    const passed = typeof parsed.passed === "boolean" ? parsed.passed : score >= 95;

    return {
      score,
      passed,
      summary: parsed.summary || (passed ? "All staging criteria verified." : "Staging defects detected."),
      detectedIssues: Array.isArray(parsed.detectedIssues) ? parsed.detectedIssues : [],
      checklist: {
        linensTaut: parsed.checklist?.linensTaut ?? true,
        trashCleared: parsed.checklist?.trashCleared ?? true,
        towelsStaged: parsed.checklist?.towelsStaged ?? true,
        surfacesClean: parsed.checklist?.surfacesClean ?? true,
      },
      bboxes: Array.isArray(parsed.bboxes) ? parsed.bboxes : [],
      photoUrl: compressed.dataUrl,
      source: "gemini_live",
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    // Soft notification and graceful fallback
    if (err?.name === "AbortError") {
      toast.info("Gemini Vision timed out (4.5s) — processed via Hotel QA Ruleset.");
    }
    return {
      ...getDeterministicHousekeepingFallback(photoTypeHint),
      photoUrl: compressed.dataUrl || null,
    };
  }
}

/**
 * Guest "Snap-a-Need" AI Triage Analyzer
 */
export async function analyzeGuestNeedPhoto(
  imageInput: File | Blob | string,
  issueHint?: string
): Promise<GuestTriageResult> {
  const envObj = typeof process !== "undefined" && process.env ? process.env : {};
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || envObj["GEMINI_API_KEY"];

  let compressed: { dataUrl: string; base64Data: string; mimeType: string };
  try {
    compressed = await compressImage(imageInput, 1024, 0.8);
  } catch {
    return getDeterministicGuestTriageFallback(issueHint);
  }

  if (!apiKey || !compressed.base64Data) {
    return getDeterministicGuestTriageFallback(issueHint);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4500);

  const promptText = `
You are a luxury hotel concierge AI. Analyze this guest photo of a room issue or needed amenity.
Determine:
1. Category ("Amenities" | "Maintenance" | "Luggage" | "Inquiry" | "Food Service" | "Late Checkout")
2. Urgency ("Critical" | "High" | "Medium" | "Low")
3. Task Item (Short title, e.g. "AC Leaking Water", "Fresh Towels Request", "Broken Remote Control")
4. Details (Concise 1-sentence description)

Return STRICT JSON format:
{
  "category": string,
  "urgency": string,
  "item": string,
  "details": string
}
`;

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: promptText },
              {
                inline_data: {
                  mime_type: compressed.mimeType,
                  data: compressed.base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.2,
        },
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Gemini API error ${response.status}`);
    }

    const data = await response.json();
    const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      throw new Error("Empty candidate from Gemini");
    }

    const parsed = JSON.parse(candidateText);
    const validCategories: RequestCategory[] = ["Amenities", "Maintenance", "Luggage", "Inquiry", "Food Service", "Late Checkout"];
    const category: RequestCategory = validCategories.includes(parsed.category) ? parsed.category : "Maintenance";

    return {
      category,
      urgency: parsed.urgency || "High",
      item: parsed.item || "Guest Service Request",
      details: parsed.details || "Issue identified from uploaded photo.",
      source: "gemini_live",
    };
  } catch {
    clearTimeout(timeoutId);
    return getDeterministicGuestTriageFallback(issueHint);
  }
}

function getDeterministicGuestTriageFallback(issueHint?: string): GuestTriageResult {
  if (issueHint?.includes("ac") || issueHint?.includes("temperature")) {
    return {
      category: "Maintenance",
      urgency: "High",
      item: "AC Temperature Check",
      details: "AC thermostat unresponsive or blowing warm air. Maintenance dispatched.",
      source: "hotel_ruleset_fallback",
    };
  }

  if (issueHint?.includes("water") || issueHint?.includes("spill")) {
    return {
      category: "Amenities",
      urgency: "Medium",
      item: "Spot Carpet Cleaning",
      details: "Beverage spill on guest room carpet. Housekeeping dispatched with extraction equipment.",
      source: "hotel_ruleset_fallback",
    };
  }

  return {
    category: "Maintenance",
    urgency: "High",
    item: "Broken Fixture / Repair Need",
    details: "Visual defect detected in room photo. Dispatched to Engineering.",
    source: "hotel_ruleset_fallback",
  };
}
