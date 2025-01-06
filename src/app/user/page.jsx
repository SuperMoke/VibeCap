"use client";
import React, { useState, useEffect, useRef } from "react";
import FaceDetection from "./facedetection";
import { isAuthenticated } from "../utils/auth";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Typography,
  Button,
  Progress,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@material-tailwind/react";
import Sidebar from "./sidebar";
import Header from "./header";
import { auth, storage, db } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import Image from "next/image";
import { ref, listAll, getDownloadURL } from "firebase/storage";
import {
  PlayCircleIcon,
  PauseCircleIcon,
  ForwardIcon,
  BackwardIcon,
} from "@heroicons/react/24/solid";
import { FaMusic } from "react-icons/fa";
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const dbName = "EmotionDB";
const dbVersion = 1;
let indexedDB;

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(dbName, dbVersion);

    request.onerror = (event) =>
      reject("IndexedDB error: " + event.target.error);

    request.onsuccess = (event) => {
      indexedDB = event.target.result;
      resolve(indexedDB);
    };

    request.onupgradeneeded = (event) => {
      indexedDB = event.target.result;
      const objectStore = indexedDB.createObjectStore("emotions", {
        keyPath: "emotion",
      });
    };
  });
};

const getAllEmotionCounts = () => {
  return new Promise((resolve, reject) => {
    const transaction = indexedDB.transaction(["emotions"], "readonly");
    const store = transaction.objectStore("emotions");
    const request = store.getAll();

    request.onsuccess = (event) => {
      const result = event.target.result.reduce((acc, item) => {
        acc[item.emotion] = item.count;
        return acc;
      }, {});
      resolve(result);
    };
    request.onerror = (event) =>
      reject("Error fetching emotion counts: " + event.target.error);
  });
};

const resetEmotionCounts = () => {
  return new Promise((resolve, reject) => {
    const transaction = indexedDB.transaction(["emotions"], "readwrite");
    const store = transaction.objectStore("emotions");
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = (event) =>
      reject("Error resetting emotion counts: " + event.target.error);
  });
};

const decodeSongTitle = (title) => {
  const decodedTitle = decodeURIComponent(title);
  const cleanTitle = decodedTitle.split("?")[0];
  const finalTitle = cleanTitle.split("/").pop();
  return finalTitle;
};

