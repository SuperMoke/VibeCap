import { NextResponse } from "next/server";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY,
    }),
  });
}

export async function DELETE(request) {
  try {
    const { uid } = await request.json();
    const auth = getAuth();

    await auth.deleteUser(uid);

    const db = getFirestore();
    const userQuery = await db
      .collection("userData")
      .where("user_id", "==", uid)
      .get();

    if (!userQuery.empty) {
      const userDoc = userQuery.docs[0];
      await userDoc.ref.delete();
    }

    return NextResponse.json(
      { message: "User deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
