import React, { useState, useRef, useEffect } from "react";
import { 
  Sparkles, 
  Linkedin, 
  Twitter,
  Github,
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  Save, 
  Video, 
  Image, 
  Mic, 
  Upload, 
  User, 
  Folder, 
  Palette, 
  Globe, 
  CheckCircle, 
  FileText, 
  X,
  RefreshCw,
  Sliders,
  AlertCircle,
  Activity,
  Search,
  Award,
  Bell,
  Code2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { CVData, Project } from "./types";
import { CanvasBackground } from "./components/CanvasBackground";

export default function App() {
  // Main CV State
  const [cvData, setCvData] = useState<CVData>({
    fullName: "",
    title: "",
    linkedinUrl: "",
    twitterUrl: "",
    githubUrl: "",
    websiteUrl: "",
    skills: "",
    aboutSectionId: "about",
    workSectionId: "myWork",
    aboutMe: "",
    projects: [],
    profilePhoto: "",
    backgroundStyle: "olive",
    customBgUrl: "",
    audioBioUrl: "",
    audioBioType: "none",
    specialization: "general",
    githubUsername: "",
    behanceUrl: "",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: ""
  });

  // Editor Panel tab selection
  const [activeTab, setActiveTab] = useState<"identity" | "specialization" | "about" | "projects" | "seo" | "theme" | "deploy">("identity");

  // AI LinkedIn Raw Paste parser state
  const [linkedinRawText, setLinkedinRawText] = useState("");
  const [isParsingLinkedin, setIsParsingLinkedin] = useState(false);
  const [linkedinUrlInput, setLinkedinUrlInput] = useState("");
  const [isImportingUrl, setIsImportingUrl] = useState(false);

  // Live Recruiter Visit Analytics & Notifications
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
  const [activeNotification, setActiveNotification] = useState<any | null>(null);

  // Input states for AI generation
  const [aiBulletsAbout, setAiBulletsAbout] = useState("");
  const [aiBulletsProject, setAiBulletsProject] = useState<{ [projectId: string]: string }>({});
  const [isEnhancingAbout, setIsEnhancingAbout] = useState(false);
  const [enhancingProjectId, setEnhancingProjectId] = useState<string | null>(null);

  // Deployment states
  const [username, setUsername] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [deployError, setDeployError] = useState("");

  // Media Capture & Audio Playback states
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Drag-and-drop state for photos
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);

  // HTML Audio & Mic refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const ttsIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [dashboardLang, setDashboardLang] = useState<"en" | "ar">("en");

  // Generate a random username on mount
  useEffect(() => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setUsername(`my-cv-${randomNum}`);
  }, []);

  // Poll analytics periodically if CV is published
  const fetchAnalytics = async (uname: string) => {
    if (!uname) return;
    try {
      const res = await fetch(`/api/cv-analytics/${uname.trim().toLowerCase()}`);
      if (res.ok) {
        const data = await res.json();
        const visits = data.analytics || [];
        setAnalytics(visits);
        
        // Trigger recruiter popup notification
        if (visits.length > 0) {
          const latestVisit = visits[0];
          const latestId = latestVisit.timestamp + latestVisit.ip;
          if (latestId !== lastNotificationId) {
            setLastNotificationId(latestId);
            if (latestVisit.isRecruiter) {
              setActiveNotification(latestVisit);
              // Auto dismiss after 8 seconds
              setTimeout(() => {
                setActiveNotification(null);
              }, 8000);
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to fetch analytics:", e);
    }
  };

  useEffect(() => {
    if (generatedUrl && username) {
      fetchAnalytics(username);
      const interval = setInterval(() => {
        fetchAnalytics(username);
      }, 12000);
      return () => clearInterval(interval);
    }
  }, [generatedUrl, username, lastNotificationId]);

  // Handle AI LinkedIn/Resume parsing via AI
  const handleAIParse = async () => {
    if (!linkedinRawText.trim()) {
      alert("Please paste some text first! / يرجى لصق نص السيرة الذاتية أولاً!");
      return;
    }
    setIsParsingLinkedin(true);
    try {
      const res = await fetch("/api/parse-linkedin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: linkedinRawText })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setCvData(prev => ({
          ...prev,
          fullName: data.fullName || prev.fullName,
          title: data.title || prev.title,
          aboutMe: data.aboutMe || prev.aboutMe,
          skills: data.skills || prev.skills,
          projects: data.projects || prev.projects,
          linkedinUrl: data.linkedinUrl || prev.linkedinUrl,
          twitterUrl: data.twitterUrl || prev.twitterUrl,
          githubUrl: data.githubUrl || prev.githubUrl
        }));
        setLinkedinRawText("");
        alert("✨ Successfully imported and updated your SmartCV content! / تم سحب البيانات وتحديث سيرتك الذاتية بنجاح!");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to parse resume text. Please ensure your AI API is configured.");
    } finally {
      setIsParsingLinkedin(false);
    }
  };

  // Handle AI LinkedIn URL Scraping/Grounding via AI
  const handleLinkedinUrlImport = async () => {
    if (!linkedinUrlInput.trim()) {
      alert("Please enter a valid LinkedIn URL first! / يرجى إدخال رابط LinkedIn أولاً!");
      return;
    }
    setIsImportingUrl(true);
    try {
      const res = await fetch("/api/import-linkedin-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: linkedinUrlInput })
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        setCvData(prev => ({
          ...prev,
          fullName: data.fullName || prev.fullName,
          title: data.title || prev.title,
          aboutMe: data.aboutMe || prev.aboutMe,
          skills: data.skills || prev.skills,
          projects: data.projects || prev.projects,
          linkedinUrl: data.linkedinUrl || prev.linkedinUrl,
          twitterUrl: data.twitterUrl || prev.twitterUrl,
          githubUrl: data.githubUrl || prev.githubUrl
        }));
        setLinkedinUrlInput("");
        alert("✨ Successfully scanned public web details and generated your SmartCV! / تم سحب البيانات العامة وتوليد سيرتك الذاتية بنجاح!");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to import LinkedIn URL. Please verify your internet connection or try the manual text parser below.");
    } finally {
      setIsImportingUrl(false);
    }
  };

  // Sync state for recording seconds
  useEffect(() => {
    if (isRecording) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      setRecordingSeconds(0);
    }
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, [isRecording]);

  // Handle local Audio Bio playback
  const handlePlayPause = () => {
    if (cvData.audioBioType === "tts") {
      if (!isPlaying) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cvData.aboutMe || "Hello, welcome to my interactive portfolio CV.");
        
        // Pick high-quality English voice if possible
        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(v => v.lang.startsWith("en") && v.name.includes("Natural")) || voices.find(v => v.lang.startsWith("en"));
        if (englishVoice) utterance.voice = englishVoice;

        utterance.onend = () => {
          setIsPlaying(false);
          setAudioProgress(0);
          if (ttsIntervalRef.current) clearInterval(ttsIntervalRef.current);
        };

        utterance.onerror = () => {
          setIsPlaying(false);
          setAudioProgress(0);
          if (ttsIntervalRef.current) clearInterval(ttsIntervalRef.current);
        };

        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);

        // Simulate progress based on character count reading estimate
        let currentProg = 0;
        const totalWords = (cvData.aboutMe || "").split(" ").length;
        const estimatedMs = Math.max(totalWords * 420, 3000);
        const steps = estimatedMs / 100;
        const stepSize = 100 / steps;

        ttsIntervalRef.current = setInterval(() => {
          currentProg += stepSize;
          if (currentProg >= 100) {
            setAudioProgress(100);
            clearInterval(ttsIntervalRef.current!);
          } else {
            setAudioProgress(currentProg);
          }
        }, 100);

      } else {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        setAudioProgress(0);
        if (ttsIntervalRef.current) clearInterval(ttsIntervalRef.current);
      }
    } else if (cvData.audioBioType === "custom" && cvData.audioBioUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(cvData.audioBioUrl);
        audioRef.current.addEventListener("timeupdate", () => {
          if (audioRef.current && audioRef.current.duration) {
            setAudioProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
          }
        });
        audioRef.current.addEventListener("ended", () => {
          setIsPlaying(false);
          setAudioProgress(0);
        });
      }

      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(e => console.error("Audio playback blocked:", e));
        setIsPlaying(true);
      }
    }
  };

  // Re-initialize audio node when URL changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
      setAudioProgress(0);
    }
  }, [cvData.audioBioUrl, cvData.audioBioType]);

  // Clean up Speech on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (ttsIntervalRef.current) clearInterval(ttsIntervalRef.current);
    };
  }, []);

  // Handle Profile Photo Upload via File input
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processPhotoFile(file);
  };

  const processPhotoFile = (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      alert("Please upload an image smaller than 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCvData(prev => ({ ...prev, profilePhoto: event.target!.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingPhoto(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      processPhotoFile(file);
    }
  };

  // Audio Voice bio file upload
  const handleVoiceBioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert("Please upload an audio file smaller than 15MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCvData(prev => ({ 
          ...prev, 
          audioBioUrl: event.target!.result as string,
          audioBioType: "custom"
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Voice recording using local Microphone
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setCvData(prev => ({ 
              ...prev, 
              audioBioUrl: event.target!.result as string,
              audioBioType: "custom"
            }));
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
      alert("Microphone access is disabled or unsupported in this preview view. Please use file upload instead.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Dynamic project additions
  const addProject = () => {
    const newProj: Project = {
      id: Date.now().toString(),
      name: "New Portfolio Project",
      description: ""
    };
    setCvData(prev => ({ ...prev, projects: [...prev.projects, newProj] }));
  };

  const deleteProject = (id: string) => {
    setCvData(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }));
  };

  const updateProject = (id: string, field: "name" | "description", val: string) => {
    setCvData(prev => ({
      ...prev,
      projects: prev.projects.map(p => p.id === id ? { ...p, [field]: val } : p)
    }));
  };

  // AI Generation triggers
  const enhanceAboutMe = async () => {
    setIsEnhancingAbout(true);
    try {
      const res = await fetch("/api/enhance-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentText: cvData.aboutMe,
          type: "about",
          bullets: aiBulletsAbout
        })
      });
      const data = await res.json();
      if (data.text) {
        setCvData(prev => ({ ...prev, aboutMe: data.text }));
        setAiBulletsAbout(""); // Clear bullets
      } else if (data.error) {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to enhance text. Make sure GEMINI_API_KEY is configured.");
    } finally {
      setIsEnhancingAbout(false);
    }
  };

  const enhanceProjectDesc = async (id: string, currentDesc: string, currentName: string) => {
    setEnhancingProjectId(id);
    const bullets = aiBulletsProject[id] || "";
    try {
      const res = await fetch("/api/enhance-cv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentText: `${currentName}: ${currentDesc}`,
          type: "project",
          bullets
        })
      });
      const data = await res.json();
      if (data.text) {
        updateProject(id, "description", data.text);
        setAiBulletsProject(prev => ({ ...prev, [id]: "" })); // Clear bullets
      } else if (data.error) {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to enhance project description.");
    } finally {
      setEnhancingProjectId(null);
    }
  };

  // Generate dynamic hosted link on server
