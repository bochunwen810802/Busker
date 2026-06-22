import React from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "./main.jsx";
import "./styles.css";

const basePath = import.meta.env.BASE_URL === "/" ? "" : import.meta.env.BASE_URL.replace(/\/$/, "");
const currentPath = window.location.pathname;
const mode = currentPath.startsWith(`${basePath}/manage`) ? "manage" : "public";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppShell mode={mode} basePath={basePath} />
  </React.StrictMode>
);
