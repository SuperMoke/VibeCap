import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../firebase";

export const isAuthenticated = async (requiredRole) => {
  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) {
    return false;
  }
  if (!requiredRole) {
    return true;
  }
  const userCollectionRef = collection(db, "userData");
  const userQuery = query(userCollectionRef, where("email", "==", user.email));
  const userQuerySnapshot = await getDocs(userQuery);
  if (!userQuerySnapshot.empty) {
    const userDoc = userQuerySnapshot.docs[0];
    const userData = userDoc.data();
    return userData.role === requiredRole;
  }
  return false;
};