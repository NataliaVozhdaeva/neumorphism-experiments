import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { useAuth } from '../context/authContext';
import Btn from '../components/button';
import Input from '../components/input';
import Modal from '../components/modal';
import Select from '../components/select';
import Textarea from '../components/textarea';
import Nav from '../components/nav';
import '../styles/home.css';

function Home() {
  const { user, register, login } = useAuth();
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [contact, setContact] = useState('');
  const [role, setRole] = useState('');
  const [createError, setCreateError] = useState('');
  const [loginError, setLoginError] = useState('');
  const emailInput = useRef(null);
  const passwordInput = useRef(null);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');

    // сохраняем узел формы до await — после него e.currentTarget уже обнулён
    const form = e.currentTarget;
    const formData = new FormData(form);

    if (contact === 'phone' && !formData.get('phone')) {
      setCreateError('Specify your phone number');
      return;
    }

    if (!role) {
      setCreateError('Please choose a role');
      return;
    }

    let roleData = {};
    if (role === 'provider') {
      const activities = (formData.get('activities') ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const locations = (formData.get('locations') ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const priceFrom = Number(formData.get('priceFrom'));
      const priceTo = Number(formData.get('priceTo'));

      if (activities.length === 0) {
        setCreateError('Specify at least one area of activity');
        return;
      }
      if (locations.length === 0) {
        setCreateError('Specify at least one location');
        return;
      }
      if (!formData.get('priceFrom') || !formData.get('priceTo')) {
        setCreateError('Specify your price range');
        return;
      }
      if (priceFrom > priceTo) {
        setCreateError('Minimum price cannot be greater than maximum price');
        return;
      }

      roleData = { activities, locations, priceFrom, priceTo };
    }

    if (role === 'customer') {
      const location = (formData.get('location') ?? '').trim();
      const serviceDescription = (formData.get('serviceDescription') ?? '').trim();
      const budgetFrom = Number(formData.get('budgetFrom'));
      const budgetTo = Number(formData.get('budgetTo'));

      if (!location) {
        setCreateError('Specify the location where you need the service');
        return;
      }
      if (!serviceDescription) {
        setCreateError('Describe the service you need');
        return;
      }
      if (!formData.get('budgetFrom') || !formData.get('budgetTo')) {
        setCreateError('Specify your budget range');
        return;
      }
      if (budgetFrom > budgetTo) {
        setCreateError('Minimum budget cannot be greater than maximum budget');
        return;
      }

      roleData = { location, serviceDescription, budgetFrom, budgetTo };
    }

    try {
      await register({
        email: formData.get('email'),
        password: formData.get('password'),
        repeatPassword: formData.get('repeatPassword'),
        contact,
        phone: formData.get('phone'),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        role,
        ...roleData,
      });
      setIsCreateOpen(false);
      form.reset();
      setContact('');
      setRole('');
    } catch (err) {
      setCreateError(err.message);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');

    const formData = new FormData(e.currentTarget);
    try {
      await login({
        email: formData.get('email'),
        password: formData.get('password'),
      });
      navigate('/requests');
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const contactOptions = [
    { value: 'email', label: 'e-mail' },
    { value: 'phone', label: 'phone' },
  ];

  const roleOptions = [
    { value: 'customer', label: 'Customer' },
    { value: 'provider', label: 'Provider' },
  ];

  return (
    <div className='homepage contentContainer'>
      <Nav />
      <h1 className='title title--main'>We are here to help you to find the best provider for cervice you need</h1>

      {!user && (
        <>
          <div className='accountContanner'>
            <form className='login-container' onSubmit={handleLoginSubmit}>
              <label className='login-label'>
                <span>Email</span>
                <Input className='login' type='email' name='email' placeholder='email' id='login-email' ref={emailInput} required />
              </label>
              <label className='login-label'>
                <span>Password</span>
                <Input className='password' type='password' name='password' placeholder='password' id='login-password' ref={passwordInput} required />
              </label>
              {loginError && <p className='form-error'>{loginError}</p>}
              <Btn text='Login into your account' className='accountBtn accountBtn-login btn-green' type='submit' />
            </form>
            <span>or</span>
            <Btn text='Create an account' className='accountBtn accountBtn-create' onClick={() => setIsCreateOpen(true)} />
          </div>

          <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
            <form className='create-form' onSubmit={handleCreateSubmit}>
              <h2 className='modal-title'>Create an account</h2>
              <Input className='first-name' type='text' name='firstName' placeholder='first name' required />
              <Input className='last-name' type='text' name='lastName' placeholder='last name' required />
              <Input className='create-email' type='email' name='email' placeholder='email' required />
              <Input className='create-password' type='password' name='password' placeholder='password' required />
              <Input className='repeat-password' type='password' name='repeatPassword' placeholder='repeat password' required />
              <Select className='select-contact' options={contactOptions} value={contact} onChange={setContact} placeholder='Preferred way to contact' />
              {contact === 'phone' && <Input className='phone' type='tel' name='phone' placeholder='Phone number' required />}
              <Select className='select-role' options={roleOptions} value={role} onChange={setRole} placeholder='I am a...' />

              {role === 'provider' && (
                <div className='role-fields'>
                  <Textarea
                    className='activities'
                    name='activities'
                    placeholder='Areas of activity, comma separated (e.g. plumbing, painting, cleaning)'
                    required
                  />
                  <Input className='locations' type='text' name='locations' placeholder='Locations, comma separated (e.g. New York, Boston)' required />
                  <div className='price-range'>
                    <Input className='price-input price-from' type='number' name='priceFrom' placeholder='Price from' min='0' required />
                    <span>—</span>
                    <Input className='price-input price-to' type='number' name='priceTo' placeholder='Price to' min='0' required />
                  </div>
                </div>
              )}

              {role === 'customer' && (
                <div className='role-fields'>
                  <Input className='location' type='text' name='location' placeholder='Location where you need the service' required />
                  <Textarea className='service-description' name='serviceDescription' placeholder='Describe the service you need' required />
                  <div className='price-range'>
                    <Input className='price-input budget-from' type='number' name='budgetFrom' placeholder='Budget from' min='0' required />
                    <span>—</span>
                    <Input className='price-input budget-to' type='number' name='budgetTo' placeholder='Budget to' min='0' required />
                  </div>
                </div>
              )}

              {createError && <p className='form-error'>{createError}</p>}
              <Btn text='Create' className='account-creation-submit btn-green' type='submit' />
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}

export default Home;
