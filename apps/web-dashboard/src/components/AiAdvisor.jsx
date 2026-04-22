import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib.js'; // Direct API authority

// Professional Nexus Icon (Relocated to src/assets)
import nexusIcon from '../assets/nexus-icon.png';

export default function AiAdvisor({ user, onTriggerOrder, onOrderCreated, onCancelLatest }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Nexus Strategic Intelligence Online. Operational sectors synchronized. Mumbai Command Bridge established. Standby for directives.", sender: 'ai' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isTyping, displayedText]);

  const executeAutonomousCommand = async (actionData) => {
    if (!user || (!user.id && !user.name)) {
        streamText("Command Failure: Auth Signature invalid. Nexus requires a verified hospital sector to modulate database telemetry.");
        return;
    }

    try {
        const result = await api.createRequest({
            hospitalId: user.id || 'authorized_sector', 
            bloodGroup: actionData.bloodGroup,
            urgency: actionData.urgency,
            lat: Number(user.lat) || 19.076,
            lng: Number(user.lng) || 72.8777,
            unitsNeeded: actionData.unitsNeeded || 1,
            notes: actionData.notes
        });
        
        onOrderCreated?.(result);
        streamText(`Autonomous Execution Success. Broadcast Hash: ${result.id.substring(0,8)}. Emergency protocols are now live in the sector.`);
    } catch (err) {
        streamText(`Operational Alert: Terminal injection failed. Reason: ${err.message}`);
    }
  };

  const executeCancelDirective = async () => {
    const success = await onCancelLatest?.();
    if (success) {
        streamText("Operational Directive Terminated. Broadcast signal modulated. Registry status: STANDBY.");
    } else {
        streamText("Directive Modulation Failed: No active sector broadcasts identified in the session history.");
    }
  };

  const streamText = (text, action, actionData) => {
    let index = 0;
    setDisplayedText('');
    const words = text.split(' ');
    const interval = setInterval(() => {
        if (index < words.length) {
            setDisplayedText(prev => prev + (index === 0 ? '' : ' ') + words[index]);
            index++;
        } else {
            clearInterval(interval);
            setMessages(prev => [...prev, { id: Date.now(), text, sender: 'ai' }]);
            setDisplayedText('');
            setIsTyping(false);

            // Execute action if provided
            if (action === 'TRIGGER_ORDER_AUTONOMOUS') {
                executeAutonomousCommand(actionData);
            } else if (action === 'CANCEL_DIRECTIVE') {
                executeCancelDirective();
            } else if (action === 'TRIGGER_ORDER') {
                onTriggerOrder?.(actionData);
            }
        }
    }, 40);
  };

  const handleSend = async (msgText) => {
    const textToSend = msgText || input;
    if (!textToSend.trim()) return;

    const userMsg = { id: Date.now(), text: textToSend, sender: 'user' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const res = await fetch('http://localhost:8000/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend, hospital_id: user?.id })
      });
      const data = await res.json();
      streamText(data.response, data.action, data.data);
    } catch (err) {
      streamText("Nexus uplink disrupted. Please verify ai-engine node status.");
    }
  };

  const quickActions = [
    { label: "Request O- Units", query: "Execute O- emergency order" },
    { label: "Cancel Directive", query: "Abort my last order broadcast" },
    { label: "Sector Audit", query: "Perform high-intensity sector audit" },
    { label: "Check Compatibility", query: "Can AB- receive from B+?" }
  ];

  return (
    <div className="ai-advisor-container">
      <motion.button 
        className="ai-fab"
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{ padding: 0, overflow: 'hidden', background: '#0a0c14', border: '2px solid var(--red)' }}
      >
        <img src={nexusIcon} alt="Nexus" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="ai-chat-window glass"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
          >
            <div className="ai-chat-header" style={{ borderLeft: '4px solid var(--red)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={nexusIcon} alt="Nexus" style={{ width: 32, height: 32, borderRadius: 4, border: '1px solid var(--glass-border)' }} />
                <div>
                    <div className="ai-chat-title" style={{ color: 'var(--red)', letterSpacing: 1 }}>Nexus Strategic Intelligence</div>
                    <div className="ai-chat-status">
                        <span className="pulse-dot-green"></span>
                        COMMAND_BRIDGE: ACTIVE // ACCESS: FULL_CENTRAL_COMMAND
                    </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#fff', opacity: 0.5, cursor: 'pointer' }}>✕</button>
            </div>

            <div className="ai-chat-body" ref={chatRef}>
              {messages.map((m) => (
                <div key={m.id} className={`ai-msg-row ${m.sender}`}>
                  <div className={`ai-msg-bubble ${m.sender === 'ai' ? 'glass' : 'user-bubble'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="ai-msg-row ai">
                  <div className="ai-msg-bubble glass typing-dots">
                    {displayedText || (
                        <><span>.</span><span>.</span><span>.</span></>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="ai-quick-actions">
                {quickActions.map(qa => (
                    <button key={qa.label} onClick={() => handleSend(qa.query)} className="qa-chip">
                        {qa.label}
                    </button>
                ))}
            </div>

            <form className="ai-chat-footer" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
              <input 
                type="text" 
                placeholder="Initialize Centeral Command directive..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoFocus
                style={{ fontFamily: 'monospace', fontSize: 12 }}
              />
              <button type="submit" disabled={!input.trim()}>
                <div className="ai-send-icon">↗</div>
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
