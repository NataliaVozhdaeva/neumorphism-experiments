import '../styles/components/modal.css';

function Modal({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div className='modal-overlay' onClick={onClose}>
      <div className='modal' onClick={(e) => e.stopPropagation()}>
        <button type='button' className='modal-close' onClick={onClose} aria-label='Close'>
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

export default Modal;