export default function UserHomepage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const router = useRouter();
  const [user, loading, error] = useAuthState(auth);
  const [expressionCount, setExpressionCount] = useState({});
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [showMusicPrompt, setShowMusicPrompt] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState("");
  const [songs, setSongs] = useState([]);
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const isClient = typeof window !== "undefined";
  const audioRef = useRef(isClient ? new Audio() : null);
  const [lastPromptedCounts, setLastPromptedCounts] = useState({});
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [acceptedPrompts, setAcceptedPrompts] = useState({});
  const [currentPlaylist, setCurrentPlaylist] = useState([]);
  const [currentPlaylistEmotion, setCurrentPlaylistEmotion] = useState("");
  const [lastThresholds, setLastThresholds] = useState({});
  const [feedbackAudio, setFeedbackAudio] = useState(null);
  const feedbackAudioRef = useRef(null);
  const [isFeedbackAudioPlaying, setIsFeedbackAudioPlaying] = useState(false);
  const [currentAvatar, setCurrentAvatar] = useState("/Avatar_VibeCap-New.gif");
  const [avatarTimer, setAvatarTimer] = useState(null);
  const [currentMusicMessage, setCurrentMusicMessage] = useState("");
  const [userData, setUserData] = useState(null);
  const [isAvatarLoading, setIsAvatarLoading] = useState(true);
  const [openStartDialog, setOpenStartDialog] = useState(false);
  const [openStopDialog, setOpenStopDialog] = useState(false);
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaylistLocked, setIsPlaylistLocked] = useState(false);
  const [userName, setUserName] = useState("");

  const handleStartDetectionClick = () => {
    setOpenStartDialog(true);
  };

  const handleStopDetectionClick = () => {
    setOpenStopDialog(true);
  };

  const handleSaveDataClick = () => {
    setOpenSaveDialog(true);
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };
  const avatarGifs = [
    "/VibeCap Avatar/1.gif",
    "/VibeCap Avatar/2.gif",
    "/VibeCap Avatar/3.gif",
    "/VibeCap Avatar/4.gif",
    "/VibeCap Avatar/5.gif",
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        const q = query(
          collection(db, "userData"),
          where("user_id", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const userData = querySnapshot.docs[0].data();
          setUserName(userData.name || "User");
          setUserData(userData);
        }
      }
    };

    fetchUserData();
  }, [user]);

  useEffect(() => {
    if (currentPlaylistEmotion) {
      const messages = musicMessages[currentPlaylistEmotion];
      const randomMessage =
        messages[Math.floor(Math.random() * messages.length)];
      setCurrentMusicMessage(randomMessage);
    }
  }, [currentPlaylistEmotion]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      console.log("User is not authenticated, redirecting to home...");
      router.push("/");
      return;
    }
    const checkAuth = async () => {
      console.log("Checking authentication...");
      const roleMap = {
        user: true,
      };
      for (const role of Object.keys(roleMap)) {
        const authorized = await isAuthenticated(role);
        if (authorized) {
          console.log("User is authorized:", role);
          setIsAuthorized(true);
          const loginSound = new Audio(
            "/Well_ hello there_ Welcome to VibeCap.mp3"
          );
          loginSound.play();
          return;
        }
      }
      console.log("User is not authorized, redirecting to home...");
      router.push("/");
    };
    checkAuth();

    const initDB = async () => {
      await openDB();
      const savedExpressionCount = await getAllEmotionCounts();
      setExpressionCount(savedExpressionCount);

      const savedAcceptedPrompts = localStorage.getItem("acceptedPrompts");
      if (savedAcceptedPrompts) {
        setAcceptedPrompts(JSON.parse(savedAcceptedPrompts));
      }
    };
    initDB();
    displayTips();
  }, [user, loading, router]);

  const handleStopDetection = () => {
    setIsDetecting(false);
  };

  const handleStartDetection = async () => {
    setIsDetecting(true);

    // Record attendance
    const attendanceData = {
      userId: user.uid,
      fullName: userName,
      email: user.email,
      timeIn: serverTimestamp(),
      date: new Date().toISOString().split("T")[0],
    };

    try {
      await addDoc(collection(db, "attendance"), attendanceData);
    } catch (error) {
      console.error("Error recording time in:", error);
    }
  };

  const displayTips = () => {
    const notificationSound = new Audio("/VibeCap Tip Sound Effect.mp3"); // Add your sound file to the public folder

    const tips = {
      "Tips in Building Resilience": [
        "Develop healthy physical habits. Healthy eating, physical activity, and regular sleep can improve your physical and mental health.",
        "Take time for yourself each day. Notice the good moments. Do something you enjoy.",
        "Look at problems from different angles. Think of challenging situations as growth opportunities. Learn from your mistakes. Try to see the positive side of things.",
        "Practice gratitude. Take time to note things to be thankful for each day.",
        "Explore your beliefs about the meaning and purpose of life. Think about how to guide your life by the principles important to you.",
        "Tap into social connections and community. Surround yourself with positive, healthy people. Ask for help when you need it.",
      ],
      "Tips in Reducing Stress": [
        "Get enough sleep. Adults need 7 or more hours each night, school-age kids need 9–12, and teens need 8–10.",
        "Exercise regularly. Just 30 minutes a day of walking can boost mood and reduce stress.",
        "Build a social support network.",
        "Set priorities. Decide what must get done and what can wait. Say no to new tasks if you feel they’re too much.",
        "Show compassion for yourself. Note what you’ve accomplished at the end of the day, not what you didn’t.",
        "Schedule regular times for a relaxing activity that uses mindfulness/breathing exercises, like yoga or tai chi.",
        "Seek help. Talk to a mental health professional if you feel unable to cope, have suicidal thoughts, or use drugs or alcohol to cope.",
      ],
      "Tips in Getting Quality Sleep": [
        "Go to bed the same time each night and wake up the same time each morning.",
        "Sleep in a dark, quiet, comfortable environment.",
        "Exercise daily (but not right before bedtime).",
        "Limit the use of electronics before bed.",
        "Relax before bedtime. Try a warm bath or reading.",
        "Avoid alcohol and large meals before bedtime.",
        "Avoid stimulants like nicotine and caffeine.",
        "Don't take naps after mid-afternoon. Keep naps short.",
        "Try to get natural sunlight for at least 30 minutes a day.",
        "Consult a health care professional if you have ongoing sleep problems.",
      ],
      "Tips in Strengthening Social Connections": [
        "Build strong relationships with your kids (if you have one or more).",
        "Get active and share good habits with family and friends.",
        "If you’re a family caregiver, ask for help from others.",
        "Join a group focused on a favorite hobby, such as reading, hiking, or painting.",
        "Take a class to learn something new.",
        "Volunteer for things you care about in your community, like a community garden, school, library, or place of worship.",
        "Travel to different places and meet new people.",
      ],
      "Tips in Coping with Loss": [
        "Take care of yourself. Try to eat right, exercise, and get enough sleep. Avoid bad habits—like smoking or drinking alcohol—that can put your health at risk.",
        "Talk to caring friends. Let others know when you want to talk.",
        "Find a grief support group. It might help to talk with others who are also grieving.",
        "Don’t make major changes right away. Wait a while before making big decisions like moving or changing jobs.",
        "Talk to your doctor if you’re having trouble with everyday activities.",
        "Consider additional support. Sometimes short-term talk therapy can help.",
        "Be patient. Mourning takes time. It’s common to have roller-coaster emotions for a while.",
      ],
      "Tips on Being Mindfulness": [
        "Take some deep breaths. Breathe in through your nose to a count of 4, hold for 1 second and then exhale through the mouth to a count of 5. Repeat often.",
        "Enjoy a stroll. As you walk, notice your breath and the sights and sounds around you. As thoughts and worries enter your mind, note them but then return to the present.",
        "Practice mindful eating. Be aware of taste, textures, and flavors in each bite, and listen to your body when you are hungry and full.",
        "Be aware of your body. Mentally scan your body from head to toe. Bring your attention to how each part feels.",
        "Find mindfulness resources, including online programs and teacher-guided practices.",
      ],
      "Tips from CDC": [
        "Get outside. Take a nature walk or city hike.",
        "Be active. Take a dance break! Lift weights. Do push-ups or sit-ups. Or kick around a ball for a few minutes. Channel your energy into a quick cleaning of your home.",
        "Practice relaxation techniques. Wash your face or rinse your hands in cool water to reduce tension and calm nerves. Close your eyes, take deep breaths, stretch, do yoga, or meditate.",
        "Embrace self-care. Make and enjoy a cup of tea and relax in a comfortable place. Curl up with a book or magazine.",
        "Check in with yourself. Take time to ask yourself how you are feeling.",
        "Practice gratitude. Write three things you are grateful for. Tell someone you appreciate them.",
        "Laugh! Think of someone who makes you laugh or the last time you laughed so hard you cried. Watch or listen to something fun.",
        "Consider a new hobby. Try playing a musical instrument, gardening, following a new recipe, working on a crossword puzzle, building something new in the workshop, or knitting.",
        "Find an inspiring song or quote. Write it down (or screenshot it) so you have it nearby.",
        "Maintain or build your social network. Check in with a friend, family member, or neighbor.",
        "Connect with your faith through prayer or reach out to a member of your faith community.",
        "Make an appointment with a counselor if you’ve been feeling overwhelmed with stress, anxiety, sadness, or depressed mood.",
      ],
    };

    let tipIndex = 0;
    let categoryIndex = 0;
    const categories = Object.keys(tips);

    const intervalId = setInterval(() => {
      console.log("Tips interval");
      if (tipIndex < tips[categories[categoryIndex]].length) {
        notificationSound.play();

        toast(
          <>
            <strong>{categories[categoryIndex]}:</strong>{" "}
            {tips[categories[categoryIndex]][tipIndex]}
          </>,
          {
            position: "top-right",
            icon: false,
            autoClose: 5000,
          }
        );
        tipIndex++;
      } else {
        tipIndex = 0;
        categoryIndex = (categoryIndex + 1) % categories.length;
      }
    }, 300000);

    return () => clearInterval(intervalId);
  };

  useEffect(() => {
    if (!isClient) return;
    const audio = audioRef.current;
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
    return () => {
      audio.removeEventListener("timeupdate", updateProgress);
      audio.removeEventListener("loadedmetadata", () =>
        setDuration(audio.duration)
      );
    };
  }, [isClient]);

  const updateProgress = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleSeek = (e) => {
    const seekTime = (e.nativeEvent.offsetX / e.target.offsetWidth) * duration;
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const previousSong = () => {
    const currentIndex = songs.indexOf(currentSong);
    const prevIndex = (currentIndex - 1 + songs.length) % songs.length;
    setCurrentSong(songs[prevIndex]);
    if (isPlaying) {
      audioRef.current.src = songs[prevIndex];
      audioRef.current.play();
    }
  };

  const getProgressColor = (expression) => {
    const colorMap = {
      happy: "yellow",
      sad: "blue",
      angry: "red",
      surprised: "orange",
      disgusted: "green",
      fearful: "purple",
    };
    return colorMap[expression.toLowerCase()] || "indigo";
  };

  const getTotalCount = () => {
    return Object.values(expressionCount).reduce((a, b) => a + b, 0);
  };

  useEffect(() => {
    updateFeedbackMessage(expressionCount);
    checkEmotionThreshold(expressionCount);
  }, [expressionCount]);

  const getThresholdBasedMessage = (emotion, threshold) => {
    const baseMessages = musicMessages[emotion];
    if (!baseMessages) return "";
    const messageIndex = (threshold - 1) % baseMessages.length;
    return baseMessages[messageIndex];
  };

  const [lastMusicThresholds, setLastMusicThresholds] = useState({});

  const checkEmotionThreshold = async (counts) => {
    // Don't check if already playing and locked
    if (isPlaying && isPlaylistLocked) return;

    // Filter out neutral and sort emotions by count
    const sortedEmotions = Object.entries(counts)
      .filter(([emotion]) => emotion !== "neutral")
      .sort(([, a], [, b]) => b - a);

    if (sortedEmotions.length === 0) return;

    const [dominantEmotion, dominantCount] = sortedEmotions[0];

    // Case 1: Initial trigger at 20 counts
    if (dominantCount >= 20 && !currentPlaylistEmotion) {
      await triggerPlaylist(dominantEmotion, counts);
      return;
    }

    // Case 2: Switch playlist when a different emotion becomes dominant
    if (
      currentPlaylistEmotion &&
      dominantEmotion !== currentPlaylistEmotion &&
      dominantCount >= 20
    ) {
      const currentCount = counts[currentPlaylistEmotion] || 0;
      if (dominantCount - currentCount >= 20) {
        await triggerPlaylist(dominantEmotion, counts);
        return;
      }
    }

    // Case 3: New threshold multiple for same emotion
    if (dominantEmotion === currentPlaylistEmotion && dominantCount >= 20) {
      const thresholdMultiple = Math.floor(dominantCount / 20);
      if (thresholdMultiple > (lastMusicThresholds[dominantEmotion] || 0)) {
        await triggerPlaylist(dominantEmotion, counts);
      }
    }
  };

  // Helper function to trigger playlist with counts parameter
  const triggerPlaylist = async (emotion, counts) => {
    try {
      // Stop current playback
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      // Fetch and start new playlist
      await fetchSongs(emotion);
      setCurrentPlaylistEmotion(emotion);
      setCurrentMusicMessage(musicMessages[emotion][0]);

      // Play notification sound
      const notificationSound = new Audio(
        "/VipeCap Music Recommendation Sound Effect.mp3"
      );
      await notificationSound.play();

      // Update thresholds using passed counts
      setLastMusicThresholds((prev) => ({
        ...prev,
        [emotion]: Math.floor(counts[emotion] / 20),
      }));

      setIsPlaylistLocked(false);
    } catch (error) {
      console.error("Error triggering playlist:", error);
    }
  };

  const happyFeedbackMessages = [
    {
      message:
        "Your happiness is contagious! It is really a gift to everyone around you. Keep spreading that joy!",
      audio: "VibeCap Avatar Voice Lines/Happy Mood or Emotion/1.mp3",
    },
    {
      message:
        "Wow, your smile is glowing like a ray of sunshine that it can light a room! Keep shining bright!",
      audio: "VibeCap Avatar Voice Lines/Happy Mood or Emotion/2.mp3",
    },
    {
      message:
        "You are oozing with positivity today. Keep that energy flowing!",
      audio: "VibeCap Avatar Voice Lines/Happy Mood or Emotion/3.mp3",
    },
    {
      message: "That smile looks amazing on you! Stay awesome!",
      audio: "VibeCap Avatar Voice Lines/Happy Mood or Emotion/4.mp3",
    },
    {
      message:
        "You are on a roll and absolutely rocking that happy energy! Keep the good vibes coming!",
      audio: "VibeCap Avatar Voice Lines/Happy Mood or Emotion/5.mp3",
    },
    {
      message:
        "Your joy and positive energy is truly inspiring. Let’s keep that going!",
      audio: "VibeCap Avatar Voice Lines/Happy Mood or Emotion/6.mp3",
    },
  ];

  const surprisedFeedbackMessages = [
    {
      message:
        "It looks like something caught you off guard! Take a deep breath, you’ve got this.",
      audio: "VibeCap Avatar Voice Lines/Surprised Mood or Emotion/1.mp3",
    },
    {
      message:
        "You seem so surprised. That reaction says it all! Sometimes that’s the spark we need!",
      audio: "VibeCap Avatar Voice Lines/Surprised Mood or Emotion/2.mp3",
    },
    {
      message: "Life has its surprises, but you’ve got this under control.",
      audio: "VibeCap Avatar Voice Lines/Surprised Mood or Emotion/3.mp3",
    },
    {
      message: "Whatever surprised you, I hope it's a good one!",
      audio: "VibeCap Avatar Voice Lines/Surprised Mood or Emotion/4.mp3",
    },
    {
      message: "Surprises make life exciting, don’t they? Keep exploring!",
      audio: "VibeCap Avatar Voice Lines/Surprised Mood or Emotion/5.mp3",
    },
    {
      message:
        "A little surprise can lead to awesome things and new possibilities. Stay open!",
      audio: "VibeCap Avatar Voice Lines/Surprised Mood or Emotion/6.mp3",
    },
    {
      message:
        "I see you are surprised! Looks like you are full of wonder! What a moment!",
      audio: "VibeCap Avatar Voice Lines/Surprised Mood or Emotion/7.mp3",
    },
  ];

  const sadFeedbackMessages = [
    {
      message:
        "It seems you are feeling down. Remember, it's okay to have tough days and feel sad sometimes. You’ve got this!",
      audio: "VibeCap Avatar Voice Lines/Sad Mood or Emotion/1.mp3",
    },
    {
      message:
        "It’s tough right now, but you’ve got the strength to get through it. Remember, every storm passes.",
      audio: "VibeCap Avatar Voice Lines/Sad Mood or Emotion/2.mp3",
    },
    {
      message:
        "You are not alone in this. Take it one step at a time. You will find your strength soon.",
      audio: "VibeCap Avatar Voice Lines/Sad Mood or Emotion/3.mp3",
    },
    {
      message:
        "Sadness is temporary and does not define you. You’ve overcome challenges before, and you will again. Brighter days are ahead.",
      audio: "VibeCap Avatar Voice Lines/Sad Mood or Emotion/4.mp3",
    },
    {
      message:
        "Sending you virtual support. You are doing awesome than you think.",
      audio: "VibeCap Avatar Voice Lines/Sad Mood or Emotion/5.mp3",
    },
    {
      message:
        "Take it easy on yourself. You deserve kindness and care, even from yourself.",
      audio: "VibeCap Avatar Voice Lines/Sad Mood or Emotion/6.mp3",
    },
  ];

  const fearfulFeedbackMessages = [
    {
      message:
        "It's okay to feel anxious sometimes. Take a deep breath, you are safe here.",
      audio:
        "VibeCap Avatar Voice Lines/Fearful or Anxiety Mood or Emotion/1.mp3",
    },
    {
      message:
        "It seems you are feeling uneasy. You are stronger than this moment even when things feel overwhelming.",
      audio:
        "VibeCap Avatar Voice Lines/Fearful or Anxiety Mood or Emotion/2.mp3",
    },
    {
      message:
        "You’ve overcome challenges before, and you can handle this too.",
      audio:
        "VibeCap Avatar Voice Lines/Fearful or Anxiety Mood or Emotion/3.mp3",
    },
    {
      message:
        "You are more capable than you give yourself credit for. Don’t let fear hold you back.",
      audio:
        "VibeCap Avatar Voice Lines/Fearful or Anxiety Mood or Emotion/4.mp3",
    },
    {
      message:
        "Whatever’s worrying you, it’s going to be okay. Take it one moment at a time. You are strong enough to face it.",
      audio:
        "VibeCap Avatar Voice Lines/Fearful or Anxiety Mood or Emotion/5.mp3",
    },
    {
      message:
        "Even in fear, you can find your strength. Let’s get through this together.",
      audio:
        "VibeCap Avatar Voice Lines/Fearful or Anxiety Mood or Emotion/6.mp3",
    },
  ];

  const disgustedFeedbackMessages = [
    {
      message:
        "It seems like something really bothered you. Take a moment to reset.",
      audio: "VibeCap Avatar Voice Lines/Disgusted Mood or Emotion/1.mp3",
    },
    {
      message:
        "I can tell you are uncomfortable and you are allowed to feel uncomfortable. Take it one moment at a time.",
      audio: "VibeCap Avatar Voice Lines/Disgusted Mood or Emotion/2.mp3",
    },
    {
      message:
        "Not everything will sit right with you, and that’s perfectly fine.",
      audio: "VibeCap Avatar Voice Lines/Disgusted Mood or Emotion/3.mp3",
    },
    {
      message:
        "It’s okay to feel disgusted. Sometimes, that’s our body’s way of protecting us.",
      audio: "VibeCap Avatar Voice Lines/Disgusted Mood or Emotion/4.mp3",
    },
    {
      message: "Disgust can be a powerful sign to refocus. You are in control.",
      audio: "VibeCap Avatar Voice Lines/Disgusted Mood or Emotion/5.mp3",
    },
    {
      message: "This feeling will pass. You are doing great in managing it.",
      audio: "VibeCap Avatar Voice Lines/Disgusted Mood or Emotion/6.mp3",
    },
    {
      message:
        "Don’t let the feeling linger too long. You have the power to move forward.",
      audio: "VibeCap Avatar Voice Lines/Disgusted Mood or Emotion/7.mp3",
    },
  ];

  const angryFeedbackMessages = [
    {
      message:
        "It seems you are feeling angry. It’s okay to take a deep breath and reset.",
      audio: "VibeCap Avatar Voice Lines/Angry Mood or Emotion/1.mp3",
    },
    {
      message:
        "It’s natural to feel angry, but you are in control of your response. It’s okay to pause.",
      audio: "VibeCap Avatar Voice Lines/Angry Mood or Emotion/2.mp3",
    },
    {
      message:
        "I know it’s tough right now, but you’ve got the strength to stay calm. You are stronger than that.",
      audio: "VibeCap Avatar Voice Lines/Angry Mood or Emotion/3.mp3",
    },
    {
      message:
        "You are strong enough to handle this without letting anger take over.",
      audio: "VibeCap Avatar Voice Lines/Angry Mood or Emotion/4.mp3",
    },
    {
      message:
        "Your frustration is valid, but don’t let it define your day. You’ve got the ability to handle this with calm.",
      audio: "VibeCap Avatar Voice Lines/Angry Mood or Emotion/5.mp3",
    },
    {
      message:
        "You are doing a great job managing your anger with calm. Keep steady!",
      audio: "VibeCap Avatar Voice Lines/Angry Mood or Emotion/6.mp3",
    },
    {
      message:
        "Even in anger, you are capable of finding calm. You can channel it in positive ways. Let’s focus on that.",
      audio: "VibeCap Avatar Voice Lines/Angry Mood or Emotion/7.mp3",
    },
  ];

  const getRandomFeedbackMessage = (messages) => {
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  };

  const updateFeedbackMessage = (counts) => {
    const feedbackThreshold = 50;
    let updatedThresholds = { ...lastThresholds };

    const sortedEmotions = Object.entries(counts)
      .filter(([emotion, count]) => emotion !== "neutral" && count > 0)
      .sort(([, a], [, b]) => b - a);

    for (const [emotion, count] of sortedEmotions) {
      const currentThreshold = Math.floor(count / feedbackThreshold);
      const lastThreshold = lastThresholds[emotion] || 0;

      // Only trigger when a new threshold multiple is reached
      if (currentThreshold > lastThreshold && count >= feedbackThreshold) {
        updatedThresholds[emotion] = currentThreshold;
        let feedback = null;

        switch (emotion) {
          case "happy":
            feedback = getRandomFeedbackMessage(happyFeedbackMessages);
            break;
          case "sad":
            feedback = getRandomFeedbackMessage(sadFeedbackMessages);
            break;
          case "angry":
            feedback = getRandomFeedbackMessage(angryFeedbackMessages);
            break;
          case "surprised":
            feedback = getRandomFeedbackMessage(surprisedFeedbackMessages);
            break;
          case "disgusted":
            feedback = getRandomFeedbackMessage(disgustedFeedbackMessages);
            break;
          case "fearful":
            feedback = getRandomFeedbackMessage(fearfulFeedbackMessages);
            break;
        }

        if (feedback) {
          setFeedbackMessage(feedback.message);
          setFeedbackAudio(feedback.audio);
          setLastThresholds(updatedThresholds);
          console.log(
            `New threshold reached for ${emotion}: ${
              currentThreshold * feedbackThreshold
            }`
          );
          break;
        }
      }
    }
  };

  useEffect(() => {
    if (feedbackAudio) {
      // If there's already an audio instance playing, pause it
      if (feedbackAudioRef.current) {
        feedbackAudioRef.current.pause();
        feedbackAudioRef.current = null;
        setIsFeedbackAudioPlaying(false);
      }

      const audio = new Audio(feedbackAudio);
      feedbackAudioRef.current = audio;

      audio.play();
      setIsFeedbackAudioPlaying(true); // Audio is now playing

      // Add an event listener for when the audio ends
      const handleEnded = () => {
        setFeedbackAudio(null);
        setIsFeedbackAudioPlaying(false); // Audio has ended
        feedbackAudioRef.current = null;
      };

      audio.addEventListener("ended", handleEnded);

      // Clean up the event listener when component unmounts
      return () => {
        audio.removeEventListener("ended", handleEnded);
        // Do not pause the audio here to allow it to finish playing
      };
    }

    // Cleanup function to run when feedbackAudio becomes null or component unmounts
    return () => {
      if (feedbackAudioRef.current) {
        feedbackAudioRef.current.pause();
        feedbackAudioRef.current = null;
        setIsFeedbackAudioPlaying(false);
      }
    };
  }, [feedbackAudio]);

  const playSong = (songUrl) => {
    setCurrentSong(songUrl);
    setIsPlaying(true);
    audioRef.current.src = songUrl;
    audioRef.current.play();
  };

  const handleMusicPrompt = async (accept) => {
    setShowMusicPrompt(false);
    if (accept) {
      await fetchSongs(currentEmotion);
      console.log("Songs fetched for emotion:", currentEmotion);
      // Mark this emotion as accepted
      setAcceptedPrompts((prev) => {
        const newAcceptedPrompts = { ...prev, [currentEmotion]: true };
        // Save to local storage
        localStorage.setItem(
          "acceptedPrompts",
          JSON.stringify(newAcceptedPrompts)
        );
        return newAcceptedPrompts;
      });
      // Play the first song of the new playlist
      if (songs.length > 0) {
        console.log("Playing first song:", songs[0]);
        setCurrentSong(songs[0]);
        audioRef.current.src = songs[0];
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      // If user declines, resume playing the current song if it was playing before
      if (currentSong && isPlaying) {
        audioRef.current.play();
      }
    }
  };

  useEffect(() => {
    if (!audioRef.current) return;

    const handlePlaylistComplete = () => {
      const currentIndex = currentPlaylist.findIndex(
        (song) => song.url === currentSong
      );
      if (currentIndex === currentPlaylist.length - 1) {
        // Unlock playlist when current set finishes
        setIsPlaylistLocked(false);
        setIsPlaying(false);
      }
    };

    audioRef.current.addEventListener("ended", handlePlaylistComplete);
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener("ended", handlePlaylistComplete);
      }
    };
  }, [currentSong, currentPlaylist]);

  const handleStopPlayback = () => {
    setIsPlaying(false);
    setIsPlaylistLocked(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  };

  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const fetchSongs = async (emotion) => {
    let folderPath = "";
    switch (emotion) {
      case "sad":
        folderPath = "Sad Emotion (To make user calm)";
        break;
      case "angry":
        folderPath = "You might want to take a break first (Songs)";
        break;
      case "happy":
        folderPath = "Happy Emotion";
        break;
      case "fearful":
        folderPath = "Motivation Songs";
        break;
      case "surprised":
      case "disgusted":
        folderPath = "Happy Emotion";
        break;
      default:
        folderPath = "Happy Emotion";
    }

    const storageRef = ref(storage, folderPath);
    try {
      const result = await listAll(storageRef);
      const urlPromises = result.items.map(async (item) => {
        const url = await getDownloadURL(item);
        return { title: decodeSongTitle(url), url: url };
      });

      let songs = await Promise.all(urlPromises);
      // Shuffle and take only 3 songs
      songs = shuffleArray(songs).slice(0, 3);

      setCurrentPlaylist(songs);
      setCurrentPlaylistEmotion(emotion);

      // Start playing the first song automatically
      if (songs.length > 0) {
        setCurrentSong(songs[0].url);
        if (audioRef.current) {
          audioRef.current.src = songs[0].url;
          audioRef.current.play();
          setIsPlaying(true);
        }
      }
    } catch (error) {
      console.error("Error fetching songs:", error);
    }
  };

  const playPause = () => {
    if (!isClient) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.src = currentSong;
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const nextSong = () => {
    const currentIndex = songs.indexOf(currentSong);
    const nextIndex = (currentIndex + 1) % songs.length;
    setCurrentSong(songs[nextIndex]);
    if (isPlaying) {
      audioRef.current.src = songs[nextIndex];
      audioRef.current.play();
    }
  };

  const handleResetData = async () => {
    try {
      // Save mood data to Firebase
      const moodData = await getAllEmotionCounts();
      const firebaseData = {
        userId: user.uid,
        userName: user.displayName || user.email,
        emotions: moodData,
        timestamp: serverTimestamp(),
      };

      // Check if data for the current date and user ID already exists
      const currentDate = new Date().toISOString().split("T")[0];
      const q = query(
        collection(db, "mooddata"),
        where("userId", "==", user.uid),
        where("timestamp", ">=", new Date(currentDate)),
        where("timestamp", "<", new Date(currentDate + "T23:59:59.999Z"))
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // Update existing data
        const docId = querySnapshot.docs[0].id;
        await updateDoc(doc(db, "mooddata", docId), firebaseData);
      } else {
        // Add new data
        await addDoc(collection(db, "mooddata"), firebaseData);
      }

      console.log("Mood data saved to Firebase");

      // Clear IndexedDB data
      await resetEmotionCounts();
      setExpressionCount({});
      setFeedbackMessage("");
      setLastThresholds({});
      setOpenResetDialog(false);
      // Reset accepted prompts
      setAcceptedPrompts({});
      setCurrentEmotion("");
      setCurrentSong("");
      setCurrentTime(0);
      localStorage.removeItem("acceptedPrompts");
      toast.success("Successfully reset mood data", {
        position: "top-right",
        autoClose: 2000,
      });
    } catch (error) {
      console.error("Error resetting mood data:", error);
    }
  };

  useEffect(() => {
    const rotateAvatar = () => {
      const randomIndex =
        Math.floor(Math.random() * (avatarGifs.length - 1)) + 1;
      setCurrentAvatar(avatarGifs[randomIndex]);

      setTimeout(() => {
        setCurrentAvatar(avatarGifs[0]);
      }, 3000);
    };

    const intervalId = setInterval(rotateAvatar, 10000);

    return () => clearInterval(intervalId);
  }, []);

  const musicMessages = {
    happy: [
      "It’s wonderful to see you so happy. How about some cheerful music to match your mood?",
    ],
    sad: ["Would some calming music help you feel a little lighter?"],
    angry: [
      "How about some calming music to help release that tension? Would some calming music help you cool down?",
    ],
    fearful: [
      "How about some calming music to relax the tension? You deserve peace.",
    ],
    disgusted: [
      "A change in atmosphere might help. Would some refreshing music help shift your mindset?",
    ],
    surprised: [
      "You seem surprised! Surprises keep life interesting. How about some music to ride the wave?",
    ],
  };

  const handleSaveData = async () => {
    try {
      if (!indexedDB) {
        await openDB();
      }

      const moodData = await getAllEmotionCounts();
      const firebaseData = {
        userId: user.uid,
        userName: user.displayName || user.email,
        emotions: moodData,
        timestamp: serverTimestamp(),
        savedAt: new Date().toISOString(), // Add precise save time
      };

      // Always create a new document
      await addDoc(collection(db, "mooddata"), firebaseData);

      // Reset local data after saving
      await resetEmotionCounts();
      setExpressionCount({});
      setFeedbackMessage("");
      setLastThresholds({});
      setCurrentEmotion("");
      setCurrentSong("");
      setCurrentTime(0);
      localStorage.removeItem("acceptedPrompts");

      // Add success toast notification
      toast.success("Your mood data has been successfully saved!", {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    } catch (error) {
      console.error("Error saving mood data:", error);
      toast.error("Failed to save mood data. Please try again.", {
        position: "top-right",
        autoClose: 2000,
      });
    }
  };

  return isAuthorized ? (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />
      <div className="flex flex-1">
        <Sidebar
          isOpen={isOpen}
          toggleSidebar={toggleSidebar}
          feedbackMessage={feedbackMessage}
          setFeedbackMessage={setFeedbackMessage}
        />
        <main className="flex-1 p-4 sm:ml-72">
          <div className="container mx-auto">
            <div className="grid grid-cols-1 gap-6">
              {/* Combined Facial Recognition Module and Mood Counter */}
              <Card className="w-full">
                <CardHeader
                  variant="gradient"
                  color="white"
                  className="grid h-auto place-items-center shadow-none mt-4"
                >
                  <Typography variant="h5" color="blue-gray">
                    Mood Tracker & Mood Counter
                  </Typography>
                </CardHeader>
                <CardBody className="flex flex-col sm:flex-row gap-8">
                  {/* Facial Recognition Module */}
                  <div className="flex-1">
                    {isDetecting ? (
                      <>
                        <FaceDetection
                          expressionCount={expressionCount}
                          setExpressionCount={(newCount) => {
                            setExpressionCount(newCount);
                            updateFeedbackMessage(newCount);
                          }}
                          isDetecting={isDetecting}
                        />
                      </>
                    ) : (
                      <div className="flex justify-center">
                        The camera is disabled please start the detection
                      </div>
                    )}
                  </div>

                  {/* Mood Counter */}
                  <div className="flex-1 flex flex-col gap-4">
                    {Object.entries(expressionCount).map(
                      ([expression, count]) => (
                        <div key={expression} className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Typography variant="h6" className="capitalize">
                              {expression}
                            </Typography>
                            <Typography variant="h6" color="blue-gray">
                              {count}
                            </Typography>
                          </div>
                          <Progress
                            value={(count / getTotalCount()) * 100}
                            color={getProgressColor(expression)}
                            className="h-2"
                          />
                        </div>
                      )
                    )}
                  </div>
                </CardBody>
                <CardFooter className="flex justify-center gap-4">
                  {isDetecting ? (
                    <Button onClick={handleStopDetectionClick} color="red">
                      Disable Detection
                    </Button>
                  ) : (
                    <Button onClick={handleStartDetectionClick} color="green">
                      Start Detection
                    </Button>
                  )}
                  <Button onClick={handleSaveDataClick} color="blue">
                    Save Mood Data
                  </Button>
                  <Button onClick={() => setOpenResetDialog(true)} color="red">
                    Reset Mood Data
                  </Button>
                </CardFooter>
              </Card>

              {/* Combined Avatar and Music Player */}
              <Card className="w-full">
                <CardHeader
                  variant="gradient"
                  color="white"
                  className="grid h-auto place-items-center shadow-none mt-4"
                >
                  <Typography variant="h5" color="blue-gray">
                    Music Player
                  </Typography>
                </CardHeader>
                <CardBody className="flex flex-col sm:flex-row items-center gap-4">
                  {/* Music Player */}
                  <div className="flex-1 w-full max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
                    {currentPlaylistEmotion && (
                      <Typography
                        variant="h6"
                        color="blue"
                        className="mt-4 text-center mb-2"
                      >
                        {currentMusicMessage}
                      </Typography>
                    )}
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <Typography
                          variant="h6"
                          className="text-lg font-semibold"
                        >
                          Now Playing ({currentPlaylistEmotion}Playlist)
                        </Typography>
                        <Typography className="text-gray-600">
                          {currentSong
                            ? decodeSongTitle(currentSong)
                            : "No song selected"}
                        </Typography>
                      </div>
                      <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
                        <FaMusic className="h-8 w-8" />
                      </div>
                    </div>
                    {currentSong && (
                      <>
                        <div
                          className="w-full bg-gray-200 rounded-full h-2 mb-4 cursor-pointer"
                          onClick={handleSeek}
                        >
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${(currentTime / duration) * 100}%`,
                            }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-sm font-medium text-gray-600 mb-4">
                          <span>{formatTime(currentTime)}</span>
                          <span>{formatTime(duration)}</span>
                        </div>
                        <div className="flex justify-center items-center gap-6 mb-6">
                          <button
                            onClick={previousSong}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <BackwardIcon className="h-8 w-8" />
                          </button>
                          <button
                            onClick={playPause}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {isPlaying ? (
                              <PauseCircleIcon className="h-16 w-16" />
                            ) : (
                              <PlayCircleIcon className="h-16 w-16" />
                            )}
                          </button>
                          <button
                            onClick={nextSong}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            <ForwardIcon className="h-8 w-8" />
                          </button>
                        </div>
                      </>
                    )}
                    <div className="mt-4">
                      <Typography variant="h6" className="mb-2">
                        Playlist
                      </Typography>
                      <div className="max-h-48 overflow-y-auto">
                        {currentPlaylist.map((song, index) => (
                          <div
                            key={index}
                            className={`flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer ${
                              currentSong === song.url ? "bg-blue-100" : ""
                            }`}
                            onClick={() => playSong(song.url)}
                          >
                            <Typography className="text-sm truncate mr-2">
                              {song.title}
                            </Typography>
                            {currentSong === song.url && isPlaying && (
                              <div className="w-4 h-4 rounded-full bg-blue-500 animate-pulse"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {showMusicPrompt && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
                        <DialogHeader>Music Suggestion</DialogHeader>
                        <DialogBody>
                          We have noticed that you are feeling {currentEmotion}.
                          Would you like to listen to some music that might
                          help?
                        </DialogBody>
                        <DialogFooter>
                          <Button
                            variant="text"
                            color="red"
                            onClick={() => handleMusicPrompt(false)}
                            className="mr-1"
                          >
                            <span>No, thanks</span>
                          </Button>
                          <Button
                            variant="gradient"
                            color="green"
                            onClick={() => handleMusicPrompt(true)}
                          >
                            <span>Yes, play music</span>
                          </Button>
                        </DialogFooter>
                      </div>
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        </main>
        <ToastContainer />
      </div>

      {/* Reset Data Confirmation Dialog */}
      <Dialog open={openResetDialog} handler={() => setOpenResetDialog(false)}>
        <DialogHeader>Confirm Reset</DialogHeader>
        <DialogBody>
          Are you sure you want to reset the mood data? This action cannot be
          undone.
        </DialogBody>
        <DialogFooter>
          <Button
            variant="text"
            color="red"
            onClick={() => setOpenResetDialog(false)}
            className="mr-1"
          >
            <span>Cancel</span>
          </Button>
          <Button variant="gradient" color="green" onClick={handleResetData}>
            <span>Confirm</span>
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={openStartDialog} handler={() => setOpenStartDialog(false)}>
        <DialogHeader>Start Detection</DialogHeader>
        <DialogBody>
          Are you sure you want to start detecting your mood?
        </DialogBody>
        <DialogFooter>
          <Button
            variant="text"
            color="red"
            onClick={() => setOpenStartDialog(false)}
            className="mr-1"
          >
            <span>Cancel</span>
          </Button>
          <Button
            variant="gradient"
            color="green"
            onClick={() => {
              handleStartDetection();
              setOpenStartDialog(false);
            }}
          >
            <span>Confirm</span>
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={openStopDialog} handler={() => setOpenStopDialog(false)}>
        <DialogHeader>Stop Detection</DialogHeader>
        <DialogBody>
          Are you sure you want to stop detecting your mood?
        </DialogBody>
        <DialogFooter>
          <Button
            variant="text"
            color="red"
            onClick={() => setOpenStopDialog(false)}
            className="mr-1"
          >
            <span>Cancel</span>
          </Button>
          <Button
            variant="gradient"
            color="green"
            onClick={() => {
              handleStopDetection();
              setOpenStopDialog(false);
            }}
          >
            <span>Confirm</span>
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog open={openSaveDialog} handler={() => setOpenSaveDialog(false)}>
        <DialogHeader>Save Mood Data</DialogHeader>
        <DialogBody>Are you sure you want to save your mood data?</DialogBody>
        <DialogFooter>
          <Button
            variant="text"
            color="red"
            onClick={() => setOpenSaveDialog(false)}
            className="mr-1"
          >
            <span>Cancel</span>
          </Button>
          <Button
            variant="gradient"
            color="green"
            onClick={() => {
              handleSaveData();
              setOpenSaveDialog(false);
            }}
          >
            <span>Confirm</span>
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  ) : null;
}
