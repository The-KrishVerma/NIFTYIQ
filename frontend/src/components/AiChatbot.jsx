import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';

export default function AiChatbot({ symbol }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Hi! I'm the AI analyst for ${symbol}. Ask me anything about their financial reports.` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input.trim();
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`http://localhost:8000/api/chat/${symbol}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Chat failed');
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-insight-blue text-white p-4 rounded-full shadow-lg hover:bg-insight-blue-soft transition flex items-center justify-center"
        >
          <MessageSquare size={24} />
        </button>
      ) : (
        <div className="bg-insight-card border border-insight-border rounded-xl shadow-2xl w-80 sm:w-96 h-[500px] flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-insight-border bg-insight-black/50 rounded-t-xl">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-insight-blue" />
              <h3 className="font-semibold text-insight-text">AI Analyst: {symbol}</h3>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-insight-muted hover:text-white transition">
              <X size={20} />
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-lg text-sm ${
                  msg.role === 'user' 
                    ? 'bg-insight-blue text-white rounded-br-none' 
                    : 'bg-insight-black border border-insight-border text-insight-text rounded-bl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-insight-black border border-insight-border text-insight-text p-3 rounded-lg rounded-bl-none flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-insight-blue" />
                  <span className="text-sm">Analyzing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-insight-border bg-insight-black/50 rounded-b-xl">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={`Ask about ${symbol}...`}
                className="flex-1 bg-insight-black border border-insight-border rounded-lg px-3 py-2 text-sm text-insight-text focus:outline-none focus:border-insight-blue"
              />
              <button 
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-insight-blue text-white p-2 rounded-lg hover:bg-insight-blue-soft transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
