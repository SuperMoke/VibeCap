"use client";
import React, { useState, useEffect } from "react";
import { isAuthenticated } from "../../utils/auth";
import { useRouter } from "next/navigation";
import { Card, Typography, Button, Input } from "@material-tailwind/react";
import Sidebar from "../sidebar";
import Header from "../header";
import { auth, db } from "../../firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { FaSort, FaSortUp, FaSortDown, FaSearch } from "react-icons/fa";

export default function AdminLogs() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [logs, setLogs] = useState([]);
  const [sortField, setSortField] = useState("timestamp");
  const [sortDirection, setSortDirection] = useState("desc");
  const [searchTerm, setSearchTerm] = useState("");
  const [user, loading] = useAuthState(auth);
  const router = useRouter();

  const TABLE_HEAD = [
    "Name",
    "Email",
    ,
    "Action",
    { label: "Date & Time", field: "timestamp" },
  ];

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/");
      return;
    }

    const checkAuth = async () => {
      const authorized = await isAuthenticated("admin");
      setIsAuthorized(authorized);
      if (!authorized) router.push("/");
    };

    checkAuth();
  }, [user, loading, router]);

  useEffect(() => {
    if (!isAuthorized) return;

    const logsQuery = query(
      collection(db, "userLogs"),
      orderBy(sortField, sortDirection)
    );

    const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
      const logsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLogs(logsData);
    });

    return () => unsubscribe();
  }, [isAuthorized, sortField, sortDirection]);

  const handleSort = (field) => {
    setSortDirection((current) =>
      sortField === field && current === "asc" ? "desc" : "asc"
    );
    setSortField(field);
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp?.toDate()).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredLogs = logs.filter(
    (log) =>
      log.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return isAuthorized ? (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 p-4 sm:ml-72">
          <div className="container mx-auto">
            <div className="flex flex-col gap-6">
              <Typography variant="h2" className="text-center">
                User Activity Logs
              </Typography>

              <div className="flex justify-end">
                <div className="w-72">
                  <Input
                    type="text"
                    label="Search logs"
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
                            key={typeof head === "object" ? head.label : head}
                            className="border-b border-blue-gray-100 p-4"
                          >
                            <div
                              className="flex items-center justify-center cursor-pointer group"
                              onClick={() =>
                                typeof head === "object" &&
                                handleSort(head.field)
                              }
                            >
                              <Typography
                                variant="small"
                                color="blue-gray"
                                className="font-bold leading-none opacity-70 mr-2"
                              >
                                {typeof head === "object" ? head.label : head}
                              </Typography>
                              {typeof head === "object" && (
                                <div className="flex flex-col">
                                  <FaSortUp
                                    className={`h-3 w-3 -mb-1 ${
                                      sortField === head.field &&
                                      sortDirection === "asc"
                                        ? "opacity-100"
                                        : "opacity-30"
                                    }`}
                                  />
                                  <FaSortDown
                                    className={`h-3 w-3 -mt-1 ${
                                      sortField === head.field &&
                                      sortDirection === "desc"
                                        ? "opacity-100"
                                        : "opacity-30"
                                    }`}
                                  />
                                </div>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLogs.map((log, index) => (
                        <tr key={log.id} className="even:bg-blue-gray-50/50">
                          <td className="p-4">
                            <Typography
                              variant="small"
                              color="blue-gray"
                              className="font-normal text-center"
                            >
                              {log.name}
                            </Typography>
                          </td>
                          <td className="p-4">
                            <Typography
                              variant="small"
                              color="blue-gray"
                              className="font-normal text-center"
                            >
                              {log.email}
                            </Typography>
                          </td>
                          <td className="p-4">
                            <Typography
                              variant="small"
                              color="blue-gray"
                              className="font-normal text-center"
                            >
                              {log.action}
                            </Typography>
                          </td>
                          <td className="p-4">
                            <Typography
                              variant="small"
                              color="blue-gray"
                              className="font-normal text-center"
                            >
                              {formatDate(log.timestamp)}
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
  ) : null;
}
