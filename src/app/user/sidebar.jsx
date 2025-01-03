import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Typography,
  Button,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@material-tailwind/react";
import {
  HomeIcon,
  UserIcon,
  FaceSmileIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
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

export default function Sidebar({
  isOpen,
  toggleSidebar,
  feedbackMessage,
  setFeedbackMessage,
}) {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [openDialog, setOpenDialog] = useState(false);
  const router = useRouter();
  const [currentAvatar, setCurrentAvatar] = useState("/Avatar_VibeCap-New.gif");
  const [isAvatarLoading, setIsAvatarLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const avatarGifs = [
      "/VibeCap Avatar/1.gif",
      "/VibeCap Avatar/2.gif",
      "/VibeCap Avatar/3.gif",
      "/VibeCap Avatar/4.gif",
      "/VibeCap Avatar/5.gif",
    ];

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

  const formatDate = (date) => {
    const options = { month: "long", day: "numeric", year: "numeric" };
    return date.toLocaleDateString("en-US", options);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleLogout = () => {
    setOpenDialog(true);
    const logoutAudio = new Audio(
      "/Are you sure you want to leave VibeCap_ Dont worry_ your data will be saved once done.mp3"
    );
    logoutAudio.play();
  };

  const confirmLogout = async () => {
    const user = auth.currentUser;
    if (user) {
      const moodData = await fetchMoodDataFromIndexedDB();
      const firebaseData = {
        userId: user.uid,
        userName: user.displayName || user.email,
        emotions: moodData,
        timestamp: serverTimestamp(),
      };

      try {
        // Save mood data
        const currentDate = new Date().toISOString().split("T")[0];
        const moodQuery = query(
          collection(db, "mooddata"),
          where("userId", "==", user.uid),
          where("timestamp", ">=", new Date(currentDate)),
          where("timestamp", "<", new Date(currentDate + "T23:59:59.999Z"))
        );
        const moodSnapshot = await getDocs(moodQuery);

        if (!moodSnapshot.empty) {
          await updateDoc(
            doc(db, "mooddata", moodSnapshot.docs[0].id),
            firebaseData
          );
        } else {
          await addDoc(collection(db, "mooddata"), firebaseData);
        }

        // Handle attendance timeOut
        const today = new Date().toISOString().split("T")[0];
        const attendanceQuery = query(
          collection(db, "attendance"),
          where("userId", "==", user.uid)
        );

        const attendanceSnapshot = await getDocs(attendanceQuery);

        const updatePromises = attendanceSnapshot.docs.map((doc) =>
          updateDoc(doc.ref, {
            timeOut: serverTimestamp(),
          })
        );

        await Promise.all(updatePromises);

        // Clear IndexedDB
        await clearIndexedDB();

        // Proceed with signOut
        await signOut(auth);
        router.push("/");
      } catch (error) {
        console.error("Error during logout process:", error);
      }
    }
  };

  const fetchMoodDataFromIndexedDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("EmotionDB", 1);

      request.onerror = (event) => {
        reject("Error opening IndexedDB: " + event.target.error);
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(["emotions"], "readonly");
        const store = transaction.objectStore("emotions");
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = (event) => {
          const result = event.target.result.reduce((acc, item) => {
            acc[item.emotion] = item.count;
            return acc;
          }, {});
          resolve(result);
        };

        getAllRequest.onerror = (event) => {
          reject("Error fetching emotion counts: " + event.target.error);
        };
      };
    });
  };

  const clearIndexedDB = () => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("EmotionDB", 1);

      request.onerror = (event) => {
        reject("Error opening IndexedDB: " + event.target.error);
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(["emotions"], "readwrite");
        const store = transaction.objectStore("emotions");
        const clearRequest = store.clear();

        clearRequest.onsuccess = (event) => {
          console.log("IndexedDB cleared successfully");
          resolve();
        };

        clearRequest.onerror = (event) => {
          reject("Error clearing IndexedDB: " + event.target.error);
        };
      };
    });
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 sm:hidden"
          onClick={toggleSidebar}
        ></div>
      )}
      <div className="relative">
        <aside
          className={`bg-gradient-to-b from-blue-600 to-blue-400 text-white shadow-lg w-72 h-screen fixed left-0 top-0 p-6 transition-transform duration-300 ease-in-out z-50 flex flex-col ${
            isOpen ? "translate-x-0" : "-translate-x-full"
          } sm:translate-x-0`}
        >
          <div className="flex justify-center items-center mb-8">
            <div className="w-1/2 p-4 bg-white  rounded-xl shadow-md">
              <Image
                src="/VibeCap_Logo.png"
                width={300}
                height={300}
                alt="Logo"
              />
            </div>
          </div>
          <nav className="flex-grow">
            <ul className="space-y-4">
              {[
                { href: "/user", icon: HomeIcon, text: "Home" },
                { href: "/user/user_profile", icon: UserIcon, text: "Profile" },
                {
                  href: "/user/user_moodsummary",
                  icon: FaceSmileIcon,
                  text: "Mood Summary",
                },
              ].map((item, index) => (
                <li key={index}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-4 p-3 hover:bg-white hover:bg-opacity-20 rounded-lg transition-all duration-200 ease-in-out"
                    onClick={toggleSidebar}
                  >
                    <item.icon className="h-6 w-6" />
                    <Typography className="text-lg font-medium">
                      {item.text}
                    </Typography>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col items-center mb-4 relative">
            {feedbackMessage && (
              <div className="speech-bubble mb-2 bg-white text-blue-600 p-3 rounded-lg relative max-w-[180px] mx-2">
                <Typography variant="small" className="text-center text-sm">
                  {feedbackMessage}
                </Typography>
              </div>
            )}

            <div className="flex justify-center items-center relative">
              {isAvatarLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
                </div>
              )}
              <Image
                src={currentAvatar}
                alt="VibeCap Avatar"
                width={120}
                height={120}
                onLoad={() => setIsAvatarLoading(false)}
                className={`
        ${
          isAvatarLoading
            ? "opacity-0"
            : "opacity-100 transition-opacity duration-300"
        }
        z-10
      `}
              />
            </div>
          </div>

          <div className="mt-auto space-y-4">
            <div className="text-center">
              <Typography className="text-sm opacity-75">
                {formatDate(currentDateTime)}
              </Typography>
              <Typography className="text-xl font-bold">
                {formatTime(currentDateTime)}
              </Typography>
            </div>
            <Button
              color="white"
              className="w-full py-3 text-blue-600 hover:bg-blue-50 transition-all duration-200 ease-in-out"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </aside>
        {isOpen && (
          <button
            className="sm:hidden absolute top-4 right-4 z-50 p-2 rounded-full bg-white text-blue-600 hover:bg-blue-50 transition-all duration-200 ease-in-out"
            onClick={toggleSidebar}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Logout Confirmation Dialog */}
      <Dialog open={openDialog} handler={() => setOpenDialog(false)}>
        <DialogHeader>Save Data Before Logout?</DialogHeader>
        <DialogBody>
          Are you sure you want to leave VibeCap? Dont worry your data will be
          saved once done.
        </DialogBody>
        <DialogFooter>
          <Button
            variant="text"
            color="red"
            onClick={() => setOpenDialog(false)}
            className="mr-1"
          >
            <span>Cancel</span>
          </Button>
          <Button variant="gradient" color="green" onClick={confirmLogout}>
            <span>Save and Logout</span>
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
