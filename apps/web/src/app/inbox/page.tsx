'use client';

import { useEffect, useState } from 'react';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { api } from '@/lib/api-client';
import { Mail, Search, MessageSquare, Send, CheckCircle2, Plus } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface MessageThread {
  id: string;
  senderName: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread?: boolean;
}

export default function InboxPage() {
  const { user } = useAppStore();
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<MessageThread | null>(null);
  const [replyText, setReplyText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // New Message Modal State
  const [showNewMsgModal, setShowNewMsgModal] = useState(false);
  const [recipientName, setRecipientName] = useState('');
  const [subjectText, setSubjectText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    async function loadThreads() {
      setLoading(true);
      const res = await api.get('/messaging/threads');
      const rawList = res.success
        ? Array.isArray(res.data)
          ? res.data
          : res.data?.threads || []
        : [];

      const formatted = rawList.map((t: any) => ({
        id: t.id,
        senderName: t.participantName || t.senderName || 'Healthcare Provider',
        subject: t.subject || 'Consultation Message',
        snippet: t.lastMessage || t.snippet || 'Message content...',
        date: t.updatedAt
          ? new Date(t.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : 'Recent',
        isUnread: t.unreadCount > 0,
      }));

      setThreads(formatted);
      if (formatted.length > 0) {
        setSelectedThread(formatted[0]);
      }
      setLoading(false);
    }
    loadThreads();
  }, []);

  const handleSendReply = async () => {
    if (!replyText.trim() || !selectedThread) return;
    const res = await api.post(`/messaging/threads/${selectedThread.id}/messages`, {
      content: replyText,
    });

    const newSnippet = `You: ${replyText}`;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === selectedThread.id
          ? { ...t, snippet: newSnippet, date: 'Just now', isUnread: false }
          : t
      )
    );
    setSelectedThread((prev) => (prev ? { ...prev, snippet: newSnippet, date: 'Just now' } : null));
    setReplyText('');
  };

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const res = await api.post('/messaging/threads', {
      recipientName,
      subject: subjectText,
      message: bodyText,
    });

    const newThread: MessageThread = {
      id: res.data?.id || `thread-${Date.now()}`,
      senderName: recipientName || 'Healthcare Specialist',
      subject: subjectText || 'Clinical Consultation Inquiry',
      snippet: `You: ${bodyText}`,
      date: 'Just now',
      isUnread: false,
    };

    setThreads((prev) => [newThread, ...prev]);
    setSelectedThread(newThread);
    setShowNewMsgModal(false);
    setSending(false);
    setRecipientName('');
    setSubjectText('');
    setBodyText('');
  };

  const filteredThreads = threads.filter(
    (t) =>
      t.senderName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.snippet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SidebarLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Mail className="w-6 h-6 text-[#1877F2]" /> Messages & Consult Inbox
            </h1>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              Direct confidential communications with your healthcare providers and pharmacies
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <Search className="absolute inset-y-0 left-3.5 my-auto text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-full text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1877F2] shadow-xs"
              />
            </div>

            <button
              type="button"
              onClick={() => setShowNewMsgModal(true)}
              className="px-5 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] text-white font-bold rounded-full text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>New Message</span>
            </button>
          </div>
        </div>

        {/* Message Threads Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[550px]">
          {/* Thread List Column */}
          <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-200/80 space-y-2 lg:col-span-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 py-2">
              Conversations ({filteredThreads.length})
            </h2>
            {loading ? (
              <div className="p-8 text-center text-xs font-bold text-slate-400">Loading messages...</div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">No active message threads found</p>
                <button
                  type="button"
                  onClick={() => setShowNewMsgModal(true)}
                  className="text-xs text-[#1877F2] font-bold hover:underline"
                >
                  + Start New Conversation
                </button>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = selectedThread?.id === thread.id;
                return (
                  <div
                    key={thread.id}
                    onClick={() => setSelectedThread(thread)}
                    className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? 'bg-blue-50 border-[#1877F2]/40 shadow-xs'
                        : 'bg-slate-50/50 border-slate-100 hover:bg-slate-100/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-xs text-slate-900 truncate">{thread.senderName}</h3>
                      <span className="text-[10px] font-semibold text-slate-400">{thread.date}</span>
                    </div>
                    <h4 className="text-xs font-semibold text-[#1877F2] truncate mb-1">{thread.subject}</h4>
                    <p className="text-[11px] text-slate-500 truncate">{thread.snippet}</p>
                  </div>
                );
              })
            )}
          </div>

          {/* Active Conversation Detail Column */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 lg:col-span-2 flex flex-col justify-between">
            {selectedThread ? (
              <>
                <div className="space-y-6">
                  {/* Conversation Header */}
                  <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-extrabold text-slate-900">{selectedThread.subject}</h2>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        With <span className="text-[#1877F2]">{selectedThread.senderName}</span>
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active Consultation
                    </span>
                  </div>

                  {/* Message Body */}
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-2">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                      <span>{selectedThread.senderName}</span>
                      <span className="text-[10px] text-slate-400">{selectedThread.date}</span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {selectedThread.snippet}
                    </p>
                  </div>
                </div>

                {/* Reply Form */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <textarea
                    rows={3}
                    placeholder={`Reply securely to ${selectedThread.senderName}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1877F2] focus:bg-white transition-all resize-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSendReply}
                      disabled={!replyText.trim()}
                      className="px-6 py-2.5 bg-[#1877F2] hover:bg-[#1565C0] disabled:opacity-50 text-white font-bold rounded-full text-xs shadow-md shadow-blue-500/20 transition-all flex items-center gap-2"
                    >
                      <span>Send Message</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-14 h-14 rounded-full bg-blue-50 text-[#1877F2] flex items-center justify-center">
                  <MessageSquare className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">Select a Conversation</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  Click on any conversation thread on the left to read messages, view doctor instructions, and send replies.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Compose New Message Modal */}
        {showNewMsgModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-xs" onClick={() => setShowNewMsgModal(false)} />
            <form onSubmit={handleCreateThread} className="relative bg-white rounded-3xl p-6 shadow-2xl max-w-md w-full z-10 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-extrabold text-slate-900">New Clinical Message</h2>
                <button
                  type="button"
                  onClick={() => setShowNewMsgModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Recipient Doctor / Specialist</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Oluwaseun Davies"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Consultation Follow-up & Medication Advice"
                    value={subjectText}
                    onChange={(e) => setSubjectText(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1877F2]"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Message Content</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Write your clinical inquiry..."
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1877F2] resize-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={sending}
                className="w-full py-3 bg-[#1877F2] text-white font-bold rounded-2xl text-xs shadow-md shadow-blue-500/20"
              >
                {sending ? 'Sending...' : 'Send Message Thread'}
              </button>
            </form>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
