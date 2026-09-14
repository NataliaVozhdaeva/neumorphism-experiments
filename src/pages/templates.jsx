import { useState } from 'react';

import Nav from '../components/nav';
import Btn from '../components/button';
import Input from '../components/input';
import Textarea from '../components/textarea';
import Select from '../components/select';

import '../styles/templates.css';

function Templates() {
  const [myValue, setMyValue] = useState('Default value');

  const templateOptions = [
    { value: 'option 1', label: 'option 1' },
    { value: 'option 2', label: 'option 2' },
  ];

  return (
    <div className='templates contentContainer'>
      <Nav />
      <h1 className='title title--main'>Templates</h1>
      <div className='components'>
        <Btn text='Btn text' className='customClassName' />
        <Input />
        <Textarea rows={'5'} />
        <Select className='select-template' options={templateOptions} value={myValue} onChange={setMyValue} />
      </div>
    </div>
  );
}

export default Templates;
