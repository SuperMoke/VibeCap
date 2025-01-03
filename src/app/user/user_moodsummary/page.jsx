"use client";
import React, { useState, useEffect } from "react";
import { Typography, Input, Card } from "@material-tailwind/react";
import { auth, db } from "../../firebase";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "../../utils/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import Header from "../header";
import Sidebar from "../sidebar";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { Bar } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import { FaCalendarAlt } from "react-icons/fa";
import { Line } from "react-chartjs-2";

Chart.register(...registerables);

export default function User_MoodSummary() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [moodData, setMoodData] = useState([]);
  const [filteredMoodData, setFilteredMoodData] = useState([]);
  const [startDate, setStartDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const router = useRouter();
  const [user, loading, error] = useAuthState(auth);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      console.log("User is not authenticated, redirecting to home...");
      router.push("/");
      return;
    }
    const checkAuth = async () => {
      const authorized = await isAuthenticated("user");
      setIsAuthorized(authorized);
    };
    checkAuth();
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      fetchMoodData();
    }
  }, [user]);

  const getEmotionTimeSeries = (data) => {
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
          borderColor: "rgba(255, 193, 7, 1)",
          tension: 0.4,
          fill: false,
          cubicInterpolationMode: "monotone",
          spanGaps: true,
        },
        {
          label: "Sad",
          data: sortedData.map((entry) => entry.emotions.sad),
          borderColor: "rgba(33, 150, 243, 1)",
          tension: 0.4,
          fill: false,
          cubicInterpolationMode: "monotone",
          spanGaps: true,
        },
        {
          label: "Angry",
          data: sortedData.map((entry) => entry.emotions.angry),
          borderColor: "rgba(244, 67, 54, 1)",
          tension: 0.4,
          fill: false,
          cubicInterpolationMode: "monotone",
          spanGaps: true,
        },
        {
          label: "Surprised",
          data: sortedData.map((entry) => entry.emotions.surprised),
          borderColor: "rgba(255, 152, 0, 1)",
          tension: 0.4,
          fill: false,
          cubicInterpolationMode: "monotone",
          spanGaps: true,
        },
        {
          label: "Disgusted",
          data: sortedData.map((entry) => entry.emotions.disgusted),
          borderColor: "rgba(76, 175, 80, 1)",
          tension: 0.4,
          fill: false,
          cubicInterpolationMode: "monotone",
          spanGaps: true,
        },
        {
          label: "Fearful",
          data: sortedData.map((entry) => entry.emotions.fearful),
          borderColor: "rgba(156, 39, 176, 1)",
          tension: 0.4,
          fill: false,
          cubicInterpolationMode: "monotone",
          spanGaps: true,
        },
      ],
    };
  };

  const lineChartOptions = {
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
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          display: true,
          color: "rgba(0, 0, 0, 0.05)",
        },
        title: {
          display: true,
          text: "Emotion Intensity",
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        },
      },
    },
  };

  const fetchMoodData = () => {
    if (!user) return; // Ensure user is not null
    const q = query(
      collection(db, "mooddata"),
      where("userId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const data = [];
      querySnapshot.forEach((doc) => {
        data.push(doc.data());
      });
      setMoodData(data);
      setFilteredMoodData(data);
    });

    // Return the unsubscribe function to clean up the listener when the component unmounts
    return unsubscribe;
  };

  useEffect(() => {
    const unsubscribe = fetchMoodData();
    return () => unsubscribe && unsubscribe();
  }, [user]);

  const filterDataByDate = (date) => {
    const filteredData = moodData.filter((data) => {
      const dataDate = data.timestamp.toDate();
      return (
        dataDate.getDate() === date.getDate() &&
        dataDate.getMonth() === date.getMonth() &&
        dataDate.getFullYear() === date.getFullYear()
      );
    });
    setFilteredMoodData(filteredData);
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

  const chartData = {
    labels: Object.keys(emotionCounts).map(capitalizeFirstLetter),
    datasets: [
      {
        label: "Emotion Counts",
        data: Object.values(emotionCounts),
        backgroundColor: [
          "rgba(255, 255, 0, 0.2)", // yellow for happy
          "rgba(0, 0, 255, 0.2)", // blue for sad
          "rgba(255, 0, 0, 0.2)", // red for angry
          "rgba(255, 165, 0, 0.2)", // orange for surprised
          "rgba(0, 128, 0, 0.2)", // green for disgusted
          "rgba(128, 0, 128, 0.2)", // purple for fearful
        ],
        borderColor: [
          "rgba(255, 255, 0, 1)", // yellow for happy
          "rgba(0, 0, 255, 1)", // blue for sad
          "rgba(255, 0, 0, 1)", // red for angry
          "rgba(255, 165, 0, 1)", // orange for surprised
          "rgba(0, 128, 0, 1)", // green for disgusted
          "rgba(128, 0, 128, 1)", // purple for fearful
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    scales: {
      y: {
        beginAtZero: true,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  const handleDateChange = (e) => {
    const selectedDate = new Date(e.target.value);
    setStartDate(selectedDate);
    setSelectedDate(e.target.value);
    filterDataByDate(selectedDate);
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
                Mood Summary
              </Typography>
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative mb-8 flex justify-center">
                  <div className="w-full md:w-64"></div>
                  <div className="w-full md:w-64"></div>
                  <div className="w-full md:w-64"></div>
                  <div className="w-full md:w-32"></div>
                </div>
              </div>
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
                    <span className="h-6 w-6 text-blue-gray-500">😡</span>
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
                    <span className="h-6 w-6 text-blue-gray-500">😲</span>
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
                <Line
                  data={getEmotionTimeSeries(filteredMoodData)}
                  options={lineChartOptions}
                />
              </div>
            </div>
          </main>
        </div>
      </div>
      <ToastContainer />
    </>
  ) : null;
}
