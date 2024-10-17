import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './Chat.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

const Chat = ({ username }) => {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('public');
  const [privateChats, setPrivateChats] = useState({});
  const [notifications, setNotifications] = useState({});
  const [users, setUsers] = useState([]);

  const socketRef = useRef(null);

  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(BACKEND_URL, {
        query: { username },
      });

      if (username) {
        socketRef.current.emit('registerUser', username);
      }

      socketRef.current.on('previousMessages', (messages) => {
        setChat(messages);
      });

      socketRef.current.on('updateUserList', (usersList) => {
        setUsers(usersList.filter((user) => user !== username));
      });

      socketRef.current.on('publicMessage', (data) => {
        // Only update the chat if the message does not already exist in the chat array
        setChat((prevChat) => {
          if (!prevChat.find((msg) => msg.message === data.message && msg.senderName === data.senderName)) {
            return [...prevChat, data];
          }
          return prevChat;
        });

        if (activeTab !== 'public') {
          setNotifications((prevNotifications) => ({
            ...prevNotifications,
            public: (prevNotifications.public || 0) + 1,
          }));
        }
      });

      socketRef.current.on('privateMessage', (data) => {
        const { senderName, recipient } = data;
        const chatPartner = senderName === username ? recipient : senderName;

        setPrivateChats((prevPrivateChats) => {
          const updatedChats = { ...prevPrivateChats };
          if (!updatedChats[chatPartner]) {
            updatedChats[chatPartner] = [];
          }
          if (!updatedChats[chatPartner].find((msg) => msg.message === data.message && msg.senderName === data.senderName)) {
            updatedChats[chatPartner].push(data);
          }
          return updatedChats;
        });

        if (senderName !== username && activeTab !== chatPartner) {
          setNotifications((prevNotifications) => ({
            ...prevNotifications,
            [chatPartner]: (prevNotifications[chatPartner] || 0) + 1,
          }));
        }
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.off('previousMessages');
        socketRef.current.off('updateUserList');
        socketRef.current.off('publicMessage');
        socketRef.current.off('privateMessage');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [username, activeTab]);

  const sendMessage = () => {
    if (message.trim() !== '') {
      const messageData = {
        message,
        senderName: username,
        recipient: activeTab === 'public' ? null : activeTab,
      };

      // Emit the message via socket (do not update chat immediately)
      if (activeTab === 'public') {
        socketRef.current.emit('publicMessage', messageData);
      } else {
        socketRef.current.emit('privateMessage', messageData);
      }

      // Clear the input field
      setMessage('');
    }
  };

  const toggleChat = () => {
    setIsChatOpen((prev) => !prev);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const handleUsernameClick = (selectedUser) => {
    setActiveTab(selectedUser);
    setNotifications((prevNotifications) => {
      const updatedNotifications = { ...prevNotifications };
      delete updatedNotifications[selectedUser];
      return updatedNotifications;
    });
    // Ensure the private chat exists
    setPrivateChats((prevPrivateChats) => {
      if (!prevPrivateChats[selectedUser]) {
        return { ...prevPrivateChats, [selectedUser]: [] };
      }
      return prevPrivateChats;
    });
  };

  const goToPublicChat = () => {
    setActiveTab('public');
    setNotifications((prevNotifications) => {
      const updatedNotifications = { ...prevNotifications };
      delete updatedNotifications.public;
      return updatedNotifications;
    });
  };

  const closePrivateChat = (user) => {
    setPrivateChats((prevChats) => {
      const updatedChats = { ...prevChats };
      delete updatedChats[user];
      return updatedChats;
    });
    setNotifications((prevNotifications) => {
      const updatedNotifications = { ...prevNotifications };
      delete updatedNotifications[user];
      return updatedNotifications;
    });
    if (activeTab === user) {
      setActiveTab('public');
    }
  };

  const renderMessages = () => {
    if (activeTab === 'public') {
      return chat.length > 0 ? (
        chat.map((msg, index) => (
          <div key={index} className="chat-message">
            <span
              className="chat-sender"
              onClick={() => handleUsernameClick(msg.senderName)}
            >
              {msg.senderName}:
            </span>{' '}
            {msg.message}
          </div>
        ))
      ) : (
        <p style={{ color: "#00ffff" }}>No messages yet. Start chatting!</p>
      );
    } else {
      return privateChats[activeTab]?.length > 0 ? (
        privateChats[activeTab].map((msg, index) => (
          <div key={index} className="chat-message">
            <span className="chat-sender">{msg.senderName}:</span> {msg.message}
          </div>
        ))
      ) : (
        <p>No private messages yet with {activeTab}.</p>
      );
    }
  };

  return (
    <>
      {isChatOpen && (
        <div className="chat-container open">
          <div className="chat-header">
            <div className="chat-tabs">
              <div
                className={`chat-tab ${activeTab === 'public' ? 'active' : ''}`}
                onClick={goToPublicChat}
              >
                Public Chat
                {notifications.public && (
                  <span className="notification-badge">
                    {notifications.public}
                  </span>
                )}
              </div>
              {Object.keys(privateChats).map((user) => (
                <div
                  key={user}
                  className={`chat-tab ${activeTab === user ? 'active' : ''}`}
                  onClick={() => handleUsernameClick(user)}
                >
                  {user}
                  {notifications[user] && (
                    <span className="notification-badge">
                      {notifications[user]}
                    </span>
                  )}
                  <span
                    className="close-private-chat"
                    onClick={(e) => {
                      e.stopPropagation();
                      closePrivateChat(user);
                    }}
                  >
                    ✖
                  </span>
                </div>
              ))}
            </div>
            <div className="chat-close-button" onClick={toggleChat}>
              ▼
            </div>
          </div>
          <div className="chat-window">{renderMessages()}</div>
          <div className="chat-input-container">
            <input
              type="text"
              className="chat-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${activeTab === 'public' ? 'Public Chat' : activeTab}...`}
            />
          </div>
        </div>
      )}
      {!isChatOpen && (
        <div className="chat-toggle" onClick={toggleChat}>
          ▲
          {Object.keys(notifications).length > 0 && (
            <span className="notification-badge">
              {Object.keys(notifications).length}
            </span>
          )}
        </div>
      )}
    </>
  );
};

export default Chat;
