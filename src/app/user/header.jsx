import React, { useState, useEffect } from "react";
import {
  Avatar,
  Menu,
  MenuHandler,
  MenuList,
  MenuItem,
  Typography,
  IconButton,
  Button,
} from "@material-tailwind/react";
import {
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
} from "@heroicons/react/24/outline";
import {
  getFirestore,
  getDocs,
  query,
  collection,
  where,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { auth } from "../firebase";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [userName, setUserName] = useState("");
  const [profileUrl, setProfileUrl] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        auth.onAuthStateChanged(async (currentUser) => {
          if (currentUser) {
            const userEmail = currentUser.email;
            const db = getFirestore();
            const userQuery = query(
              collection(db, "userData"),
              where("email", "==", userEmail)
            );
            const unsubscribe = onSnapshot(userQuery, (querySnapshot) => {
              if (!querySnapshot.empty) {
                querySnapshot.forEach((doc) => {
                  const userData = doc.data();
                  setUserName(userData.name);
                  setProfileUrl(userData.profileUrl);
                });
              } else {
                console.error("User not found or role not specified");
              }
            });
            return () => unsubscribe();
          }
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserData();
  }, []);

  const router = useRouter();
  function handleLogout() {
    signOut(auth)
      .then(() => {
        console.log("User signed out");
        router.push("/");
      })
      .catch((error) => {
        console.error("Error signing out:", error);
      });
  }

  return (
    <header className="bg-white shadow-md py-4 px-4 sm:px-10 flex justify-between items-center">
      <div className="flex items-center space-x-4 ml-auto">
        <Menu open={isMenuOpen} handler={setIsMenuOpen} placement="bottom-end">
          <MenuHandler>
            <Link
              href="/user/user_profile"
              className="flex items-center space-x-2 cursor-pointer"
            >
              {profileUrl ? (
                <Image
                  src={profileUrl}
                  width={200}
                  height={200}
                  alt="User Picture"
                  className="w-10 h-15 rounded-full object-cover"
                />
              ) : (
                <Image
                  src="/user_profile.png"
                  width={200}
                  height={200}
                  alt="User Picture"
                  className="w-10 h-15 rounded-full object-cover"
                />
              )}
              <Typography
                variant="small"
                className="text-base hidden sm:block "
              >
                {userName}
              </Typography>
            </Link>
          </MenuHandler>
        </Menu>
      </div>
    </header>
  );
}
