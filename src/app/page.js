"use client";
import React, { useState, useEffect } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  Button,
  Card,
  Input,
  Typography,
  Spinner,
  Alert,
  IconButton,
  CardFooter,
} from "@material-tailwind/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { auth, db } from "../app/firebase";
import { isAuthenticated } from "../app/utils/auth";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { addDoc, collection, getDocs, query, where } from "firebase/firestore";

export default function SigninPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const auth = getAuth();

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      const userQuery = query(
        collection(db, "userData"),
        where("user_id", "==", userCredential.user.uid)
      );
      const userSnapshot = await getDocs(userQuery);
      const userData = userSnapshot.docs[0].data();

      // Log the login activity
      await addDoc(collection(db, "userLogs"), {
        name: userData.name,
        email: email,
        action: "User Login",
        timestamp: new Date(),
        user_id: userCredential.user.uid,
      });

      const roleMap = {
        user: "/user",
        admin: "/admin",
      };
      for (const role of Object.keys(roleMap)) {
        const hasRole = await isAuthenticated(role);
        if (hasRole) {
          router.push(roleMap[role]);
          return;
        }
      }
      toast.error("User does not have a valid role");
    } catch (error) {
      toast.error("Wrong email or password!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <Card className="w-96 p-6">
        <div className="flex justify-center">
          <Image
            src="/VibeCap Register and Sign In.png"
            width={200}
            height={200}
            alt="Logo Picture"
          />
        </div>
        <Typography variant="h4" className="mb-6 mt-4 text-center text-black">
          Sign in to your account
        </Typography>
        <form onSubmit={handleSignIn}>
          <div className="mb-4">
            <Input
              type="email"
              label="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <div className="relative flex w-full max-w-[24rem]">
              <Input
                type={showPassword ? "text" : "password"}
                label="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-20"
                containerProps={{
                  className: "min-w-0",
                }}
              />
              <IconButton
                variant="text"
                size="sm"
                className="!absolute right-1 top-1 rounded"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-40" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-40" />
                )}
              </IconButton>
            </div>
          </div>
          <div className="flex justify-center">
            <Button type="submit" color="blue" fullWidth disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </div>
          <CardFooter className="pt-0">
            <Typography variant="small" className="mt-2 flex justify-center">
              <Link
                href="/forgotpassword"
                className="text-blue-500 hover:text-blue-700"
              >
                Forgot Password?
              </Link>
            </Typography>

            <Typography variant="small" className=" mt-2 flex justify-center">
              Do you want to join us?
              <Link
                href="/register"
                className="ml-1 font-bold text-blue-500 hover:text-blue-700"
              >
                Sign up
              </Link>
            </Typography>
          </CardFooter>
        </form>
      </Card>
      <ToastContainer />
    </div>
  );
}
