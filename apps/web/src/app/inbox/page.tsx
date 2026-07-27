'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';

export default function InboxPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadConversations() {
      const res = await api.get('/messaging/conversations');
      if (res.success && res.data) {
        const convList = Array.isArray(res.data) ? res.data : res.data.conversations || [];
        setConversations(convList);
        if (convList.length > 0) {
          setSelectedChat(convList[0]);
        }
      } else {
        // Fallback demo conversations
        const demoConv = [
          { id: 'c1', name: 'Dr. Tope Olaniyi', role: 'Cardiologist', lastMsg: 'Your lab report looks stable.', time: '10:30 AM', unread: 2 },
          { id: 'c2', name: 'Akala Juwon', role: 'Patient', lastMsg: 'Can I reschedule for tomorrow?', time: 'Yesterday', unread: 0 },
          { id: 'c3', name: 'St. Jude Hospital Pharmacy', role: 'Pharmacy', lastMsg: 'Order #RX9201 is ready for delivery.', time: 'Jul 24', unread: 0 },
        ];
        setConversations(demoConv);
        setSelectedChat(demoConv[0]);
      }
      setLoading(false);
    }
    loadConversations();
  }, []);

  useEffect(() => {
    if (!selectedChat) return;
    async function loadMessages() {
      const res = await api.get(`/messaging/conversations/${selectedChat.id}/messages`);
      if (res.success && res.data) {
        setMessages(Array.isArray(res.data) ? res.data : res.data.messages || []);
      } else {
        setMessages([
          { id: 'm1', sender: 'them', text: 'Hello, please review your prescription details.', time: '10:15 AM' },
          { id: 'm2', sender: 'me', text: 'Thank you doctor, will check right away.', time: '10:20 AM' },
          { id: 'm3', sender: 'them', text: selectedChat.lastMsg || 'Your lab report looks stable.', time: '10:30 AM' },
        ]);
      }
    }
    loadMessages();
  }, [selectedChat]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat) return;

    const msgText = newMessage;
    setNewMessage('');
    setMessages((prev) => [...prev, { id: Date.now().toString(), sender: 'me', text: msgText, time: 'Just now' }]);

    await api.post(`/messaging/conversations/${selectedChat.id}/messages`, {
      content: msgText,
    });
  };

  return (
    <SidebarLayout>
      <div className="h-[calc(100vh-140px)] bg-white rounded-3xl shadow-xs border border-slate-200/60 flex overflow-hidden">
        {/* Left Conversation List */}
        <div className="w-80 border-r border-slate-100 flex flex-col justify-between shrink-0">
          <div>
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-base">Inbox Messages</h2>
              <input
                type="text"
                placeholder="Search conversations..."
                className="mt-3 w-full px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
              />
            </div>

            <div className="divide-y divide-slate-100 overflow-y-auto max-h-[calc(100vh-230px)]">
              {conversations.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`w-full p-4 text-left flex items-center justify-between transition-colors ${
                    selectedChat?.id === chat.id ? 'bg-blue-50/70 border-l-4 border-[#1877F2]' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 font-bold flex items-center justify-center text-sm shrink-0">
                      👤
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-slate-900 truncate">{chat.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{chat.lastMsg}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[9px] text-slate-400 font-medium">{chat.time}</p>
                    {chat.unread > 0 && (
                      <span className="mt-1 inline-block px-1.5 py-0.5 bg-[#1877F2] text-white text-[9px] font-bold rounded-full">
                        {chat.unread}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Active Chat Pane */}
        {selectedChat ? (
          <div className="flex-1 flex flex-col justify-between">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1877F2] text-white font-bold flex items-center justify-center text-sm">
                  👤
                </div>
                <div>
                  <h3 className="font-bold text-xs text-slate-900">{selectedChat.name}</h3>
                  <p className="text-[10px] text-slate-500">{selectedChat.role || 'Active Consultation'}</p>
                </div>
              </div>
              <button className="px-3 py-1.5 bg-[#1877F2] text-white text-xs font-bold rounded-full shadow-xs">
                📞 Call Doctor
              </button>
            </div>

            {/* Messages Feed */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/30">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                      msg.sender === 'me'
                        ? 'bg-[#1877F2] text-white font-medium shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-800 shadow-xs'
                    }`}
                  >
                    <p>{msg.text}</p>
                    <p className={`text-[9px] mt-1 text-right ${msg.sender === 'me' ? 'text-blue-100' : 'text-slate-400'}`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Input Footer */}
            <form onSubmit={handleSend} className="p-4 border-t border-slate-100 flex items-center gap-3 bg-white">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-full text-xs shadow-md transition-colors"
              >
                Send
              </button>
            </form>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
