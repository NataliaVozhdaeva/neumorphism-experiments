import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import '../styles/components/select.css';

const VIEWPORT_GAP = 20;

function Select({ className = '', options = [], value, onChange, placeholder = 'Select an option' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [maxHeight, setMaxHeight] = useState();
  const selectRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (!selectRef.current.contains(e.target)) setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updateMaxHeight = () => {
      const { bottom } = selectRef.current.getBoundingClientRect();
      setMaxHeight(Math.max(window.innerHeight - bottom - 8 - VIEWPORT_GAP, 0));
    };

    updateMaxHeight();
    window.addEventListener('resize', updateMaxHeight);
    window.addEventListener('scroll', updateMaxHeight, true);
    return () => {
      window.removeEventListener('resize', updateMaxHeight);
      window.removeEventListener('scroll', updateMaxHeight, true);
    };
  }, [isOpen]);

  const selected = options.find((option) => option.value === value);

  return (
    <div ref={selectRef} className={`select ${isOpen ? 'select--open' : ''} ${className}`.trim()}>
      <button type='button' className='btn select-trigger' onClick={() => setIsOpen(!isOpen)}>
        <span className='select-value'>{selected ? selected.label : placeholder}</span>
      </button>

      {isOpen && (
        <ul className='select-list' style={{ maxHeight }}>
          {options.map((option) => (
            <li key={option.value}>
              <button
                type='button'
                className={option.value === value ? 'btn select-option select-option--selected' : 'btn select-option'}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}>
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default Select;
