import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './Chat.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';
let socket;

const Chat = ({ username }) => {
  const [message, setMessage] = useState('');
  const [chat, setChat] = useState([]);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('public');
  const [privateChats, setPrivateChats] = useState({});
  const [notifications, setNotifications] = useState({});
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!socket) {
      // Initialize socket connection only once
      socket = io(BACKEND_URL, {
        query: { username },
      });

      // Register the user
      if (username) {
        socket.emit('registerUser', username);
      }

      // Listen for previous messages (load existing messages when joining)
      socket.on('previousMessages', (messages) => {
        setChat(messages);
      });

      // Listen for updated user list
      socket.on('updateUserList', (usersList) => {
        setUsers(usersList.filter((user) => user !== username));
      });

      // Listen for new public messages
      socket.on('publicMessage', (data) => {
        setChat((prevChat) => [...prevChat, data]);
        if (activeTab !== 'public') {
          setNotifications((prevNotifications) => ({
            ...prevNotifications,
            public: (prevNotifications.public || 0) + 1,
          }));
        }
      });

      // Listen for private messages
      socket.on('privateMessage', (data) => {
        const { senderName, recipient } = data;
        const chatPartner = senderName === username ? recipient : senderName;

        // Update private chats
        setPrivateChats((prevPrivateChats) => {
          const updatedChats = { ...prevPrivateChats };
          if (!updatedChats[chatPartner]) {
            updatedChats[chatPartner] = [];
          }
          updatedChats[chatPartner].push(data);
          return updatedChats;
        });

        // Add notification if user is not in the active chat with sender
        if (username === recipient && activeTab !== senderName) {
          setNotifications((prevNotifications) => ({
            ...prevNotifications,
            [senderName]: (prevNotifications[senderName] || 0) + 1,
          }));
        }
      });

      // Clean up the socket when the component is unmounted
      return () => {
        socket.off('previousMessages');
        socket.off('publicMessage');
        socket.off('privateMessage');
        socket.disconnect(); // Disconnect socket on component unmount
        socket = null;
      };
    }
  }, [username]);

  const sendMessage = () => {
    if (message.trim() !== '') {
      const messageData = {
        message,
        senderName: username,
        recipient: activeTab === 'public' ? null : activeTab,
      };

      if (activeTab === 'public') {
        socket.emit('publicMessage', messageData);
      } else {
        // Avoid sending multiple times by ensuring single emit
        socket.emit('privateMessage', messageData);
      }
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
        <p style={{ color: "#00ffff"}}>No messages yet. Start chatting!</p>
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
