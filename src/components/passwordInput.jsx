import { useState } from 'react';

import Input from './input';
import '../styles/components/passwordInput.css';

// Поле пароля с кнопкой "показать/скрыть" — остальные пропсы уходят в обычный Input
function PasswordInput({ className = '', ...rest }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className='password-input'>
      <Input type={isVisible ? 'text' : 'password'} className={className} {...rest} />
      <button
        type='button'
        className='password-toggle'
        onClick={() => setIsVisible((prev) => !prev)}
        aria-label={isVisible ? 'Hide password' : 'Show password'}
        title={isVisible ? 'Hide password' : 'Show password'}
      >
        <svg viewBox='0 0 24 24' width='18' height='18' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
          <path d='M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z' />
          <circle cx='12' cy='12' r='3' />
          {/* Перечёркнутый глаз, пока пароль виден */}
          {isVisible && <path d='m3 3 18 18' />}
        </svg>
      </button>
    </div>
  );
}

export default PasswordInput;
