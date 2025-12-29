// src/utils/copyrightApi.js
// Client-side utilities for interacting with the Copyright Registry API

const API_BASE = "/.netlify/functions/copyrightRegistry";

/**
 * Check if an image is registered
 * @param {string} imageId - The image ID (e.g., "i-xxxx")
 * @returns {Promise<{is_registered: boolean, registration: object|null, in_pending_batch: boolean, pending_quarter: string|null}>}
 */
export async function checkCopyrightStatus(imageId) {
  const res = await fetch(`${API_BASE}?action=status&imageId=${encodeURIComponent(imageId)}`);
  if (!res.ok) throw new Error(`Failed to check status: ${res.statusText}`);
  return res.json();
}

/**
 * Get bulk status for multiple images
 * @param {string[]} imageIds - Array of image IDs
 * @returns {Promise<Object<string, {is_registered: boolean, registration: object|null}>>}
 */
export async function bulkCheckCopyrightStatus(imageIds) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "bulkStatus", imageIds })
  });
  if (!res.ok) throw new Error(`Failed to check bulk status: ${res.statusText}`);
  return res.json();
}

/**
 * Get the full copyright registry
 * @returns {Promise<Object>}
 */
export async function getRegistry() {
  const res = await fetch(`${API_BASE}?action=registry`);
  if (!res.ok) throw new Error(`Failed to get registry: ${res.statusText}`);
  return res.json();
}

/**
 * Mark an image as already registered (manual catch-up)
 * @param {Object} params
 * @param {string} params.imageId - The image ID
 * @param {string} [params.registration_number] - Copyright Office registration number
 * @param {string} [params.submission_date] - Date submitted (YYYY-MM-DD)
 * @param {string} [params.batch_id] - Batch identifier
 * @param {string} [params.title_at_submission] - Title at time of submission
 * @param {string} [params.notes] - Optional notes
 */
export async function markAsRegistered(params) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "markRegistered", ...params })
  });
  if (!res.ok) throw new Error(`Failed to mark as registered: ${res.statusText}`);
  return res.json();
}

/**
 * Update an existing registration
 * @param {Object} params
 * @param {string} params.imageId - The image ID
 * @param {string} [params.registration_number] - Copyright Office registration number
 * @param {string} [params.submission_date] - Date submitted (YYYY-MM-DD)
 * @param {string} [params.batch_id] - Batch identifier
 * @param {string} [params.title_at_submission] - Title at time of submission
 * @param {string} [params.notes] - Optional notes
 */
export async function updateRegistration(params) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "updateRegistration", ...params })
  });
  if (!res.ok) throw new Error(`Failed to update registration: ${res.statusText}`);
  return res.json();
}

/**
 * Remove a registration (requires confirmation)
 * @param {string} imageId - The image ID
 */
export async function removeRegistration(imageId) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "removeRegistration", imageId, confirm: true })
  });
  if (!res.ok) throw new Error(`Failed to remove registration: ${res.statusText}`);
  return res.json();
}

/**
 * Batch mark images as already registered
 * @param {Object} params
 * @param {Array<string|{image_id: string, title_at_submission?: string}>} params.images
 * @param {string} [params.registration_number]
 * @param {string} [params.submission_date]
 * @param {string} [params.batch_id]
 */
export async function batchMarkAsRegistered(params) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "batchMarkRegistered", ...params })
  });
  if (!res.ok) throw new Error(`Failed to batch mark as registered: ${res.statusText}`);
  return res.json();
}

/**
 * Get quarterly batch
 * @param {string} [quarter] - Quarter identifier (e.g., "2025-Q2"), defaults to current
 * @returns {Promise<Object>}
 */
export async function getQuarterlyBatch(quarter) {
  const params = quarter ? `?action=quarterly&quarter=${encodeURIComponent(quarter)}` : "?action=quarterly";
  const res = await fetch(`${API_BASE}${params}`);
  if (!res.ok) throw new Error(`Failed to get quarterly batch: ${res.statusText}`);
  return res.json();
}

/**
 * List all quarterly batches
 * @returns {Promise<{batches: Array}>}
 */
export async function listQuarterlyBatches() {
  const res = await fetch(`${API_BASE}?action=listQuarterly`);
  if (!res.ok) throw new Error(`Failed to list quarterly batches: ${res.statusText}`);
  return res.json();
}

