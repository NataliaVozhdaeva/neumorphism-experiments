import '../styles/components/btn.css';

function Btn({ type = 'button', className = '', text, children, ...rest }) {
  return (
    <button type={type} className={`btn ${className}`.trim()} {...rest}>
      <span>{text}</span>
      {children}
    </button>
  );
}

export default Btn;
