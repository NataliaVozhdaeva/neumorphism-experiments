import { NavLink } from 'react-router';

import { useAuth } from '../context/authContext';
import Avatar from './avatar';

const links = [
  { to: '/', label: 'Home' },
  { to: '/requests', label: 'Requests' },
  { to: '/help', label: 'Help' },
  { to: '/profile', label: 'Profile' },
  { to: '/templates', label: 'Templates' },
];

function Nav() {
  const { user } = useAuth();

  return (
    <nav className='pages-navigation'>
      {links.map(({ to, label }) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'btn navlink navlink--active' : 'btn navlink')}>
          {to === '/profile' && user && <Avatar email={user.email} size={20} />}
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default Nav;
