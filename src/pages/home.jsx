import { useState } from 'react';

import Btn from '../components/button';
import Input from '../components/input';
import Modal from '../components/modal';
import Select from '../components/select';
import Nav from '../components/nav';
import '../styles/home.css';

function Home() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [contact, setContact] = useState('');

  const handleCreateSubmit = (e) => {
    e.preventDefault();
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email');
    const password = formData.get('password');
    console.log({ email, password });
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
            <Input className='login' type='email' name='email' placeholder='email' id='login-email' required />
          </label>
          <label className='login-label'>
            <span>Password</span>
            <Input className='password' type='password' name='password' placeholder='password' id='login-password' required />
          </label>
          <Btn text='Login into your account' className='accountBtn accountBtn-login' type='submit' />
        </form>
        <span>or</span>
        <Btn text='Create an account' className='accountBtn accountBtn-create' onClick={() => setIsCreateOpen(true)} />
      </div>

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)}>
        <form className='create-form' onSubmit={handleCreateSubmit}>
          <h2 className='modal-title'>Create an account</h2>
          <Input className='create-email' placeholder='email' />
          <Input className='create-password' type='password' placeholder='password' />
          <Input className='repeat-password' type='password' placeholder='repeat password' />
          <Select
            className='select-contact'
            options={contactOptions}
            value={contact}
            onChange={setContact}
            placeholder='Preferred way to contact'
          />

          <Btn text='Create' className='account-creation-submit' type='submit' />
        </form>
      </Modal>
    </div>
  );
}

export default Home;
