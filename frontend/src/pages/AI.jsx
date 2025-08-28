import React, { useState, useEffect } from "react";

export default function AI() {
  const [userInput, setUserInput] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [option, setOption] = useState("");
  const [blobs, setBlobs] = useState([]);
  const [gridData, setGridData] = useState(
    Array.from({ length: 150 }, () => (Math.random() > 0.5 ? 1 : 0))
  );

  const COLORS = ["#56D364", "#2EA043", "#196C2E", "#033A16"];

  useEffect(() => {
    const initialBlobs = Array.from({ length: 15 }).map((_, i) => {
      const size = Math.floor(Math.random() * 120) + 80;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      return {
        id: i,
        size,
        color,
        top: Math.random() * 80 + 10,
        left: Math.random() * 80 + 10,
        dx: (Math.random() - 0.5) * 2,
        dy: (Math.random() - 0.5) * 2,
      };
    });
    setBlobs(initialBlobs);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setBlobs((prev) =>
        prev.map((blob) => {
          let dx = blob.dx + (Math.random() - 0.5) * 0.5;
          let dy = blob.dy + (Math.random() - 0.5) * 0.5;

          dx = Math.max(-2, Math.min(2, dx));
          dy = Math.max(-2, Math.min(2, dy));

          let newTop = blob.top + dy;
          let newLeft = blob.left + dx;

          if (newTop < 0 || newTop > 90) {
            dy = -dy;
            newTop = Math.max(0, Math.min(90, newTop));
          }
          if (newLeft < 0 || newLeft > 90) {
            dx = -dx;
            newLeft = Math.max(0, Math.min(90, newLeft));
          }

          return { ...blob, top: newTop, left: newLeft, dx, dy };
        })
      );
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const refreshGrid = () => {
    setGridData(Array.from({ length: 150 }, () => (Math.random() > 0.5 ? 1 : 0)));
  };

const handleSend = async () => {
  if (!option || !userInput) return;

  try {
    setAiResponse("⏳ Processing...");

    const res = await fetch("http://localhost:5000/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userInput, option }),
    });

    const data = await res.json();

    if (data.response) {
      setAiResponse(data.response);
    } else {
      setAiResponse("⚠️ Error: No response from AI");
    }
  } catch (err) {
    console.error(err);
    setAiResponse("❌ Server error");
  }

  refreshGrid();
};


  return (
    <div className="min-h-screen bg-black text-green-400 font-silkscreen flex items-center justify-center relative overflow-hidden p-4">
      {blobs.map((blob) => (
        <div
          key={blob.id}
          className="absolute rounded-full opacity-30 blur-3xl"
          style={{
            width: blob.size,
            height: blob.size,
            backgroundColor: blob.color,
            top: `${blob.top}%`,
            left: `${blob.left}%`,
            transition: "top 0.3s linear, left 0.3s linear",
          }}
        />
      ))}

      <div className="absolute top-4 left-4 z-20 grid grid-cols-3 gap-1 cursor-pointer"
      onClick={() => window.location.href = "/"}>
        {[
          [0, 1, 1],
          [1, 0, 0],
          [0, 1, 1],
        ]
          .flat()
          .map((cell, i) => (
            <div
              key={i}
              className={`w-2 h-2 md:w-3 md:h-3 rounded-sm ${
                cell ? "bg-green-400" : "bg-green-900"
              }`}
            />
          ))}
      </div>

      <div className="bg-black border border-green-400 p-4 md:p-6 rounded-lg w-full md:w-[75%] h-[70vh] flex flex-col md:flex-row gap-4 md:gap-6 relative z-10">
        <div className="flex flex-col md:w-2/3 w-full">
          <label className="text-green-400 mb-2">CIPHER</label>
          <div className="bg-black border border-green-400 p-3 h-48 md:h-full overflow-y-auto text-sm md:text-base">
            {aiResponse || "Waiting for input..."}
          </div>
        </div>

        <div className="flex flex-col md:w-2/3 w-full">
          <label className="text-green-400 mb-2">YOU</label>
          <textarea
  className="bg-black border border-green-400 p-3 flex-1 resize-none outline-none mb-3 text-sm md:text-base h-72 md:h-auto"
            placeholder="Type your request..."
            value={userInput}
            onChange={(e) => {
              setUserInput(e.target.value);
              refreshGrid();
            }}
          />

          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex gap-2">
              {["DEBUG", "EXPLAIN", "DRY-RUN"].map((btn) => (
                <button
                  key={btn}
                  className={`px-3 py-1 md:px-4 border rounded-md transition text-xs md:text-sm ${
                    option === btn
                      ? "bg-green-400 text-black shadow-[0_0_10px_2px_#22c55e]"
                      : "bg-black text-green-400 border-green-400 hover:bg-green-700"
                  }`}
                  onClick={() => {
                    setOption(btn);
                    refreshGrid();
                  }}
                >
                  {btn}
                </button>
              ))}
            </div>
            <button
              onClick={handleSend}
              className="px-3 py-1 border border-green-400 rounded-md bg-black hover:bg-green-600 hover:text-black transition text-sm"
            >
              ➤
            </button>
          </div>
        </div>
      </div>

\      <div className="hidden lg:flex absolute right-0 top-0 h-full flex-col justify-center pr-4">
        <div className="grid grid-cols-5 gap-1">
          {gridData.map((cell, i) => (
            <div
              key={i}
              className={`w-4 h-4 md:w-6 md:h-6 rounded-sm ${
                cell ? "bg-green-500" : "bg-green-900"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