/**
 * Get quarterly summary for review
 * @param {string} [quarter] - Quarter identifier
 * @returns {Promise<{quarter: string, total_images: number, submission_count: number, submissions: Array, status: string}>}
 */
export async function getQuarterlySummary(quarter) {
  const params = quarter ? `?action=summary&quarter=${encodeURIComponent(quarter)}` : "?action=summary";
  const res = await fetch(`${API_BASE}${params}`);
  if (!res.ok) throw new Error(`Failed to get quarterly summary: ${res.statusText}`);
  return res.json();
}

/**
 * Add images to quarterly batch
 * @param {Object} params
 * @param {Array<{image_id: string, source_gallery?: string, title?: string, thumbnail?: string}>} params.images
 * @param {string} [params.quarter] - Target quarter, defaults to current
 */
export async function addToQuarterlyBatch(params) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "addToQuarterly", ...params })
  });
  if (!res.ok) throw new Error(`Failed to add to quarterly batch: ${res.statusText}`);
  return res.json();
}

/**
 * Remove images from quarterly batch
 * @param {Object} params
 * @param {string[]} params.imageIds - Image IDs to remove
 * @param {string} [params.quarter] - Target quarter
 */
export async function removeFromQuarterlyBatch(params) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "removeFromQuarterly", ...params })
  });
  if (!res.ok) throw new Error(`Failed to remove from quarterly batch: ${res.statusText}`);
  return res.json();
}

/**
 * Approve a quarterly batch for submission
 * @param {string} [quarter] - Target quarter
 */
export async function approveQuarterlyBatch(quarter) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "approveQuarterly", quarter })
  });
  if (!res.ok) throw new Error(`Failed to approve quarterly batch: ${res.statusText}`);
  return res.json();
}

/**
 * Mark a quarterly batch as submitted to Copyright Office (pending registration)
 * @param {string} [quarter] - Target quarter
 */
export async function markAsSubmitted(quarter) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "markAsSubmitted", quarter })
  });
  if (!res.ok) throw new Error(`Failed to mark as submitted: ${res.statusText}`);
  return res.json();
}

/**
 * Record a submission with registration number
 * @param {Object} params
 * @param {string} params.group - Submission group (A, B, C, etc.)
 * @param {string} params.registration_number - Copyright Office registration number
 * @param {string} [params.quarter] - Target quarter
 */
export async function recordSubmission(params) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "recordSubmission", ...params })
  });
  if (!res.ok) throw new Error(`Failed to record submission: ${res.statusText}`);
  return res.json();
}

/**
 * Process a quarterly batch (finalize into registry)
 * @param {string} [quarter] - Target quarter
 */
export async function processQuarterlyBatch(quarter) {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "processQuarterly", quarter })
  });
  if (!res.ok) throw new Error(`Failed to process quarterly batch: ${res.statusText}`);
  return res.json();
}

/**
 * Get current quarter string
 * @returns {string} e.g., "2025-Q4"
 */
export function getCurrentQuarter() {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `${year}-Q${quarter}`;
}

/**
 * Get quarter from a date string
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {string} e.g., "2025-Q2"
 */
export function getQuarterFromDate(dateStr) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const quarter = Math.ceil((date.getMonth() + 1) / 3);
  return `${year}-Q${quarter}`;
}

/**
 * Check if a date falls within a specific quarter
 * @param {string} dateStr - Date string
 * @param {string} quarter - Quarter string
 * @returns {boolean}
 */
export function isDateInQuarter(dateStr, quarter) {
  return getQuarterFromDate(dateStr) === quarter;
}

/**
 * Generate CSV from ledger data
 * @param {Array<{image_id: string, batch_id: string, registration_number: string, submission_date: string, source_gallery: string, title_at_submission: string}>} entries
 * @returns {string} CSV content
 */
export function generateLedgerCSV(entries) {
  const headers = ["image_id", "batch_id", "registration_number", "submission_date", "source_gallery", "title_at_submission"];
  const rows = entries.map(e => 
    headers.map(h => {
      const val = e[h] || "";
      // Escape quotes and wrap in quotes if contains comma
      if (val.includes(",") || val.includes('"') || val.includes("\n")) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

/**
 * Download a string as a file
 * @param {string} content - File content
 * @param {string} filename - Filename
 * @param {string} [mimeType="text/csv"] - MIME type
 */
export function downloadAsFile(content, filename, mimeType = "text/csv") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
