import { useRef, useState } from 'react';

import { useAuth } from '../context/authContext';
import Btn from '../components/button';
import Input from '../components/input';
import Modal from '../components/modal';
import Select from '../components/select';
import Nav from '../components/nav';
import '../styles/home.css';

function Home() {
  const { register, login } = useAuth();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [contact, setContact] = useState('');
  const [createError, setCreateError] = useState('');
  const [loginError, setLoginError] = useState('');
  const emailInput = useRef(null);
  const passwordInput = useRef(null);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');

    const formData = new FormData(e.currentTarget);
    try {
      await register({
        email: formData.get('email'),
        password: formData.get('password'),
        repeatPassword: formData.get('repeatPassword'),
        contact,
      });
      setIsCreateOpen(false);
      e.currentTarget.reset();
      setContact('');
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
      emailInput.current.value = '';
      passwordInput.current.value = '';
    } catch (err) {
      setLoginError(err.message);
    }
  };

  const contactOptions = [
    { value: 'email', label: 'e-mail' },
    { value: 'phone', label: 'phone' },
  ];

  return (
    <div className='homepage contentContainer'>
      <Nav />
      <h1 className='title title--main'>We are here to help you to find the best provider for cervice you need</h1>

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
          <Input className='create-email' type='email' name='email' placeholder='email' required />
          <Input className='create-password' type='password' name='password' placeholder='password' required />
          <Input className='repeat-password' type='password' name='repeatPassword' placeholder='repeat password' required />
          <Select className='select-contact' options={contactOptions} value={contact} onChange={setContact} placeholder='Preferred way to contact' />

          {createError && <p className='form-error'>{createError}</p>}
          <Btn text='Create' className='account-creation-submit btn-green' type='submit' />
        </form>
      </Modal>
    </div>
  );
}

export default Home;
