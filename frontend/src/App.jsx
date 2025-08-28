import React from "react";
import { Routes, Route } from "react-router-dom";
import Intro from "./pages/intro";
import AI from "./pages/ai";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Intro />} />
      <Route path="/ai" element={<AI />} />
    </Routes>
  );
}

export default App;
