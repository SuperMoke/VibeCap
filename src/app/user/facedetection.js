import React, { useState, useRef, useEffect, useMemo } from "react";
import * as faceapi from "face-api.js";

const dbName = "EmotionDB";
const dbVersion = 1;
let db;

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onerror = (event) =>
      reject("IndexedDB error: " + event.target.error);

    request.onsuccess = (event) => {
      db = event.target.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      db = event.target.result;
      const objectStore = db.createObjectStore("emotions", {
        keyPath: "emotion",
      });
    };
  });
};

const updateEmotionCount = async (emotion) => {
  const transaction = db.transaction(["emotions"], "readwrite");
  const store = transaction.objectStore("emotions");

  const getRequest = store.get(emotion);

  return new Promise((resolve, reject) => {
    getRequest.onsuccess = (event) => {
      const data = event.target.result || { emotion, count: 0 };
      data.count++;
      const putRequest = store.put(data);
      putRequest.onsuccess = () => resolve(data.count);
      putRequest.onerror = (event) =>
        reject("Error updating emotion count: " + event.target.error);
    };
    getRequest.onerror = (event) =>
      reject("Error getting emotion count: " + event.target.error);
  });
};

const FaceDetection = ({ setExpressionCount, onNewEmotion, isDetecting }) => {
  const [maxExpression, setMaxExpression] = useState("");
  const videoRef = useRef();
  const canvasRef = useRef();
  const detectionsRef = useRef([]);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
      ]);
      await openDB();
      startVideo();
    };

    const startVideo = () => {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 640, height: 480 } })
        .then((stream) => {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            detectFaces();
          };
        })
        .catch((err) => console.error(err));
    };

    const getMaxExpression = (expressions) => {
      return Object.entries(expressions).reduce(
        (max, [expression, score]) =>
          score > max.score && expression !== "neutral"
            ? { expression, score }
            : max,
        { expression: "", score: 0 }
      ).expression;
    };

    const detectFaces = async () => {
      if (videoRef.current && canvasRef.current) {
        const detections = await faceapi
          .detectAllFaces(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions()
          )
          .withFaceLandmarks()
          .withFaceExpressions();

        detectionsRef.current = detections;
        drawResults();

        requestAnimationFrame(drawResults);
      }
      setTimeout(detectFaces, 1000);
    };

    const drawResults = async () => {
      if (!canvasRef.current || !isDetecting) return;

      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      const detections = detectionsRef.current;
      faceapi.draw.drawDetections(canvasRef.current, detections);
      faceapi.draw.drawFaceLandmarks(canvasRef.current, detections);

      if (detections.length > 0) {
        const firstFaceExpressions = detections[0].expressions;
        const maxExpressionKey = getMaxExpression(firstFaceExpressions);
        setMaxExpression(maxExpressionKey);

        if (maxExpressionKey && maxExpressionKey !== "neutral") {
          try {
            const newCount = await updateEmotionCount(maxExpressionKey);
            setExpressionCount((prevCount) => ({
              ...prevCount,
              [maxExpressionKey]: newCount,
            }));
          } catch (error) {
            console.error("Error updating emotion count:", error);
          }
        }
      } else {
        setMaxExpression("No faces detected");
      }
    };

    if (isDetecting) {
      loadModels();
    }

    return () => {
      const stream = videoRef.current?.srcObject;
      stream?.getTracks().forEach((track) => track.stop());
      // Clear the canvas on cleanup
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    };
  }, [isDetecting]); // Add isDetecting to dependency array

  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        muted
        style={{ width: "100%", height: "auto" }}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
};

export default React.memo(FaceDetection);