const handleDeployCV = async () => {
  if (!username.trim()) {
    setDeployError("Please provide a username first!");
    return;
  }
  setDeployError("");
  setIsGenerating(true);
  setGeneratedUrl("");

  try {
    const res = await fetch("/api/cv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: username.trim(),
        cvData
      })
    });
    const data = await res.json();
    if (data.url) {
      // تخزين الرابط الكامل في حالة منفصلة للاستخدام الداخلي
      setGeneratedUrl(data.url); // الاحتفاظ بالرابط الكامل للاستخدام الفعلي
      window.location.assign(`/cv/${username.trim().toLowerCase()}`);
    } else if (data.error) {
      setDeployError(data.error);
    }
  } catch (e) {
    console.error(e);
    setDeployError("Deployment failed. Could not communicate with server.");
  } finally {
    setIsGenerating(false);
  }
};

// دالة النشر على GitHub Pages
const publishCV = async () => {
  if (!username.trim()) {
    alert("❌ الرجاء إدخال اسم المستخدم أولاً!");
    return;
  }
  
  try {
    const response = await fetch(`/api/publish-cv/${username.trim()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cvData: cvData
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'فشل نشر السيرة الذاتية');
    }

    const data = await response.json();
    if (data.success && data.githubPagesUrl) {
      // عرض الرابط المختصر في التنبيه مع إمكانية نسخ الرابط الكامل
      const fullUrl = data.githubPagesUrl;
      const shortDisplayUrl = fullUrl.length > 60 ? fullUrl.substring(0, 60) + '...' : fullUrl;
      alert(`✅ تم النشر بنجاح!\n\nالرابط: ${shortDisplayUrl}\n\n📋 اضغط على الرابط لنسخه:\n${fullUrl}`);
      
      // فتح الرابط في نافذة جديدة تلقائياً
      if (confirm('هل تريد فتح الرابط الآن؟')) {
        window.open(fullUrl, '_blank');
      }
    } else {
      alert('❌ فشل النشر: ' + (data.message || 'خطأ غير معروف'));
    }
  } catch (error) {
    console.error('خطأ في النشر:', error);
    alert(`❌ حدث خطأ أثناء النشر: ${error instanceof Error ? error.message : 'الرجاء المحاولة مرة أخرى'}`);
  }
};

  // Determine current background style inline CSS
  const getPreviewBackgroundStyle = () => {
    const style = cvData.backgroundStyle;
    if (style === "olive") {
      return {
        background: "linear-gradient(135deg, #131710 0%, #1e2617 50%, #11140e 100%)"
      };
    } else if (style === "sunset") {
      return {
        background: "linear-gradient(135deg, #1c140f 0%, #2b1f15 50%, #150f0b 100%)"
      };
    } else if (style === "obsidian") {
      return {
        background: "linear-gradient(135deg, #0d0e10 0%, #181a1f 50%, #0a0b0d 100%)"
      };
    } else if (style === "forest") {
      return {
        background: "linear-gradient(135deg, #09130d 0%, #0f2416 50%, #060a07 100%)"
      };
    } else if (style === "custom") {
      return { background: "#11140e" };
    }
    return { background: "#1a1f15" };
  };

  const getStyleThemeColor = () => {
    switch(cvData.backgroundStyle) {
      case "sunset": 
        return { 
          text: "text-amber-500", 
          bg: "bg-amber-500", 
          border: "border-amber-500/30", 
          borderHeader: "border-amber-500/40",
          outline: "focus:border-amber-500",
          accentHex: "#f59e0b",
          darkAccentHex: "#b45309",
          bgGradient: "from-amber-500 via-amber-700 to-amber-500",
          bgPulse: "bg-[#b45309]/15",
          buttonBg: "from-amber-600 to-amber-400",
          glowShadow: "shadow-amber-500/20"
        };
      case "obsidian": 
        return { 
          text: "text-blue-400", 
          bg: "bg-blue-400", 
          border: "border-blue-400/30", 
          borderHeader: "border-blue-400/40",
          outline: "focus:border-blue-400",
          accentHex: "#60a5fa",
          darkAccentHex: "#1d4ed8",
          bgGradient: "from-blue-400 via-blue-700 to-blue-400",
          bgPulse: "bg-[#1d4ed8]/15",
          buttonBg: "from-blue-600 to-blue-400",
          glowShadow: "shadow-blue-500/20"
        };
      case "forest": 
        return { 
          text: "text-emerald-400", 
          bg: "bg-emerald-400", 
          border: "border-emerald-400/30", 
          borderHeader: "border-emerald-400/40",
          outline: "focus:border-emerald-400",
          accentHex: "#34d399",
          darkAccentHex: "#059669",
          bgGradient: "from-emerald-400 via-emerald-700 to-emerald-400",
          bgPulse: "bg-[#059669]/15",
          buttonBg: "from-emerald-600 to-emerald-400",
          glowShadow: "shadow-emerald-500/20"
        };
      default: 
        return { 
          text: "text-[#a4b465]", 
          bg: "bg-[#a4b465]", 
          border: "border-[#a4b465]/30", 
          borderHeader: "border-[#a4b465]/40",
          outline: "focus:border-[#a4b465]",
          accentHex: "#a4b465",
          darkAccentHex: "#535d0a",
          bgGradient: "from-[#a4b465] via-[#535d0a] to-[#a4b465]",
          bgPulse: "bg-[#535d0a]/20",
          buttonBg: "from-[#6b7c2e] to-[#a4b465]",
          glowShadow: "shadow-[#a4b465]/20"
        };
    }
  };

  const themeColors = getStyleThemeColor();

  const dt = {
    title: dashboardLang === "ar" ? "صانع السيرة الذاتية" : "SmartCV Builder",
    subtitle: dashboardLang === "ar" ? "أنشئ سيرتك الذاتية بسهولة وانشرها أونلاين" : "Build your resume easily and publish it online",
    tabIdentity: dashboardLang === "ar" ? "الهوية والصورة" : "Identity",
    tabSpecialization: dashboardLang === "ar" ? "التركيز والروابط" : "Focus & Links",
    tabAbout: dashboardLang === "ar" ? "النبذة والمهارات" : "About & Skills",
    tabProjects: dashboardLang === "ar" ? "الخبرات والمشاريع" : "Experience",
    tabSeo: dashboardLang === "ar" ? "البحث في جوجل" : "Search Settings",
    tabTheme: dashboardLang === "ar" ? "القوالب والخلفيات" : "Themes",
    tabDeploy: dashboardLang === "ar" ? "نشر السيرة" : "Publish",
    fullName: dashboardLang === "ar" ? "الاسم الكامل" : "Full Name",
    jobTitle: dashboardLang === "ar" ? "المسمى الوظيفي" : "Job Title",
    skills: dashboardLang === "ar" ? "المهارات (مفصولة بفواصل)" : "Skills (comma-separated)",
    aboutText: dashboardLang === "ar" ? "نبذة عنك" : "About You",
    saveAndPublish: dashboardLang === "ar" ? "حفظ ونشر السيرة الذاتية" : "Save & Publish SmartCV",
    pastedResume: dashboardLang === "ar" ? "استيراد من LinkedIn أو نص خام بالذكاء الاصطناعي" : "AI Import from LinkedIn or Raw Text",
    pasteHelper: dashboardLang === "ar" ? "الصق نص ملفك الشخصي هنا وسنقوم بصياغة سيرتك الذاتية تلقائياً!" : "Paste your profile text here and we will organize it into your CV!",
    parseBtn: dashboardLang === "ar" ? "استخراج البيانات بذكاء" : "AI Parse Resume",
    successMsg: dashboardLang === "ar" ? "تم الحفظ والنشر بنجاح!" : "Saved and published successfully!",
    audioBio: dashboardLang === "ar" ? "السيرة الذاتية الصوتية" : "Voice Bio",
    audioBioTts: dashboardLang === "ar" ? "تحويل النص إلى صوت ذكي" : "AI Speech Synthesis (TTS)",
    audioBioCustom: dashboardLang === "ar" ? "تسجيل أو رفع صوت مخصص" : "Upload or Record Audio",
    audioBioNone: dashboardLang === "ar" ? "بدون صوت" : "No Audio",
    recordBtn: dashboardLang === "ar" ? "تسجيل صوتي" : "Record Audio",
    uploadBtn: dashboardLang === "ar" ? "رفع ملف" : "Upload File",
    themeOlive: dashboardLang === "ar" ? "الزيتوني الهادئ" : "Olive Harmony",
    themeSunset: dashboardLang === "ar" ? "غروب الشمس الدافئ" : "Warm Sunset",
    themeObsidian: dashboardLang === "ar" ? "الأوبسيديان الغامق" : "Obsidian Dark",
    themeForest: dashboardLang === "ar" ? "الغابة العميقة" : "Deep Forest",
    themeCustom: dashboardLang === "ar" ? "خلفية مخصصة (رابط)" : "Custom Background (URL)",
    specializationDev: dashboardLang === "ar" ? "مطور برمجيات (روابط GitHub تلقائية)" : "Software Developer (Auto-GitHub Repos)",
    specializationDes: dashboardLang === "ar" ? "مصمم رقمي (معرض أعمال إبداعي)" : "Digital Designer (Creative Bento Grid)",
    specializationGen: dashboardLang === "ar" ? "عام / إداري" : "General / Non-Technical",
    cvLanguageLabel: dashboardLang === "ar" ? "لغة عرض السيرة الذاتية المنشورة" : "Published CV View Language",
    
    // Extended Translated Keys
    personalIdentity: dashboardLang === "ar" ? "الهوية الشخصية" : "Personal Identity",
    profilePhoto: dashboardLang === "ar" ? "الصورة الشخصية" : "Profile Photo",
    dragClickPhoto: dashboardLang === "ar" ? "اسحب الصورة هنا أو اضغط للاختيار" : "Drag or click to choose photo",
    removePhoto: dashboardLang === "ar" ? "إزالة الصورة" : "Remove Photo",
    photoLoaded: dashboardLang === "ar" ? "تم تحميل الصورة بنجاح" : "Photo Loaded",
    linkedinProfileUrl: dashboardLang === "ar" ? "رابط حساب لينكد إن (LinkedIn)" : "LinkedIn Profile URL",
    twitterProfileUrl: dashboardLang === "ar" ? "رابط حساب تويتر (X)" : "Twitter / X Profile URL",
    githubProfileUrl: dashboardLang === "ar" ? "رابط حساب جيت هاب (GitHub)" : "GitHub Profile URL",
    personalWebsiteUrl: dashboardLang === "ar" ? "رابط الموقع الشخصي" : "Personal Website URL",
    professionalFocus: dashboardLang === "ar" ? "التركيز والمسار المهني" : "Professional Focus",
    chooseSpecialization: dashboardLang === "ar" ? "اختر التخصص" : "Choose Specialization",
    specDeveloper: dashboardLang === "ar" ? "مبرمج" : "Programmer",
    specDeveloperDesc: dashboardLang === "ar" ? "عرض مستودعات GitHub" : "Showcases GitHub repos",
    specDesigner: dashboardLang === "ar" ? "مصمم" : "Designer",
    specDesignerDesc: dashboardLang === "ar" ? "معرض أعمال Behance" : "Showcases Behance Portfolio",
    specGeneral: dashboardLang === "ar" ? "عام" : "General",
    specGeneralDesc: dashboardLang === "ar" ? "سيرة ذاتية نصية" : "Standard text resume",
    githubUsernameLabel: dashboardLang === "ar" ? "اسم المستخدم في جيت هاب" : "GitHub Username",
    githubUsernameDesc: dashboardLang === "ar" ? "أدخل اسم المستخدم في GitHub لعرض مشاريعك على صفحة سيرتك الذاتية." : "Enter your GitHub username to show your projects on your live CV page.",
    behanceUrlLabel: dashboardLang === "ar" ? "رابط معرض أعمال Behance" : "Behance Portfolio URL",
    behanceUrlDesc: dashboardLang === "ar" ? "أدخل رابط حسابك في Behance لعرض أعمالك وتصميماتك." : "Enter your Behance profile link to showcase your design work.",
    seoTitleLabel: dashboardLang === "ar" ? "إعدادات البحث في جوجل" : "Google Search Settings",
    seoDesc: dashboardLang === "ar" ? "خصص العنوان والوصف الذي يظهر عند البحث عنك في Google." : "Customize the title and description that appear when people search for you on Google.",
    googleSearchTitle: dashboardLang === "ar" ? "عنوان البحث في جوجل" : "Google Search Title",
    pageDescriptionMeta: dashboardLang === "ar" ? "وصف الصفحة" : "Page Description",
    pageDescriptionPlaceholder: dashboardLang === "ar" ? "مثال: أنا مصمم جرافيك أعمل على الهوية البصرية والعلامات التجارية..." : "e.g. I am a graphic designer specializing in branding and visual identity...",
    keywordsLabel: dashboardLang === "ar" ? "الكلمات المفتاحية (مفصولة بفواصل)" : "Keywords (comma-separated)",
    yourStoryBio: dashboardLang === "ar" ? "نبذتك المهنية" : "Your Story",
    aboutMeStatement: dashboardLang === "ar" ? "نبذة عني" : "About Me",
    aboutMePlaceholder: dashboardLang === "ar" ? "اكتب عن خلفيتك وخبراتك وما الذي يميزك..." : "Tell employers about your background, experience, and what makes you stand out...",
    coreSkills: dashboardLang === "ar" ? "المهارات" : "Skills",
    skillsDesc: dashboardLang === "ar" ? "أدخل مهاراتك مفصولة بفواصل (،) لعرضها على سيرتك الذاتية." : "Enter your skills separated by commas to display them on your CV.",
    featuredProjects: dashboardLang === "ar" ? "الخبرات والمشاريع" : "Experience & Projects",
    addProjectBtn: dashboardLang === "ar" ? "إضافة خبرة أو مشروع" : "Add Experience or Project",
    projectNamePlaceholder: dashboardLang === "ar" ? "مثال: متجر إلكتروني، تدريب صيفي، مشروع تخرج" : "e.g. Online store, summer internship, graduation project",
    projectDescPlaceholder: dashboardLang === "ar" ? "ماذا فعلت؟ ما النتيجة أو الإنجاز؟" : "What did you do? What was the result or achievement?",
    projectPolisherTitle: dashboardLang === "ar" ? "تحسين الوصف بالذكاء الاصطناعي" : "AI Description Helper",
    projectPolisherInputPlaceholder: dashboardLang === "ar" ? "أضف تفاصيل: زيادة المبيعات 20%، إدارة فريق من 5..." : "Add details: increased sales 20%, managed a team of 5...",
    aiEnhanceProjectBtn: dashboardLang === "ar" ? "تحسين وصف المشروع بذكاء" : "AI Enhance Project Summary",
    polishingProjectBtn: dashboardLang === "ar" ? "جاري تحسين المشروع..." : "Polishing Project...",
    noProjectsYet: dashboardLang === "ar" ? "لم تقم بإضافة مشاريع بعد." : "No projects added yet.",
    noProjectsDesc: dashboardLang === "ar" ? "اضغط على زر 'إضافة مشروع جديد' لتسليط الضوء على أعمالك وإنجازاتك." : "Click '+ Add Project' to feature your accomplishments.",
    themeAndBackground: dashboardLang === "ar" ? "القوالب والخلفيات" : "Theme & Background",
    backdropStyleLabel: dashboardLang === "ar" ? "نمط وأسلوب الخلفية" : "Backdrop Style",
    themeOliveDesc: dashboardLang === "ar" ? "القالب العضوي الزيتوني الهادئ" : "Our primary organic theme",
    themeSunsetDesc: dashboardLang === "ar" ? "تدرج ذهبي برتقالي دافئ" : "Golden-amber hues",
    themeObsidianDesc: dashboardLang === "ar" ? "مظهر معدني سيبراني داكن" : "Sleek metallic blue-black",
    themeForestDesc: dashboardLang === "ar" ? "تدرج غابات زمردي طبيعي عميق" : "Emerald natural gradients",
    themeCustomDesc: dashboardLang === "ar" ? "فيديو أو صورة مخصصة بالرابط" : "Custom video/image asset",
    navigationSectionIds: dashboardLang === "ar" ? "روابط ومعرفات أقسام التنقل" : "Navigation Section IDs",
    aboutMeIdLabel: dashboardLang === "ar" ? "معرّف قسم (عني)" : "About Me ID",
    myWorkIdLabel: dashboardLang === "ar" ? "معرّف قسم (أعمالي)" : "My Work ID",
    voicePortfolioBio: dashboardLang === "ar" ? "سيرة ذاتية صوتية تفاعلية" : "Voice Portfolio Bio",
    bioAudioSource: dashboardLang === "ar" ? "مصدر الصوت للسيرة" : "Bio Audio Source",
    audioNoneLabel: dashboardLang === "ar" ? "بدون صوت" : "None",
    audioTtsLabel: dashboardLang === "ar" ? "صوت ذكي (TTS)" : "AI Voice",
    audioCustomLabel: dashboardLang === "ar" ? "صوتي المخصص" : "My Voice",
    audioTtsDesc: dashboardLang === "ar" ? "✅ تم تمكين النطق الطبيعي: سيتم قراءة وصف 'عني' تلقائياً بصوت عالي الدقة عند تشغيل الصوت في السيرة الذاتية المنشورة!" : "✅ Natural Speech Enabled: Your 'About Me' description will automatically be spoken aloud using standard high-definition browser voice synthesizers upon clicking play in the preview!",
    recordViaMicLabel: dashboardLang === "ar" ? "🎙️ تسجيل صوتي عبر الميكروفون" : "🎙️ Record via Mic",
    recordingActiveLabel: dashboardLang === "ar" ? "جاري التسجيل حالياً..." : "Recording...",
    stopRecordingBtn: dashboardLang === "ar" ? "إيقاف" : "Stop",
    recordFromMicBtn: dashboardLang === "ar" ? "بدء التسجيل من الميكروفون" : "Record from Microphone",
    orLabel: dashboardLang === "ar" ? "أو" : "Or",
    uploadAudioBioLabel: dashboardLang === "ar" ? "📁 رفع سيرة صوتية جاهزة" : "📁 Upload Audio Bio",
    chooseAudioFileBtn: dashboardLang === "ar" ? "اختر ملف بصيغة MP3 أو WAV أو WebM" : "Choose MP3/WAV/WebM File",
    voiceBioLoadedMsg: dashboardLang === "ar" ? "تم تحميل سيرتك الصوتية المخصصة بنجاح" : "Voice Bio Loaded Successfully",
    publishOnlineTitle: dashboardLang === "ar" ? "نشر سيرتك الذاتية" : "Publish Your CV",
    generatePortfolioLinkLabel: dashboardLang === "ar" ? "إنشاء رابط سيرتك الذاتية" : "Create Your CV Link",
    publishDesc: dashboardLang === "ar" ? "اختر اسم مستخدم لرابط سيرتك الذاتية. بعد النشر سيتم فتح صفحتك مباشرة." : "Choose a username for your CV link. After publishing, your live page will open automatically.",
    portfolioUsernameLabel: dashboardLang === "ar" ? "اسم مستخدم السيرة الذاتية" : "CV Username",
    publishAndDeployBtn: dashboardLang === "ar" ? "إنشاء ونشر السيرة الذاتية" : "Create CV",
    publishingToInstanceBtn: dashboardLang === "ar" ? "جاري الإنشاء والنشر..." : "Creating your CV...",
    publishedSuccessfullyMsg: dashboardLang === "ar" ? "تم نشر وحفظ سيرتك الذاتية بنجاح!" : "Published Successfully!",
    liveAtMsg: dashboardLang === "ar" ? "أصبحت سيرتك الذاتية المهنية متاحة مباشرة على الرابط التالي:" : "Your professional portfolio CV is now live at:",
    openLiveCvBtn: dashboardLang === "ar" ? "فتح رابط السيرة الذاتية المباشر" : "Open Live CV Page",
    recruiterAnalyticsTitle: dashboardLang === "ar" ? "تحليلات وإحصاءات الزوار ومسؤولي التوظيف" : "Recruiter & Traffic Analytics",
    liveTrackingBadge: dashboardLang === "ar" ? "تتبع مباشر" : "Live Tracking",
    analyticsDesc: dashboardLang === "ar" ? "يتم تحديث هذا القسم تلقائياً بمجرد قيام مسؤول توظيف أو زائر بفتح صفحة سيرتك الذاتية المستضافة. تتم الإشارة لزيارات مسؤولي التوظيف بتنبيه مخصص!" : "This section automatically updates when a recruiter or visitor opens your hosted CV page. Recruiter visits are highlighted with alerts!",
    waitingForVisitorMsg: dashboardLang === "ar" ? "في انتظار الزائر الأول... افتح رابط سيرتك الذاتية المباشر لتسجيل زيارة وتجربة التتبع المباشر!" : "Waiting for first visitor... Open your live CV page to register a hit!",
    visitorLabel: dashboardLang === "ar" ? "زائر عادي" : "Visitor",
    recruiterLabel: dashboardLang === "ar" ? "مسؤول توظيف / HR" : "Recruiter / HR"
  };

  const wizardSteps = [
    { id: "identity" as const, label: dt.tabIdentity, icon: User, step: 1 },
    { id: "specialization" as const, label: dt.tabSpecialization, icon: Sliders, step: 2 },
    { id: "about" as const, label: dt.tabAbout, icon: FileText, step: 3 },
    { id: "projects" as const, label: dt.tabProjects, icon: Folder, step: 4 },
    { id: "seo" as const, label: dt.tabSeo, icon: Search, step: 5 },
    { id: "theme" as const, label: dt.tabTheme, icon: Palette, step: 6 },
    { id: "deploy" as const, label: dt.tabDeploy, icon: Globe, step: 7 }
  ];

  return (
    <div className={`min-h-screen flex flex-col text-gray-100 selection:bg-[#a4b465]/30 selection:text-white ${dashboardLang === "ar" ? "font-sans text-right [direction:rtl]" : "font-sans text-left"}`} style={dashboardLang === "ar" ? { fontFamily: "'Cairo', sans-serif" } : {}}>
      
      {/* Real-time Recruiter Live Alert Notification Toast */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-5 right-5 z-50 max-w-sm w-full bg-amber-950/85 backdrop-blur-xl border border-amber-500/40 p-4 rounded-xl shadow-2xl flex flex-col gap-2.5 shadow-amber-500/15"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-400">
                <div className="p-1 rounded bg-amber-500/10">
                  <Bell className="w-4.5 h-4.5 animate-bounce" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">Recruiter Detected / تنبيه مسؤول توظيف</span>
              </div>
              <button 
                onClick={() => setActiveNotification(null)}
                className="text-amber-400/60 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-[11px] text-gray-200 leading-normal font-medium">
              A recruiter or hiring manager from <strong className="text-amber-300 bg-white/5 px-1 py-0.5 rounded">{activeNotification.city || "USA/Saudi"} ({activeNotification.org || "Recruiting Network"})</strong> is currently viewing your live resume portfolio page right now!
            </p>

            <div className="flex items-center justify-between text-[9px] text-amber-400/80 pt-1 border-t border-amber-500/10">
              <span>Visitor IP: {activeNotification.ip}</span>
              <span className="font-mono font-bold">Just Now</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Background Preview */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 transition-all duration-700"
        style={getPreviewBackgroundStyle()}
      >
        {/* Abstract Frosted Glass Background Blobs */}
        <div 
          className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none transition-all duration-1000" 
          style={{ backgroundColor: `${themeColors.accentHex}1c` }} 
        />
        <div 
          className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[100px] pointer-events-none transition-all duration-1000" 
          style={{ backgroundColor: `${themeColors.darkAccentHex}30` }} 
        />
        {/* Animated Radial Spots */}
        {cvData.backgroundStyle === "olive" && (
          <div className="mesh-layer absolute inset-0 opacity-40 mix-blend-screen" style={{
            background: "radial-gradient(circle at 20% 20%, rgba(164, 180, 101, 0.25) 0%, transparent 60%), radial-gradient(circle at 85% 85%, rgba(83, 93, 10, 0.35) 0%, transparent 70%)",
            filter: "blur(50px)"
          }} />
        )}
        {cvData.backgroundStyle === "sunset" && (
          <div className="mesh-layer absolute inset-0 opacity-40 mix-blend-screen" style={{
            background: "radial-gradient(circle at 15% 30%, rgba(212, 140, 80, 0.25) 0%, transparent 60%), radial-gradient(circle at 80% 70%, rgba(164, 101, 65, 0.35) 0%, transparent 70%)",
            filter: "blur(50px)"
          }} />
        )}
        {cvData.backgroundStyle === "obsidian" && (
          <div className="mesh-layer absolute inset-0 opacity-40 mix-blend-screen" style={{
            background: "radial-gradient(circle at 30% 25%, rgba(100, 120, 160, 0.2) 0%, transparent 60%), radial-gradient(circle at 75% 80%, rgba(30, 35, 45, 0.45) 0%, transparent 70%)",
            filter: "blur(50px)"
          }} />
        )}
        {cvData.backgroundStyle === "forest" && (
          <div className="mesh-layer absolute inset-0 opacity-40 mix-blend-screen" style={{
            background: "radial-gradient(circle at 25% 20%, rgba(65, 164, 101, 0.25) 0%, transparent 60%), radial-gradient(circle at 75% 75%, rgba(20, 80, 40, 0.35) 0%, transparent 70%)",
            filter: "blur(50px)"
          }} />
        )}
        
        {/* Custom Video / Image backgrounds */}
        {cvData.backgroundStyle === "custom" && cvData.customBgUrl && (
          <>
            {cvData.customBgUrl.startsWith("preset-") ? (
              <CanvasBackground preset={cvData.customBgUrl} />
            ) : /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(cvData.customBgUrl) ? (
              <video key={cvData.customBgUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" autoPlay muted loop playsInline src={cvData.customBgUrl}>
                {/* Fallback */}
              </video>
            ) : (
              <div className="absolute inset-0 w-full h-full bg-cover bg-center opacity-65" style={{ backgroundImage: `url(${cvData.customBgUrl})` }} />
            )}
            <div className="absolute inset-0 bg-black/50 pointer-events-none" />
          </>
        )}
      </div>

      {/* Sticky header + horizontal step wizard */}
      <div className="relative z-40 sticky top-0 shrink-0 bg-[#0a0c08]/90 backdrop-blur-xl border-b border-[#a4b465]/20">
        <div className="p-4 md:px-6 flex items-center justify-between gap-2 border-b border-[#a4b465]/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#a4b465]/10 border border-[#a4b465]/30 shrink-0">
              <Sparkles className="w-5 h-5 text-[#a4b465]" />
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-white leading-tight">{dt.title}</h1>
              <p className="text-[9px] text-[#c8d5a0] leading-tight font-medium opacity-80">{dt.subtitle}</p>
            </div>
          </div>
          <button 
            onClick={() => setDashboardLang(prev => prev === "en" ? "ar" : "en")}
            className="px-2 py-1 rounded-lg bg-[#a4b465]/15 border border-[#a4b465]/30 hover:bg-[#a4b465]/30 transition-all text-[9px] font-bold text-[#c8d5a0] shrink-0 cursor-pointer"
          >
            {dashboardLang === "en" ? "العربية" : "English"}
          </button>
          <button
  onClick={publishCV}
  className="px-2 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 hover:bg-blue-600/30 transition-all text-[9px] font-bold text-blue-400 shrink-0 cursor-pointer flex items-center gap-1"
  title={dashboardLang === "ar" ? "نشر على GitHub Pages" : "Publish to GitHub Pages"}
>
  <Upload className="w-3.5 h-3.5" />
  {dashboardLang === "ar" ? "نشر" : "Publish"}
</button>
        </div>

        <nav className="flex overflow-x-auto px-3 md:px-6 py-2.5 gap-1.5 scrollbar-none" aria-label="CV builder steps">
          {wizardSteps.map(tab => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={isSel ? "step" : undefined}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  isSel 
                    ? "bg-[#a4b465]/15 text-[#a4b465] border border-[#a4b465]/30 shadow-md shadow-[#a4b465]/5" 
                    : "text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                <span className={`text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${isSel ? "bg-[#a4b465]/25 text-[#a4b465]" : "bg-white/5 text-gray-500"}`}>
                  {tab.step}
                </span>
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row flex-1 min-h-0">
      {/* ======================================================== */}
      {/* EDITOR CONTROL PANEL (Left Side)                         */}
      {/* ======================================================== */}
      <aside className="relative w-full md:w-[350px] lg:w-[380px] md:overflow-y-auto bg-[#0a0c08]/85 backdrop-blur-xl border-b md:border-b-0 md:border-r border-[#a4b465]/20 flex flex-col shrink-0 md:max-h-[calc(100vh-7.5rem)]">

        {/* Dynamic Editor View Container */}
        <div className="flex-1 p-5 space-y-5 overflow-y-auto">

          {/* TAB 1: IDENTITY */}
          {activeTab === "identity" && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              
              {/* AI Quick Import Component */}
              <div className="bg-[#a4b465]/10 border border-[#a4b465]/30 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#a4b465]" />
                    <h3 className="text-xs font-bold text-white tracking-wide">
                      {dashboardLang === "ar" ? "استيراد السيرة بالذكاء الاصطناعي" : "AI Resume Importer"}
                    </h3>
                  </div>
                  <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-[#a4b465]/10 text-[#a4b465] border border-[#a4b465]/20">
                    Dual AI Mode
                  </span>
                </div>

                {/* MODE 1: LinkedIn URL Import */}
                <div className="space-y-2 bg-black/25 p-3 rounded-lg border border-white/5">
                  <div className="text-[11px] font-bold text-gray-200">
                    {dashboardLang === "ar" ? "الطريقة الأولى: رابط LinkedIn" : "Mode 1: LinkedIn URL"}
                  </div>
                  <p className="text-[10px] text-gray-400 leading-normal">
                    {dashboardLang === "ar" 
                      ? "أدخل رابط حسابك الشخصي، وسنستخدم بحث Google المطور بالذكاء الاصطناعي لجلب بياناتك العامة وتحديث سيرتك الذاتية!" 
                      : "Enter your LinkedIn profile link, and we will use AI Google Search grounding to retrieve public details and generate your CV!"}
                  </p>
                  <div className="flex gap-1.5">
                    <input 
                      type="url"
                      placeholder="https://linkedin.com/in/username"
                      value={linkedinUrlInput}
                      onChange={e => setLinkedinUrlInput(e.target.value)}
                      className="flex-1 bg-black/40 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg px-2.5 py-1.5 text-xs text-white transition-all"
                    />
                    <button
                      onClick={handleLinkedinUrlImport}
                      disabled={isImportingUrl}
                      className="px-4 rounded-lg bg-[#a4b465] text-[#12140e] font-bold text-[11px] hover:bg-[#b4c575] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer whitespace-nowrap flex items-center gap-1"
                    >
                      {isImportingUrl ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Globe className="w-3.5 h-3.5" />
                      )}
                      {dashboardLang === "ar" ? "سحب" : "Import"}
                    </button>
                  </div>
                </div>

                {/* MODE 2: Paste Raw Text (Fail-safe for private profiles) */}
                <div className="space-y-2 bg-black/25 p-3 rounded-lg border border-white/5">
                  <div className="text-[11px] font-bold text-gray-200">
                    {dashboardLang === "ar" ? "الطريقة الثانية: لصق السيرة أو الملف الشخصي" : "Mode 2: Copy-Paste Text (Fail-Safe)"}
                  </div>
                  <p className="text-[10px] text-gray-400 leading-normal">
                    {dashboardLang === "ar" 
                      ? "مضمونة 100%! انسخ نص حسابك في LinkedIn أو ملف PDF والصقه هنا وسيقوم الذكاء الاصطناعي بتنظيمه في ثانية واحدة!" 
                      : "100% Guaranteed! Copy your LinkedIn profile text or PDF content and paste it here, and our AI will parse it instantly!"}
                  </p>
                  <div className="space-y-1.5">
                    <textarea 
                      rows={2}
                      placeholder={dashboardLang === "ar" ? "الصق النص هنا..." : "Paste profile text here..."}
                      value={linkedinRawText}
                      onChange={e => setLinkedinRawText(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg p-2 text-xs text-white transition-all resize-none"
                    />
                  </div>
                  <button
                    onClick={handleAIParse}
                    disabled={isParsingLinkedin}
                    className="w-full py-1.5 rounded-lg bg-white/5 border border-white/10 text-white font-bold text-[10px] flex items-center justify-center gap-1.5 hover:bg-white/10 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isParsingLinkedin ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        {dashboardLang === "ar" ? "جاري التحليل والتوليد..." : "Analyzing & Generating..."}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        {dashboardLang === "ar" ? "استخراج البيانات بذكاء" : "Extract & Organize with AI"}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Published CV View Language selector */}
              <div className="space-y-1.5 bg-white/5 border border-white/10 p-4 rounded-xl">
                <label className="text-xs font-bold text-white block">
                  🌐 {dt.cvLanguageLabel}
                </label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input 
                      type="radio" 
                      name="cv_lang" 
                      value="en"
                      checked={cvData.language !== "ar"}
                      onChange={() => setCvData(prev => ({ ...prev, language: "en" }))}
                      className="accent-[#a4b465] cursor-pointer"
                    />
                    English (EN)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                    <input 
                      type="radio" 
                      name="cv_lang" 
                      value="ar"
                      checked={cvData.language === "ar"}
                      onChange={() => setCvData(prev => ({ ...prev, language: "ar" }))}
                      className="accent-[#a4b465] cursor-pointer"
                    />
                    العربية (AR)
                  </label>
                </div>
              </div>

              <h2 className="text-sm font-bold text-[#a4b465] tracking-wide uppercase border-b border-white/5 pb-2 mt-2">{dt.personalIdentity}</h2>
              
              {/* Profile Photo Uploader Dropzone */}
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">{dt.profilePhoto}</label>
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`relative h-28 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-all ${
                    isDraggingPhoto 
                      ? "border-[#a4b465] bg-[#a4b465]/10 scale-[0.98]" 
                      : cvData.profilePhoto 
                        ? "border-[#a4b465]/30 bg-black/40" 
                        : "border-gray-700 hover:border-[#a4b465]/50 bg-black/20"
                  }`}
                >
                  {cvData.profilePhoto ? (
                    <div className="absolute inset-0 p-1 flex items-center justify-between">
                      <img src={cvData.profilePhoto} className="h-full w-24 object-cover rounded-lg border border-white/10" referrerPolicy="no-referrer" />
                      <div className="flex-1 pl-4 pr-2 flex flex-col justify-center items-start">
                        <p className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> {dt.photoLoaded}
                        </p>
                        <button 
                          onClick={() => setCvData(prev => ({ ...prev, profilePhoto: "" }))}
                          className="mt-2 text-[10px] text-red-400 font-bold hover:underline cursor-pointer"
                        >
                          {dt.removePhoto}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label className="cursor-pointer flex flex-col items-center justify-center p-3 text-center">
                      <Upload className="w-6 h-6 text-gray-400 mb-1" />
                      <span className="text-xs font-semibold text-gray-300">{dt.dragClickPhoto}</span>
                      <span className="text-[9px] text-gray-500 mt-1">PNG, JPG or SVG</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoUpload} 
                        className="hidden" 
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest">{dt.fullName}</label>
                <input 
                  type="text"
                  placeholder="e.g. Sarah Johnson"
                  value={cvData.fullName}
                  onChange={e => setCvData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg px-3.5 py-2.5 text-sm text-white transition-all focus:ring-1 focus:ring-[#a4b465]/30"
                />
              </div>

              {/* Professional Title */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest">{dt.jobTitle}</label>
                <input 
                  type="text"
                  placeholder="Enter your job title (e.g. Marketing, Student, Designer, Engineer)"
                  value={cvData.title}
                  onChange={e => setCvData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg px-3.5 py-2.5 text-sm text-white transition-all focus:ring-1 focus:ring-[#a4b465]/30"
                />
              </div>

              {/* LinkedIn URL */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest flex items-center gap-1">
                  <Linkedin className="w-3.5 h-3.5 text-[#0a66c2]" /> {dt.linkedinProfileUrl}
                </label>
                <input 
                  type="url"
                  placeholder="https://linkedin.com/in/username"
                  value={cvData.linkedinUrl}
                  onChange={e => setCvData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg px-3.5 py-2.5 text-sm text-white transition-all focus:ring-1 focus:ring-[#a4b465]/30"
                />
              </div>

              {/* Twitter URL */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest flex items-center gap-1">
                  <Twitter className="w-3.5 h-3.5 text-[#1da1f2]" /> {dt.twitterProfileUrl}
                </label>
                <input 
                  type="url"
                  placeholder="https://twitter.com/username"
                  value={cvData.twitterUrl || ""}
                  onChange={e => setCvData(prev => ({ ...prev, twitterUrl: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg px-3.5 py-2.5 text-sm text-white transition-all focus:ring-1 focus:ring-[#a4b465]/30"
                />
              </div>

              {/* GitHub URL */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest flex items-center gap-1">
                  <Github className="w-3.5 h-3.5 text-white" /> {dt.githubProfileUrl}
                </label>
                <input 
                  type="url"
                  placeholder="https://github.com/username"
                  value={cvData.githubUrl || ""}
                  onChange={e => setCvData(prev => ({ ...prev, githubUrl: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg px-3.5 py-2.5 text-sm text-white transition-all focus:ring-1 focus:ring-[#a4b465]/30"
                />
              </div>

              {/* Personal Website */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-teal-400" /> {dt.personalWebsiteUrl}
                </label>
                <input 
                  type="url"
                  placeholder="https://yourwebsite.com"
                  value={cvData.websiteUrl || ""}
                  onChange={e => setCvData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg px-3.5 py-2.5 text-sm text-white transition-all focus:ring-1 focus:ring-[#a4b465]/30"
                />
              </div>
            </motion.div>
          )}

          {/* TAB 1.5: SPECIALIZATION */}
          {activeTab === "specialization" && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <h2 className="text-sm font-bold text-[#a4b465] tracking-wide uppercase border-b border-white/5 pb-2">{dt.professionalFocus}</h2>
              
              <div className="space-y-3 bg-white/5 p-4 rounded-xl border border-white/10">
                <label className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest block">{dt.chooseSpecialization}</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "developer", label: dt.specDeveloper, icon: Code2, desc: dt.specDeveloperDesc },
                    { id: "designer", label: dt.specDesigner, icon: Award, desc: dt.specDesignerDesc },
                    { id: "general", label: dt.specGeneral, icon: User, desc: dt.specGeneralDesc }
                  ].map(spec => {
                    const Icon = spec.icon;
                    const isSel = cvData.specialization === spec.id;
                    return (
                      <button
                        key={spec.id}
                        onClick={() => setCvData(prev => ({ ...prev, specialization: spec.id as any }))}
                        className={`p-3 rounded-lg border text-center flex flex-col items-center justify-center transition-all cursor-pointer ${
                          isSel 
                            ? "bg-[#a4b465]/15 border-[#a4b465] text-[#a4b465]" 
                            : "bg-black/20 border-white/10 text-gray-400 hover:text-white hover:border-white/25"
                        }`}
                      >
                        <Icon className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold">{spec.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {cvData.specialization === "developer" && (
                <motion.div initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5 bg-white/5 p-4 rounded-xl border border-white/10">
                  <label className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest flex items-center gap-1">
                    <Github className="w-3.5 h-3.5 text-white" /> {dt.githubUsernameLabel}
                  </label>
                  <p className="text-[9px] text-gray-400 leading-normal mb-1.5">
                    {dt.githubUsernameDesc}
                  </p>
                  <input 
                    type="text"
                    placeholder="e.g. sarah-johnson"
                    value={cvData.githubUsername || ""}
                    onChange={e => setCvData(prev => ({ ...prev, githubUsername: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg px-3.5 py-2.5 text-xs text-white transition-all font-mono"
                  />
                </motion.div>
              )}

              {cvData.specialization === "designer" && (
                <motion.div initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5 bg-white/5 p-4 rounded-xl border border-white/10">
                  <label className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-pink-400" /> {dt.behanceUrlLabel}
                  </label>
                  <p className="text-[9px] text-gray-400 leading-normal mb-1.5">
                    {dt.behanceUrlDesc}
                  </p>
                  <input 
                    type="url"
                    placeholder="https://behance.net/username"
                    value={cvData.behanceUrl || ""}
                    onChange={e => setCvData(prev => ({ ...prev, behanceUrl: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg px-3.5 py-2.5 text-xs text-white transition-all"
                  />
                </motion.div>
              )}

              {/* Duplicate Core Skills block so user can easily find it under Specialization as well! */}
              <div className="space-y-2 pt-4 border-t border-white/10 bg-white/5 p-4 rounded-xl">
                <label className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest">{dt.coreSkills}</label>
                <input 
                  type="text"
                  placeholder="e.g. Communication, Excel, Teamwork, Customer service"
                  value={cvData.skills}
                  onChange={e => setCvData(prev => ({ ...prev, skills: e.target.value }))}
                  className="w-full bg-black/40 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg px-3.5 py-2.5 text-xs text-white transition-all focus:ring-1 focus:ring-[#a4b465]/30"
                />
                <p className="text-[10px] text-gray-400 leading-normal">
                  {dt.skillsDesc}
                </p>
              </div>
            </motion.div>
          )}

          {/* TAB 1.7: SEO / METADATA */}
          {activeTab === "seo" && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <h2 className="text-sm font-bold text-[#a4b465] tracking-wide uppercase border-b border-white/5 pb-2">{dt.seoTitleLabel}</h2>
              
              <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-4">
                <p className="text-[10px] text-gray-300 leading-normal">
                  {dt.seoDesc}
                </p>

                {/* SEO Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest flex items-center gap-1">
                    <Search className="w-3.5 h-3.5" /> {dt.googleSearchTitle}
                  </label>
                  <input 
                    type="text"
                    placeholder="e.g. Sarah Johnson — Graphic Designer"
                    value={cvData.seoTitle || ""}
                    onChange={e => setCvData(prev => ({ ...prev, seoTitle: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg px-3.5 py-2 text-xs text-white transition-all font-bold"
                  />
                </div>

                {/* SEO Description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest">{dt.pageDescriptionMeta}</label>
                  <textarea 
                    rows={3}
                    placeholder={dt.pageDescriptionPlaceholder}
                    value={cvData.seoDescription || ""}
                    onChange={e => setCvData(prev => ({ ...prev, seoDescription: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg p-2.5 text-xs text-white transition-all resize-none"
                  />
                </div>

                {/* SEO Keywords */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest">{dt.keywordsLabel}</label>
                  <input 
                    type="text"
                    placeholder="e.g. designer, marketing, student, teacher"
                    value={cvData.seoKeywords || ""}
                    onChange={e => setCvData(prev => ({ ...prev, seoKeywords: e.target.value }))}
                    className="w-full bg-black/40 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg px-3.5 py-2 text-xs text-white transition-all"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: BIO & STORY */}
          {activeTab === "about" && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h2 className="text-xs font-black uppercase text-[#a4b465] tracking-widest">{dt.yourStoryBio}</h2>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest">{dt.aboutMeStatement}</label>
                <textarea 
                  rows={6}
                  value={cvData.aboutMe}
                  onChange={e => setCvData(prev => ({ ...prev, aboutMe: e.target.value }))}
                  placeholder={dt.aboutMePlaceholder}
                  className="w-full bg-white/5 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg p-3 text-sm text-white transition-all focus:ring-1 focus:ring-[#a4b465]/30 resize-none font-sans leading-relaxed"
                />
              </div>

              {/* Smart AI Enhancer Box */}
              <div className="bg-gradient-to-br from-black/50 to-[#a4b465]/5 border border-white/10 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-[#a4b465]/20 text-[#a4b465]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-xs font-bold text-white tracking-wide">
                    {dashboardLang === "ar" ? "مطور النبذة بالذكاء الاصطناعي" : "Smart AI Bio Enhancer"}
                  </h3>
                </div>
                <p className="text-[11px] text-gray-400 leading-normal">
                  {dashboardLang === "ar" 
                    ? "أدخل بعض النقاط الأساسية أو الكلمات المفتاحية وسيقوم الذكاء الاصطناعي بإعادة صياغة نبذتك المهنية بشكل احترافي وجذاب!" 
                    : "Provide a few bullets or keywords (e.g., certifications, key stacks, years of experience), and our AI will rewrite your bio into a powerful profile!"}
                </p>
                
                <input 
                  type="text"
                  placeholder="e.g. 5 years in sales, team leadership, bilingual English and Arabic"
                  value={aiBulletsAbout}
                  onChange={e => setAiBulletsAbout(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg px-3 py-2 text-xs text-white transition-all"
                />

                <button
                  type="button"
                  onClick={enhanceAboutMe}
                  disabled={isEnhancingAbout}
                  className={`w-full py-2 rounded-lg bg-gradient-to-r ${themeColors.buttonBg} text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-md`}
                >
                  {isEnhancingAbout ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {dashboardLang === "ar" ? "جاري تحسين النبذة..." : "Polishing Bio..."}
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      {dashboardLang === "ar" ? "تحسين النبذة بذكاء" : "Polished with Smart AI"}
                    </>
                  )}
                </button>
              </div>

              {/* Skills Editor */}
              <div className="space-y-2 pt-4 border-t border-white/10">
                <label className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest">{dt.coreSkills}</label>
                <input 
                  type="text"
                  placeholder="e.g. Communication, Excel, Teamwork, Customer service"
                  value={cvData.skills}
                  onChange={e => setCvData(prev => ({ ...prev, skills: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg px-3.5 py-2.5 text-sm text-white transition-all focus:ring-1 focus:ring-[#a4b465]/30"
                />
                <p className="text-[10px] text-gray-500 leading-normal">
                  {dt.skillsDesc}
                </p>
              </div>
            </motion.div>
          )}

          {/* TAB 3: PROJECTS */}
          {activeTab === "projects" && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h2 className="text-xs font-black uppercase text-[#a4b465] tracking-widest">{dt.featuredProjects}</h2>
                <button
                  onClick={addProject}
                  className={`flex items-center gap-1 text-xs font-bold text-white bg-gradient-to-r ${themeColors.buttonBg} hover:opacity-95 px-3 py-1.5 border border-white/5 rounded-lg cursor-pointer transition-all shadow`}
                >
                  <Plus className="w-3.5 h-3.5" /> {dt.addProjectBtn}
                </button>
              </div>

              <div className="space-y-4">
                {cvData.projects.map((proj, idx) => (
                  <div key={proj.id} className="p-4 bg-white/5 border border-white/10 hover:border-[#a4b465]/30 rounded-xl space-y-3 relative group transition-all">
                    
                    {/* Project delete trigger */}
                    <button
                      onClick={() => deleteProject(proj.id)}
                      className="absolute top-3.5 right-3.5 p-1 rounded-md text-gray-500 hover:text-red-400 hover:bg-white/5 cursor-pointer transition-all"
                      title={dashboardLang === "ar" ? "حذف المشروع" : "Delete Project"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <span className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest">{dashboardLang === "ar" ? `المشروع رقم ${idx + 1}` : `Project #${idx + 1}`}</span>

                    {/* Title */}
                    <div className="space-y-1">
                      <input 
                        type="text"
                        placeholder={dt.projectNamePlaceholder}
                        value={proj.name}
                        onChange={e => updateProject(proj.id, "name", e.target.value)}
                        className="w-full bg-white/5 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg px-3 py-2 text-xs text-white font-bold transition-all"
                      />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                      <textarea 
                        rows={3}
                        placeholder={dt.projectDescPlaceholder}
                        value={proj.description}
                        onChange={e => updateProject(proj.id, "description", e.target.value)}
                        className="w-full bg-white/5 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg p-2.5 text-xs text-white transition-all resize-none font-sans"
                      />
                    </div>

                    {/* Collapsible Smart AI Polisher for Project */}
                    <div className="border border-white/10 rounded-lg bg-black/20 p-2.5 space-y-2">
                      <div className="flex items-center gap-1 text-[10px] font-bold text-white uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-[#a4b465]" />
                        {dt.projectPolisherTitle}
                      </div>
                      <input 
                        type="text"
                        placeholder={dt.projectPolisherInputPlaceholder}
                        value={aiBulletsProject[proj.id] || ""}
                        onChange={e => setAiBulletsProject(prev => ({ ...prev, [proj.id]: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg px-2.5 py-1.5 text-[10px] text-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => enhanceProjectDesc(proj.id, proj.description, proj.name)}
                        disabled={enhancingProjectId !== null}
                        className={`w-full py-1.5 rounded-lg bg-gradient-to-r ${themeColors.buttonBg} text-white hover:opacity-90 font-bold text-[10px] flex items-center justify-center gap-1 transition-all disabled:opacity-50 cursor-pointer shadow`}
                      >
                        {enhancingProjectId === proj.id ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            {dt.polishingProjectBtn}
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3" />
                            {dt.aiEnhanceProjectBtn}
                          </>
                        )}
                      </button>
                    </div>

                  </div>
                ))}

                {cvData.projects.length === 0 && (
                  <div className="text-center py-10 bg-black/20 border border-[#a4b465]/10 border-dashed rounded-xl p-4">
                    <Folder className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">{dt.noProjectsYet}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{dt.noProjectsDesc}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 4: THEMES & VOICE BIOM */}
          {activeTab === "theme" && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              
              {/* Theme selection */}
              <div className="space-y-3">
                <h2 className="text-xs font-black uppercase text-[#a4b465] tracking-widest border-b border-white/5 pb-2">{dt.themeAndBackground}</h2>
                <label className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest">{dt.backdropStyleLabel}</label>
                
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "olive", label: "🌿 " + dt.themeOlive, desc: dt.themeOliveDesc },
                    { id: "sunset", label: "🌅 " + dt.themeSunset, desc: dt.themeSunsetDesc },
                    { id: "obsidian", label: "💎 " + dt.themeObsidian, desc: dt.themeObsidianDesc },
                    { id: "forest", label: "🌲 " + dt.themeForest, desc: dt.themeForestDesc },
                    { id: "custom", label: "⚙️ " + dt.themeCustom, desc: dt.themeCustomDesc }
                  ].map(style => (
                    <button
                      key={style.id}
                      onClick={() => setCvData(prev => ({ ...prev, backgroundStyle: style.id }))}
                      className={`p-2.5 rounded-xl text-left border cursor-pointer transition-all ${
                        cvData.backgroundStyle === style.id 
                          ? "border-[#a4b465] bg-[#a4b465]/15 shadow-md shadow-[#a4b465]/5" 
                          : "border-white/10 bg-white/5 hover:border-white/20"
                      }`}
                    >
                      <p className="text-xs font-bold text-white">{style.label}</p>
                      <p className="text-[9px] text-gray-400 mt-0.5 leading-normal">{style.desc}</p>
                    </button>
                  ))}
                </div>

                {cvData.backgroundStyle === "custom" && (
                  <div className="space-y-3 p-3.5 bg-black/30 border border-white/10 rounded-xl">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider font-bold text-[#a4b465]">
                        {dashboardLang === "ar" ? "رابط الخلفية المخصصة (فيديو أو صورة)" : "Custom Media Asset URL"}
                      </label>
                      <input 
                        type="url"
                        placeholder="e.g. https://domain.com/bg-video.mp4"
                        value={cvData.customBgUrl}
                        onChange={e => setCvData(prev => ({ ...prev, customBgUrl: e.target.value }))}
                        className="w-full bg-white/5 border border-white/10 focus:border-[#a4b465] outline-none rounded-lg px-3 py-2 text-xs text-white transition-all"
                      />
                      <p className="text-[9px] text-gray-500 leading-normal">
                        {dashboardLang === "ar" 
                          ? "أدخل رابط فيديو مباشر بصيغة MP4 أو رابط صورة JPG/PNG لتخصيص موقعك." 
                          : "Input a valid public URL to an MP4 video or JPG/PNG image. For video, make sure it is directly streamable."}
                      </p>
                    </div>

                    {/* Premium Loop Video Presets section */}
                    <div className="space-y-2 pt-2.5 border-t border-white/10">
                      <label className="text-[10px] uppercase tracking-wider font-black text-[#a4b465]/90 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" />
                        {dashboardLang === "ar" ? "خلفيات فيديو عالية الدقة للتخصصات" : "Premium Specialty Loop Videos"}
                      </label>
                      <p className="text-[9.5px] text-gray-400 leading-relaxed">
                        {dashboardLang === "ar" 
                          ? "اختر خلفية سينمائية متحركة وفائقة الخفة ومناسبة لتخصصك بضغطة واحدة:" 
                          : "Click any high-quality interactive animated canvas loop to instantly style your professional portfolio site dynamically:"}
                      </p>

                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                        {[
                          {
                            id: "vid-tech",
                            titleAr: "🤖 الروبوتات والتكنولوجيا الذكية (تفاعلي)",
                            titleEn: "🤖 Robotics & Smart Tech (Interactive)",
                            descAr: "شبكة ذكاء اصطناعي تفاعلية متحركة للمطورين والتقنيين",
                            descEn: "Stunning responsive digital neural node network particle loop",
                            url: "preset-tech"
                          },
                          {
                            id: "vid-hospital",
                            titleAr: "🏥 المستشفيات والطب والرعاية الصحية",
                            titleEn: "🏥 Medical & Healthcare Helix",
                            descAr: "شريط الحمض النووي DNA ثلاثي الأبعاد يدور للأطباء والمهن الصحية",
                            descEn: "Beautiful rotating 3D DNA molecular model particle loop",
                            url: "preset-medical"
                          },
                          {
                            id: "vid-restaurant",
                            titleAr: "🍽️ المطاعم وفنون الطهي والمقاهي",
                            titleEn: "🍽️ Culinary & Restaurant Warmth",
                            descAr: "جزيئات وهج دافئة تطفو ببطء للطهاة والمقاهي والضيافة",
                            descEn: "Gentle warm floating firefly bokeh and ember particle glow",
                            url: "preset-culinary"
                          },
                          {
                            id: "vid-corporate",
                            titleAr: "📈 الشركات والتقارير المالية والبيانات",
                            titleEn: "📈 Corporate & Finance Charts",
                            descAr: "لوحة تحليلات ورسم بياني مالي متحرك للإداريين والمحللين",
                            descEn: "Interactive live-moving analytical line chart and grid loops",
                            url: "preset-corporate"
                          },
                          {
                            id: "vid-creative",
                            titleAr: "🎨 الفنون والتصميم والإنتاج الرقمي",
                            titleEn: "🎨 Creative Liquid Neon Waves",
                            descAr: "أمواج نيون ضوئية متموجة للفنانين والمصممين والمسوقين",
                            descEn: "Dreamy colorful moving bezier neon ribbon light wave loops",
                            url: "preset-creative"
                          }
                        ].map(preset => {
                          const isSelected = cvData.backgroundStyle === "custom" && cvData.customBgUrl === preset.url;
                          return (
                            <button
                              type="button"
                              key={preset.id}
                              onClick={() => setCvData(prev => ({ ...prev, backgroundStyle: "custom", customBgUrl: preset.url }))}
                              className={`w-full p-2.5 rounded-lg text-left transition-all border flex gap-3 items-center cursor-pointer ${
                                isSelected 
                                  ? "bg-[#a4b465]/15 border-[#a4b465] text-white" 
                                  : "bg-black/40 border-white/5 hover:border-white/10 text-gray-300"
                              }`}
                            >
                              <div className="flex-1 min-w-0 text-left">
                                <p className={`text-[11px] font-bold ${isSelected ? "text-[#c8d5a0]" : "text-white"}`}>
                                  {dashboardLang === "ar" ? preset.titleAr : preset.titleEn}
                                </p>
                                <p className="text-[9px] text-gray-400 mt-0.5 truncate leading-tight">
                                  {dashboardLang === "ar" ? preset.descAr : preset.descEn}
                                </p>
                              </div>
                              {isSelected && (
                                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                                  {dashboardLang === "ar" ? "نشط" : "Active"}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Anchors Settings */}
              <div className="space-y-3">
                <h2 className="text-xs font-black uppercase text-[#a4b465] tracking-widest border-b border-white/5 pb-2">{dt.navigationSectionIds}</h2>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest">{dt.aboutMeIdLabel}</label>
                    <input 
                      type="text" 
                      value={cvData.aboutSectionId}
                      onChange={e => setCvData(prev => ({ ...prev, aboutSectionId: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#a4b465] transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest">{dt.myWorkIdLabel}</label>
                    <input 
                      type="text" 
                      value={cvData.workSectionId}
                      onChange={e => setCvData(prev => ({ ...prev, workSectionId: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-[#a4b465] transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* VOICE BIO BUILDER */}
              <div className="space-y-3">
                <h2 className="text-xs font-black uppercase text-[#a4b465] tracking-widest border-b border-white/5 pb-2">{dt.voicePortfolioBio}</h2>
                
                <div className="space-y-2.5">
                  <label className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest">{dt.bioAudioSource}</label>
                  
                  <div className="flex bg-white/5 border border-white/10 rounded-lg p-1 gap-1">
                    {[
                      { id: "none", label: dt.audioNoneLabel },
                      { id: "tts", label: dt.audioTtsLabel },
                      { id: "custom", label: dt.audioCustomLabel }
                    ].map(type => (
                      <button
                        key={type.id}
                        onClick={() => setCvData(prev => ({ ...prev, audioBioType: type.id as any }))}
                        className={`flex-1 text-center py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${
                          cvData.audioBioType === type.id 
                            ? "bg-gradient-to-r " + themeColors.buttonBg + " text-white font-bold shadow" 
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>
                </div>

                {cvData.audioBioType === "tts" && (
                  <p className="text-[11px] text-gray-400 bg-white/5 border border-white/10 rounded-xl p-3.5 leading-normal">
                    {dt.audioTtsDesc}
                  </p>
                )}

                {cvData.audioBioType === "custom" && (
                  <div className="space-y-3 bg-white/5 border border-white/10 rounded-xl p-3.5">
                    
                    {/* Microphone Recorder UI */}
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{dt.recordViaMicLabel}</p>
                      
                      {isRecording ? (
                        <div className="flex items-center justify-between bg-red-950/20 border border-red-500/20 rounded-lg px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                            <span className="text-xs font-bold text-red-400">{dt.recordingActiveLabel}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-white">0:{recordingSeconds < 10 ? `0${recordingSeconds}` : recordingSeconds}</span>
                          <button
                            onClick={stopRecording}
                            className="bg-red-500 text-white font-bold text-xs px-3 py-1 rounded hover:opacity-90 cursor-pointer"
                          >
                            {dt.stopRecordingBtn}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={startRecording}
                          className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold text-xs py-2 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <Mic className="w-3.5 h-3.5 text-[#a4b465]" />
                          {dt.recordFromMicBtn}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-center">
                      <div className="w-1/3 border-b border-white/10" />
                      <span className="text-[10px] text-gray-500 font-bold px-3 uppercase">{dt.orLabel}</span>
                      <div className="w-1/3 border-b border-white/10" />
                    </div>

                    {/* File Audio Bio Upload */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">{dt.uploadAudioBioLabel}</p>
                      <label className="w-full bg-white/5 border border-dashed border-white/10 hover:border-[#a4b465]/40 rounded-lg py-3 text-center flex flex-col items-center justify-center cursor-pointer transition-all">
                        <Upload className="w-4 h-4 text-gray-400 mb-1" />
                        <span className="text-[11px] font-semibold text-gray-300">{dt.chooseAudioFileBtn}</span>
                        <input 
                          type="file" 
                          accept="audio/*" 
                          onChange={handleVoiceBioUpload} 
                          className="hidden" 
                        />
                      </label>
                    </div>

                    {/* File upload confirmation */}
                    {cvData.audioBioUrl && (
                      <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/20 rounded-lg text-center">
                        <p className="text-[10px] font-bold text-emerald-400 flex items-center justify-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> {dt.voiceBioLoadedMsg}
                        </p>
                        <audio controls src={cvData.audioBioUrl} className="w-full h-8 mt-2 opacity-80" />
                      </div>
                    )}

                  </div>
                )}

              </div>
            </motion.div>
          )}

          {/* TAB 5: PUBLISH & DEPLOY */}
          {activeTab === "deploy" && (
            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
              <h2 className="text-xs font-black uppercase text-[#a4b465] tracking-widest border-b border-white/5 pb-2">{dt.publishOnlineTitle}</h2>
              
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-[#a4b465]/10 text-[#a4b465]">
                    <Globe className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="text-xs font-bold text-white tracking-wide">{dt.generatePortfolioLinkLabel}</h3>
                </div>

                <p className="text-[11px] text-gray-400 leading-normal">
                  {dt.publishDesc}
                </p>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-[#a4b465]/80 tracking-widest">{dt.portfolioUsernameLabel}</label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3.5 rounded-l-lg border border-r-0 border-white/10 bg-black/40 text-xs text-gray-500 font-medium">
                      cv/
                    </span>
                    <input 
                      type="text"
                      value={username}
                      onChange={e => setUsername(e.target.value)}
                      placeholder="e.g. sarah-johnson"
                      className="flex-1 bg-white/5 border border-white/10 focus:border-[#a4b465] outline-none rounded-r-lg px-3.5 py-2.5 text-xs text-white transition-all font-bold"
                    />
                  </div>
                </div>

                {deployError && (
                  <div className="flex items-start gap-2 p-3 bg-red-950/30 border border-red-500/20 rounded-lg text-red-400 text-xs leading-normal">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{deployError}</span>
                  </div>
                )}

                <button
                  onClick={handleDeployCV}
                  disabled={isGenerating}
                  className={`w-full py-2.5 rounded-lg bg-gradient-to-r ${themeColors.buttonBg} text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 cursor-pointer active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg ${themeColors.glowShadow}`}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {dt.publishingToInstanceBtn}
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      {dt.publishAndDeployBtn}
                    </>
                  )}
                </button>
                {/* أضف هذا الزر بعد زر النشر الحالي مباشرة */}
<button
  onClick={publishCV}
  className={`w-full py-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-95 cursor-pointer active:scale-[0.98] transition-all shadow-lg shadow-blue-500/20`}
  title={dashboardLang === "ar" ? "نشر على GitHub Pages" : "Publish to GitHub Pages"}
>
  <Upload className="w-3.5 h-3.5" />
  {dashboardLang === "ar" ? "نشر على GitHub Pages" : "Publish to GitHub Pages"}
</button>
              </div>

              {/* Success Result Link View */}
              {generatedUrl && (
                <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }} 
                   animate={{ opacity: 1, scale: 1 }} 
                   className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 text-center space-y-3"
                >
                  <p className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
                    <CheckCircle className="w-4.5 h-4.5" /> {dt.publishedSuccessfullyMsg}
                  </p>
                  <p className="text-[11px] text-gray-300">{dt.liveAtMsg}</p>
                  
                {/* عرض الرابط المختصر مع زر نسخ */}
<div className="p-2.5 bg-black/40 border border-emerald-500/10 rounded-lg font-mono text-[10px] text-emerald-300">
  <div className="flex items-center justify-between gap-2">
    <span className="truncate flex-1 text-left">
      {generatedUrl.length > 50 ? generatedUrl.substring(0, 50) + '...' : generatedUrl}
    </span>
    <button
      onClick={() => {
        navigator.clipboard.writeText(generatedUrl);
        alert(dashboardLang === "ar" ? "✅ تم نسخ الرابط الكامل!" : "✅ Full link copied!");
      }}
      className="text-[10px] px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition-colors cursor-pointer whitespace-nowrap"
    >
      📋 نسخ
    </button>
  </div>
</div>
                  <a 
                    href={generatedUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-gradient-to-r ${themeColors.buttonBg} rounded-lg hover:opacity-90 cursor-pointer active:scale-[0.98] transition-all shadow-md ${themeColors.glowShadow}`}
                  >
                    {dt.openLiveCvBtn}
                  </a>
                </motion.div>
              )}

              {/* Analytics & Traffic Card */}
              {generatedUrl && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4.5 h-4.5 text-[#a4b465]" />
                      <h3 className="text-xs font-bold text-white tracking-wide">{dt.recruiterAnalyticsTitle}</h3>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/20 px-2 py-0.5 rounded-full animate-pulse">
                      {dt.liveTrackingBadge}
                    </span>
                  </div>

                  <p className="text-[10px] text-gray-400 leading-normal">
                    {dt.analyticsDesc}
                  </p>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-none">
                    {analytics.length === 0 ? (
                      <div className="text-center py-6 text-gray-500 text-[11px] italic">
                        {dt.waitingForVisitorMsg}
                      </div>
                    ) : (
                      analytics.map((visit, idx) => (
                        <div 
                          key={idx} 
                          className={`p-2.5 rounded-lg border text-[11px] space-y-1.5 transition-all ${
                            visit.isRecruiter 
                              ? "bg-amber-950/15 border-amber-500/30 text-amber-100" 
                              : "bg-black/30 border-white/5 text-gray-300"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-gray-200">{visit.ip}</span>
                            <span className="text-[9px] text-gray-400 font-mono">
                              {new Date(visit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-1.5 text-gray-400">
                              <span className="text-xs">{visit.countryCode === "US" ? "🇺🇸" : visit.countryCode === "JO" ? "🇯🇴" : visit.countryCode === "SA" ? "🇸🇦" : "🌐"}</span>
                              <span>{visit.city ? `${visit.city}, ` : ""}{visit.country || "Unknown Location"}</span>
                            </div>
                            
                            {visit.isRecruiter ? (
                              <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                🎯 {dt.recruiterLabel}
                              </span>
                            ) : (
                              <span className="text-[9px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                {dt.visitorLabel}
                              </span>
                            )}
                          </div>

                          {visit.org && (
                            <div className="text-[10px] bg-black/40 px-2 py-1 rounded text-gray-400 truncate">
                              <span className="text-[9px] text-gray-500 uppercase font-bold mr-1">Network:</span>
                              {visit.org}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}

            </motion.div>
          )}

        </div>

        {/* Footer info banner */}
        <div className="p-4 border-t border-[#a4b465]/10 text-center bg-black/40 text-[10px] text-gray-500">
          SmartCV Builder — Dynamic Portfolio Platform
        </div>
      </aside>

      {/* ======================================================== */}
      {/* CV PREVIEW CANVAS (Right Side)                           */}
      {/* ======================================================== */}
      <main className="flex-1 min-h-screen relative overflow-y-auto p-4 md:p-12 z-10 flex flex-col items-center">
        
        {/* Dynamic Watermark Banner */}
        <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-full text-[10px] text-gray-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Interactive Live Preview
        </div>

        {/* Portfolio Document Outer Container */}
        <div className="w-full max-w-2xl flex flex-col items-center my-6 md:my-10">
          
          {/* HEADER SECT */}
          <header className="flex flex-col items-center gap-4 text-center py-6">
            
            {/* Animated Profile Border */}
            <div className="relative mb-2">
              <div className={`w-44 h-44 rounded-full p-1 bg-gradient-to-tr ${themeColors.bgGradient} shadow-2xl shadow-black/40`}>
                <div className="w-full h-full rounded-full bg-[#1a1f15] flex items-center justify-center p-1.5 overflow-hidden">
                  {cvData.profilePhoto ? (
                    <img 
                      src={cvData.profilePhoto} 
                      alt={cvData.fullName} 
                      className="w-full h-full rounded-full object-cover relative" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 rounded-full flex items-center justify-center text-5xl font-black text-[#a4b465]/50">
                      {cvData.fullName ? cvData.fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase() : "?"}
                    </div>
                  )}
                </div>
              </div>

              {/* Active customized audio player */}
              {cvData.audioBioType !== "none" && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#535d0a]/85 backdrop-blur-md border border-[#a4b465]/40 px-3.5 py-1.5 rounded-full flex items-center gap-2.5 w-44 shadow-2xl z-20 transition-all duration-300">
                  <button 
                    onClick={handlePlayPause}
                    className="w-7 h-7 rounded-full bg-[#a4b465] text-[#12140e] flex items-center justify-center font-bold hover:scale-110 active:scale-95 transition-all text-xs focus:outline-none cursor-pointer flex-shrink-0"
                    title="Play Voice Bio"
                  >
                    {isPlaying ? <span className="text-xs leading-none">❚❚</span> : <span className="text-xs leading-none pl-0.5">▶</span>}
                  </button>
                  <div className="flex-1 flex flex-col justify-center min-w-0">
                    <span className="text-[9px] font-black text-[#d4e080] uppercase tracking-wider truncate">
                      {cvData.audioBioType === "tts" ? "AI Voice Bio" : "Voice Bio"}
                    </span>
                    <div className="h-1 bg-white/15 rounded-full mt-1 overflow-hidden cursor-pointer">
                      <div 
                        className="h-full bg-[#a4b465] transition-all duration-100 ease-out rounded-full"
                        style={{ width: `${audioProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Custom styled spin classes for profile */}
            <style>{`
              @keyframes spinSlow { to { transform: rotate(360deg); } }
              .animate-spin-slow { animation: spinSlow 8s linear infinite; }
            `}</style>

            {/* Full Name & Title */}
            <div className="space-y-1">
              <h2 className="text-5xl font-extrabold text-white tracking-tight drop-shadow-xl mb-1">
                {cvData.fullName || "Your Name"}
              </h2>
              <p className={`text-base font-bold uppercase tracking-[0.2em] ${themeColors.text}`}>
                {cvData.title || "Your Job Title"}
              </p>
            </div>

            {/* Social Profile Links */}
            <div className="flex flex-wrap items-center justify-center gap-3 mt-1 max-w-lg">
              {cvData.linkedinUrl && (
                <a 
                  href={cvData.linkedinUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#a4b465] bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#a4b465]/30 px-3 py-1.5 rounded-full transition-all duration-200"
                >
                  <Linkedin className="w-3.5 h-3.5 text-[#0a66c2]" />
                  <span className="font-semibold">LinkedIn</span>
                </a>
              )}
              {cvData.twitterUrl && (
                <a 
                  href={cvData.twitterUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#a4b465] bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#a4b465]/30 px-3 py-1.5 rounded-full transition-all duration-200"
                >
                  <Twitter className="w-3.5 h-3.5 text-[#1da1f2]" />
                  <span className="font-semibold">Twitter</span>
                </a>
              )}
              {cvData.githubUrl && (
                <a 
                  href={cvData.githubUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#a4b465] bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#a4b465]/30 px-3 py-1.5 rounded-full transition-all duration-200"
                >
                  <Github className="w-3.5 h-3.5 text-white" />
                  <span className="font-semibold">GitHub</span>
                </a>
              )}
              {cvData.websiteUrl && (
                <a 
                  href={cvData.websiteUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-[#a4b465] bg-white/5 hover:bg-white/10 border border-white/5 hover:border-[#a4b465]/30 px-3 py-1.5 rounded-full transition-all duration-200"
                >
                  <Globe className="w-3.5 h-3.5 text-teal-400" />
                  <span className="font-semibold">Website</span>
                </a>
              )}
            </div>

            {/* Navigation Bar inside Preview */}
            <nav className="navigation mt-2">
              <ul className="flex items-center gap-6 bg-black/40 backdrop-blur-md px-8 py-3 border border-white/10 rounded-full shadow-inner">
                <li>
                  <a href={`#${cvData.aboutSectionId}`} className="text-xs font-semibold text-gray-300 hover:text-[#a4b465] transition-colors">
                    About Me
                  </a>
                </li>
                <li>
                  <a href="#skills" className="text-xs font-semibold text-gray-300 hover:text-[#a4b465] transition-colors">
                    Skills
                  </a>
                </li>
                <li>
                  <a href={`#${cvData.workSectionId}`} className="text-xs font-semibold text-gray-300 hover:text-[#a4b465] transition-colors">
                    My Work
                  </a>
                </li>
              </ul>
            </nav>

          </header>

          <div className="w-[70%] h-[2px] bg-gradient-to-r from-transparent via-[#a4b465]/40 to-transparent my-10" />

          {/* ABOUT ME GLASS BOX */}
          <section id={cvData.aboutSectionId} className="w-full bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-2xl flex flex-col gap-3 shadow-2xl text-left mb-6">
            <h3 className="text-[#a4b465] text-xs font-black uppercase tracking-widest border-b border-[#a4b465]/20 pb-2 mb-2">About Me</h3>
            <p className="text-sm md:text-base leading-relaxed text-[#d8e2dc] whitespace-pre-wrap font-sans">
              {cvData.aboutMe || "Write about yourself in the editor to see your introduction here."}
            </p>
          </section>

          <div className="w-[70%] h-[2px] bg-gradient-to-r from-transparent via-[#a4b465]/40 to-transparent my-4" />

          {/* SKILLS GLASS BOX */}
          <section id="skills" className="w-full bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-2xl flex flex-col gap-3 shadow-2xl text-left mb-6">
            <h3 className="text-[#a4b465] text-xs font-black uppercase tracking-widest border-b border-[#a4b465]/20 pb-2 mb-2">Skills</h3>
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {cvData.skills ? (
                cvData.skills.split(",")
                  .map(s => s.trim())
                  .filter(Boolean)
                  .map((skill, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-sm text-[#d8e2dc]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#a4b465]" />
                      <span className="font-medium">{skill}</span>
                    </li>
                  ))
              ) : (
                <p className="text-xs text-gray-500 italic">No skills listed yet.</p>
              )}
            </ul>
          </section>

          <div className="w-[70%] h-[2px] bg-gradient-to-r from-transparent via-[#a4b465]/40 to-transparent my-4" />

          {/* PROJECTS PORTFOLIO GLASS BOX */}
          <section id={cvData.workSectionId} className="w-full bg-white/5 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-2xl flex flex-col gap-3 shadow-2xl text-left">
            <h3 className="text-[#a4b465] text-xs font-black uppercase tracking-widest border-b border-[#a4b465]/20 pb-2 mb-2">Experience & Projects</h3>
            
            <div className="flex flex-col gap-4 text-left">
              {cvData.projects.map((proj) => (
                <div 
                  key={proj.id} 
                  className="p-5 rounded-xl bg-white/5 border border-white/5 hover:border-[#a4b465]/35 hover:bg-white/[0.08] transition-all group cursor-pointer"
                >
                  <h3 className="text-base font-bold text-[#a4b465] flex items-center gap-2 group-hover:translate-x-0.5 transition-transform">
                    ⚡ {proj.name || "Untitled Project"}
                  </h3>
                  {proj.description && (
                    <p className="text-xs md:text-sm text-[#cdd5cb] mt-2 leading-relaxed">
                      {proj.description}
                    </p>
                  )}
                </div>
              ))}

              {cvData.projects.length === 0 && (
                <p className="text-center text-xs text-gray-500 italic py-6">
                  No experience or projects added yet.
                </p>
              )}
            </div>
          </section>

          {/* Interactive footer line */}
          <footer className="text-center py-10 text-[10px] text-gray-500 font-medium">
            © {new Date().getFullYear()} {cvData.fullName || ""}. All rights reserved.
          </footer>

        </div>

      </main>

      </div>
    </div>
  );
}
