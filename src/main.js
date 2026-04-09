import React from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import { HashRouter } from "https://esm.sh/react-router-dom@6.28.0?deps=react@18.2.0,react-dom@18.2.0";
import { AuthProvider } from "./context/AuthContext.js";
import { App } from "./App.js";

const root = createRoot(document.getElementById("root"));

root.render(
  React.createElement(
    HashRouter,
    null,
    React.createElement(AuthProvider, null, React.createElement(App)),
  ),
);

