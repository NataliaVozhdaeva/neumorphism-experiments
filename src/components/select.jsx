import { useState } from 'react';

import '../styles/components/select.css';

function Select({ className = '', options = [], value, onChange, placeholder = 'Select an option' }) {
  // открыт ли список; состояние внутреннее, родителю про него знать незачем
  const [isOpen, setIsOpen] = useState(false);

  // объект выбранной опции или undefined, если ничего не выбрано
  const selected = options.find((option) => option.value === value);

  return (
    <div className={`select ${isOpen ? 'select--open' : ''} ${className}`.trim()}>
      <button type='button' className='btn select-trigger' onClick={() => setIsOpen(!isOpen)}>
        <span className='select-value'>{selected ? selected.label : placeholder}</span>
      </button>

      {isOpen && (
        <ul className='select-list'>
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
