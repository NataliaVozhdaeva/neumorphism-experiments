import '../styles/components/textarea.css';

function Textarea({ className = '', placeholder = 'textarea placeholder', ...rest }) {
  return <textarea className={`textarea ${className}`.trim()} {...rest} placeholder={placeholder} />;
}

export default Textarea;
