"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Typography,
  Card,
  Input,
  Button,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
} from "@material-tailwind/react";
import Image from "next/image";
import {
  getFirestore,
  getDocs,
  query,
  collection,
  where,
  updateDoc,
  onSnapshot,
} from "firebase/firestore";
import { auth, db, storage } from "../../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  EmailAuthProvider,
  getAuth,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "../../utils/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import Header from "../header";
import Sidebar from "../sidebar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

export default function AdminProfile() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [profileUrl, setProfileUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();
  const [user, loading, error] = useAuthState(auth);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [showEditConfirmation, setShowEditConfirmation] = useState(false);
  const [showPasswordConfirmation, setShowPasswordConfirmation] =
    useState(false);
  const fileInputRef = useRef();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      console.log("User is not authenticated, redirecting to home...");
      router.push("/");
      return;
    }
    const checkAuth = async () => {
      const authorized = await isAuthenticated("admin");
      setIsAuthorized(authorized);
    };
    checkAuth();
  }, [user, loading, router]);

  const validatePassword = (password) => {
    const passwordRegex =
      /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;
    return passwordRegex.test(password);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        auth.onAuthStateChanged(async (currentUser) => {
          if (currentUser) {
            const userEmail = currentUser.email;
            console.log("User email:", userEmail);
            const db = getFirestore();
            const userQuery = query(
              collection(db, "userData"),
              where("email", "==", userEmail)
            );
            const unsubscribe = onSnapshot(userQuery, (querySnapshot) => {
              if (!querySnapshot.empty) {
                querySnapshot.forEach((doc) => {
                  const userData = doc.data();
                  setName(userData.name);
                  setEmail(userData.email);
                  setProfileUrl(userData.profileUrl);
                });
              } else {
                console.error("User not found or role not specified");
              }
            });
            return () => unsubscribe(); // Cleanup listener on component unmount
          }
        });
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };
    fetchUserData();
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

    if (file && allowedTypes.includes(file.type)) {
      setProfilePhoto(file);
    } else {
      toast.error("Please select a valid image file (JPEG, PNG, GIF, or WEBP)");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const userRef = collection(db, "userData");
      const userQuery = query(userRef, where("email", "==", email));
      const userSnapshot = await getDocs(userQuery);

      if (!userSnapshot.empty) {
        userSnapshot.forEach(async (doc) => {
          await updateDoc(doc.ref, {
            name: editedName || name,
          });
        });
        setName(editedName || name);
        setShowEditConfirmation(false);
        setEditedName("");
        toast.success("Name successfully updated!");
      }
    } catch (error) {
      toast.error("Error updating name");
      console.error("Error updating name:", error);
    }
  };

  const handleUpload = async () => {
    if (!profilePhoto) return;
    try {
      const storageRef = ref(storage, "profileImages/" + profilePhoto.name);
      await uploadBytes(storageRef, profilePhoto);
      const downloadURL = await getDownloadURL(storageRef);
      console.log("Image uploaded:", downloadURL);
      const db = getFirestore();
      const userRef = collection(db, "userData");
      const userQuery = query(userRef, where("email", "==", email));
      const userSnapshot = await getDocs(userQuery);
      if (!userSnapshot.empty) {
        userSnapshot.forEach(async (doc) => {
          const userDocRef = doc.ref;
          try {
            await updateDoc(userDocRef, {
              profileUrl: downloadURL,
            });
            console.log("Profile URL updated in Firestore");
            toast.success("Profile photo successfully updated!");
          } catch (error) {
            console.error("Error updating profile URL:", error);
          }
        });
      } else {
        console.error("User not found");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  };

  const handleChangePassword = async () => {
    try {
      const auth = getAuth();
      const user = auth.currentUser;

      if (!validatePassword(newPassword)) {
        toast.error(
          "Password must contain at least 8 characters, including uppercase, lowercase, numbers, and special characters (#?!@$%^&*-)"
        );
        return;
      }

      if (newPassword !== confirmPassword) {
        toast.error("Your new passwords do not match!");
        return;
      }

      const Emailcredential = EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      await reauthenticateWithCredential(user, Emailcredential);

      await updatePassword(user, newPassword);
      toast.success("Password successfully updated!");

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      if (error.code === "auth/wrong-password") {
        toast.error("Error updating password: " + error.message);
      } else {
        toast.error("Your current password is incorrect!");
      }
    }
  };

  return isAuthorized ? (
    <>
      <div className="bg-blue-gray-50 min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-4 sm:ml-64">
            <div className="container mx-auto">
              <Typography variant="h2" className="mb-8 text-center">
                Admin Profile
              </Typography>
              <div className="flex flex-wrap justify-center gap-6">
                <Card className="w-96 p-8">
                  <div className="flex justify-center mb-6">
                    {profileUrl ? (
                      <Image
                        src={profileUrl}
                        width={200}
                        height={200}
                        alt="User Picture"
                        className="w-40 h-40 rounded-full object-cover"
                      />
                    ) : (
                      <Image
                        src="/user_profile.png"
                        width={200}
                        height={200}
                        alt="User Picture"
                        className="w-40 h-40 rounded-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex flex-col space-y-5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg, image/png, image/gif, image/webp"
                      onChange={handleFileChange}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                    <Button
                      color="blue"
                      className="w-full py-3 text-white transition-all duration-200 ease-in-out"
                      onClick={handleUpload}
                      disabled={!profilePhoto}
                    >
                      Upload Profile Photo
                    </Button>
                  </div>
                  <Typography color="gray" className="font-normal mt-6 mb-2">
                    Full name:
                  </Typography>
                  {isEditing ? (
                    <Input
                      type="text"
                      value={editedName || name}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="mb-4"
                    />
                  ) : (
                    <Typography color="gray" className="font-bold mb-4">
                      {name}
                    </Typography>
                  )}

                  <Typography className="font-normal mb-2">Email:</Typography>
                  <Typography color="gray" className="font-bold mb-4">
                    {email}
                  </Typography>
                </Card>
                <Card className="w-96 p-8">
                  <Typography
                    color="gray"
                    className="text-xl font-bold mb-8 mt-24 text-center"
                  >
                    Change Password
                  </Typography>
                  <div className="flex flex-col space-y-6">
                    <div className="relative">
                      <Input
                        label="Enter current password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full" // Ensure full width
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                      >
                        {showCurrentPassword ? (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        label="Enter new password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                      >
                        {showNewPassword ? (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        label="Confirm new password"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                      >
                        {showConfirmPassword ? (
                          <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                        ) : (
                          <EyeIcon className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button
                    color="blue"
                    className="mt-8 w-full py-3 text-white transition-all duration-200 ease-in-out" // Increased top margin
                    onClick={handleChangePassword}
                  >
                    Update Password
                  </Button>
                </Card>
              </div>
            </div>
          </main>
        </div>
      </div>
      <Dialog
        open={showEditConfirmation}
        handler={() => setShowEditConfirmation(false)}
      >
        <DialogHeader>Confirm Changes</DialogHeader>
        <DialogBody>Are you sure you want to keep these changes?</DialogBody>
        <DialogFooter>
          <Button
            variant="text"
            color="red"
            onClick={() => setShowEditConfirmation(false)}
            className="mr-1"
          >
            Cancel
          </Button>
          <Button
            variant="gradient"
            color="green"
            onClick={handleUpdateProfile}
          >
            Confirm
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        open={showPasswordConfirmation}
        handler={() => setShowPasswordConfirmation(false)}
      >
        <DialogHeader>Confirm Password Change</DialogHeader>
        <DialogBody>
          Are you sure you want to keep your new password?
        </DialogBody>
        <DialogFooter>
          <Button
            variant="text"
            color="red"
            onClick={() => setShowPasswordConfirmation(false)}
            className="mr-1"
          >
            Cancel
          </Button>
          <Button
            variant="gradient"
            color="green"
            onClick={handleChangePassword}
          >
            Confirm
          </Button>
        </DialogFooter>
      </Dialog>
      <ToastContainer />
    </>
  ) : null;
}
