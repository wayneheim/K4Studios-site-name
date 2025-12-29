// src/data/copyright/copyright-types.ts
// TypeScript types for the Copyright Registration System

/**
 * Individual copyright registration record stored in the master registry
 * Keyed by image_id (e.g., "i-xxxx")
 */
export interface CopyrightRegistration {
  /** Whether the image has been registered with the Copyright Office */
  registered: boolean;
  /** Date the registration was submitted (ISO format: YYYY-MM-DD) */
  submission_date: string;
  /** Copyright Office registration number (e.g., "VA 2-345-678") */
  registration_number: string;
  /** Internal batch identifier (e.g., "2025-Q2-A") */
  batch_id: string;
  /** Optional: Title at time of submission (for audit purposes) */
  title_at_submission?: string;
  /** Optional: Notes about this registration */
  notes?: string;
}

/**
 * Master Copyright Registry structure
 */
export interface CopyrightRegistry {
  _meta: {
    version: string;
    description: string;
    lastUpdated: string | null;
    note: string;
  };
  /** Map of image_id to registration info */
  registrations: Record<string, CopyrightRegistration>;
}

/**
 * Quarterly batch status
 */
export type QuarterlyBatchStatus = 'draft' | 'approved' | 'submitted' | 'processed';

/**
 * Image reference in a quarterly batch (no duplication of image data)
 */
export interface QuarterlyImageRef {
  /** Image ID (e.g., "i-xxxx") */
  image_id: string;
  /** Source gallery path for context */
  source_gallery: string;
  /** Optional: Title at time of collection (for reference only) */
  title_snapshot?: string;
  /** Optional: Thumbnail URL for preview */
  thumbnail_url?: string;
  /** Submission group assignment (A, B, C, etc.) for batches > 750 */
  submission_group?: string;
}

/**
 * Quarterly Registration Database structure
 * File example: copyright-quarterly-2025-Q2.json
 */
export interface QuarterlyBatch {
  /** Quarter identifier (e.g., "2025-Q2") */
  quarter: string;
  /** Current status of this batch */
  status: QuarterlyBatchStatus;
  /** When this batch was created */
  created_at: string;
  /** When this batch was last modified */
  updated_at: string;
  /** When approved (if applicable) */
  approved_at?: string;
  /** When submitted to Copyright Office (if applicable) */
  submitted_at?: string;
  /** When processing completed (if applicable) */
  processed_at?: string;
  /** Image references (deduplicated by image_id) */
  images: QuarterlyImageRef[];
  /** Submission groups with their registration numbers */
  submissions?: {
    [groupId: string]: {
      image_count: number;
      registration_number?: string;
      submitted_at?: string;
    };
  };
}

/**
 * Submission Ledger entry (for CSV export / audit trail)
 */
export interface SubmissionLedgerEntry {
  /** Image ID */
  image_id: string;
  /** Batch ID (e.g., "2025-Q2-A") */
  batch_id: string;
  /** Copyright Office registration number */
  registration_number: string;
  /** Date submitted */
  submission_date: string;
  /** Source gallery path */
  source_gallery: string;
  /** Title at time of submission */
  title_at_submission: string;
}

/**
 * Copyright status summary for UI display
 */
export interface CopyrightStatus {
  image_id: string;
  is_registered: boolean;
  registration?: CopyrightRegistration;
  /** Whether the image is in a pending quarterly batch */
  in_pending_batch?: boolean;
  pending_quarter?: string;
}

/**
 * Gallery scan result for copyright management
 */
export interface GalleryScanResult {
  gallery_path: string;
  total_images: number;
  registered_count: number;
  unregistered_count: number;
  pending_count: number;
  images: {
    id: string;
    title: string;
    thumbnail: string;
    first_seen?: string;
    status: CopyrightStatus;
  }[];
}

/**
 * Quarterly summary for review screen
 */
export interface QuarterlySummary {
  quarter: string;
  total_images: number;
  submission_count: number;
  submissions: {
    group: string;
    count: number;
    images: string[];
  }[];
  status: QuarterlyBatchStatus;
}

/**
 * Helper to calculate current quarter
 */
export function getCurrentQuarter(): string {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `${year}-Q${quarter}`;
}

/**
 * Helper to calculate quarter from a date
 */
export function getQuarterFromDate(dateStr: string): string {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const quarter = Math.ceil((date.getMonth() + 1) / 3);
  return `${year}-Q${quarter}`;
}

/**
 * Helper to check if a date falls within a specific quarter
 */
export function isDateInQuarter(dateStr: string, quarter: string): boolean {
  return getQuarterFromDate(dateStr) === quarter;
}
