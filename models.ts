import mongoose from "mongoose";
githubPagesUrl: { type: String, 'default': "" },
isPublishedToGithub: { type: Boolean, 'default': false },
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  createdAt: { type: Date, default: Date.now }
});

const ProjectSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, default: "" },
  description: { type: String, default: "" }
});

const VisitSchema = new mongoose.Schema({
  timestamp: { type: String, required: true },
  ip: { type: String, default: "" },
  country: { type: String, default: "" },
  city: { type: String, default: "" },
  org: { type: String, default: "" },
  isRecruiter: { type: Boolean, default: false }
});

const CVSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  username: { type: String, required: true, unique: true, lowercase: true, trim: true },
  fullName: { type: String, default: "" },
  title: { type: String, default: "" },
  linkedinUrl: { type: String, default: "" },
  twitterUrl: { type: String, default: "" },
  githubUrl: { type: String, default: "" },
  websiteUrl: { type: String, default: "" },
  skills: { type: String, default: "" },
  aboutSectionId: { type: String, default: "about" },
  workSectionId: { type: String, default: "myWork" },
  aboutMe: { type: String, default: "" },
  experience: { type: String, default: "" }, // Explicitly requested field
  projects: [ProjectSchema],
  profilePhoto: { type: String, default: "" },
  backgroundStyle: { type: String, default: "olive" },
  customBgUrl: { type: String, default: "" },
  audioBioUrl: { type: String, default: "" },
  audioBioType: { type: String, default: "none" },
  specialization: { type: String, default: "general" },
  githubUsername: { type: String, default: "" },
  behanceUrl: { type: String, default: "" },
  seoTitle: { type: String, default: "" },
  seoDescription: { type: String, default: "" },
  seoKeywords: { type: String, default: "" },
  language: { type: String, default: "en" },
  analytics: [VisitSchema]
});

export const User = mongoose.model("User", UserSchema);
export const CV = mongoose.model("CV", CVSchema);
