import { NavLink } from 'react-router';

const links = [
  { to: '/', label: 'Home' },
  { to: '/requests', label: 'Requests' },
  { to: '/help', label: 'Help' },
  { to: '/profile', label: 'Profile' },
];

function Nav() {
  return (
    <nav className='pages-navigation'>
      {links.map(({ to, label }) => (
        <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'btn navlink navlink--active' : 'btn navlink')}>
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

export default Nav;
