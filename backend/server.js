import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/api/ai", async (req, res) => {
  try {
    const { userInput, option } = req.body;
    if (!userInput || !option) {
      return res.status(400).json({ error: "Missing input or option" });
    }

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    let prompt = "";

    if (option === "one-shot") {
      prompt = `
System: You are an AI assistant. Follow the RTFC framework (Role: assistant, Task: solve problem, Format: structured output, Context: example provided).
User: Task: Summarize this text
User Input: "Artificial Intelligence is transforming industries worldwide."
Assistant Output: "AI is changing industries globally."

System: Now complete the new request.
User: Task: ${option}
User Input: ${userInput}
Assistant Output:
`;
    } else if (option === "zero-shot") {
      prompt = `
System: You are an AI assistant. Follow the RTFC framework. Perform the task without any examples.
User: Task: ${option}
User Input: ${userInput}
Assistant Output:
`;
    } else if (option === "multi-shot") {
      prompt = `
System: You are an AI assistant. Follow the RTFC framework. Here are multiple examples:

User: Task: Summarize this text
User Input: "Artificial Intelligence is transforming industries worldwide."
Assistant Output: "AI is changing industries globally."

User: Task: Translate this text to French
User Input: "Hello, how are you?"
Assistant Output: "Bonjour, comment ça va?"

User: Task: Convert this to uppercase
User Input: "innovation drives growth"
Assistant Output: "INNOVATION DRIVES GROWTH"

System: Now complete the new request.
User: Task: ${option}
User Input: ${userInput}
Assistant Output:
`;
    } else if (option === "chain-of-thought") {
      prompt = `
System: You are an AI assistant. Follow the RTFC framework. Think step by step before final answer.
User: Task: ${option}
User Input: ${userInput}
Assistant Reasoning:
Assistant Final Answer:
`;
    } else if (option === "system-user") {
      prompt = `
System: You are an AI assistant. Your role is to strictly follow instructions, think logically, and return clear, correct outputs.
User: Task: ${option}
User Input: ${userInput}
Assistant Output:
`;
    } else {
      prompt = `
System: You are an AI assistant. Perform the task as requested.
User: Task: ${option}
User Input: ${userInput}
Assistant Output:
`;
    }

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    res.json({ response: responseText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
