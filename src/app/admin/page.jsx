"use client";
import React, { useState, useEffect } from "react";
import { isAuthenticated } from "../utils/auth";
import { useRouter } from "next/navigation";
import {
  Card,
  Typography,
  Dialog,
  DialogHeader,
  DialogBody,
  Input,
  Button,
} from "@material-tailwind/react";
import Sidebar from "./sidebar";
import Header from "./header";
import { auth, db } from "../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { Bar } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import { FaCalendarAlt } from "react-icons/fa";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Tooltip } from "@material-tailwind/react";
import { FaEye, FaTrash } from "react-icons/fa";
import { FaSearch } from "react-icons/fa";
import { Line } from "react-chartjs-2";

Chart.register(...registerables);

export default function AdminHomepage() {
  const TABLE_HEAD = ["Full Name", "Email", "Contact Number", "Action"];
  const [isAuthorized, setIsAuthorized] = useState(false);
  const router = useRouter();
  const [user, loading, error] = useAuthState(auth);
  const [userData, setUserData] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [moodData, setMoodData] = useState([]);
  const [filteredMoodData, setFilteredMoodData] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const getEmotionTimeSeries = (data) => {
    // Sort data by timestamp
    const sortedData = [...data].sort(
      (a, b) => a.timestamp.toDate() - b.timestamp.toDate()
    );

    return {
      labels: sortedData.map((entry) =>
        entry.timestamp.toDate().toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      ),
      datasets: [
        {
          label: "Happy",
          data: sortedData.map((entry) => entry.emotions.happy),
          borderColor: "rgba(255, 193, 7, 1)", // Yellow
          tension: 0.4,
          fill: false,
          cubicInterpolationMode: "monotone",
          spanGaps: true,
        },
        {
          label: "Sad",
          data: sortedData.map((entry) => entry.emotions.sad),
          borderColor: "rgba(33, 150, 243, 1)", // Blue
          tension: 0.4,
          fill: false,
          cubicInterpolationMode: "monotone",
          spanGaps: true,
        },
        {
          label: "Angry",
          data: sortedData.map((entry) => entry.emotions.angry),
          borderColor: "rgba(244, 67, 54, 1)", // Red
          tension: 0.4,
          fill: false,
          cubicInterpolationMode: "monotone",
          spanGaps: true,
        },
        {
          label: "Surprised",
          data: sortedData.map((entry) => entry.emotions.surprised),
          borderColor: "rgba(255, 152, 0, 1)", // Orange
          tension: 0.4,
          fill: false,
          cubicInterpolationMode: "monotone",
          spanGaps: true,
        },
        {
          label: "Disgusted",
          data: sortedData.map((entry) => entry.emotions.disgusted),
          borderColor: "rgba(76, 175, 80, 1)", // Green
          tension: 0.4,
          fill: false,
          cubicInterpolationMode: "monotone",
          spanGaps: true,
        },
        {
          label: "Fearful",
          data: sortedData.map((entry) => entry.emotions.fearful),
          borderColor: "rgba(156, 39, 176, 1)", // Purple
          tension: 0.4,
          fill: false,
          cubicInterpolationMode: "monotone",
          spanGaps: true,
        },
      ],
    };
  };

  useEffect(() => {
    if (loading) return;
    if (!user) {
      console.log("User is not authenticated, redirecting to home...");
      router.push("/");
      return;
    }
    const checkAuth = async () => {
      console.log("Checking authentication...");
      const roleMap = {
        admin: true,
      };
      for (const role of Object.keys(roleMap)) {
        const authorized = await isAuthenticated(role);
        if (authorized) {
          console.log("User is authorized:", role);
          setIsAuthorized(true);
          return;
        }
      }
      console.log("User is not authorized, redirecting to home...");
      router.push("/");
    };

    checkAuth();
  }, [user, loading, router]);

  const handleDeleteClick = (user) => {
    setUserToDelete(user);
    setOpenDeleteDialog(true);
  };

  useEffect(() => {
    if (isAuthorized) {
      const userDataCollection = collection(db, "userData");
      const q = query(userDataCollection, where("role", "==", "user"));

      // Set up realtime listener
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const userDataList = snapshot.docs.map((doc) => doc.data());
        setUserData(userDataList);
      });

      // Cleanup listener on unmount
      return () => unsubscribe();
    }
  }, [isAuthorized]);

  const handleOpenDialog = (user) => {
    console.log("Opening dialog for user:", user);
    setSelectedUser(user);
    setOpenDialog(!openDialog);
    if (user?.user_id) {
      fetchMoodData(user.user_id);
    }
  };

  const handleDeleteUser = async () => {
    try {
      const response = await fetch("/api/deleteUser", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uid: userToDelete.user_id }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success("User successfully deleted!");
        setOpenDeleteDialog(false);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error("Error deleting user:", error.message);
      toast.error("Error deleting user!");
    }
  };

  const fetchMoodData = async (userId) => {
    console.log("Fetching mood data for user:", userId);
    const q = query(collection(db, "mooddata"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    const data = [];
    querySnapshot.forEach((doc) => {
      data.push(doc.data());
    });
    console.log("Mood data fetched:", data);
    setMoodData(data);
    setFilteredMoodData(data);
  };

  const filterDataByDate = (date) => {
    console.log("Filtering mood data by date:", date);
    const filteredData = moodData.filter((data) => {
      const dataDate = data.timestamp.toDate();
      return (
        dataDate.getDate() === date.getDate() &&
        dataDate.getMonth() === date.getMonth() &&
        dataDate.getFullYear() === date.getFullYear()
      );
    });
    console.log("Filtered mood data:", filteredData);
    setFilteredMoodData(filteredData);
  };

  const handleDateChange = (e) => {
    const selectedDate = new Date(e.target.value);
    setStartDate(selectedDate);
    setSelectedDate(e.target.value);
    filterDataByDate(selectedDate);
  };

  const getEmotionCounts = (data) => {
    const emotions = {
      happy: 0,
      sad: 0,
      angry: 0,
      surprised: 0,
      disgusted: 0,
      fearful: 0,
    };
    data.forEach((entry) => {
      Object.keys(entry.emotions).forEach((emotion) => {
        emotions[emotion] += entry.emotions[emotion];
      });
    });
    return emotions;
  };

  const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const emotionCounts = getEmotionCounts(filteredMoodData);

  const chartData = getEmotionTimeSeries(filteredMoodData);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          padding: 20,
          font: {
            size: 12,
            family: "'Inter', sans-serif",
          },
          usePointStyle: true,
          pointStyle: "circle",
        },
      },
      title: {
        display: true,
        text: "Emotion Timeline",
        font: {
          size: 20,
          family: "'Inter', sans-serif",
          weight: "600",
        },
        padding: 20,
      },
      tooltip: {
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        titleColor: "#000",
        bodyColor: "#000",
        bodyFont: {
          size: 13,
        },
        borderColor: "rgba(0, 0, 0, 0.1)",
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        usePointStyle: true,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: "rgba(0, 0, 0, 0.05)",
        },
        ticks: {
          font: {
            size: 12,
            family: "'Inter', sans-serif",
          },
        },
        title: {
          display: true,
          text: "Emotion Intensity",
          font: {
            size: 14,
            family: "'Inter', sans-serif",
          },
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 12,
            family: "'Inter', sans-serif",
          },
        },
        title: {
          display: true,
          text: "Date & Time",
          font: {
            size: 14,
            family: "'Inter', sans-serif",
          },
        },
      },
    },
    interaction: {
      mode: "index",
      intersect: false,
    },
    elements: {
      point: {
        radius: 4,
        hoverRadius: 6,
        borderWidth: 2,
      },
      line: {
        tension: 0.4,
        borderWidth: 2,
      },
    },
    animation: {
      duration: 1000,
      easing: "easeInOutQuart",
    },
  };

  const filteredUsers = userData.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      user.name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower) ||
      user.contact?.toLowerCase().includes(searchLower)
    );
  });

  return isAuthorized ? (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:ml-72">
          <div className="container mx-auto">
            <div className="flex flex-col justify-center gap-6">
              <Typography variant="h2" className="text-center">
                Admin Dashboard
              </Typography>
              <div className="flex justify-end">
                <div className="w-72">
                  <Input
                    type="text"
                    label="Search users"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    icon={<FaSearch className="h-5 w-5 text-blue-gray-300" />}
                  />
                </div>
              </div>

              <Card className="w-full mb-8 shadow-lg rounded-lg overflow-hidden">
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
                      {filteredUsers.map((user, index) => (
                        <tr key={index} className="even:bg-blue-gray-50/50">
                          <td className="p-4">
                            <Typography
                              variant="small"
                              color="blue-gray"
                              className="font-normal text-center"
                            >
                              {user.name}
                            </Typography>
                          </td>
                          <td className="p-4">
                            <Typography
                              variant="small"
                              color="blue-gray"
                              className="font-normal text-center"
                            >
                              {user.email}
                            </Typography>
                          </td>
                          <td className="p-4">
                            <Typography
                              variant="small"
                              color="blue-gray"
                              className="font-normal text-center"
                            >
                              {user.contact}
                            </Typography>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-center space-x-4">
                              <Tooltip content="View data">
                                <button
                                  onClick={() => handleOpenDialog(user)}
                                  className="text-blue-500 hover:text-blue-700"
                                >
                                  <FaEye size={20} />
                                </button>
                              </Tooltip>
                              <Tooltip content="Delete user">
                                <button
                                  onClick={() => handleDeleteClick(user)}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <FaTrash size={20} />
                                </button>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
          <ToastContainer />
        </main>
      </div>
      <Dialog open={openDialog} handler={handleOpenDialog} size="xl">
        <DialogHeader>Mood Summary for {selectedUser?.name}</DialogHeader>
        <DialogBody
          divider
          className="max-h-[calc(100vh-200px)] overflow-y-auto"
        >
          <div className="flex flex-col gap-4">
            <div className="flex justify-end mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 ml-20 mb-10">
              <Card className="w-64 bg-yellow-100 shadow-lg rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <Typography variant="h5" color="blue-gray">
                    Happy
                  </Typography>
                  <span className="h-6 w-6 text-blue-gray-500">😊</span>
                </div>
                <Typography className="text-2xl font-bold">
                  {emotionCounts.happy}
                </Typography>
              </Card>
              <Card className="w-64 bg-blue-100 shadow-lg rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <Typography variant="h5" color="blue-gray">
                    Sad
                  </Typography>
                  <span className="h-6 w-6 text-blue-gray-500">😢</span>
                </div>
                <Typography className="text-2xl font-bold">
                  {emotionCounts.sad}
                </Typography>
              </Card>
              <Card className="w-64 bg-red-100 shadow-lg rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <Typography variant="h5" color="blue-gray">
                    Angry
                  </Typography>
                  <span className="h-6 w-6 text-blue-gray-500">😠</span>
                </div>
                <Typography className="text-2xl font-bold">
                  {emotionCounts.angry}
                </Typography>
              </Card>
              <Card className="w-64 bg-orange-100 shadow-lg rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <Typography variant="h5" color="blue-gray">
                    Suprised
                  </Typography>
                  <span className="h-6 w-6 text-blue-gray-500">😨</span>
                </div>
                <Typography className="text-2xl font-bold">
                  {emotionCounts.surprised}
                </Typography>
              </Card>
              <Card className="w-64 bg-green-100 shadow-lg rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <Typography variant="h5" color="blue-gray">
                    Disgusted
                  </Typography>
                  <span className="h-6 w-6 text-blue-gray-500">🤢</span>
                </div>
                <Typography className="text-2xl font-bold">
                  {emotionCounts.disgusted}
                </Typography>
              </Card>
              <Card className="w-64 bg-purple-100 shadow-lg rounded-xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <Typography variant="h5" color="blue-gray">
                    Fearful
                  </Typography>
                  <span className="h-6 w-6 text-blue-gray-500">😨</span>
                </div>
                <Typography className="text-2xl font-bold">
                  {emotionCounts.fearful}
                </Typography>
              </Card>
            </div>
            <div className="w-full max-w-4xl mx-auto">
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        </DialogBody>
      </Dialog>

      <Dialog
        open={openDeleteDialog}
        handler={() => setOpenDeleteDialog(false)}
      >
        <DialogHeader>Confirm Deletion</DialogHeader>
        <DialogBody>
          Are you sure you want to delete {userToDelete?.name}? This action
          cannot be undone.
        </DialogBody>
        <div className="flex justify-end gap-2 p-4">
          <Button variant="text" color="red" onClick={() => setOpenDeleteDialog(false)}>
          <span> Cancel </span>
          </Button>
          <Button color="green" onClick={handleDeleteUser}>
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  ) : null;
}
