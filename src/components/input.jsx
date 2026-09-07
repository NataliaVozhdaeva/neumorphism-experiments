import '../styles/components/input.css';

function Input({ type = 'text', className = '', placeholder = 'input placeholder', children, ...rest }) {
  return <input type={type} className={`input ${className}`.trim()} placeholder={placeholder} {...rest} />;
}

export default Input;
