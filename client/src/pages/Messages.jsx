import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { messageAPI } from "../services/api";
import "../styles/messages.css";

const formatTime = (isoDate) => {
  const date = new Date(isoDate);
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const formatListTime = (isoDate) => {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMins < 60) return `${Math.max(diffMins, 1)}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const getDateLabel = (isoDate) => {
  const date = new Date(isoDate);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";

  return date.toLocaleDateString([], { month: "long", day: "numeric" });
};

const getSenderId = (message) => String(message?.sender?._id || message?.sender || "");

const getOtherParticipant = (conversation, currentUserId) => {
  const participants = Array.isArray(conversation?.participants) ? conversation.participants : [];
  return (
    participants.find((participant) => String(participant?._id || participant?.id) !== String(currentUserId)) ||
    participants[0] ||
    null
  );
};

export default function Messages() {
  const { user } = useContext(AuthContext);
  const socket = useSocket();
  const location = useLocation();
  const preselectedConversationId = location.state?.conversationId || null;

  const currentUserId = String(user?._id || user?.id || "");
  const [conversations, setConversations] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messagesByConversation, setMessagesByConversation] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [unreadByConversation, setUnreadByConversation] = useState({});
  const [typingUserId, setTypingUserId] = useState(null);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);

  const typingDebounceRef = useRef(null);
  const stopTypingTimerRef = useRef(null);

  useEffect(() => {
    let isActive = true;

    const loadConversations = async () => {
      setLoading(true);
      setError("");

      try {
        const { data } = await messageAPI.getConversations();
        if (!isActive) return;

        const list = Array.isArray(data) ? data : [];
        setConversations(list);

        if (preselectedConversationId && list.some((conversation) => conversation._id === preselectedConversationId)) {
          setSelectedConversationId(preselectedConversationId);
        } else if (list.length > 0) {
          setSelectedConversationId((prev) => prev || list[0]._id);
        } else {
          setSelectedConversationId(null);
        }
      } catch (err) {
        if (!isActive) return;
        setError(err.response?.data?.message || "Failed to load conversations");
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadConversations();

    return () => {
      isActive = false;
    };
  }, [preselectedConversationId]);

  useEffect(() => {
    if (!selectedConversationId) return undefined;

    const loadMessages = async () => {
      try {
        const { data } = await messageAPI.getMessages(selectedConversationId);
        setMessagesByConversation((prev) => ({
          ...prev,
          [selectedConversationId]: Array.isArray(data) ? data : [],
        }));

        setUnreadByConversation((prev) => ({
          ...prev,
          [selectedConversationId]: 0,
        }));
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load messages");
      }
    };

    loadMessages();
  }, [selectedConversationId]);

  useEffect(() => {
    if (!socket || !selectedConversationId) return undefined;

    socket.emit("join_conversation", selectedConversationId);

    return () => {
      socket.emit("leave_conversation", selectedConversationId);
    };
  }, [socket, selectedConversationId]);

  useEffect(() => {
    if (!socket || !currentUserId) return undefined;

    const onReceiveMessage = (incoming) => {
      const conversationId = String(incoming?.conversationId || "");
      if (!conversationId) return;

      const senderId = getSenderId(incoming);
      if (senderId === currentUserId) return;

      setMessagesByConversation((prev) => ({
        ...prev,
        [conversationId]: [...(prev[conversationId] || []), incoming],
      }));

      setConversations((prev) =>
        prev
          .map((conversation) =>
            conversation._id === conversationId
              ? {
                  ...conversation,
                  lastMessage: incoming.content,
                  lastMessageAt: incoming.createdAt,
                }
              : conversation
          )
          .sort((a, b) => new Date(b.lastMessageAt || b.createdAt || 0) - new Date(a.lastMessageAt || a.createdAt || 0))
      );

      if (conversationId !== selectedConversationId) {
        setUnreadByConversation((prev) => ({
          ...prev,
          [conversationId]: (prev[conversationId] || 0) + 1,
        }));
      }
    };

    const onUserTyping = ({ conversationId, senderId }) => {
      if (String(conversationId) !== String(selectedConversationId)) return;
      if (String(senderId) === currentUserId) return;
      setTypingUserId(String(senderId));
    };

    const onUserStopTyping = ({ conversationId }) => {
      if (String(conversationId) !== String(selectedConversationId)) return;
      setTypingUserId(null);
    };

    socket.on("receive_message", onReceiveMessage);
    socket.on("user_typing", onUserTyping);
    socket.on("user_stop_typing", onUserStopTyping);

    return () => {
      socket.off("receive_message", onReceiveMessage);
      socket.off("user_typing", onUserTyping);
      socket.off("user_stop_typing", onUserStopTyping);
    };
  }, [socket, currentUserId, selectedConversationId]);

  useEffect(() => {
    let active = true;
    const term = userSearchQuery.trim();

    if (term.length < 2) {
      setUserSearchResults([]);
      setSearchingUsers(false);
      return undefined;
    }

    const timer = window.setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const { data } = await messageAPI.searchUsers(term);
        if (!active) return;
        setUserSearchResults(Array.isArray(data) ? data : []);
        setError("");
      } catch {
        if (!active) return;
        setUserSearchResults([]);
        setError("Failed to search users");
      } finally {
        if (active) {
          setSearchingUsers(false);
        }
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [userSearchQuery]);

  const filteredConversations = useMemo(() => {
    const search = searchQuery.trim().toLowerCase();
    if (!search) return conversations;

    return conversations.filter((conversation) => {
      const participant = getOtherParticipant(conversation, currentUserId);
      const name = participant?.name || "";
      const preview = conversation?.lastMessage || "";
      return name.toLowerCase().includes(search) || preview.toLowerCase().includes(search);
    });
  }, [conversations, searchQuery, currentUserId]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation._id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const selectedParticipant = selectedConversation
    ? getOtherParticipant(selectedConversation, currentUserId)
    : null;

  const selectedMessages = selectedConversationId ? messagesByConversation[selectedConversationId] || [] : [];

  const handleDeleteConversation = async (conversationId) => {
    const confirmed = window.confirm("Delete this conversation? This cannot be undone.");
    if (!confirmed) return;

    try {
      await messageAPI.deleteConversation(conversationId);

      setConversations((prev) => prev.filter((conversation) => conversation._id !== conversationId));
      setMessagesByConversation((prev) => {
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });
      setUnreadByConversation((prev) => {
        const next = { ...prev };
        delete next[conversationId];
        return next;
      });

      if (selectedConversationId === conversationId) {
        const remaining = conversations.filter((conversation) => conversation._id !== conversationId);
        setSelectedConversationId(remaining[0]?._id || null);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete conversation");
    }
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || !selectedConversationId) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      conversationId: selectedConversationId,
      sender: currentUserId,
      content,
      createdAt: new Date().toISOString(),
      isRead: true,
    };

    setMessagesByConversation((prev) => ({
      ...prev,
      [selectedConversationId]: [...(prev[selectedConversationId] || []), optimisticMessage],
    }));

    setConversations((prev) =>
      prev
        .map((conversation) =>
          conversation._id === selectedConversationId
            ? {
                ...conversation,
                lastMessage: content,
                lastMessageAt: optimisticMessage.createdAt,
              }
            : conversation
        )
        .sort((a, b) => new Date(b.lastMessageAt || b.createdAt || 0) - new Date(a.lastMessageAt || a.createdAt || 0))
    );

    setDraft("");
    if (socket) {
      socket.emit("stop_typing", { conversationId: selectedConversationId });
    }

    try {
      const { data } = await messageAPI.sendMessage(selectedConversationId, { content });
      setMessagesByConversation((prev) => ({
        ...prev,
        [selectedConversationId]: (prev[selectedConversationId] || []).map((message) =>
          message._id === tempId ? data : message
        ),
      }));

      if (socket) {
        socket.emit("send_message", {
          conversationId: selectedConversationId,
          senderId: currentUserId,
          content,
        });
      }
    } catch (err) {
      setMessagesByConversation((prev) => ({
        ...prev,
        [selectedConversationId]: (prev[selectedConversationId] || []).filter((message) => message._id !== tempId),
      }));
      setError(err.response?.data?.message || "Failed to send message");
    }
  };

  const handleInputChange = (value) => {
    setDraft(value);

    if (!socket || !selectedConversationId) return;

    if (!typingDebounceRef.current) {
      typingDebounceRef.current = window.setTimeout(() => {
        socket.emit("typing", {
          conversationId: selectedConversationId,
          senderId: currentUserId,
        });
        typingDebounceRef.current = null;
      }, 300);
    }

    if (stopTypingTimerRef.current) {
      window.clearTimeout(stopTypingTimerRef.current);
    }

    stopTypingTimerRef.current = window.setTimeout(() => {
      socket.emit("stop_typing", { conversationId: selectedConversationId, senderId: currentUserId });
    }, 1500);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const typingUserName = useMemo(() => {
    if (!typingUserId || !selectedConversation) return "Someone";

    const participant = (selectedConversation.participants || []).find(
      (userItem) => String(userItem?._id || userItem?.id) === String(typingUserId)
    );

    return participant?.name || "Someone";
  }, [typingUserId, selectedConversation]);

  const handleStartConversation = async (targetUser) => {
    try {
      const { data } = await messageAPI.createConversation({ participantId: targetUser._id });
      const createdConversation = data;

      setConversations((prev) => {
        const exists = prev.some((item) => item._id === createdConversation._id);
        if (exists) {
          return prev.map((item) => (item._id === createdConversation._id ? createdConversation : item));
        }
        return [createdConversation, ...prev];
      });

      setSelectedConversationId(createdConversation._id);
      setUserSearchQuery("");
      setUserSearchResults([]);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to start conversation");
    }
  };

  return (
    <div className="messages-page">
      <section className="messages-layout">
        <aside className="messages-sidebar">
          <header className="messages-sidebar-header">
            <h1>Messages</h1>
            <input
              type="text"
              placeholder="Find users/employers to message"
              aria-label="Find users to message"
              value={userSearchQuery}
              onChange={(event) => setUserSearchQuery(event.target.value)}
            />

            {(userSearchQuery.trim().length >= 2 || searchingUsers) && (
              <div className="messages-user-search-results">
                {searchingUsers && <p className="messages-user-search-empty">Searching...</p>}

                {!searchingUsers && userSearchResults.length === 0 && (
                  <p className="messages-user-search-empty">No matching users found.</p>
                )}

                {!searchingUsers &&
                  userSearchResults.map((item) => (
                    <button
                      key={item._id}
                      type="button"
                      className="messages-user-search-item"
                      onClick={() => handleStartConversation(item)}
                    >
                      <span className="conversation-avatar">{(item.name || "U").trim().charAt(0).toUpperCase()}</span>
                      <span className="messages-user-search-main">
                        <strong>{item.name}</strong>
                        <small>{item.role === "employer" ? item.companyName || item.email : item.desiredJobTitle || item.email}</small>
                      </span>
                    </button>
                  ))}
              </div>
            )}

            <input
              type="text"
              placeholder="Search conversations"
              aria-label="Search conversations"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </header>

          <div className="messages-conversation-list">
            {!loading && filteredConversations.length === 0 && (
              <p className="messages-empty-list">No conversations yet.</p>
            )}

            {filteredConversations.map((conversation) => {
              const otherUser = getOtherParticipant(conversation, currentUserId);
              const isActive = selectedConversationId === conversation._id;
              const unreadCount = unreadByConversation[conversation._id] || 0;

              return (
                <div key={conversation._id} className={`conversation-item-wrap ${isActive ? "active" : ""}`}>
                  <button
                    type="button"
                    className={`conversation-item ${isActive ? "active" : ""}`}
                    onClick={() => setSelectedConversationId(conversation._id)}
                  >
                    <span className="conversation-avatar">
                      {(otherUser?.name || "U").trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="conversation-main">
                      <strong>{otherUser?.name || "Unknown User"}</strong>
                      <small>{conversation.lastMessage || "No messages yet"}</small>
                    </span>
                    <span className="conversation-meta">
                      <span>{formatListTime(conversation.lastMessageAt || conversation.createdAt)}</span>
                      {unreadCount > 0 ? <span className="conversation-unread-dot" aria-label="Unread" /> : null}
                    </span>
                  </button>

                  <button
                    type="button"
                    className="conversation-delete-btn"
                    aria-label="Delete conversation"
                    onClick={() => handleDeleteConversation(conversation._id)}
                  >
                    x
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        <main className="messages-thread-panel">
          {!selectedConversation ? (
            <div className="messages-thread-empty">
              <div className="messages-thread-empty-icon">+</div>
              <p>Select a conversation to start messaging</p>
            </div>
          ) : (
            <>
              <header className="thread-header">
                <span className="thread-header-avatar">
                  {(selectedParticipant?.name || "U").trim().charAt(0).toUpperCase()}
                </span>
                <div>
                  <strong>{selectedParticipant?.name || "Unknown User"}</strong>
                  <p>{selectedParticipant?.desiredJobTitle || selectedParticipant?.role || "Conversation"}</p>
                </div>
              </header>

              <div className="thread-messages" role="log" aria-live="polite">
                {selectedMessages.map((message, index) => {
                  const currentLabel = getDateLabel(message.createdAt);
                  const previousLabel = index > 0 ? getDateLabel(selectedMessages[index - 1].createdAt) : "";
                  const showSeparator = index === 0 || currentLabel !== previousLabel;
                  const mine = getSenderId(message) === currentUserId;

                  return (
                    <div key={message._id || `${message.createdAt}-${index}`}>
                      {showSeparator ? <div className="date-separator">{currentLabel}</div> : null}
                      <article className={`thread-message ${mine ? "mine" : "theirs"}`}>
                        <p>{message.content}</p>
                        <time>{formatTime(message.createdAt)}</time>
                      </article>
                    </div>
                  );
                })}

                {typingUserId && (
                  <p className="typing-indicator">
                    {typingUserName} is typing<span>.</span><span>.</span><span>.</span>
                  </p>
                )}
              </div>

              <footer className="thread-input-bar">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={draft}
                  onChange={(event) => handleInputChange(event.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button type="button" className="thread-send-btn" onClick={handleSend} aria-label="Send message">
                  &rarr;
                </button>
              </footer>
            </>
          )}
        </main>
      </section>

      {error ? <div className="messages-error-banner">{error}</div> : null}
    </div>
  );
}
