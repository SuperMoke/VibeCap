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
  ClipboardDocumentIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth, db } from "../firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export default function Sidebar({ isOpen, toggleSidebar }) {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [openDialog, setOpenDialog] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
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

  const handleLogout = async () => {
    const user = auth.currentUser;

    signOut(auth)
      .then(() => {
        console.log("User signed out");
        router.push("/");
      })
      .catch((error) => {
        console.error("Error signing out:", error);
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
            <div className="w-1/2 p-4 bg-white rounded-xl shadow-md">
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
                { href: "/admin", icon: HomeIcon, text: "Home" },
                {
                  href: "/admin/admin_profile",
                  icon: UserIcon,
                  text: "Profile",
                },
                {
                  href: "/admin/admin_userlogstracking",
                  icon: UsersIcon,
                  text: "User Logs Tracking",
                },
                {
                  href: "/admin/admin_logs",
                  icon: ClipboardDocumentIcon,
                  text: "System Logs",
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
    </>
  );
}
