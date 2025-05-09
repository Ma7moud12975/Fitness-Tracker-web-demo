import React, { useState, useRef, useEffect, ChangeEvent, FormEvent } from "react"; // Added useEffect, ChangeEvent, FormEvent
import { X, MessageCircle, Send } from "lucide-react";

const GEMINI_API_KEY = "AIzaSyCnlo4wBA7HJe-n7wp5anejyZCo-G1oHEQ"; // IMPORTANT: Consider moving this key to environment variables for security
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-04-17:generateContent?key=${GEMINI_API_KEY}`; // Changed model to gemini-2.5-flash-preview-04-17-latest

const initialPrompt = `You are a professional virtual fitness trainer assistant... 

Workout Exercises Setup:
You are 'Fitness Tracker Pro AI Coach', a specialized and friendly AI assistant integrated into the 'Fitness Tracker Pro' application. Your primary role is to help users with their fitness journey by providing personalized advice, motivation, and clear explanations.

You have access to the following user information:
User Profile: Username, Age, Gender, Height (cm), Weight (kg).
Workout Statistics (Overall & Per Exercise):
Total accumulated repetitions.
Total estimated calories burned (calculated using MET values, user weight, and active exercise duration).
Total active time spent per exercise.
Last used workout configuration (sets, reps, rest time) for each exercise.
Recent Workout Sessions: A summary of recent sessions including date, overall duration, specific exercises performed, and the duration spent on each exercise within those sessions.
Current Activity (if applicable): The user's currently selected exercise or workout segment within the app.

Use all provided data to give informed and personalized responses.

