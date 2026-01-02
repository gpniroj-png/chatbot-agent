import React, { useState, useRef, useEffect } from 'react';
import './ChatContainer.css';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatContainerProps {
  onSendMessage?: (message: string) => Promise<string>;
  title?: string;
  placeholder?: string;
}

const ChatContainer: React.FC<ChatContainerProps> = ({
  onSendMessage,
  title = 'Chat Assistant',
  placeholder = 'Type your message here...'
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Hello! How can I assist you today?',
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateMessageId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!inputValue.trim()) {
      return;
    }

    // Add user message
    const userMessage: Message = {
      id: generateMessageId(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call the provided handler or use a default response
      let botResponse = 'I received your message, but I\'m not connected to a backend service yet.';

      if (onSendMessage) {
        botResponse = await onSendMessage(inputValue);
      }

      // Add bot message
      const botMessage: Message = {
        id: generateMessageId(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message:', error);

      // Add error message
      const errorMessage: Message = {
        id: generateMessageId(),
        text: 'Sorry, something went wrong. Please try again.',
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>{title}</h2>
        <div className="header-status">
          {isLoading && <span className="status-indicator loading">Processing...</span>}
        </div>
      </div>

      <div className="messages-container" ref={messagesContainerRef}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message-wrapper ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
          >
            <div className="message-bubble">
              <p>{message.text}</p>
              <span className="message-time">{formatTime(message.timestamp)}</span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message-wrapper bot-message">
            <div className="message-bubble">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          className="message-input"
          aria-label="Message input"
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="send-button"
          aria-label="Send message"
        >
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};

export default ChatContainer;
