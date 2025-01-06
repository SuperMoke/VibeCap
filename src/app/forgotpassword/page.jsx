"use client";
import React, { useState } from "react";
import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import {
  Button,
  Card,
  Input,
  Typography,
  CardFooter,
} from "@material-tailwind/react";
import Image from "next/image";
import Link from "next/link";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const getErrorMessage = (errorCode) => {
  switch (errorCode) {
    case "auth/invalid-email":
      return "The email address is not valid.";
    case "auth/user-not-found":
      return "No account exists with this email address.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    default:
      return "An error occurred while sending the reset email. Please try again.";
  }
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const auth = getAuth();

    try {
      await sendPasswordResetEmail(auth, email);
      toast.success("Password reset email sent! Check your inbox.");
      setEmail("");
    } catch (error) {
      const errorMessage = getErrorMessage(error.code);
      toast.error(errorMessage, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
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
          Reset Password
        </Typography>
        <form onSubmit={handleResetPassword}>
          <div className="mb-4">
            <h2 className="text-black text-sm font-normal mb-2">Email:</h2>
            <Input
              type="email"
              label="Enter Your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-center">
            <Button type="submit" color="blue" fullWidth disabled={isLoading}>
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>
          </div>
          <CardFooter className="pt-0">
            <Typography variant="small" className="mt-2 flex justify-center">
              Remember your password?
              <Link
                href="/"
                className="ml-1 font-bold text-blue-500 hover:text-blue-700"
              >
                Sign in
              </Link>
            </Typography>
          </CardFooter>
        </form>
      </Card>
      <ToastContainer />
    </div>
  );
}
