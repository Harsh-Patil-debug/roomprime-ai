// Refined UI Pass: Converted 70 hardcoded color references to semantic design tokens.
// Enhanced WhatsApp simulator UI, terminal logger, and theme consistency.

import { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Send,
  Smartphone,
  Terminal,
  ChevronDown,
  ChevronUp,
  Play,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRoomFlow, STAFF_PHONES } from "./store";

export function WhatsAppSandbox() {
  const { rooms, staff, whatsappLogs, simulateIncomingWhatsApp } = useRoomFlow();
  
  // Webhook sender phone
  const [waSender, setWaSender] = useState("+15551010001");
  const [waMessage, setWaMessage] = useState("");
  
  // Accordion toggle for raw logs
  const [logsExpanded, setLogsExpanded] = useState(false);

  // Auto-scroll chat to bottom
  const chatBottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [whatsappLogs]);

  // Find staff name by phone
  const getStaffNameByPhone = (phone: string) => {
    return Object.keys(STAFF_PHONES).find((key) => STAFF_PHONES[key] === phone) || "Housekeeper";
  };

  const activeWorkerName = getStaffNameByPhone(waSender);

  const handleQuickAction = (commandText: string) => {
    simulateIncomingWhatsApp(waSender, commandText, false);
    toast.success(`Simulated text: "${commandText}"`);
  };

  const handleSendMessage = () => {
    if (!waMessage.trim()) {
      toast.error("Please type a message first.");
      return;
    }
    simulateIncomingWhatsApp(waSender, waMessage, false);
    setWaMessage("");
  };

  // Plain-English system reaction generator
  const getPlainEnglishReaction = (log: { body: string; type: "inbound" | "outbound"; sender: string }) => {
    const isInbound = log.type === "inbound";
    const text = log.body.trim();
    const senderName = log.sender.split(" (")[0] || "Housekeeper";

    if (!isInbound) {
      return `System dispatched automated reply: "${log.body}"`;
    }

    // 1. START [room#]
    const startMatch = text.match(/^START\s+(\d+)/i);
    if (startMatch) {
      return `🧹 ${senderName} checked in to Room ${startMatch[1]}. Status changed to "Cleaning in Progress" and live turnaround stopwatch timer started.`;
    }

    // 2. READY / COMPLETE [room#]
    const readyMatch = text.match(/^READY\s+(\d+)/i);
    if (readyMatch) {
      return `✅ ${senderName} completed room turnover for Room ${readyMatch[1]}. Status updated to "Inspection Pending", notifying supervisor.`;
    }

    // 3. ISSUE [room#] [details]
    const issueMatch = text.match(/^ISSUE\s+(\d+)\s+(.*)/i);
    if (issueMatch) {
      return `⚠️ ${senderName} reported maintenance fault for Room ${issueMatch[1]}: "${issueMatch[2]}". Room set to "Maintenance Blocked" and request added to queue.`;
    }

    // 4. Staging Photo uploads
    if (text.toLowerCase().includes("photo") || text.toLowerCase().includes("staging")) {
      let typeLabel = "Clean turn check";
      if (text.toLowerCase().includes("bed")) typeLabel = "Wrinkled bed linning";
      if (text.toLowerCase().includes("trash")) typeLabel = "Desk floor debris";
      return `📸 ${senderName} uploaded visual staging check image. Gemini Vision AI checked and returned: "${typeLabel}".`;
    }

    return `💬 ${senderName} sent command: "${log.body}"`;
  };

  return (
    <div className="space-y-6">
      
      {/* 1. RENAME HEADER & HELPER SUBTITLE */}
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          WhatsApp Staff Live Simulation (Interactive Demo)
        </h2>
        <p className="text-xs text-muted-foreground mt-1 font-sans">
          Simulate staff text commands on WhatsApp to see live task assignment and room status changes in real time.
        </p>
      </div>

      {/* 2. CLEAN 2-COLUMN SPLIT */}
      <div className="grid gap-6 md:grid-cols-2">
        
        {/* LEFT COLUMN: WhatsApp Mobile Chat Simulator */}
        <Card className="bg-card border border-border shadow-sm p-5 flex flex-col h-[550px] justify-between">
          
          {/* Chat Window Top Bar */}
          <div className="border-b pb-3 border-border/60 /60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                {activeWorkerName.split(" ").map(n => n[0]).join("")}
              </span>
              <div>
                <span className="font-display font-semibold text-foreground text-sm block leading-none">{activeWorkerName}</span>
                <span className="text-[10px] text-muted-foreground font-mono mt-1 block">{waSender}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5 bg-ready/15 text-ready border border-ready/20 text-[9px] py-0 px-2 rounded-full font-bold">
              CONNECTED
            </div>
          </div>

          {/* Chat bubbles list area */}
          <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1 scrollbar-thin scrollbar-thumb-border">
            {whatsappLogs.map((log) => {
              const isInbound = log.type === "inbound";
              return (
                <div
                  key={log.id}
                  className={`flex flex-col w-full max-w-[85%] ${
                    isInbound ? "ml-auto items-end" : "mr-auto items-start"
                  }`}
                >
                  <span className="text-[9px] text-muted-foreground font-sans mb-1 font-semibold">
                    {isInbound ? `${log.sender}` : "RoomFlow Dispatcher"} • {log.timestamp}
                  </span>

                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-xs shadow-xs leading-relaxed ${
                      isInbound
                        ? "bg-card text-foreground rounded-tr-none border border-border"
                        : "bg-ready/15 text-foreground rounded-tl-none border border-ready/25"
                    }`}
                  >
                    {log.body}
                  </div>
                </div>
              );
            })}

            {whatsappLogs.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-2 py-20 text-muted-foreground italic">
                <span className="text-3xl">💬</span>
                <p className="text-xs font-semibold text-foreground">No active conversation thread</p>
                <p className="text-[10px] max-w-xs">Tap one of the quick replies below to start simulating.</p>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Interactive Chat reply & input box */}
          <div className="border-t pt-3 border-border/60 /60 space-y-3">
            
            {/* Quick replies buttons */}
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[10px] font-sans text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 gap-1 font-bold p-1 px-2.5 rounded-full"
                onClick={() => handleQuickAction("START 203")}
              >
                ▶ START Room 203
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[10px] font-sans text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 gap-1 font-bold p-1 px-2.5 rounded-full"
                onClick={() => handleQuickAction("READY 203")}
              >
                ✔ READY Room 203
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[10px] font-sans text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 gap-1 font-bold p-1 px-2.5 rounded-full"
                onClick={() => handleQuickAction("ISSUE 102 Clogged Drain")}
              >
                ⚠ ISSUE 102 Clogged Drain
              </Button>
            </div>

            {/* Custom Input */}
            <div className="flex gap-1.5">
              <Input
                className="h-8 text-xs flex-1 border-border"
                placeholder="Type manual custom WhatsApp command..."
                value={waMessage}
                onChange={(e) => setWaMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <Button size="sm" className="h-8 w-8 p-0 bg-primary hover:bg-primary/90 text-black shrink-0" onClick={handleSendMessage}>
                <Send className="size-3.5" />
              </Button>
            </div>
          </div>

        </Card>

        {/* RIGHT COLUMN: Simplified Live Action Feed */}
        <Card className="bg-card border border-border shadow-sm p-5 flex flex-col h-[550px]">
          
          <div className="border-b pb-3 border-border/60 /60 flex items-center justify-between">
            <div>
              <h3 className="font-display font-semibold text-base text-foreground flex items-center gap-1.5">
                <Clock className="size-4.5 text-primary" /> Live Action Feed
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">Plain-English system routing updates parsed from WhatsApp webhook requests.</p>
            </div>
            
            <Badge className="bg-primary/10 text-primary border border-primary/20 hover:none text-[10px] py-0 px-2 font-mono">
              {whatsappLogs.length} updates
            </Badge>
          </div>

          <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1 scrollbar-thin scrollbar-thumb-border">
            {whatsappLogs.map((log) => {
              const isStatus = log.body.includes("READY") || log.body.includes("START") || log.body.includes("Turn completed");
              const isIssue = log.body.includes("ISSUE");
              
              return (
                <div key={log.id} className="p-3 bg-muted/35 /10 rounded-xl border border-border space-y-1.5 leading-relaxed text-xs">
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground font-mono">
                    <span>{log.timestamp}</span>
                    <Badge variant="outline" className={`text-[8px] px-1 py-0 leading-none ${
                      isIssue ? "border-destructive/30 text-destructive" : isStatus ? "border-ready/30 text-ready" : "border-border text-muted-foreground"
                    }`}>
                      {isIssue ? "MAINTENANCE" : isStatus ? "ROOM STATUS" : "SERVICE"}
                    </Badge>
                  </div>
                  <p className="text-foreground font-medium leading-relaxed">
                    {getPlainEnglishReaction(log)}
                  </p>
                </div>
              );
            })}

            {whatsappLogs.length === 0 && (
              <div className="h-full flex items-center justify-center text-muted-foreground italic text-center py-20">
                Awaiting simulated events...
              </div>
            )}
          </div>

          {/* Webhook Configuration form inside bottom of sidebar */}
          <div className="border-t pt-3 border-border/60 /60 space-y-1.5">
            <Label htmlFor="sandbox-sender-select" className="text-[9px] uppercase font-bold text-muted-foreground">Select staff context phone</Label>
            <select
              id="sandbox-sender-select"
              value={waSender}
              onChange={(e) => setWaSender(e.target.value)}
              className="w-full h-8 text-xs border rounded-md px-2 bg-transparent text-foreground border-border"
            >
              {Object.entries(STAFF_PHONES).map(([name, phone]) => (
                <option key={phone} value={phone} className="bg-background text-foreground">
                  {name} ({phone})
                </option>
              ))}
            </select>
          </div>

        </Card>

      </div>

      {/* 3. EXPANDABLE ACCORDION FOR RAW WEBHOOK TERMINAL LOGS */}
      <Card className="border border-border bg-card shadow-sm rounded-xl overflow-hidden">
        <button
          onClick={() => setLogsExpanded(!logsExpanded)}
          className="w-full p-4 flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:bg-accent/30 transition-colors border-none"
        >
          <span className="flex items-center gap-1.5 font-mono">
            <Terminal className="size-4 text-primary" /> Advanced Raw Webhook & Terminal Logs
          </span>
          {logsExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>

        {logsExpanded && (
          <div className="bg-zinc-950 text-slate-100 p-5 border-t border-zinc-950 font-mono text-[10px] h-[300px] overflow-y-auto leading-relaxed scrollbar-thin scrollbar-thumb-zinc-850">
            <div className="border-b border-zinc-800 pb-2 mb-3 flex justify-between items-center text-[9px] text-slate-500">
              <span>POST /api/webhooks/whatsapp HTTP/1.1</span>
              <span>RAW LOG STREAM</span>
            </div>

            <div className="space-y-4">
              {whatsappLogs.map((log) => {
                const isPhoto = log.body.includes("photo") || log.body.includes("uploaded");
                const senderName = log.sender.split(" (")[0] ?? "Housekeeper";
                const phone = STAFF_PHONES[senderName] ?? "+15551010001";
                const cleanBody = log.body;

                return (
                  <div key={log.id} className="border-b border-zinc-800 pb-3 last:border-0 last:pb-0 space-y-1 text-slate-350">
                    <div className="flex justify-between text-slate-500 text-[8px] font-sans">
                      <span>{log.timestamp}</span>
                      <span className={log.type === "inbound" ? "text-sky-400" : "text-emerald-400"}>
                        {log.type === "inbound" ? "INBOUND POST" : "OUTBOUND RESPONSE"}
                      </span>
                    </div>

                    <div className="bg-zinc-900/60 p-2 rounded border border-zinc-850">
                      {log.type === "inbound" ? (
                        <>
                          <span className="text-yellow-600 font-bold">POST</span> /api/webhooks/whatsapp HTTP/1.1<br/>
                          <span className="text-slate-500">Headers:</span> Host=api.roomflow.com, Content-Type=url-encoded<br/>
                          <span className="text-slate-500">Payload:</span> From={encodeURIComponent(phone)}&amp;Body={encodeURIComponent(cleanBody)}&amp;NumMedia={isPhoto ? 1 : 0}
                        </>
                      ) : (
                        <>
                          <span className="text-emerald-600 font-bold">HTTP/1.1 200 OK</span><br/>
                          <span className="text-slate-500">Content-Type:</span> application/xml<br/>
                          <span className="text-slate-500">TwiML:</span> &lt;Response&gt;&lt;Message&gt;{cleanBody}&lt;/Message&gt;&lt;/Response&gt;
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {whatsappLogs.length === 0 && (
                <div className="text-center text-slate-600 py-16 italic">
                  Awaiting twilio webhook simulation connection logs...
                </div>
              )}
            </div>
          </div>
        )}
      </Card>

    </div>
  );
}
