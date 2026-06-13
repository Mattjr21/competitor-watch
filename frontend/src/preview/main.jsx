import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./preview.css";
import Prototype from "./Prototype";

createRoot(document.getElementById("preview-root")).render(
  <StrictMode>
    <Prototype />
  </StrictMode>
);
