import { useState, useRef, useEffect } from "react";
import {
  ArrowLeft,
  Send,
  MessageCircle,
  X,
  Clock,
  CheckCheck,
  Hotel,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatMessage {
  id: string;
  text: string;
  sender: "guest" | "staff";
  timestamp: string;
  status?: "sent" | "delivered" | "read";
}

const STORAGE_KEY = "roomflow_chat_messages";

// Initial demo messages
const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "1",
    text: "Hello, could we have two extra espresso pods delivered to room 203?",
    sender: "guest",
    timestamp: "09:41 AM",
    status: "read",
  },
  {
    id: "2",
    text: "Of course! A member of our team will be at your door shortly.",
    sender: "staff",
    timestamp: "09:43 AM",
  },
  {
    id: "3",
    text: "Thank you.",
    sender: "guest",
    timestamp: "09:45 AM",
    status: "read",
  },
];

function getStoredMessages(): ChatMessage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    // ignore
  }
  return INITIAL_MESSAGES;
}

function storeMessages(messages: ChatMessage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

function getCurrentTime(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  userRole: "guest" | "staff";
}

export function ChatPanel({ open, onClose, userRole }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(getStoredMessages);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync messages from localStorage on interval (for cross-tab updates)
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => {
      const stored = getStoredMessages();
      setMessages(stored);
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Focus input when opened
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      text: trimmed,
      sender: userRole,
      timestamp: getCurrentTime(),
      status: "delivered",
    };

    const updated = [...messages, newMessage];
    setMessages(updated);
    storeMessages(updated);
    setInput("");

    // Simulate auto-reply from the other side (only in demo mode)
    if (userRole === "guest") {
      setIsTyping(true);
      setTimeout(() => {
        const autoReply: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          text: getAutoReply(trimmed),
          sender: "staff",
          timestamp: getCurrentTime(),
        };
        const withReply = [...updated, autoReply];
        setMessages(withReply);
        storeMessages(withReply);
        setIsTyping(false);
      }, 1500 + Math.random() * 1500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const otherLabel = userRole === "guest" ? "Concierge" : "Guest – Room 203";
  const headerTitle = userRole === "guest" ? "RoomFlow Concierge" : "Guest Chat";

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/30 backdrop-blur-sm z-50 transition-opacity duration-300 ${
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Chat Panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-50 w-full max-w-md transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col bg-[#F5F1E8] shadow-2xl border-l border-[#EBE3D1]">
          {/* Header */}
          <div className="bg-[#2A2620] text-white px-4 py-4 flex items-center gap-3 shrink-0">
            <button
              onClick={onClose}
              className="flex size-9 items-center justify-center rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="flex size-10 items-center justify-center rounded-full bg-[#B5652F] text-white shrink-0">
                <Hotel className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-bold tracking-wide truncate uppercase">
                  {headerTitle}
                </h2>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-white/60 font-medium uppercase tracking-wider">
                    Usually replies in minutes
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Date separator */}
          <div className="flex justify-center py-3 shrink-0">
            <span className="px-3 py-1 rounded-full bg-[#EBE3D1] text-[9px] font-bold text-[#736B5E] uppercase tracking-wider">
              Today, {new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit" })}
            </span>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 pb-3 space-y-3 scroll-smooth"
          >
            {messages.map((msg) => {
              const isMine = msg.sender === userRole;
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                  {/* Sender label */}
                  {!isMine && (
                    <span className="text-[9px] font-bold text-[#736B5E] uppercase tracking-wider mb-1 ml-1">
                      {otherLabel}
                    </span>
                  )}

                  <div
                    className={`relative max-w-[80%] px-4 py-3 text-[13px] leading-relaxed ${
                      isMine
                        ? "bg-[#2A2620] text-white rounded-2xl rounded-br-md shadow-md"
                        : "bg-white text-[#2A2620] rounded-2xl rounded-bl-md shadow-sm border border-[#EBE3D1]"
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Timestamp + status */}
                  <div className={`flex items-center gap-1 mt-1 ${isMine ? "mr-1" : "ml-1"}`}>
                    <span className="text-[9px] text-[#736B5E]/70 font-medium">{msg.timestamp}</span>
                    {isMine && msg.status === "read" && (
                      <CheckCheck className="size-3 text-[#B5652F]" />
                    )}
                    {isMine && msg.status === "delivered" && (
                      <CheckCheck className="size-3 text-[#736B5E]/50" />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex flex-col items-start">
                <span className="text-[9px] font-bold text-[#736B5E] uppercase tracking-wider mb-1 ml-1">
                  {otherLabel}
                </span>
                <div className="bg-white text-[#2A2620] rounded-2xl rounded-bl-md shadow-sm border border-[#EBE3D1] px-4 py-3">
                  <div className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-[#736B5E]/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="size-2 rounded-full bg-[#736B5E]/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="size-2 rounded-full bg-[#736B5E]/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="shrink-0 border-t border-[#EBE3D1] bg-white px-3 py-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  userRole === "guest"
                    ? "Message concierge..."
                    : "Reply to guest..."
                }
                className="flex-1 h-11 px-4 rounded-2xl border border-[#E8E2D5] bg-[#F7F5F0] text-sm text-[#2A2620] placeholder-[#736B5E]/40 focus:outline-none focus:ring-2 focus:ring-[#B5652F]/20 focus:border-[#B5652F] transition-all"
              />
              <Button
                type="button"
                onClick={handleSend}
                disabled={!input.trim()}
                className="size-11 rounded-2xl bg-[#B5652F] hover:bg-[#9C5424] text-white shadow-md shrink-0 p-0 cursor-pointer disabled:opacity-40"
              >
                <Send className="size-4.5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Floating chat button component
interface ChatButtonProps {
  onClick: () => void;
  unreadCount?: number;
}

export function ChatButton({ onClick, unreadCount = 0 }: ChatButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="outline"
      size="icon"
      className="relative size-9 border-[#EBE3D1] hover:bg-[#B5652F]/10 shrink-0 rounded-xl cursor-pointer transition-all"
    >
      <MessageCircle className="size-4.5 text-[#B5652F]" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-[#B14A3E] text-[8px] font-black text-white animate-pulse">
          {unreadCount}
        </span>
      )}
    </Button>
  );
}

// Smart auto-reply generator for demo
function getAutoReply(userMessage: string): string {
  const msg = userMessage.toLowerCase();

  if (msg.includes("towel") || msg.includes("linen")) {
    return "Fresh towels will be delivered to your room within 10 minutes. Is there anything else you need?";
  }
  if (msg.includes("clean") || msg.includes("housekeeping")) {
    return "I've scheduled a housekeeping visit for your room. Our team will be there within 15 minutes.";
  }
  if (msg.includes("wifi") || msg.includes("internet") || msg.includes("password")) {
    return "Your WiFi password is RoomFlow_WiFi. Connect to the 'RoomFlow-Guest' network. Let me know if you need further assistance!";
  }
  if (msg.includes("breakfast") || msg.includes("food") || msg.includes("dining")) {
    return "Breakfast is served from 07:00 to 10:30 AM at the Grand Dining Hall on the 2nd floor. Would you like a reservation?";
  }
  if (msg.includes("checkout") || msg.includes("check out") || msg.includes("leaving")) {
    return "Checkout time is 11:00 AM. Would you like to request a late checkout? I can check availability for you.";
  }
  if (msg.includes("spa") || msg.includes("pool") || msg.includes("gym")) {
    return "Our wellness facilities are open from 06:00 AM to 10:00 PM. I can book a spa session for you — what time works best?";
  }
  if (msg.includes("taxi") || msg.includes("cab") || msg.includes("transport") || msg.includes("airport")) {
    return "I'll arrange transport for you right away. Could you please let me know your destination and preferred pickup time?";
  }
  if (msg.includes("thank")) {
    return "You're very welcome! Don't hesitate to reach out if you need anything else. Enjoy your stay! 🌟";
  }
  if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey")) {
    return "Hello! Welcome to RoomFlow Concierge. How may I assist you today?";
  }
  if (msg.includes("help")) {
    return "I'm here to help! I can assist with room service, housekeeping, dining reservations, transport, spa bookings, and more. What do you need?";
  }

  // Default
  const defaults = [
    "Absolutely, I'll take care of that for you right away. Is there anything else?",
    "Thank you for reaching out. A member of our team will assist you shortly.",
    "Noted! We'll get that sorted for you within a few minutes.",
    "Of course! Let me arrange that for you. You'll receive a confirmation shortly.",
  ];
  return defaults[Math.floor(Math.random() * defaults.length)] || defaults[0]!;
}
