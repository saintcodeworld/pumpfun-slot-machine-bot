import { useState, useEffect, useRef } from 'react';
import { supabase, supabaseConfigured } from '../utils/supabase';
import { socket } from '../utils/socket';

export default function ChatSidebar() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [nickname, setNickname] = useState('');
  const [hasNickname, setHasNickname] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const handleChatMessage = (msg) => {
      setMessages((prev) => [...prev, msg].slice(-100));
    };

    socket.on('chat-message', handleChatMessage);

    // Load recent messages from Supabase if configured
    if (supabaseConfigured) {
      loadRecentMessages();

      const channel = supabase
        .channel('chat')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_messages' },
          (payload) => {
            setMessages((prev) => [...prev, payload.new].slice(-100));
          },
        )
        .subscribe();

      return () => {
        socket.off('chat-message', handleChatMessage);
        channel.unsubscribe();
      };
    }

    return () => {
      socket.off('chat-message', handleChatMessage);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function loadRecentMessages() {
    try {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (data) setMessages(data.reverse());
    } catch {
      // Supabase not available
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const value = input.trim();
    if (!value) return;

    // First submission sets the nickname
    if (!hasNickname) {
      setNickname(value);
      setHasNickname(true);
      setInput('');
      return;
    }

    const message = { nickname, text: value, timestamp: Date.now() };

    // Broadcast via WebSocket
    socket.emit('chat-message', message);

    // Persist to Supabase
    if (supabaseConfigured) {
      try {
        await supabase.from('chat_messages').insert([{ nickname, text: value }]);
      } catch {
        // ignore
      }
    }

    setInput('');
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-800 bg-gray-900/50 flex-shrink-0">
        <h2 className="text-lg font-bold text-green-400">💬 Chat</h2>
        {hasNickname && (
          <p className="text-xs text-gray-500 mt-0.5">
            Chatting as <span className="text-green-300 font-medium">{nickname}</span>
          </p>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="text-xs text-gray-600 text-center mt-8">
            {hasNickname ? 'No messages yet. Say hi!' : 'Enter a nickname to start chatting.'}
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className="text-sm break-words">
            <span className="text-green-400 font-semibold">{msg.nickname}: </span>
            <span className="text-gray-300">{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800 flex-shrink-0">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={hasNickname ? 'Type a message…' : 'Get Nickname'}
          className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-green-500/70 focus:ring-1 focus:ring-green-500/30 transition-all"
        />
      </form>
    </div>
  );
}
