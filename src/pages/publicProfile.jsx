import { useEffect, useState } from 'react';
import { useParams } from 'react-router';

import { authApi } from '../api/authApi';
import Avatar from '../components/avatar';
import Nav from '../components/nav';
import { FALLBACK_CURRENCY, formatAmount, formatRange } from '../utils/currency';
import { getIndustryLabel } from '../utils/industries';
import '../styles/profile.css';

const roleLabels = {
  customer: 'Customer',
  provider: 'Provider',
};

// Публичная страница профиля — сюда ведёт QR-код, логин не нужен
function PublicProfile() {
  const { id } = useParams();
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
  const currency = profile.currency ?? FALLBACK_CURRENCY;
  // Показываем только предпочтительный контакт — именно его юзер разрешил отдавать
  const contactValue = profile.contact === 'phone' ? profile.phone : profile.email;

  return (
    <div className='profile contentContainer'>
      <Nav />
      <h1 className='title title--main'>{fullName || 'Profile'}</h1>

      <div className='content'>
        <div className='profile-card'>
          <Avatar email={profile.firstName} size={72} />
          <dl className='profile-details'>
            <div className='profile-row'>
              <dt>Role</dt>
              <dd>{roleLabels[profile.role] ?? 'Not set'}</dd>
            </div>
            {contactValue && (
              <div className='profile-row'>
                <dt>{profile.contact === 'phone' ? 'Phone' : 'Email'}</dt>
                <dd>{profile.contact === 'phone' ? <a href={`tel:${contactValue}`}>{contactValue}</a> : <a href={`mailto:${contactValue}`}>{contactValue}</a>}</dd>
              </div>
            )}
            <div className='profile-row'>
              <dt>Member since</dt>
              <dd>{new Date(profile.createdAt).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        {profile.role === 'provider' && (
          <>
            <div className='profile-card additional-info'>
              <dl className='profile-details'>
                <div className='profile-row'>
                  <dt>Industry</dt>
                  <dd>{getIndustryLabel(profile.industry)}</dd>
                </div>
                <div className='profile-row'>
                  <dt>Areas of activity</dt>
                  <dd>{profile.activities?.join(', ') || 'Not set'}</dd>
                </div>
                <div className='profile-row'>
                  <dt>Locations</dt>
                  <dd>{profile.locations?.join(', ') || 'Not set'}</dd>
                </div>
                <div className='profile-row'>
                  <dt>Price range</dt>
                  <dd>{formatRange(profile.priceFrom, profile.priceTo, currency)}</dd>
                </div>
              </dl>
            </div>

            <div className='profile-card additional-info price-list'>
              <h2 className='services-title'>Price list</h2>
              {profile.services.length === 0 ? (
                <p className='price-list-empty'>No services yet</p>
              ) : (
                <dl className='profile-details'>
                  {profile.services.map((service) => (
                    <div key={service.id} className='profile-row price-list-row'>
                      <dt>
                        <span className='price-list-title'>{service.name}</span>
                        {service.description && <span className='price-list-description'>{service.description}</span>}
                      </dt>
                      <dd>{formatAmount(service.price, currency)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PublicProfile;
