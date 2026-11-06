/**
 * Image Gallery and Entitlement Types
 */

export type GalleryCategory = 'All' | 'Nature' | 'Architecture' | 'Space' | 'Minimalist' | 'Abstract';

export interface GalleryImage {
  id: string;
  title: string;
  description: string;
  category: 'Nature' | 'Architecture' | 'Space' | 'Minimalist' | 'Abstract';
  author: string;
  thumbnailUrl: string;
  highResUrl: string;
  isPremium: boolean;
  resolution: string;
  dimensions: { width: number; height: number };
  fileSize: string;
  format: 'JPEG' | 'PNG';
  likes: number;
}

export type GalleryFilter = 'All' | 'Free' | 'Premium' | 'Downloaded';

export interface EntitlementCheckResult {
  allowed: boolean;
  isPremiumRequired: boolean;
  reason?: string;
}

export interface ImageDownloadProgress {
  imageId: string;
  progress: number; // 0 to 1
  status: 'idle' | 'downloading' | 'completed' | 'failed';
  errorMessage?: string;
}
