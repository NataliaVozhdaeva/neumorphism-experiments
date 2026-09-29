import { useState } from 'react';
import { Navigate } from 'react-router';

import { useAuth } from '../context/authContext';
import Avatar from '../components/avatar';
import Nav from '../components/nav';
import Input from '../components/input';
import Textarea from '../components/textarea';
import Select from '../components/select';
import Btn from '../components/button';
import { FALLBACK_CURRENCY, formatAmount, getCurrencyOptions } from '../utils/currency';
import '../styles/profile.css';

const contactLabels = {
  email: 'e-mail',
  phone: 'phone',
};

const roleLabels = {
  customer: 'Customer',
  provider: 'Provider',
};

const contactOptions = [
  { value: 'email', label: 'e-mail' },
  { value: 'phone', label: 'phone' },
];

const roleOptions = [
  { value: 'customer', label: 'Customer' },
  { value: 'provider', label: 'Provider' },
];

// Пустой шаблон услуги: id нужен как key для списка и чтобы редактировать конкретную строку
function createEmptyService() {
  return { id: crypto.randomUUID(), name: '', price: '' };
}

function buildEditForm(user) {
  return {
    contact: user.contact ?? '',
    phone: user.phone ?? '',
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    role: user.role ?? '',
    currency: user.currency ?? '',
    activities: user.activities?.join(', ') ?? '',
    locations: user.locations?.join(', ') ?? '',
    priceFrom: user.priceFrom ?? '',
    priceTo: user.priceTo ?? '',
    // Цену в форме храним строкой, как её отдаёт input; если услуг нет — сразу даём одну пустую строку
    services: user.services?.length ? user.services.map((service) => ({ ...service, price: String(service.price) })) : [createEmptyService()],
  };
}

