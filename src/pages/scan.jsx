import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { authApi } from '../api/authApi';
import Avatar from '../components/avatar';
import Btn from '../components/button';
import Nav from '../components/nav';
import { getIndustryLabel } from '../utils/industries';
import '../styles/profile.css';

// Страница, на которую ведёт QR-код: краткая карточка партнёра и выбор действия.
// Логин не нужен — как и на публичном профиле
function Scan() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    authApi
      .getPublicProfile(id)
      .then(setProfile)
      .catch((err) => setError(err.message));
  }, [id]);

  if (error) {
    return (
      <div className='profile contentContainer'>
        <Nav />
        <h1 className='title title--main'>{error}</h1>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className='profile contentContainer'>
        <Nav />
      </div>
    );
  }

  const fullName = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim();

  return (
    <div className='profile contentContainer'>
      <Nav />
      <h1 className='title title--main'>{fullName || 'Partner'}</h1>

      <div className='content'>
        <div className='profile-card scan-card'>
          <Avatar email={profile.firstName} size={72} />
          {profile.role === 'partner' && <p className='scan-industry'>{getIndustryLabel(profile.industry)}</p>}
          <div className='scan-actions'>
            <Btn text='Learn more about partner' onClick={() => navigate(`/profile/${id}`)} />
            <Btn text='Book appointment' className='btn-green' onClick={() => navigate(`/book/${id}`)} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Scan;
