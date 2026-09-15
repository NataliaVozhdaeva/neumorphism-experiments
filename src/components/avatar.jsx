import '../styles/components/avatar.css';

// Заглушка вместо реального аватара — кружок с первой буквой email
function Avatar({ email, size = 32, className = '' }) {
  const initial = email ? email[0].toUpperCase() : '?';

  return (
    <span className={`avatar ${className}`.trim()} style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {initial}
    </span>
  );
}

export default Avatar;