function Profile() {
  const { user, isLoading, logout, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState('');

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error(error);
    }
  };

  const startEditing = () => {
    setEditError('');
    setEditForm(buildEditForm(user));
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm(null);
    setEditError('');
  };

  const updateField = (field, value) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateService = (id, field, value) => {
    setEditForm((prev) => ({
      ...prev,
      services: prev.services.map((service) => (service.id === id ? { ...service, [field]: value } : service)),
    }));
  };

  const addService = () => {
    setEditForm((prev) => ({ ...prev, services: [...prev.services, createEmptyService()] }));
  };

  const removeService = (id) => {
    setEditForm((prev) => ({ ...prev, services: prev.services.filter((service) => service.id !== id) }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');

    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      setEditError('First name and last name are required');
      return;
    }
    if (editForm.contact === 'phone' && !editForm.phone.trim()) {
      setEditError('Specify your phone number');
      return;
    }
    if (!editForm.role) {
      setEditError('Please choose a role');
      return;
    }

    let roleData = {};
    if (editForm.role === 'provider') {
      const activities = editForm.activities
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const locations = editForm.locations
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const priceFrom = Number(editForm.priceFrom);
      const priceTo = Number(editForm.priceTo);

      if (activities.length === 0) {
        setEditError('Specify at least one area of activity');
        return;
      }
      if (locations.length === 0) {
        setEditError('Specify at least one location');
        return;
      }
      if (!editForm.priceFrom || !editForm.priceTo) {
        setEditError('Specify your price range');
        return;
      }
      if (priceFrom > priceTo) {
        setEditError('Minimum price cannot be greater than maximum price');
        return;
      }

      // Полностью пустые строки просто отбрасываем, наполовину заполненные — ошибка
      const filledServices = editForm.services.filter((service) => service.name.trim() || service.price !== '');
      if (filledServices.some((service) => !service.name.trim() || service.price === '')) {
        setEditError('Each service needs both a name and a price');
        return;
      }
      const services = filledServices.map((service) => ({ id: service.id, name: service.name.trim(), price: Number(service.price) }));

      roleData = { activities, locations, priceFrom, priceTo, services };
    }

    try {
      await updateProfile({
        contact: editForm.contact || null,
        phone: editForm.phone.trim(),
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        role: editForm.role,
        // Пустую валюту не отправляем, чтобы не помешать её определению по IP
        ...(editForm.currency && { currency: editForm.currency }),
        ...roleData,
      });
      setIsEditing(false);
      setEditForm(null);
    } catch (err) {
      setEditError(err.message);
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

      {isEditing ? (
        <form className='content' onSubmit={handleEditSubmit}>
          <div className='profile-card'>
            <Avatar email={user.email} size={72} />
            <dl className='profile-details'>
              <div className='profile-row'>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div className='profile-row'>
                <dt>Member since</dt>
                <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>
          </div>

          <div className='profile-card additional-info'>
            {/* Подсказка нужна только провайдерам — в режиме редактирования смотрим на выбранную в форме роль */}
            {editForm.role === 'provider' && (
              <div className='profile-hint'>
                <span className='info-icon icon btn'>
                  <i>i</i>
                </span>
                <span className='hint-text'>You can fill it to be able to share anytime with your partners</span>
              </div>
            )}

            <div className='additional-info-fields'>
              <label className='field-label'>
                <span>First name</span>
                <Input
                  className='first-name'
                  type='text'
                  placeholder='first name'
                  value={editForm.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  required
                />
              </label>
              <label className='field-label'>
                <span>Last name</span>
                <Input
                  className='last-name'
                  type='text'
                  placeholder='last name'
                  value={editForm.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  required
                />
              </label>
              <label className='field-label field-label--inline'>
                <span>Preferred contact</span>
                <Select
                  className='select-contact'
                  options={contactOptions}
                  value={editForm.contact}
                  onChange={(value) => updateField('contact', value)}
                  placeholder='Preferred way to contact'
                />
              </label>
              <label className='field-label field-label--inline'>
                <span>Role</span>
                <Select
                  className='select-role'
                  options={roleOptions}
                  value={editForm.role}
                  onChange={(value) => updateField('role', value)}
                  placeholder='I am a...'
                />
              </label>
              <label className='field-label field-label--inline'>
                <span>Currency</span>
                <Select
                  className='select-currency'
                  options={getCurrencyOptions(editForm.currency)}
                  value={editForm.currency}
                  onChange={(value) => updateField('currency', value)}
                  placeholder='Currency'
                />
              </label>
            </div>

            {editForm.contact === 'phone' && (
              <label className='field-label'>
                <span>Phone number</span>
                <Input
                  className='phone'
                  type='tel'
                  placeholder='Phone number'
                  value={editForm.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  required
                />
              </label>
            )}

            {editForm.role === 'provider' && (
              <div className='role-fields'>
                <label className='field-label'>
                  <span>Areas of activity</span>
                  <Textarea
                    className='activities'
                    placeholder='Comma separated (e.g. plumbing, painting, cleaning)'
                    value={editForm.activities}
                    onChange={(e) => updateField('activities', e.target.value)}
                    required
                  />
                </label>
                <label className='field-label'>
                  <span>Locations</span>
                  <Input
                    className='locations'
                    type='text'
                    placeholder='Comma separated (e.g. New York, Boston)'
                    value={editForm.locations}
                    onChange={(e) => updateField('locations', e.target.value)}
                    required
                  />
                </label>
                <label className='field-label'>
                  <span>Price range</span>
                  <div className='price-range'>
                    <Input
                      className='price-input'
                      type='number'
                      min='0'
                      placeholder='from'
                      value={editForm.priceFrom}
                      onChange={(e) => updateField('priceFrom', e.target.value)}
                      required
                    />
                    <span>—</span>
                    <Input
                      className='price-input'
                      type='number'
                      min='0'
                      placeholder='to'
                      value={editForm.priceTo}
                      onChange={(e) => updateField('priceTo', e.target.value)}
                      required
                    />
                  </div>
                </label>
                <div className='field-label'>
                  <span>Services</span>
                  <ul className='services-list'>
                    {editForm.services.map((service) => (
                      <li key={service.id} className='service-row'>
                        <Input
                          className='service-name'
                          type='text'
                          placeholder='Service (e.g. Fix a leaking tap)'
                          value={service.name}
                          onChange={(e) => updateService(service.id, 'name', e.target.value)}
                        />
                        <Input
                          className='service-price'
                          type='number'
                          min='0'
                          placeholder='price'
                          value={service.price}
                          onChange={(e) => updateService(service.id, 'price', e.target.value)}
                        />
                        <span className='service-currency'>{editForm.currency || FALLBACK_CURRENCY}</span>
                        <Btn text='×' className='service-remove' aria-label='Remove service' onClick={() => removeService(service.id)} />
                      </li>
                    ))}
                  </ul>
                  <Btn text='+ Add service' className='service-add' onClick={addService} />
                </div>
              </div>
            )}

            {editError && <p className='form-error'>{editError}</p>}
            <div className='edit-actions'>
              <Btn text='Cancel' type='button' className='accountBtn accountBtn-cancel' onClick={cancelEditing} />
              <button type='submit' className='btn btn-green additional_info-btn'>
                Save
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className='content'>
          <div className='profile-card'>
            <Avatar email={user.email} size={72} />
            <dl className='profile-details'>
              <div className='profile-row'>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div className='profile-row'>
                <dt>Member since</dt>
                <dd>{new Date(user.createdAt).toLocaleDateString()}</dd>
              </div>
            </dl>
            <Btn text='Log Out' className='accountBtn accountBtn-logout' onClick={handleLogout} />
          </div>

          <div className='profile-card additional-info'>
            <Btn text='Edit' className='accountBtn accountBtn-edit btn-green' onClick={startEditing} />

            {/* Подсказка нужна только провайдерам */}
            {user.role === 'provider' && (
              <div className='profile-hint'>
                <span className='info-icon icon btn'>
                  <i>i</i>
                </span>
                <span className='hint-text'>You can fill it to be able to share anytime with your partners</span>
              </div>
            )}

            <dl className='profile-details'>
              <div className='profile-row'>
                <dt>First name</dt>
                <dd>{user.firstName || 'Not set'}</dd>
              </div>
              <div className='profile-row'>
                <dt>Last name</dt>
                <dd>{user.lastName || 'Not set'}</dd>
              </div>
              <div className='profile-row'>
                <dt>Preferred contact</dt>
                <dd>{contactLabels[user.contact] ?? 'Not set'}</dd>
              </div>
              <div className='profile-row'>
                <dt>Role</dt>
                <dd>{roleLabels[user.role] ?? 'Not set'}</dd>
              </div>
              <div className='profile-row'>
                <dt>Currency</dt>
                <dd>{user.currency ?? 'Not set'}</dd>
              </div>
              {user.contact === 'phone' && (
                <div className='profile-row'>
                  <dt>Phone number</dt>
                  <dd>{user.phone || 'Not set'}</dd>
                </div>
              )}
              {user.role === 'provider' && (
                <>
                  <div className='profile-row'>
                    <dt>Areas of activity</dt>
                    <dd>{user.activities?.join(', ') || 'Not set'}</dd>
                  </div>
                  <div className='profile-row'>
                    <dt>Locations</dt>
                    <dd>{user.locations?.join(', ') || 'Not set'}</dd>
                  </div>
                  <div className='profile-row'>
                    <dt>Price range</dt>
                    <dd>{user.priceFrom != null && user.priceTo != null ? `${user.priceFrom} – ${user.priceTo}` : 'Not set'}</dd>
                  </div>
                  <div className='profile-row profile-row--services'>
                    <dt>Services</dt>
                    <dd>
                      {user.services?.length ? (
                        <ul className='services-view'>
                          {user.services.map((service) => (
                            <li key={service.id}>
                              {service.name} — {formatAmount(service.price, user.currency ?? FALLBACK_CURRENCY)}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        'Not set'
                      )}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </div>
        </div>
      )}
    </div>
  );
}

export default Profile;
