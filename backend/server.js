import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenerativeAI } from "@google/generative-ai";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

app.post("/api/ai", async (req, res) => {
  try {
    const { userInput, option } = req.body;
    if (!userInput || !option) return res.status(400).json({ error: "Missing input or option" });

    let prompt = "";
    if (option === "one-shot") {
      prompt = `
System: You are an AI assistant. Return JSON {task,input,output}.
User: Task: Summarize text
User Input: "Artificial Intelligence is transforming industries worldwide."
Assistant Output: {"task":"Summarize text","input":"Artificial Intelligence is transforming industries worldwide.","output":"AI is changing industries globally."}
System: Now complete the new request.
User: Task: ${option}
User Input: ${userInput}
Assistant Output:
`;
    } else if (option === "zero-shot") {
      prompt = `
System: You are an AI assistant. Return JSON {task,input,output}.
User: Task: ${option}
User Input: ${userInput}
Assistant Output:
`;
    } else if (option === "multi-shot") {
      prompt = `
System: You are an AI assistant. Return JSON {task,input,output}.
Example 1: {"task":"Summarize text","input":"Artificial Intelligence is transforming industries worldwide.","output":"AI is changing industries globally."}
Example 2: {"task":"Translate text to French","input":"Hello, how are you?","output":"Bonjour, comment ça va?"}
Example 3: {"task":"Convert to uppercase","input":"innovation drives growth","output":"INNOVATION DRIVES GROWTH"}
System: Now complete the new request.
User: Task: ${option}
User Input: ${userInput}
Assistant Output:
`;
    } else if (option === "chain-of-thought") {
      prompt = `
System: Think step by step internally but return ONLY JSON {task,input,output}.
User: Task: ${option}
User Input: ${userInput}
Assistant Output:
`;
    } else if (option === "dynamic") {
      let dynamicTask = "General Task";
      if (userInput.length > 200) dynamicTask = "Summarize the following long text concisely";
      else if (userInput.includes("?")) dynamicTask = "Answer the following question clearly";
      else if (userInput.match(/translate to/i)) dynamicTask = "Translate the following text accordingly";
      prompt = `
System: Use dynamic prompting. Always return JSON {task,input,output}.
User: Task: ${dynamicTask}
User Input: ${userInput}
Assistant Output:
`;
    } else {
      prompt = `
System: You are an AI assistant. Return JSON {task,input,output}.
User: Task: ${option}
User Input: ${userInput}
Assistant Output:
`;
    }

    const tokenInfo = await model.countTokens(prompt);
    const result = await model.generateContent({ contents: [{ role: "user", parts: [{ text: prompt }] }] });
    let responseText = result.response.text();

    let structuredOutput;
    try {
      structuredOutput = JSON.parse(responseText);
    } catch {
      structuredOutput = { task: option, input: userInput, output: responseText.trim() };
    }

    res.json({ response: structuredOutput, tokens: tokenInfo.totalTokens });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// ------------------ Function Calling ------------------
app.post("/api/function-call", async (req, res) => {
  const { userInput } = req.body;
  const prompt = `Extract name and age. Input: "${userInput}" Return ONLY JSON: {"name": string, "age": number}`;
  const result = await model.generateContent(prompt);
  res.json(JSON.parse(result.response.text()));
});

// ------------------ Embeddings ------------------
app.post("/api/embed", async (req, res) => {
  const { text } = req.body;
  const embedding = await genAI.embedContent(text);
  res.json(embedding.embedding);
});

// ------------------ Similarity Functions ------------------
const cosineSimilarity = (a, b) => {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return dot / (magA * magB);
};
const euclideanDistance = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
const dotProduct = (a, b) => a.reduce((s, v, i) => s + v * b[i], 0);

app.post("/api/cosine", (req, res) => res.json({ similarity: cosineSimilarity(req.body.a, req.body.b) }));
app.post("/api/euclidean", (req, res) => res.json({ distance: euclideanDistance(req.body.a, req.body.b) }));
app.post("/api/dot", (req, res) => res.json({ dot: dotProduct(req.body.a, req.body.b) }));

// ------------------ Minimal In-Memory Vector Database ------------------
const vectorDB = [];

app.post("/api/vector-db/add", async (req, res) => {
  const { id, text } = req.body;
  if (!id || !text) return res.status(400).json({ error: "Missing id or text" });

  const embedding = await genAI.embedContent(text);
  vectorDB.push({ id, text, embedding: embedding.embedding });

  res.json({ success: true, stored: { id, text } });
});

app.post("/api/vector-db/query", async (req, res) => {
  const { queryText, topK = 3 } = req.body;
  if (!queryText) return res.status(400).json({ error: "Missing queryText" });

  const queryEmbedding = await genAI.embedContent(queryText);
  const queryVec = queryEmbedding.embedding;

  const results = vectorDB
    .map(item => ({ ...item, score: cosineSimilarity(item.embedding, queryVec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  res.json(results);
});

// ------------------ Evaluation Dataset + Judge ------------------
const dataset = [
  { task: "Summarize text", input: "Artificial Intelligence is transforming industries worldwide.", expected: "AI is changing industries globally." },
  { task: "Translate text to French", input: "Hello, how are you?", expected: "Bonjour, comment ça va?" },
  { task: "Convert to uppercase", input: "innovation drives growth", expected: "INNOVATION DRIVES GROWTH" },
  { task: "Answer question", input: "What is the capital of France?", expected: "Paris" },
  { task: "Summarize text", input: "Machine learning enables systems to learn without being explicitly programmed.", expected: "ML lets systems learn without explicit programming." }
];

app.get("/api/evaluate", async (req, res) => {
  try {
    const judgePrompt = (expected, actual) => `
You are a strict evaluator. Compare the EXPECTED vs MODEL OUTPUT. 
Return ONLY JSON: {"match": boolean, "reason": string}
EXPECTED: "${expected}"
MODEL OUTPUT: "${actual}"
`;

    const results = [];
    for (let sample of dataset) {
      const userPrompt = `
System: Return JSON {task,input,output}.
User: Task: ${sample.task}
User Input: ${sample.input}
Assistant Output:
`;
      const result = await model.generateContent(userPrompt);
      let modelOut;
      try {
        modelOut = JSON.parse(result.response.text()).output;
      } catch {
        modelOut = result.response.text();
      }

      const judgeResult = await model.generateContent(judgePrompt(sample.expected, modelOut));
      let verdict;
      try {
        verdict = JSON.parse(judgeResult.response.text());
      } catch {
        verdict = { match: false, reason: "Invalid judge response" };
      }

      results.push({ ...sample, modelOut, ...verdict });
    }
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Evaluation failed" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
