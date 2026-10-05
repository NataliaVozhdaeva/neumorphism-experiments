import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import { useAuth } from '../context/authContext';
import Btn from '../components/button';
import Input from '../components/input';
import PasswordInput from '../components/passwordInput';
import Modal from '../components/modal';
import Select from '../components/select';
import Textarea from '../components/textarea';
import Nav from '../components/nav';
import { industryOptions } from '../utils/industries';
import '../styles/home.css';

function Home() {
  const { user, register, login } = useAuth();
  const navigate = useNavigate();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [contact, setContact] = useState('');
  const [role, setRole] = useState('');
  const [industry, setIndustry] = useState('');
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
      // Цена необязательна: пустое поле сохраняем как null, а не как 0
      const priceFrom = formData.get('priceFrom') ? Number(formData.get('priceFrom')) : null;
      const priceTo = formData.get('priceTo') ? Number(formData.get('priceTo')) : null;

      if (!industry) {
        setCreateError('Please choose an industry');
        return;
      }
      if (activities.length === 0) {
        setCreateError('Specify at least one area of activity');
        return;
      }
      if (locations.length === 0) {
        setCreateError('Specify at least one location');
        return;
      }
      // Сравниваем границы только если указаны обе
      if (priceFrom !== null && priceTo !== null && priceFrom > priceTo) {
        setCreateError('Minimum price cannot be greater than maximum price');
        return;
      }

      roleData = { industry, activities, locations, priceFrom, priceTo };
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
      setIndustry('');
      // Провайдера сразу ведём в профиль — заполнить услуги и цены
      if (role === 'provider') navigate('/profile');
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
                <PasswordInput className='password' name='password' placeholder='password' id='login-password' ref={passwordInput} required />
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
              <PasswordInput className='create-password' name='password' placeholder='password' required />
              <PasswordInput className='repeat-password' name='repeatPassword' placeholder='repeat password' required />
              <Select className='select-contact' options={contactOptions} value={contact} onChange={setContact} placeholder='Preferred way to contact' />
              {contact === 'phone' && <Input className='phone' type='tel' name='phone' placeholder='Phone number' required />}
              <Select className='select-role' options={roleOptions} value={role} onChange={setRole} placeholder='I am a...' />

              {role === 'provider' && (
                <div className='role-fields'>
                  <Select className='select-industry' options={industryOptions} value={industry} onChange={setIndustry} placeholder='Industry' />
                  <Textarea
                    className='activities'
                    name='activities'
                    placeholder='Areas of activity, comma separated (e.g. plumbing, painting, cleaning)'
                    required
                  />
                  <Input className='locations' type='text' name='locations' placeholder='Locations, comma separated (e.g. New York, Boston)' required />
                  <div className='price-range'>
                    <Input className='price-input price-from' type='number' name='priceFrom' placeholder='Price from' min='0' />
                    <span>—</span>
                    <Input className='price-input price-to' type='number' name='priceTo' placeholder='Price to' min='0' />
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
