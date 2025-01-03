"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Input,
  Button,
  Card,
  CardBody,
  CardFooter,
  Typography,
} from "@material-tailwind/react";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { getFirestore, addDoc, collection } from "firebase/firestore";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { auth } from "../firebase";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

export default function Register() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const [passwordCriteria, setPasswordCriteria] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecial: false,
  });

  const validatePassword = (password) => {
    const criteria = {
      minLength: password.length >= 8,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(password),
    };
    setPasswordCriteria(criteria);
    return Object.values(criteria).every(Boolean);
  };

  const validateContact = (contact) => {
    const contactRegex = /^\d{11}$/;
    return contactRegex.test(contact);
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setPassword(newPassword);
    validatePassword(newPassword);
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    if (!validatePassword(password)) {
      toast.error(
        "Password must contain at least 8 characters, including uppercase, lowercase, numbers, and special characters (#?!@$%^&*-)"
      );
      return;
    }

    if (!validateContact(contact)) {
      toast.error(
        "Mobile number must be exactly 11 digits (Example: 09123456789)"
      );
      return;
    }

    setIsLoading(true);
    const auth = getAuth();
    try {
      const userCredentials = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredentials.user;
      const db = getFirestore();
      await addDoc(collection(db, "userData"), {
        name: name,
        contact: contact,
        email: email,
        role: "user",
        user_id: user.uid,
      });
      await addDoc(collection(db, "userLogs"), {
        name: name,
        email: email,
        action: "User Registration",
        timestamp: new Date(),
        user_id: user.uid,
      });
      toast.success("Account created successfully", {
        onClose: () => router.push("/"),
      });
    } catch (error) {
      toast.error("Something went wrong!");
    } finally {
      setIsLoading(false);
    }
  };

  const CriteriaItem = ({ met, text }) => (
    <div className="flex items-center gap-2 text-sm">
      {met ? (
        <CheckCircleIcon className="h-4 w-4 text-green-500" />
      ) : (
        <XCircleIcon className="h-4 w-4 text-red-500" />
      )}
      <span className={`${met ? "text-green-500" : "text-red-500"} text-xs`}>
        {text}
      </span>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-100 justify-center items-center px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <div className="flex justify-center mt-6">
          <Image
            src="/VibeCap Register and Sign In.png"
            width={150}
            height={150}
            alt="VibeCap Logo"
          />
        </div>
        <CardBody className="flex flex-col gap-4">
          <Typography variant="h4" color="blue-gray" className="text-center">
            Create an account
          </Typography>
          <Typography color="gray" className="text-center font-normal">
            Enter your details to get started.
          </Typography>
          <form onSubmit={handleRegister} className="mt-4 space-y-4">
            <Input
              label="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              size="lg"
            />
            <Input
              label="Phone number"
              value={contact}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "").slice(0, 11);
                setContact(value);
              }}
              required
              size="lg"
              type="tel"
              pattern="[0-9]{11}"
            />
            <Input
              type="email"
              label="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              size="lg"
            />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                label="Password"
                value={password}
                onChange={(e) => {
                  const newPassword = e.target.value;
                  setPassword(newPassword);
                  validatePassword(newPassword); // This makes it real-time
                }}
                required
                size="lg"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                {showPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-40" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-40" />
                )}
              </button>
            </div>

            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                label="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                size="lg"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3"
              >
                {showConfirmPassword ? (
                  <EyeSlashIcon className="h-5 w-5 text-gray-40" />
                ) : (
                  <EyeIcon className="h-5 w-5 text-gray-40" />
                )}
              </button>
            </div>
            <div className="mt-2 space-y-1 bg-gray-50 p-2 rounded">
              <CriteriaItem
                met={passwordCriteria.minLength}
                text="At least 8 characters"
              />
              <CriteriaItem
                met={passwordCriteria.hasUpperCase}
                text="Contains uppercase letter"
              />
              <CriteriaItem
                met={passwordCriteria.hasLowerCase}
                text="Contains lowercase letter"
              />
              <CriteriaItem
                met={passwordCriteria.hasNumber}
                text="Contains number"
              />
              <CriteriaItem
                met={passwordCriteria.hasSpecial}
                text="Contains special character"
              />
            </div>

            <Button type="submit" color="blue" fullWidth disabled={isLoading}>
              {isLoading ? "Loading..." : "Register"}
            </Button>
          </form>
        </CardBody>

        <CardFooter className="pt-0">
          <Typography variant="small" className=" flex justify-center">
            Already have an account?
            <Link
              href="/"
              className="ml-1 font-bold text-blue-500 hover:text-blue-700"
            >
              Sign in
            </Link>
          </Typography>
        </CardFooter>
      </Card>
      <ToastContainer />
    </div>
  );
}
