"use client";
import React, { useState, useEffect } from "react";
import { Card, Typography, Input } from "@material-tailwind/react";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

import Sidebar from "../sidebar";
import Header from "../header";

export default function AttendancePage() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const TABLE_HEAD = ["Full Name", "Email", "Time In", "Time Out", "Duration"];

  const calculateDuration = (timeIn, timeOut) => {
    if (!timeIn || !timeOut) return "N/A";
    const diff = timeOut.toDate() - timeIn.toDate();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // Fetch attendance data
  useEffect(() => {
    // Create query with exact date match
    const q = query(
      collection(db, "attendance"),
      where("date", "==", selectedDate)
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const userAttendance = {};

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const userId = data.userId;

        if (!userAttendance[userId]) {
          userAttendance[userId] = {
            fullName: data.fullName,
            email: data.email,
            timeIn: data.timeIn,
            timeOut: data.timeOut,
            records: [],
          };
        }

        userAttendance[userId].records.push({
          timeIn: data.timeIn,
          timeOut: data.timeOut,
        });

        // Update earliest timeIn
        if (
          !userAttendance[userId].timeIn ||
          data.timeIn.toDate() < userAttendance[userId].timeIn.toDate()
        ) {
          userAttendance[userId].timeIn = data.timeIn;
        }

        // Update latest timeOut
        if (
          data.timeOut &&
          (!userAttendance[userId].timeOut ||
            data.timeOut.toDate() > userAttendance[userId].timeOut.toDate())
        ) {
          userAttendance[userId].timeOut = data.timeOut;
        }
      });

      // Convert to array format for table display
      const aggregatedData = Object.values(userAttendance);
      setAttendanceData(aggregatedData);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [selectedDate]);

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:ml-72">
          <div className="container mx-auto">
            <div className="flex flex-col justify-center gap-6">
              <Typography variant="h2" className="text-center">
                User Logs Tracking
              </Typography>
              <div className="flex justify-end mb-4">
                <div className="w-72">
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
              </div>

              <Card className="w-full shadow-lg rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full table-auto">
                    <thead>
                      <tr>
                        {TABLE_HEAD.map((head) => (
                          <th
                            key={head}
                            className="border-b border-blue-gray-100 p-4"
                          >
                            <Typography
                              variant="small"
                              color="blue-gray"
                              className="font-bold leading-none opacity-70"
                            >
                              {head}
                            </Typography>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {attendanceData.map((record, index) => (
                        <tr key={index} className="even:bg-blue-gray-50/50">
                          <td className="p-4">
                            <Typography
                              variant="small"
                              color="blue-gray"
                              className="font-normal text-center"
                            >
                              {record.fullName}
                            </Typography>
                          </td>
                          <td className="p-4">
                            <Typography
                              variant="small"
                              color="blue-gray"
                              className="font-normal text-center"
                            >
                              {record.email}
                            </Typography>
                          </td>
                          <td className="p-4">
                            <Typography
                              variant="small"
                              color="blue-gray"
                              className="font-normal text-center"
                            >
                              {record.timeIn?.toDate().toLocaleTimeString()}
                            </Typography>
                          </td>
                          <td className="p-4">
                            <Typography
                              variant="small"
                              color="blue-gray"
                              className="font-normal text-center"
                            >
                              {record.timeOut?.toDate().toLocaleTimeString() ||
                                "Not logged out"}
                            </Typography>
                          </td>
                          <td className="p-4">
                            <Typography
                              variant="small"
                              color="blue-gray"
                              className="font-normal text-center"
                            >
                              {calculateDuration(record.timeIn, record.timeOut)}
                            </Typography>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
