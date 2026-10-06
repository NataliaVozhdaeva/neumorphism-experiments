import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router';

import { useAuth } from '../context/authContext';
import { chatApi } from '../api/chatApi';
import Nav from '../components/nav';
import Input from '../components/input';
import Btn from '../components/button';
import '../styles/chat.css';

// В моках нет реального времени — новые сообщения собеседника подтягиваем опросом
const POLL_INTERVAL_MS = 3000;

// Чат сделки между кастомером и провайдером. Открывается по кнопке "Go to deal" / "Open chat" на странице заявок
function Chat() {
  const { id } = useParams();
  const { user, isLoading } = useAuth();
  const [chat, setChat] = useState(null);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [actionError, setActionError] = useState('');
  const messagesEnd = useRef(null);

  useEffect(() => {
    if (!user) return;

    // После ухода со страницы или смены чата ответ запоздавшего запроса уже не нужен
    let isCancelled = false;
    const load = () =>
      chatApi
        .getChat(id)
        .then((data) => {
          if (isCancelled) return;
          setChat(data);
          setError('');
        })
        .catch((err) => {
          if (!isCancelled) setError(err.message);
        });

    load();
    const timer = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      isCancelled = true;
      clearInterval(timer);
    };
  }, [id, user]);

  // Прокручиваем к последнему сообщению, когда приходит новое
  const messagesCount = chat?.messages.length;
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messagesCount]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setActionError('');
    try {
      setChat(await chatApi.sendMessage(id, text));
      setText('');
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleConfirmation = async (confirmed) => {
    setActionError('');
    try {
      setChat(await chatApi.setWorkConfirmation(id, confirmed));
    } catch (err) {
      setActionError(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className='chat contentContainer'>
        <Nav />
      </div>
    );
  }

  if (!user) {
    return <Navigate to='/' replace />;
  }

  if (error && !chat) {
    return (
      <div className='chat contentContainer'>
        <Nav />
        <h1 className='title title--main'>{error}</h1>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className='chat contentContainer'>
        <Nav />
      </div>
    );
  }

  const otherRole = chat.myRole === 'customer' ? 'provider' : 'customer';
  const iConfirmed = chat.confirmations[chat.myRole];
  const otherConfirmed = chat.confirmations[otherRole];

  return (
    <div className='chat contentContainer'>
      <Nav />
      <h1 className='title title--main'>Deal with {chat.otherName}</h1>
      <Link to='/requests' className='chat-back'>
        ← Back to requests
      </Link>
      {chat.serviceDescription && <p className='chat-service'>{chat.serviceDescription}</p>}

      {/* Старт работы подтверждают обе стороны; после этого решение провайдера по заявке менять нельзя */}
      <div className='chat-work'>
        {chat.workStartedAt ? (
          <span className='chat-work-status chat-work-status--started'>Work started on {new Date(chat.workStartedAt).toLocaleDateString()}</span>
        ) : (
          <>
            <span className='chat-work-status'>
              {iConfirmed
                ? `You confirmed the start of work, waiting for ${chat.otherName}`
                : otherConfirmed
                  ? `${chat.otherName} is ready to start. Confirm to start the work`
                  : 'Both of you need to confirm the start of work. After that the decision can no longer be changed'}
            </span>
            <Btn
              text={iConfirmed ? 'Cancel confirmation' : 'Confirm start of work'}
              className={iConfirmed ? 'chat-confirm' : 'chat-confirm btn-green'}
              disabled={!chat.isActive}
              onClick={() => handleConfirmation(!iConfirmed)}
            />
          </>
        )}
      </div>

      {!chat.isActive && <p className='form-error'>The provider has declined this request, the chat is closed</p>}

      <ul className='chat-messages'>
        {chat.messages.length === 0 && <li className='chat-empty'>No messages yet — say hello</li>}
        {chat.messages.map((message) => (
          <li key={message.id} className={message.senderId === user.id ? 'chat-message chat-message--mine' : 'chat-message'}>
            <span className='chat-message-text'>{message.text}</span>
            <span className='chat-message-time'>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </li>
        ))}
        <li ref={messagesEnd} />
      </ul>

      {actionError && <p className='form-error'>{actionError}</p>}
      <form className='chat-form' onSubmit={handleSend}>
        <Input className='chat-input' type='text' placeholder='Write a message' value={text} onChange={(e) => setText(e.target.value)} disabled={!chat.isActive} />
        <Btn text='Send' className='chat-send btn-green' type='submit' disabled={!chat.isActive || !text.trim()} />
      </form>
    </div>
  );
}

export default Chat;
