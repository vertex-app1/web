/**
 * Types representing the data structure of a SmartCV.
 */

export interface Project {
  id: string;
  name: string;
  description: string;
}

export interface CVData {
  fullName: string;
  title: string;
  linkedinUrl: string;
  twitterUrl?: string;
  githubUrl?: string;
  websiteUrl?: string;
  skills: string; // Comma-separated list or individual entries
  aboutSectionId: string;
  workSectionId: string;
  aboutMe: string;
  projects: Project[];
  profilePhoto: string; // Base64 or placeholder URL
  backgroundStyle: string; // "olive", "sunset", "obsidian", "forest", "custom"
  customBgUrl: string; // Custom video/image background URL
  audioBioUrl: string; // Base64 or uploaded URL for custom voice
  audioBioType: "none" | "tts" | "custom";
  specialization?: "developer" | "designer" | "general";
  githubUsername?: string;
  behanceUrl?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  language?: "en" | "ar";
}
