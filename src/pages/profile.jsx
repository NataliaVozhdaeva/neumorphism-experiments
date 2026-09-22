import { Navigate } from 'react-router';

import { useAuth } from '../context/authContext';
import Avatar from '../components/avatar';
import Nav from '../components/nav';
import Input from '../components/input';
import '../styles/profile.css';
import Btn from '../components/button';

const contactLabels = {
  email: 'e-mail',
  phone: 'phone',
};

function Profile() {
  const { user, isLoading, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error(error);
    }
  };

  if (isLoading) {
    return (
      <div className='profile contentContainer'>
        <Nav />
      </div>
    );
  }

  if (!user) {
    return <Navigate to='/' replace />;
  }

  return (
    <div className='profile contentContainer'>
      <Nav />
      <h1 className='title title--main'>Profile</h1>

      <div className='content'>
        <div className='profile-card'>
          <Avatar email={user.email} size={72} />
          <dl className='profile-details'>
            <div className='profile-row'>
              <dt>Email</dt>
              <dd>{user.email}</dd>
            </div>
            <div className='profile-row'>
              <dt>Preferred contact</dt>
              <dd>{contactLabels[user.contact] ?? 'Not set'}</dd>
            </div>
            <div className='profile-row'>
              <dt>Member since</dt>
              <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
          <Btn text='Log Out' className='accountBtn accountBtn-logout' onClick={logout} />
        </div>

        <div className='profile-card additional-info'>
          <div className='profile-hint'>
            <span className='info-icon icon btn'>
              <i>i</i>
            </span>
            <span className='hint-text'>You can fill it to be able to share anytame with your partners</span>
          </div>
          <form>
            <label className='profile-label'>
              <span>First name</span>
              <Input className='first-name profile-input' type='text' name='first-name' placeholder='first name' required />
            </label>
            <label className='profile-label'>
              <span>Last name</span>
              <Input className='last-name profile-input' type='text' name='last-name' placeholder='last name' required />
            </label>

            <div className='occupation'>
              <Btn text='+' className='addBtn' onClick={() => console.log('click add')} />
            </div>

            <button type='submit' className='btn btn-green additional_info-btn'>
              Submit
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