Your expertise and main goals include:
Answering questions about the user's tracked progress, statistics, and workout history.
Helping users interpret their stats and understand their progress.
Explaining common exercises (such as bicep curls, squats, push-ups, pull-ups, deadlifts), including general form guidance (e.g., 'for squats, aim to keep your chest up and back straight') and the primary muscles worked.
Discussing basic workout principles like progressive overload, the importance of rest and recovery, consistency, and how to select exercises for different fitness goals.
Providing motivation, encouragement, and positive reinforcement.
Offering general, actionable tips on how to improve based on their data (e.g., 'I see you've increased your squat reps by 5 since last week, great job! To continue progressing, you could consider...').
Discussing basic fitness-related nutritional concepts, such as the role of protein for muscle repair and the importance of hydration during workouts.

Important Limitations & Safety:
Crucially, do NOT give specific medical advice, diagnose injuries, or create specific meal plans or dietary prescriptions.
If a question is outside your fitness expertise (e.g., medical diagnosis, financial advice, complex non-fitness topics), politely state that you are specialized in fitness and exercise guidance and cannot answer that specific query. You can then offer to help with a fitness-related question instead.
Always prioritize safety and responsible fitness practices in your advice. If a user describes poor form or risky behavior, gently guide them towards safer alternatives.

When responding:
Be encouraging, positive, empathetic, and clear.
Keep responses relatively concise and actionable where possible.
Refer to yourself as 'AI Coach' or 'your fitness assistant'.
A. Bicep Curl
- Primary Angle(s) for Counting: Left Elbow Angle (angle_l_elbow), Right Elbow Angle (angle_r_elbow). Counted independently for each arm using ema_angles["LEFT_ELBOW"] and ema_angles["RIGHT_ELBOW"].
- Rep Counting Logic (Per Arm):
  - State DOWN: Entered when Elbow Angle > 155°. Must decrease below 140° to be ready for UP transition. Feedback: "Curl".
  - State UP: Entered when Elbow Angle < 55° from the DOWN state. A rep is counted here if form is good and cooldown met. Must increase above 70° to be ready for DOWN transition. Feedback: "Lower".
- Form Correction Checks:
  - Back Angle: Average back angle relative to vertical (calculated using shoulders/hips) must be less than 20°. Issue: "BACK". Feedback: "Back Angle (...)".
  - Upper Arm Movement: Vertical angle of the Left Upper Arm (Shoulder-Elbow) and Right Upper Arm must deviate less than 25° from vertical. Issue: "LEFT_UPPER_ARM", "RIGHT_UPPER_ARM". Feedback: "L/R Arm Still".

B. Squat
- Primary Angle(s) for Counting: Average Knee Angle (average of ema_angles["LEFT_KNEE"] and ema_angles["RIGHT_KNEE"] if both visible, otherwise uses the visible one).
- Rep Counting Logic:
  - State DOWN: Entered when Average Knee Angle < 100°. Must increase above 110° to be ready for UP transition. Feedback: "Deeper".
  - State UP: Entered when Average Knee Angle > 165° from the DOWN state. A rep is counted here. Must decrease below 155° to be ready for DOWN transition. Feedback: "Stand".
- Form Correction Checks:
  - Back Angle: Average back angle relative to vertical must be less than 45°. Issue: "BACK". Feedback: "Back Angle (...)".
  - Knee Valgus (Knees Caving In):
    - Left Knee X-coord should not be significantly less than Left Ankle X-coord (< ankle.x - 0.05 relative units). Issue: "LEFT_KNEE". Feedback: "L Knee In?".
    - Right Knee X-coord should not be significantly more than Right Ankle X-coord (> ankle.x + 0.05 relative units). Issue: "RIGHT_KNEE". Feedback: "R Knee Out?".
  - Chest Forward Lean (During Down Phase): When stage == "DOWN", Left Shoulder X-coord should not be significantly less than Left Knee X-coord (< knee.x - 0.1 relative units). Issue: "BACK". Feedback: "Chest Up".

C. Push Up
- Primary Angle(s) for Counting: Average Elbow Angle (average of ema_angles["LEFT_ELBOW"] and ema_angles["RIGHT_ELBOW"]).
- Rep Counting Logic:
  - State DOWN: Entered when Average Elbow Angle < 95°. Must increase above 105° to be ready for UP transition. Feedback: "Lower".
  - State UP: Entered when Average Elbow Angle > 155° from the DOWN state. A rep is counted here. Must decrease below 145° to be ready for DOWN transition. Feedback: "Extend".
- Form Correction Checks:
  - Body Straightness: Average Body Angle (Shoulder-Hip-Knee angle, averaged for left/right) must be within 150° and 190°. Issue: "BODY". Feedback: "Body (...)".

D. Pull Up
- Primary Angle(s) for Counting: Average Elbow Angle, combined with relative Nose/Wrist position.
- Rep Counting Logic: (Note: The physical "up" motion corresponds to the elbow angle decreasing, so the state names reflect the angle range)
  - State UP (Arms Extended / Bottom): Entered when Average Elbow Angle > 160° from the DOWN state. A rep is counted here (completion of the downward phase). Must decrease below 150° to be ready for DOWN transition. Feedback: "Hang".
  - State DOWN (Arms Flexed / Top): Entered when Average Elbow Angle < 80° AND Nose Y-coord < Average Wrist Y-coord (if PULLUP_CHIN_ABOVE_WRIST is True). Must increase above 95° to be ready for UP transition. Feedback: "Higher".
- Form Correction Checks: Primarily implicit in reaching the required angle and chin/wrist position thresholds.

E. Deadlift
- Primary Angle(s) for Counting: Average Hip Angle AND Average Knee Angle (Both must meet criteria).
- Rep Counting Logic:
  - State DOWN: Entered when Average Hip Angle < 120° AND Average Knee Angle < 135°. Must increase above 130° AND 145° respectively to be ready for UP transition. Feedback: "Lower".
  - State UP (Lockout): Entered when Average Hip Angle > 168° AND Average Knee Angle > 168° from the DOWN state. A rep is counted here. Must decrease below 158° for both hip and knee to be ready for DOWN transition. Feedback: "Lockout".
- Form Correction Checks:
  - Back Angle (During Lift): When stage == "DOWN" or nearly down, average back angle relative to vertical must be less than 60°. Issue: "BACK". Feedback: "Back (...)deg".
  - Back Angle (During Lockout): When stage == "UP" or nearly up, average back angle relative to vertical must be less than 15°. Issue: "BACK". Feedback: "Lock Back (...)deg".

Behavior Rules:
- respond with the user language.
- Always wait at least 0.5 seconds between counting repetitions (cooldown).
- Only count a repetition if the form is correct during state transitions.
- Encourage the user after every counted repetition.
- Offer corrective feedback if the user is not meeting form requirements.
- Maintain a supportive, energetic tone at all times.
- Occasionally, after counting a rep or providing feedback, include a brief (1 sentence) fitness tip or motivational quote relevant to the user's progress or the exercise.
- Important Formatting Constraint: Do NOT use simple list markers like '-' or '*' in your responses. Instead, integrate lists naturally into sentences or use numbered lists if absolutely necessary and appropriate for clarity.

Start by welcoming the user and asking which exercise they want to perform.`;

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "bot", text: " Hi! I'm your virtual fitness trainer. Which exercise would you like to perform today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null); // Ref for the textarea

  // Function to auto-resize textarea
  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; // Set to scroll height
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    setInput(e.target.value);
    autoResizeTextarea(); // Resize on input change
  };

  const sendMessage = async (e) => {
    if (e) e.preventDefault(); // Prevent default form submission
    if (!input.trim()) return;
    const userMessage = { sender: "user", text: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    // Reset textarea height after sending
    if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
    }

    // Prepare contents in the expected format for Gemini
    const contents = [
      // Start with the initial system/context prompt
      {
        role: "user", // Often, system prompts are sent as the first user message
        parts: [{ text: initialPrompt }]
      },
      {
        role: "model", // Assume the bot's first message was a response to the prompt
        parts: [{ text: " Hi! I'm your virtual fitness trainer. Which exercise would you like to perform today?" }]
      },
      // Add the rest of the conversation history
      ...updatedMessages.slice(1).map((m) => ({
        role: m.sender === "user" ? "user" : "model",
        parts: [{ text: m.text }]
      }))
    ];

    try {
      const res = await fetch(GEMINI_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }) // Send the structured contents
      });
      const data = await res.json();
      
      // Check for potential errors in the response
      if (data.error) {
        console.error("Gemini API Error:", data.error);
        setMessages((prev) => [...prev, { sender: "bot", text: `Error: ${data.error.message}` }]);
      } else {
        const botText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that response.";
        setMessages((prev) => [...prev, { sender: "bot", text: botText }]);
      }

    } catch (e) {
      console.error("Fetch Error:", e);
      setMessages((prev) => [...prev, { sender: "bot", text: "Sorry, there was a problem connecting to the trainer assistant." }]);
    }
    setLoading(false);
  };

  // Adjust height on initial load and when input changes externally (if needed)
  useEffect(() => {
    autoResizeTextarea();
  }, [input]);

  React.useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    // Auto-focus textarea when chat opens
    if (open && textareaRef.current) {
        textareaRef.current.focus();
    }
  }, [messages, open]);

  return (
    <>
      {/* Wrap the conditional rendering in curly braces */}
      {!open && (
        <button
          title="Open chat with trainer assistant"
          className="fixed bottom-6 right-6 z-50 bg-primary text-white rounded-full shadow-lg p-3 hover:bg-primary/90 transition"
          onClick={() => setOpen(true)}
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}
      {open && (
        <div 
          className="fixed bottom-6 right-6 z-50 w-80 max-w-[90vw] bg-card border border-white/10 rounded-xl shadow-2xl flex flex-col transition-all duration-300 ease-out overflow-hidden" // Added border, overflow-hidden
          style={{
            backgroundImage: `linear-gradient(rgba(10, 5, 5, 0.65), rgba(10, 5, 5, 0.65)), url('https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcST25vZzhlUORJgddBzGPxEzMLuNBsnfYtJ8bAgxb-UvcI0TH99PPT_NhbvaMw0RZyIHRI&usqp=CAU')`, // Updated URL
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        >
          {/* Header - Slightly darker, matching overlay */}
          <div className="flex items-center justify-between p-3 border-b border-white/15 bg-black/40 text-white rounded-t-xl"> {/* Adjusted header style */}
            <span className="font-bold flex items-center gap-2">
              <MessageCircle className="w-5 h-5" /> Trainer Assistant
            </span>
            <button onClick={() => setOpen(false)} aria-label="Close Chatbot" className="text-white/80 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Message Area - Adjusted bubble colors */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ maxHeight: 320 }}>
            {messages.map((msg, i) => {
              // Example: Replace with your actual rep tracking state
              const currentRep = 5; // placeholder
              const totalReps = 10; // placeholder
              // Hypothetical: Assume you have currentRep and totalReps state
              const repProgress = msg.sender === 'bot' && msg.text.includes("rep") ? ` [${currentRep}/${totalReps}]` : '';
              
              return (
                <div key={i} className={`flex items-end gap-2 max-w-[90%] ${msg.sender === 'user' ? 'ml-auto' : ''} message-enter`}>
                  {msg.sender === 'bot' && <span className="text-xl">🤖</span>}
                  <div className={`text-sm rounded-lg px-3 py-2 shadow-md ${msg.sender === 'bot' 
                    ? 'bg-zinc-800/70 text-white/90 rounded-bl-none' // Darker grey bot message
                    : 'bg-red-900/60 text-white/90 rounded-br-none ml-auto'} // Muted red user message
                  `}>
                    {msg.text}
                    {/* Display simple text progress */}
                    {/* {repProgress && <span className="text-xs font-semibold text-red-300/80">{repProgress}</span>} */}
                  </div>
                  {msg.sender === 'user' && <span className="text-xl">👤</span>}
                </div>
              );
            })}
            {/* Typing Indicator - Adjusted color */}
            {loading && (
              <div className="flex items-center gap-2">
                 <span className="text-xl">🤖</span>
                 <div className="text-sm text-white/80 flex items-center space-x-1"> {/* Adjusted typing indicator color */}
                    <span className="animate-pulse">.</span>
                    <span className="animate-pulse delay-150">.</span>
                    <span className="animate-pulse delay-300">.</span>
                 </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {/* Input Area - Adjusted style */}
          <form
            className="flex items-start gap-2 border-t border-white/15 p-2 bg-black/50" // Use items-start for alignment with taller textarea
            onSubmit={sendMessage} // Use the updated sendMessage
          >
            <textarea
              ref={textareaRef}
              className="flex-1 rounded-lg border border-white/20 bg-black/30 px-3 py-2 text-sm text-white/90 placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-red-600 resize-none overflow-hidden min-h-[40px] max-h-[120px]" // Added resize-none, overflow-hidden, min/max height
              placeholder="Type your message..."
              value={input}
              onChange={handleInputChange} // Use the new handler
              disabled={loading}
              rows={1} // Start with one row
              onKeyDown={(e) => {
                // Send message on Enter, allow Shift+Enter for newline
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button
              type="submit"
              className="p-2 rounded-full bg-red-800 text-white hover:bg-red-700 disabled:opacity-50 disabled:bg-zinc-600 self-end mb-[1px]" // Align button to bottom
              disabled={loading || !input.trim()}
              aria-label="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
